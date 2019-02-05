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

exports.up = function(db) {
  return db.createTable('files', {
    id: { type: 'int', primaryKey: true, autoIncrement:true, notNull: true, unique: true },
    name: { type: 'string', notNull: true },
    importdate: { type: 'datetime', notNull: true },
    type: { type: 'string', notNull: true },
    content: { type: 'blob', notNull: true }
  });
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
