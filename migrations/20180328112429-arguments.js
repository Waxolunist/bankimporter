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
  db.runSql('CREATE TABLE  "arguments" ' +
            '("id" INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, ' +
              '"name" VARCHAR  NOT NULL, ' +
              '"value" VARCHAR  NOT NULL, ' +
              '"account_id" INTEGEER NOT NULL, ' +
              'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE' +
              '  )', callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
