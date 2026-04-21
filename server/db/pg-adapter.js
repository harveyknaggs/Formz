const { Pool } = require('pg');

let pool;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }
  });
  return pool;
}

function translatePlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function rewriteSqliteIsms(sql) {
  return sql
    .replace(/date\('now',\s*'-(\d+)\s+days?'\)/gi, "(NOW() - INTERVAL '$1 days')")
    .replace(/date\('now'\)/gi, 'CURRENT_DATE');
}

function isInsert(sql) {
  return /^\s*insert\s+into/i.test(sql);
}

function hasReturning(sql) {
  return /\breturning\b/i.test(sql);
}

function createPgAdapter() {
  const p = getPool();

  return {
    prepare(rawSql) {
      const rewritten = rewriteSqliteIsms(rawSql);
      const translated = translatePlaceholders(rewritten);
      const insert = isInsert(rewritten);
      const finalSql = insert && !hasReturning(rewritten)
        ? `${translated} RETURNING id`
        : translated;

      return {
        async run(...params) {
          const result = await p.query(finalSql, params);
          const lastInsertRowid = insert && result.rows[0]?.id != null
            ? result.rows[0].id
            : undefined;
          return { lastInsertRowid, changes: result.rowCount };
        },
        async get(...params) {
          const result = await p.query(finalSql, params);
          return result.rows[0];
        },
        async all(...params) {
          const result = await p.query(finalSql, params);
          return result.rows;
        }
      };
    },
    async exec(sql) {
      await p.query(rewriteSqliteIsms(sql));
    },
    _pool: p
  };
}

module.exports = { createPgAdapter, getPool };
