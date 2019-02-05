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
  db.createTable('csvschema', {
    id: { type: 'int', primaryKey: true, autoIncrement: true, notNull: true, unique: true },
    name: { type: 'string', notNull: true },
    description: { type: 'string', notNull: true }
  }, callback);
  db.runSql('CREATE TABLE  "csvschema_fields" ' +
            '("id" INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, ' +
              '"schema_id" INTEGER  NOT NULL, ' +
              '"name" VARCHAR  NOT NULL, ' +
              '"type" VARCHAR  NOT NULL, ' +
              '"format" VARCHAR, ' +
              'FOREIGN KEY (schema_id) REFERENCES csvschema(id) ON DELETE CASCADE' +
              '  )', callback);
};

exports.down = function(db, callback) {
  db.dropTable('csvschema_fields', callback);
  db.dropTable('csvschema', callback);
};

exports._meta = {
  "version": 1
};
