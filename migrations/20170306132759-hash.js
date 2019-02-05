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
    db.runSql('ALTER TABLE importdata ADD hash VARCHAR NOT NULL DEFAULT "";', callback);
    db.runSql('CREATE UNIQUE INDEX IF NOT EXISTS HashUniqueIndex ON importdata (hash) WHERE hash is not "";', callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
