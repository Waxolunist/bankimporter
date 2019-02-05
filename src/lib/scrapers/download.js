class PromiseUtils {

    static delay(time) {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        });
    }

    static once(emitter, event) {
        return new Promise(resolve => emitter.once(event, resolve));
    }

}

class PageUtils {
    static waitForFrame(p, name) {
        let fulfill;
        const promise = new Promise(x => fulfill = x);
        checkFrame();
        return promise;

        function checkFrame() {
            console.log('checkframe');
            const frame = p.frames().find((f) => {
                return f.name() === name;
            });

            if (frame)
                fulfill(frame);
            else
                p.once('frameattached', checkFrame);
        }
    }
}

class PageDownloader {

    constructor() {
        this.files = [];
        this._prepareSteps();
    }

    async _prepareClient() {
        const puppeteer = require('puppeteer');
        const fs = require('fs');
        const path = require("path");
        var dir = 'screenshots';
        if (!fs.existsSync(dir)) {
            console.log('Create dir ' + path.resolve('screenshots'));
            fs.mkdirSync(dir);
        }
        this.browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: './downloads'
        });
        console.log('Prepared browser and page');
        this.page.on('response', (response) => {
            try {
                let headers = response.headers();
                let contentDisposition = headers['content-disposition'];
                if (contentDisposition) {
                    console.log(contentDisposition);
                    let regex = /attachment;\s?filename\s?=\s?\"?([a-zA-Z0-9\-\.\_]+)\"?/g;
                    let match = regex.exec(contentDisposition);
                    if (match) {
                        let file = match[1];
                        console.log('Found contentDisposition with file: ' + file);
                        this.files.push(file);
                        this.page.emit('filedownloaded', file);
                    }
                }
            } catch (e) {
                console.log('Error while reading headers from ' + response.url());
                console.log(e);
            }
        });
    }

    _prepareSteps() {
        this.steps = [];
    }

    _add(arr) {
        this.steps = this.steps.concat(arr);
    }

    async download(starturl, steps, args) {
        var BreakException = {};
        await this._prepareClient();
        this._add(steps);
        console.log('Client prepared.');
        let _args = args || {};
        _args.starturl = starturl;
        console.log('Arguments: ' + JSON.stringify(_args));
        for (let s of this.steps) {
            const ret = await s.execute(this, _args);
            console.log('Step ' + s.name + ' returned with code: ' + ret);
            if (ret === 1) {
                break;
            }
        }
        await this.close();
        let returnfile = this.files[0];
        if(args.filepattern) {
            returnfile = this.files.filter(f => {
                return args.filepattern.exec(f); 
            })[0];
        }
        return new Promise(resolve => resolve(this._createFileObject(returnfile)));
    }

    async close() {
        console.log('Close browser');
        await this.browser.close();
    }

    _createFileObject(filename) {
        const fs = require('fs');
        const mime = require('mime-types');
        let filepath = 'downloads/' + filename;
        let buffer = fs.readFileSync(filepath);
        let mimetype = mime.lookup(filepath);
        return {
            mimetype: mimetype,
            originalname: filename,
            buffer: buffer
        };
    }
}

class Step {

    constructor(name, fn, options) {
        this.name = name;
        this.fn = fn;
        this.options = options || {};
        let defaultOptions = {
            delaybefore: 1000,
            delayafter: 1000,
            takescreenshotbefore: true,
            takescreenshotafter: true
        };
        this.options = Object.assign(defaultOptions, this.options);
    }

    async execute(pagedownloader, args) {
        try {
            console.log('################ Executing step: ' + this.name);
            if (this.options.delaybefore) {
                await PromiseUtils.delay(this.options.delaybefore);
            }
            if (this.options.takescreenshotbefore) {
                await pagedownloader.page.screenshot({
                    path: 'screenshots/' + this.name + '_before.png'
                });
            }
            await this.fn.call(this, pagedownloader.browser, pagedownloader.page, args);
            if (this.options.delayafter) {
                await PromiseUtils.delay(this.options.delayafter);
            }
            if (this.options.takescreenshotafter) {
                await pagedownloader.page.screenshot({
                    path: 'screenshots/' + this.name + '_after.png'
                });
            }
            console.log('################ Executed step: ' + this.name);
        } catch (e) {
            console.log('Error executing step ' + this.name);
            console.log(e);
            await pagedownloader.page.screenshot({
                path: 'screenshots/' + this.name + '_error.png'
            });
            return 1;
        }
        return 0;
    }
}

module.exports = {Step: Step, PageDownloader: PageDownloader, PageUtils: PageUtils, PromiseUtils: PromiseUtils};
