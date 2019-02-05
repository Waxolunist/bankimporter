'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  db.runSql('CREATE TABLE  "accounts" ' +
            '("id" INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, ' +
              '"name" VARCHAR  NOT NULL, ' +
              '"iban" VARCHAR  NOT NULL, ' +
              '"bank_id" INTEGEER NOT NULL, ' +
              '"csvparser" VARCHAR  NOT NULL, ' +
              'FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE' +
              '  )', callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
