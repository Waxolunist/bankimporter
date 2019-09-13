# About

This application imports csv exports from your banking account into an sqlite
database and exports the statements into YNAB csv format.
It is possible to keep multiple accounts.

The application is duplicate safe per account, so you can't import the same
bank statement twice.

You can define parsers and web scrapers for auto download.

To start the application run `npm start`.

# Working on the code

## Begin

### Install sqlite3

*Mac:* `brew install sqlite3`

`npm install`

If errors occur during fsevents install execute first: `env TOUCH=/usr/bin/touch npm install fsevents`.

### Install gulp-cli

Install it globally with `npm install -g gulp-cli`

### Puppeteer

If npm install is called, puppeteer may not download chrome. For that execute manually `npm install puppeteer`.

## Development

For server development start `npm run watch` and `gulp watch`, for client side development start `npm run devbuild`.

## Building

`npm run build`

# TODO


- Look through packages, which are still needed
- Update bulma
- see babel / env instead of deprecated package

# Issues

## Common

- Module routing
- Modularization (include.js)
- Caching (ETag, etc.)
- Client side caching?

## Banks

- Pressing cancel reloads list
- File encoding iso8859-1 missing
