const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'formflow.db');
let db;

// sql.js wrapper to match better-sqlite3-like API
function createWrapper(database) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          database.run(sql, params);
          const lastId = database.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
          save();
          return { lastInsertRowid: lastId, changes: database.getRowsModified() };
        },
        get(...params) {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
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
    exec(sql) {
      database.exec(sql);
      save();
    }
  };
}

function save() {
  if (db && db._db) {
    const data = db._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

async function init() {
  const SQL = await initSqlJs();

  let database;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  const wrapper = createWrapper(database);
  wrapper._db = database;
  db = wrapper;

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS form_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      form_type TEXT NOT NULL,
      form_category TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      form_type TEXT NOT NULL,
      form_category TEXT NOT NULL,
      form_data TEXT NOT NULL,
      ai_summary TEXT,
      agent_notes TEXT,
      status TEXT DEFAULT 'submitted',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      FOREIGN KEY (token_id) REFERENCES form_tokens(id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
  save();

  // Seed default agent if none exists
  const stmt = database.prepare("SELECT COUNT(*) as count FROM agents");
  stmt.step();
  const count = stmt.get()[0];
  stmt.free();

  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    database.run('INSERT INTO agents (email, password, name, phone) VALUES (?, ?, ?, ?)', [
      'agent@hometownrealty.co.nz',
      hash,
      'John Mitchell',
      '+64 21 555 0100'
    ]);
    save();
    console.log('Default agent created: agent@hometownrealty.co.nz / admin123');
  }

  return wrapper;
}

function getDb() {
  return db;
}

module.exports = { init, getDb };
