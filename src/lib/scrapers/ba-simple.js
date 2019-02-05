const DL = require('./download.js');

module.exports = {
    id: 'BA-simple',
    name: 'Bank Austria (giro)',
    expectedmimetype: 'text/csv',
    url: 'https://online.bankaustria.at/wps/portal/userlogin',
    filepattern: /IKS-\d{29}\.csv/g,
    steps: [new DL.Step('Start',
        async function(browser, page, args) {
            await page.goto(args.starturl);
        }, {
            delaybefore: 0,
            takescreenshotbefore: false
        }),
        new DL.Step('Login', 
        async function(browser, page, args) {
            await page.evaluate(function(username, password) {
            var usernameInput = document.getElementsByName('LoginPortletFormID')[0];
            usernameInput.value = username;
            var passwordInput = document.getElementsByName('LoginPortletFormPassword')[0];
            passwordInput.value = password;
            }, args.username, args.password);
            await page.$eval('form#loginForm', form => form.submit());
        }),
        new DL.Step('Banking',
        async function(browser, page, args) {
            await page.waitForSelector('#wpt_tabs div:nth-child(2) > a', { visible: true });
            await page.$eval('#wpt_tabs div:nth-child(2) > a', a => a.click());
        }),
        /*
        new DL.Step('Welcomepage', 
        async function(browser, page, args) {
            let flash = await page.waitForSelector('#divOutputTextCustomerName', { visible: true });
            let flashMessage = await flash.getProperty('innerText');
            console.log(await flashMessage.jsonValue());
        }),
        */
        new DL.Step('Chooseaccount',
        async function(browser, page, args) {
            await page.waitForSelector('span[title="' + args.accountnumber + '"]', { visible: true });
            console.log('Span selector visible.');
            await page.$eval('span[title="' + args.accountnumber + '"]', span => span.parentNode.click());
        }),
        new DL.Step('Waitforframe',
        async function(browser, page, args) {
            const accountFrame = await DL.PageUtils.waitForFrame(page, 'Web-Page');
            await DL.PromiseUtils.once(page, 'framenavigated');
            args.frame = accountFrame;
        }),
        new DL.Step('Waitfordownloadlink', 
        async function(browser, page, args) {
            await args.frame.waitForSelector('#generalForm\\:orders', { visible: true });
        }),
        new DL.Step('Clickdownload', 
        async function(browser, page, args) {
            args.frame.$eval('#generalForm\\:j_id38\\:exporterExcel\\:j_id39\\:j_id44\\:link', a => a.click());
            await DL.PromiseUtils.once(page, 'filedownloaded');
        }),
        new DL.Step('Logout',
        async function(browser, page, args) {
            await page.waitForSelector('#wpt_header_logout > a', { visible: true });
            await page.$eval('#wpt_header_logout > a', a => a.click());
        })
    ],
    requiredarguments: ['username', 'password', 'accountnumber']
};