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
  db.runSql(`CREATE INDEX IF NOT EXISTS "importdata_all" ON "importdata" (
    "file_id",
    "amount",
    "text1",
    "text2",
    "text3",
    "text4",
    "text5",
    "text6",
    "date",
    "order"
  );`, callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
