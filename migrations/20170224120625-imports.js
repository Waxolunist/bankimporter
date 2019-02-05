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
  db.runSql('CREATE TABLE  "importdata" ' +
            '("id" INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, ' +
              '"file_id" INTEGER  NOT NULL, ' +
              '"order" INTEGER  NOT NULL, ' +
              '"date" DATE NOT NULL, ' +
              '"text1" VARCHAR, ' +
              '"text2" VARCHAR, ' +
              '"text3" VARCHAR, ' +
              '"text4" VARCHAR, ' +
              '"text5" VARCHAR, ' +
              '"text6" VARCHAR, ' +
              '"amount" INTEGER  NOT NULL, ' +
              '"currency" VARCHAR  NOT NULL, ' +
              '"sourcename" VARCHAR, ' +
              '"sourceaccount" VARCHAR, ' +
              '"sourcebank" VARCHAR, ' +
              '"destname" VARCHAR, ' +
              '"destaccount" VARCHAR, ' +
              '"destbank" VARCHAR, ' +
              'FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE' +
              '  )', callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
