const DL = require('./download.js');

module.exports = {
    id: 'rendity',
    name: 'Rendity',
    expectedmimetype: 'text/csv',
    url: 'https://rendity.com/dashboard/login',
    filepattern: /Invoice_\d{10}.csv/g,
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
            var usernameInput = document.getElementsByName('user_name')[0];
            usernameInput.value = username;
            var passwordInput = document.getElementsByName('user_password')[0];
            passwordInput.value = password;
            }, args.username, args.password);
            await page.$eval('form', form => form.submit());
        }),
        new DL.Step('Wallet',
        async function(browser, page, args) {
            await page.goto('https://rendity.com/dashboard/wallet');
        }),
        new DL.Step('Opendownload', 
        async function(browser, page, args) {
            await page.waitForSelector('#export-container', { visible: true });
            await page.$eval('#dropdown-export-opts a[rel="all"]', a => a.click());
        }),
        new DL.Step('Download', 
        async function(browser, page, args) {
            page.evaluate('exportNow("csv")');
            await DL.PromiseUtils.once(page, 'filedownloaded');
        }),
        new DL.Step('Logout',
        async function(browser, page, args) {
            await page.goto('https://rendity.com/dashboard/login/logout');
        })
    ],
    requiredarguments: ['username', 'password']
};