const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendFormLink } = require('../services/email');

const router = express.Router();

const FORM_TYPES = {
  vendor: ['market_appraisal', 'vendor_disclosure', 'agency_agreement'],
  buyer: ['purchaser_acknowledgement', 'sale_purchase_agreement']
};

router.post('/send', authenticate, (req, res) => {
  const db = getDb();
  const { client_id, form_category, form_types } = req.body;
  if (!client_id || !form_category || !form_types?.length) {
    return res.status(400).json({ error: 'client_id, form_category, and form_types are required' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND agent_id = ?').get(client_id, req.agent.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const validTypes = FORM_TYPES[form_category];
  if (!validTypes) return res.status(400).json({ error: 'Invalid form category' });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const tokens = [];

  for (const formType of form_types) {
    if (!validTypes.includes(formType)) continue;
    const token = uuidv4();
    db.prepare('INSERT INTO form_tokens (token, client_id, agent_id, form_type, form_category, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(token, client_id, req.agent.id, formType, form_category, expiresAt);
    tokens.push({ token, formType, form_category });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  for (const t of tokens) {
    sendFormLink({
      to: client.email,
      clientName: client.name,
      agentName: req.agent.name,
      formType: t.formType,
      formCategory: t.form_category,
      link: `${appUrl}/form/${t.token}`
    }).catch(err => console.error('Email send error:', err));
  }

  res.json({ message: `${tokens.length} form(s) sent successfully`, tokens });
});

router.get('/sent', authenticate, (req, res) => {
  const db = getDb();
  const forms = db.prepare(`
    SELECT ft.*, c.name as client_name, c.email as client_email,
      s.id as submission_id, s.status as submission_status, s.submitted_at
    FROM form_tokens ft
    JOIN clients c ON c.id = ft.client_id
    LEFT JOIN submissions s ON s.token_id = ft.id
    WHERE ft.agent_id = ?
    ORDER BY ft.created_at DESC
  `).all(req.agent.id);
  res.json(forms);
});

router.get('/public/:token', (req, res) => {
  const db = getDb();
  const token = db.prepare(`
    SELECT ft.*, c.name as client_name, c.email as client_email, a.name as agent_name
    FROM form_tokens ft
    JOIN clients c ON c.id = ft.client_id
    JOIN agents a ON a.id = ft.agent_id
    WHERE ft.token = ?
  `).get(req.params.token);

  if (!token) return res.status(404).json({ error: 'Form not found' });
  if (token.status === 'submitted') return res.status(400).json({ error: 'This form has already been submitted' });
  if (new Date(token.expires_at) < new Date()) return res.status(400).json({ error: 'This form link has expired' });

  res.json({
    token: token.token,
    form_type: token.form_type,
    form_category: token.form_category,
    client_name: token.client_name,
    client_email: token.client_email,
    agent_name: token.agent_name
  });
});

module.exports = router;
