class PromiseUtils {

  static delay(time) {
    return new Promise(function(resolve) {
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
    this.browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    this.page = await this.browser.newPage();
    await this.page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './downloads'});
    console.log('Prepared browser and page');
    this.page.on('response', (response) => {
      try {
        let headers = response.headers();
        let contentDisposition = headers['content-disposition'];
        if(contentDisposition) {
          let regex = /attachment;\s?filename=\"([a-zA-Z0-9\-\.\_]+)\"/g;
          let match = regex.exec(contentDisposition);
          if(match) {
            let file = match[1];
            console.log('Found contentDisposition with file: ' + file);
            this.files.push(file);
            this.page.emit('filedownloaded', file);
          }
        }
      } catch(e) {
        console.log('Error while reading headers from ' + response.url());
        console.log(e);
      }
    });
  }

  _prepareSteps() {
    this.steps = [];
  }

  add(arr) {
    this.steps = this.steps.concat(arr);
  }

  async download(starturl, args) {
    var BreakException = {};
    await this._prepareClient();
    console.log('Client prepared');
    let _args = args || {};
    args.starturl = starturl;
    for (let s of this.steps) {
      const ret = await s.execute(this, _args);
      console.log('Step ' + s.name + ' returned with code: ' + ret);
      if(ret === 1) {
        break;
      }
    }
    await this.close();
  }

  async close() {
    console.log('Close browser');
    await this.browser.close();
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
      if(this.options.delaybefore) {
        await PromiseUtils.delay(this.options.delaybefore);
      }
      if(this.options.takescreenshotbefore) {
        await pagedownloader.page.screenshot({ path: 'screenshots/' + this.name + '_before.png' });
      }
      await this.fn.call(this, pagedownloader.browser, pagedownloader.page, args);
      if(this.options.delayafter) {
        await PromiseUtils.delay(this.options.delayafter);
      }
      if(this.options.takescreenshotafter) {
        await pagedownloader.page.screenshot({ path: 'screenshots/' + this.name + '_after.png' });
      }
      console.log('################ Executed step: ' + this.name);
    } catch (e) {
      console.log('Error executing step ' + this.name);
      console.log(e);
      await pagedownloader.page.screenshot({ path: 'screenshots/' + this.name + '_error.png' });
      return 1;
    }
    return 0;
  }
}

async function run(url, steps, args) {

  const downloader = new PageDownloader();

  downloader.add(steps);
  await downloader.download(url, args);
  console.log('Downloaded files: ' + downloader.files);
}

let steps = [new Step('Start',
  async function(browser, page, args) {
    await page.goto(args.starturl);
  }, {
    delaybefore: 0,
    takescreenshotbefore: false
  }),
  new Step('Login', 
  async function(browser, page, args) {
    await page.evaluate(function(username, password) {
      var usernameInput = document.getElementsByName('LoginPortletFormID')[0];
      usernameInput.value = username;
      var passwordInput = document.getElementsByName('LoginPortletFormPassword')[0];
      passwordInput.value = password;
    }, args.username, args.password);
    await page.$eval('form#loginForm', form => form.submit());
  }),
  new Step('Welcomepage', 
  async function(browser, page, args) {
    let flash = await page.waitForSelector('#divOutputTextCustomerName', { visible: true });
    let flashMessage = await flash.getProperty('innerText');
    console.log(await flashMessage.jsonValue());
  }),
  new Step('Chooseaccount',
  async function(browser, page, args) {
    await page.waitForSelector('span[title="' + args.accountnumber + '"]', { visible: true });
    console.log('Span selector visible.');
    await page.$eval('span[title="' + args.accountnumber + '"]', span => span.parentNode.click());
  }),
  new Step('Waitforframe',
  async function(browser, page, args) {
    const accountFrame = await PageUtils.waitForFrame(page, 'Web-Page');
    await PromiseUtils.once(page, 'framenavigated');
    args.frame = accountFrame;
  }),
  new Step('Waitfordownloadlink', 
  async function(browser, page, args) {
    await args.frame.waitForSelector('#generalForm\\:orders', { visible: true });
  }),
  new Step('Clickdownload', 
  async function(browser, page, args) {
    await args.frame.$eval('#generalForm\\:j_id38\\:exporterExcel\\:j_id39\\:j_id44\\:link', a => a.click());
    await PromiseUtils.once(page, 'filedownloaded');
  }),
  new Step('Logout',
  async function(browser, page, args) {
    await page.waitForSelector('#wpt_header_logout > a', { visible: true });
    await page.$eval('#wpt_header_logout > a', a => a.click());
  })];

  let url = 'https://online.bankaustria.at/wps/portal/userlogin';

  let testurl = 'https://www.sympany.ch/de/privatkunden/services/dokumente/dokumente_finden.html';
  let teststeps = [new Step('Start',
  async function(browser, page, args) {
    page.goto(args.starturl);
    await PromiseUtils.once(page, 'filedownloaded');
  }, {
    delaybefore: 0,
    takescreenshotbefore: false
  })];
  
  const args = {
    username: '********',
    password: '********',
    accountnumber: '**************'
  };
run(url, steps, args);
console.log('Program end');
