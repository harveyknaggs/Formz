const path = require('path');
const bcrypt = require('bcryptjs');

let db;
let backend;

async function runPgMigrations() {
  const knex = require('knex')(require('./db/knexfile'));
  try {
    await knex.migrate.latest();
    console.log('[DB] Postgres migrations applied');
  } finally {
    await knex.destroy();
  }
}

async function countRows(table) {
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
  return Number(row.count);
}

async function seed() {
  let seedAgencyId;
  if ((await countRows('agencies')) === 0) {
    const r = await db.prepare('INSERT INTO agencies (name) VALUES (?)').run('Formz');
    seedAgencyId = r.lastInsertRowid;
    console.log('[DB] Default agency created: Formz');
  } else {
    seedAgencyId = (await db.prepare('SELECT id FROM agencies ORDER BY id ASC LIMIT 1').get()).id;
  }

  await db.prepare('UPDATE agents SET agency_id = ? WHERE agency_id IS NULL').run(seedAgencyId);

  if ((await countRows('agents')) === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.prepare(
      'INSERT INTO agents (email, password, name, phone, is_admin, agency_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('agent@hometownrealty.co.nz', hash, 'John Mitchell', '+64 21 555 0100', 1, seedAgencyId);
    console.log('[DB] Default admin created: agent@hometownrealty.co.nz / admin123');
  }
}

async function init() {
  if (process.env.DATABASE_URL) {
    backend = 'pg';
    await runPgMigrations();
    const { createPgAdapter } = require('./db/pg-adapter');
    db = createPgAdapter();
    console.log('[DB] Using Postgres backend');
  } else {
    backend = 'sqlite';
    const { createSqliteAdapter } = require('./db/sqlite-adapter');
    db = await createSqliteAdapter();
    await applySqliteSchema();
    console.log('[DB] Using SQLite backend (DATABASE_URL not set)');
  }

  await seed();
  return db;
}

async function applySqliteSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS agencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#3b82f6',
      accent_color TEXT DEFAULT '#1e3a5f',
      contact_email TEXT,
      contact_phone TEXT,
      email_footer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      gmail_tokens TEXT,
      gmail_email TEXT,
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
    CREATE TABLE IF NOT EXISTS e_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      signer_name TEXT,
      signer_role TEXT,
      signer_ip TEXT,
      signer_ua TEXT,
      data_hash TEXT NOT NULL,
      signature_png TEXT NOT NULL,
      client_timestamp TEXT,
      signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      suburb TEXT,
      city TEXT,
      description TEXT,
      asking_price TEXT,
      bedrooms INTEGER,
      bathrooms INTEGER,
      floor_area INTEGER,
      land_area INTEGER,
      status TEXT DEFAULT 'active',
      hero_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
    CREATE TABLE IF NOT EXISTS property_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );
    CREATE TABLE IF NOT EXISTS property_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);

  for (const sql of [
    'ALTER TABLE agents ADD COLUMN gmail_tokens TEXT',
    'ALTER TABLE agents ADD COLUMN gmail_email TEXT',
    'ALTER TABLE agents ADD COLUMN is_admin INTEGER DEFAULT 0',
    'ALTER TABLE agents ADD COLUMN company TEXT',
    'ALTER TABLE agents ADD COLUMN agency_id INTEGER'
  ]) {
    try { await db.exec(sql); } catch {}
  }
}

function getDb() {
  return db;
}

function getBackend() {
  return backend;
}

module.exports = { init, getDb, getBackend };
