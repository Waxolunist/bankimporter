import 'babel-polyfill';
import Koa from 'koa';
import Router from 'koa-router';
import multer from 'koa-multer';
import serve from 'koa-static';
import mount from 'koa-mount';
import DBMigrate from 'db-migrate';
import csv from 'fast-csv';
import streamifier from 'streamifier';
import db from 'sqlite';
import Datauri from 'datauri';
import sql from 'squel';
import zippy from 'zippy';
import numeral from 'numeral';
import moment from 'moment-timezone';
import streamBuffers from 'stream-buffers';
import memorystream from 'memorystream';
import hash from 'object-hash';
import csvparsers from './lib/parsers';
import csvscrapers from './lib/scrapers';
import DL from './lib/scrapers/download.js'

var app = new Koa();
var router = new Router();
var upload = multer({
    storage: multer.memoryStorage()
});
var datauri = new Datauri();

var dbmigrate = DBMigrate.getInstance(true);
dbmigrate.up();
db.open(dbmigrate.config.getCurrent().settings.filename, {
    Promise
});

numeral.register('locale', 'de_at', {
    delimiters: {
        thousands: ' ',
        decimal: ','
    },
    abbreviations: {
        thousand: 'k',
        million: 'm',
        billion: 'b',
        trillion: 't'
    },
    ordinal: undefined,
    currency: {
        symbol: '€'
    }
});

var hashRow = function(input) {
    let cloned = {...input };
    delete cloned.file_id;
    delete cloned.order;
    return hash(cloned);
};

router.get('/api/imports', async(ctx, next) => {
    var arr = [];
    var query = ctx.request.query || {};
    var page = parseInt(query.page || 1);
    var sort = query.sort || '';
    var asc = JSON.parse(query.asc || true);
    var account = query.account;
    if (page < 1) page = 1;
    var pageSize = parseInt(query.pageSize || 10);
    var countstmt = sql.select({ autoQuoteTableNames: false, autoQuoteFieldNames: false })
        .from('importdata', 'd')
        .field('count(*)', 'c')
        .left_join('files', 'f', 'f.id = d.file_id')
        .left_join('accounts', 'a', 'a.id = f.account_id');
    var sqlstmt = sql.select({ autoQuoteTableNames: false, autoQuoteFieldNames: false })
        .from('importdata', 'd')
        .field('printf("%.2f", d.amount / 100.0)', 'amount')
        .field('d.text1 || " " || d.text2 || " " || d.text3 || " " || d.text4 || " " || d.text5 || " " || d.text6', 'text')
        .field('strftime("%Y-%m-%d", d.date, "localtime")', 'date')
        .field('strftime("%Y-%m-%d", f.importdate, "localtime")', 'importdate')
        .field('a.name')
        .field('a.id', 'account')
        .left_join('files', 'f', 'f.id = d.file_id')
        .left_join('accounts', 'a', 'a.id = f.account_id')
        .limit(pageSize)
        .offset(pageSize * (page - 1));
    if (typeof sort === 'string' && sort.length > 0) {
        sqlstmt.order(sort, asc);
    }
    if (account && account !== 'all') {
        sqlstmt.where('a.id = ?', account);
        countstmt.where('a.id = ?', account);
    }
    sqlstmt.order('f.importdate', false)
        .order('f.id')
        .order('d."order"');
    var sqlstmtparam = sqlstmt.toParam();
    var countstmtparam = countstmt.toParam();
    //console.log(sqlstmtparam);
    const [total, importdata] = await Promise.all([
        db.get(countstmtparam.text, countstmtparam.values),
        db.all(sqlstmtparam.text, sqlstmtparam.values)
    ]);
    var imports = {
        total: total.c,
        totalPages: Math.ceil(total.c / pageSize),
        offset: pageSize * (page - 1),
        items: importdata
    };
    ctx.body = JSON.stringify(imports);
    return next();
});
router.post('/api/imports', upload.single('csv'), async ctx => {
    let {
        file
    } = ctx.req;
    const [account, args] = await Promise.all([
        db.get('SELECT * FROM accounts WHERE id = ?', ctx.req.body.account),
        db.all('SELECT name, value FROM arguments WHERE account_id = ?', ctx.req.body.account)
    ]);
    var csvparser = csvparsers.find(function(element) {
        return element.id === account.csvparser;
    });
    var scraper = csvscrapers.find(function(element) {
        return element.id === account.scraper;
    });
    if (ctx.req.body.autodownload && scraper) {
        console.log('Start autodownload.');
        let downloader = new DL.PageDownloader();
        var argsmapped = Object.assign({}, ...args.map(item => ({
            [item.name]: item.value
        })));
        argsmapped.filepattern = scraper.filepattern;
        file = await downloader.download(scraper.url, scraper.steps, argsmapped);
    }
    var insertfilestmt = sql.insert()
        .into('files')
        .set('name', file.originalname)
        .set('importdate', moment().format())
        .set('type', file.mimetype)
        .set('content', file.buffer.toString(csvparser.encoding))
        .set('csvparser', csvparser.id)
        .set('account_id', account.id)
        .toParam();
    await db.run(insertfilestmt.text, insertfilestmt.values)
        .then((stmt) => {
            var counter = 0;
            var firstline = true;
            var stream = streamifier.createReadStream(file.buffer, {
                encoding: csvparser.encoding
            });
            var importdataRows = [];
            var csvStream = csv(csvparser.parseOptions)
                .on("data", function(data) {
                    if (!(firstline && csvparser.ignoreFirstLine) || !firstline) {
                        var row = csvparser.parseFunction.apply(csvparser, [data, counter++, stmt.lastID]);
                        row['hash'] = hashRow(row) + '_' + ctx.req.body.account;
                        importdataRows.push(row);
                    }
                    firstline = false;
                })
                .on("end", async() => {
                    if (importdataRows.length > 0) {
                        var insertdatastmt = sql.insert({ autoQuoteTableNames: true, autoQuoteFieldNames: true })
                            .into("importdata")
                            .setFields(importdataRows[0]);
                        importdataRows.forEach(function(row) {
                            insertdatastmt.setFields(row);
                            var insertdatastmtParams = insertdatastmt.toParam();
                            db.run(insertdatastmtParams.text, insertdatastmtParams.values)
                                .catch((err) => {
                                    console.log(err);
                                });
                        });
                    }
                });

            stream.pipe(csvStream);
        });
    ctx.status = 200;
});
router.get('/api/export', async(ctx, next) => {
    var query = ctx.request.query;
    var sqlstmt = sql.select({ autoQuoteTableNames: false, autoQuoteFieldNames: false })
        .from('importdata', 'd')
        .field('strftime("%d/%m/%Y", d.date, "localtime")', 'Date')
        .field('a.defaultpayee', 'Payee')
        .field('""', 'Category')
        .field('d.text1 || " " || d.text2 || " " || d.text3 || " " || d.text4 || " " || d.text5 || " " || d.text6', 'Memo')
        .field('case when amount < 0 then printf("%.2f", amount / -100.0) else "" end', 'Outflow')
        .field('case when amount > 0 then printf("%.2f", amount / 100.0) else "" end', 'Inflow')
        .left_join('files', 'f', 'f.id = d.file_id')
        .left_join('accounts', 'a', 'a.id = f.account_id')
        .order('f.importdate', false)
        .order('f.id')
        .order('d."order"')
        .where('a.id = ?', query.account)
        .where('date(d.date, "localtime") <= date(?)', query.dateto)
        .where('date(d.date, "localtime") >= date(?)', query.datefrom)
        .toParam();

    const [categories] = await Promise.all([
        db.all('SELECT * FROM categories where account_id = ? or account_id = ""', query.account)
    ]);
    await db.all(sqlstmt.text, sqlstmt.values)
        .then(function(result) {
            ctx.set('Content-disposition', 'attachment; filename=export-' + result[0]['Payee'] + '_' + moment().format('YYYY-MM-DD') + '.csv');
            ctx.set('Content-type', 'application/csv');

            result.forEach(row => {
                row['Memo'] = row['Memo'].replace(/(?:(?![\n\r])\s){2,}/g, ' ').trim();
                row.Category = (categories.find(category => {
                    let retval = new RegExp(category.searchinput).test(row.Memo);
                    if (retval && category.amounteval) {
                        console.log(`Found category ${category.category}. Looking for amount ${category.amounteval}`);
                        let evalexp = category.amounteval.replace(/\$a\$/, row.Outflow ||  row.Inflow);
                        retval = eval(evalexp);
                    }
                    return retval;
                }) ||  {}).category ||  '';
            });

            var memStream = new memorystream();
            csv.write(result, { headers: true })
                .pipe(memStream);
            ctx.body = memStream;
        });
});
router.get('/api/banks', async(ctx, next) => {
    const [banks] = await Promise.all([
        db.all('SELECT * FROM banks')
    ]);
    ctx.body = banks;
});
router.get('/api/banks/:id', async(ctx, next) => {
    const [bank] = await Promise.all([
        db.get('SELECT * FROM banks WHERE id = ?', ctx.params.id)
    ]);
    ctx.body = bank;
});
router.post('/api/banks', upload.single('logo'), async ctx => {
    const {
        file
    } = ctx.req;
    const logo = datauri.format(file.originalname, file.buffer);
    await db.run('INSERT INTO banks (name, logo) VALUES (?, ?)',
        ctx.req.body.name, logo.content);
    ctx.status = 200;
});
router.post('/api/banks/:id', upload.single('logo'), async ctx => {
    const {
        file
    } = ctx.req;
    var updatestmt = sql.update()
        .table('banks')
        .set('name', ctx.req.body.name);
    if (file !== undefined) {
        updatestmt.set('logo', datauri.format(file.originalname,
            file.buffer).content);
    }
    updatestmt = updatestmt.where('id = ?', ctx.req.body.id).toParam();
    await db.run(updatestmt.text, updatestmt.values);
    ctx.status = 200;
});
router.get('/api/accounts', async(ctx, next) => {
    const [accounts] = await Promise.all([
        db.all('select a.id, a.name, a.iban, b.name as bank, b.logo, a.csvparser, a.scraper, a.defaultpayee from accounts a left join banks b on a.bank_id = b.id')
    ]);
    ctx.body = accounts;
});
router.get('/api/accounts/:id', async(ctx, next) => {
    if (ctx.params.id === 'new') {
        ctx.body = {
            id: '',
            name: '',
            iban: '',
            bank_id: 0,
            csvparser: '',
            scraper: '',
            defaultpayee: '',
            arguments: {}
        };
    } else {
        const [account, args] = await Promise.all([
            db.get('SELECT * FROM accounts WHERE id = ?', ctx.params.id),
            db.all('SELECT name, value as val FROM arguments WHERE account_id = ?', ctx.params.id)
        ]);
        let scraper = csvscrapers.find(function(element) {
            return element.id === account.scraper;
        });
        if (args.length == 0 && scraper) {
            account.arguments = scraper.requiredarguments.map(function(a) {
                return {
                    name: a,
                    val: ''
                };
            });
        } else {
            account.arguments = args;
        }
        ctx.body = account;
    }
});
router.post('/api/accounts', upload.none(), async ctx => {
    var account = ctx.req.body;
    var insertstmt = sql.insert()
        .into('accounts')
        .set('name', account.name)
        .set('iban', account.iban)
        .set('bank_id', account.bank_id)
        .set('csvparser', account.csvparser)
        .set('scraper', account.scraper)
        .set('defaultpayee', account.defaultpayee)
        .toParam();
    await db.run(insertstmt.text, insertstmt.values);
    for (var a in account.arguments) {
        var insertstmt = sql.insert()
            .into('arguments')
            .set('name', a.name)
            .set('value', a.value)
            .set('account_id', account.id)
            .toParam();
        await db.run(insertstmt.text, insertstmt.values);
    }
    ctx.status = 200;
});
router.post('/api/accounts/:id', upload.none(), async ctx => {
    var account = ctx.req.body;
    var updatestmt = sql.update()
        .table('accounts')
        .set('name', account.name)
        .set('iban', account.iban)
        .set('bank_id', account.bank_id)
        .set('csvparser', account.csvparser)
        .set('scraper', account.scraper)
        .set('defaultpayee', account.defaultpayee)
        .where('id = ?', account.id).toParam();
    await db.run(updatestmt.text, updatestmt.values);
    var deletestmt = sql.delete()
        .from('arguments')
        .where('account_id = ?', account.id)
        .toParam();
    await db.run(deletestmt.text, deletestmt.values);
    for (var a in account.arguments) {
        var insertstmt = sql.insert()
            .into('arguments')
            .set('name', a)
            .set('value', account.arguments[a])
            .set('account_id', account.id)
            .toParam();
        await db.run(insertstmt.text, insertstmt.values);
    }
    ctx.status = 200;
});
router.get('/api/csv', async(ctx, next) => {
    ctx.body = csvparsers.map(function(obj) {
        return {
            id: obj.id,
            name: obj.name
        };
    });
});
router.get('/api/scraper', async(ctx, next) => {
    ctx.body = csvscrapers.map(function(obj) {
        return {
            id: obj.id,
            name: obj.name,
            requiredarguments: obj.requiredarguments.map(function(a) {
                return {
                    name: a,
                    val: ''
                };
            })
        };
    });
});
router.get('/api/csv/:id', async(ctx, next) => {
    if (ctx.params.id === 'new') {
        ctx.body = {
            name: '',
            description: ''
        };
    } else {
        const [csvschema, fields] = await Promise.all([
            db.get('SELECT * FROM csvschema WHERE id = ?', ctx.params.id),
            db.all('SELECT * FROM csvschema_fields WHERE schema_id = ?', ctx.params.id)
        ]);
        ctx.body = csvschema;
        ctx.body.fields = fields
    }
});
router.post('/api/csv', upload.none(), async ctx => {
    var csvschema = ctx.req.body;
    var insertstmt = sql.insert()
        .into('csvschema')
        .set('name', csvschema.name)
        .set('description', csvschema.description);
    console.log(insertstmt.toString());
    insertstmt = insertstmt.toParam();
    console.log(insertstmt);
    await db.run(insertstmt.text, insertstmt.values)
        .then(async(stmt) => {
            var fieldValues = zippy.zipWith(function(name, type, format) {
                return {
                    name: name,
                    type: type,
                    format: format,
                    "schema_id": stmt.lastID
                };
            }, csvschema.fieldname, csvschema.fieldtype, csvschema.fieldformat);
            var insertfieldsstmt = sql.insert()
                .into("csvschema_fields")
                .setFieldsRows(fieldValues)
                .toParam();
            await db.run(insertfieldsstmt.text, insertfieldsstmt.values);
        });
    ctx.status = 200;
});
router.get('/api/categories', async(ctx, next) => {
    const [categories] = await Promise.all([
        db.all('SELECT * FROM categories')
    ]);
    ctx.body = categories;
});
router.get('/api/categories/:id', async(ctx, next) => {
    const [category] = await Promise.all([
        db.get('SELECT * FROM categories WHERE id = ?', ctx.params.id)
    ]);
    ctx.body = category;
});
router.post('/api/categories/:id', upload.none(), async ctx => {
    var category = ctx.req.body;
    var updatestmt = sql.update()
        .table('categories')
        .set('category', category.category)
        .set('searchinput', category.searchinput)
        .set('amounteval', category.amounteval)
        .set('account_id', category.account)
        .where('id = ?', category.id).toParam();
    await db.run(updatestmt.text, updatestmt.values);
    ctx.status = 200;
});
router.del('/api/categories/:id', async(ctx, next) => {
    var deletestatement = sql.delete()
        .from('categories')
        .where('id = ?', ctx.params.id).toParam();
    await db.run(deletestatement.text, deletestatement.values);
    ctx.status = 200;
});
router.post('/api/categories', upload.none(), async ctx => {
    var category = ctx.req.body;
    var insertstmt = sql.insert()
        .into('categories')
        .set('category', category.category)
        .set('searchinput', category.searchinput)
        .set('amounteval', category.amounteval)
        .set('account_id', category.account)
        .toParam();
    await db.run(insertstmt.text, insertstmt.values);
    ctx.status = 200;
});

app
    .use(router.routes())
    .use(router.allowedMethods())
    .use(mount('/', serve('dist/html')))
    .use(mount('/css', serve('dist/css')))
    .use(mount('/js', serve('dist/js')))
    .use(mount('/fonts', serve('dist/fonts')));

app.listen(3000);