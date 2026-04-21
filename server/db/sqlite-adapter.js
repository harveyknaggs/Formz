const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'formflow.db');

let database;

function save() {
  if (!database) return;
  const data = database.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

async function createSqliteAdapter() {
  const SQL = await initSqlJs();
  database = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  const adapter = {
    prepare(sql) {
      return {
        async run(...params) {
          database.run(sql, params);
          const lastId = database.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0];
          save();
          return { lastInsertRowid: lastId, changes: database.getRowsModified() };
        },
        async get(...params) {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          let row;
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
          }
          stmt.free();
          return row;
        },
        async all(...params) {
          const results = [];
          const stmt = database.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            results.push(row);
          }
          stmt.free();
          return results;
        }
      };
    },
    async exec(sql) {
      database.exec(sql);
      save();
    },
    _db: database
  };

  return adapter;
}

module.exports = { createSqliteAdapter };
