const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const UPDATABLE_FIELDS = ['name', 'logo_url', 'primary_color', 'accent_color', 'contact_email', 'contact_phone', 'email_footer'];

router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const row = await db.prepare('SELECT agency_id FROM agents WHERE id = ?').get(req.agent.id);
  if (!row || !row.agency_id) return res.status(404).json({ error: 'No agency' });
  const agency = await db.prepare('SELECT * FROM agencies WHERE id = ?').get(row.agency_id);
  if (!agency) return res.status(404).json({ error: 'No agency' });
  res.json(agency);
});

router.put('/', authenticate, async (req, res) => {
  const db = getDb();

  const requestor = await db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agentRow = await db.prepare('SELECT agency_id FROM agents WHERE id = ?').get(req.agent.id);
  if (!agentRow || !agentRow.agency_id) return res.status(404).json({ error: 'No agency' });
  const agencyId = agentRow.agency_id;

  const body = req.body || {};
  const updates = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') return res.status(400).json({ error: 'name must be a string' });
    const trimmed = body.name.trim();
    if (!trimmed) return res.status(400).json({ error: 'name cannot be empty' });
    if (trimmed.length > 100) return res.status(400).json({ error: 'name must be 100 characters or fewer' });
    updates.name = trimmed;
  }

  if (body.primary_color !== undefined) {
    if (typeof body.primary_color !== 'string' || !HEX_RE.test(body.primary_color)) {
      return res.status(400).json({ error: 'primary_color must be a 6-digit hex like #3b82f6' });
    }
    updates.primary_color = body.primary_color;
  }

  if (body.accent_color !== undefined) {
    if (typeof body.accent_color !== 'string' || !HEX_RE.test(body.accent_color)) {
      return res.status(400).json({ error: 'accent_color must be a 6-digit hex like #1e3a5f' });
    }
    updates.accent_color = body.accent_color;
  }

  for (const field of ['logo_url', 'contact_email', 'contact_phone', 'email_footer']) {
    if (body[field] !== undefined) {
      if (body[field] === null) {
        updates[field] = null;
      } else if (typeof body[field] !== 'string') {
        return res.status(400).json({ error: `${field} must be a string` });
      } else {
        const trimmed = body[field].trim();
        updates[field] = trimmed === '' ? null : trimmed;
      }
    }
  }

  const keys = Object.keys(updates).filter(k => UPDATABLE_FIELDS.includes(k));
  if (keys.length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => updates[k]);
  await db.prepare(`UPDATE agencies SET ${setClause} WHERE id = ?`).run(...values, agencyId);

  const agency = await db.prepare('SELECT * FROM agencies WHERE id = ?').get(agencyId);
  res.json(agency);
});

module.exports = router;
