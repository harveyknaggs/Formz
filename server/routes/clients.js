const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const clients = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM form_tokens WHERE client_id = c.id) as forms_sent,
      (SELECT COUNT(*) FROM submissions WHERE client_id = c.id) as forms_submitted
    FROM clients c
    WHERE c.agent_id = ?
    ORDER BY c.created_at DESC
  `).all(req.agent.id);
  res.json(clients);
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const forms = db.prepare(`
    SELECT ft.*, s.id as submission_id, s.status as submission_status, s.submitted_at
    FROM form_tokens ft
    LEFT JOIN submissions s ON s.token_id = ft.id
    WHERE ft.client_id = ? AND ft.agent_id = ?
    ORDER BY ft.created_at DESC
  `).all(parseInt(req.params.id), req.agent.id);

  res.json({ ...client, forms });
});

router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const result = db.prepare('INSERT INTO clients (agent_id, name, email, phone) VALUES (?, ?, ?, ?)').run(req.agent.id, name, email, phone || null);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDb();
  const { name, email, phone } = req.body;
  const existing = db.prepare('SELECT * FROM clients WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  db.prepare('UPDATE clients SET name = ?, email = ?, phone = ? WHERE id = ?').run(
    name || existing.name, email || existing.email, phone ?? existing.phone, parseInt(req.params.id)
  );
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(parseInt(req.params.id));
  res.json(client);
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM clients WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  db.prepare('DELETE FROM clients WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Client deleted' });
});

module.exports = router;
