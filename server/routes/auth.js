const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'formflow-re-default-jwt-secret-change-me';
const router = express.Router();

router.post('/login', (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const agent = db.prepare('SELECT * FROM agents WHERE email = ?').get(email);
  if (!agent) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, agent.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: agent.id, email: agent.email, name: agent.name, is_admin: agent.is_admin || 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, agent: { id: agent.id, email: agent.email, name: agent.name, phone: agent.phone, company: agent.company, is_admin: agent.is_admin || 0 } });
});

// Sign up
router.post('/signup', (req, res) => {
  const db = getDb();
  const { email, password, name, phone, company } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM agents WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO agents (email, password, name, phone, company, is_admin) VALUES (?, ?, ?, ?, ?, ?)').run(email, hash, name, phone || null, company || null, 0);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, name, is_admin: 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, agent: { id: result.lastInsertRowid, email, name, phone: phone || null, company: company || null, is_admin: 0 } });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT id, email, name, phone, company, is_admin, created_at FROM agents WHERE id = ?').get(req.agent.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

router.put('/me', authenticate, (req, res) => {
  const db = getDb();
  const { name, phone, company, currentPassword, newPassword } = req.body;
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, agent.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE agents SET name = ?, phone = ?, company = ?, password = ? WHERE id = ?').run(name || agent.name, phone || agent.phone, company || agent.company, hash, req.agent.id);
  } else {
    db.prepare('UPDATE agents SET name = ?, phone = ?, company = ? WHERE id = ?').run(name || agent.name, phone || agent.phone, company || agent.company, req.agent.id);
  }

  res.json({ message: 'Profile updated' });
});

// Admin: Get all agents
router.get('/admin/agents', authenticate, (req, res) => {
  const db = getDb();
  // Check if requesting user is admin
  const requestor = db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agents = db.prepare(`
    SELECT a.id, a.email, a.name, a.phone, a.company, a.is_admin, a.gmail_email, a.created_at,
      (SELECT COUNT(*) FROM clients WHERE agent_id = a.id) as client_count,
      (SELECT COUNT(*) FROM form_tokens WHERE agent_id = a.id) as forms_sent,
      (SELECT COUNT(*) FROM submissions WHERE agent_id = a.id) as submissions_count
    FROM agents a
    ORDER BY a.created_at DESC
  `).all();

  res.json(agents);
});

// Admin: Delete agent
router.delete('/admin/agents/:id', authenticate, (req, res) => {
  const db = getDb();
  const requestor = db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agentId = parseInt(req.params.id);
  if (agentId === req.agent.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);
  res.json({ message: 'Agent deleted' });
});

// Admin: Toggle admin status
router.put('/admin/agents/:id/toggle-admin', authenticate, (req, res) => {
  const db = getDb();
  const requestor = db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agentId = parseInt(req.params.id);
  const target = db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(agentId);
  if (!target) return res.status(404).json({ error: 'Agent not found' });

  const newStatus = target.is_admin ? 0 : 1;
  db.prepare('UPDATE agents SET is_admin = ? WHERE id = ?').run(newStatus, agentId);
  res.json({ message: `Admin status ${newStatus ? 'granted' : 'revoked'}`, is_admin: newStatus });
});

module.exports = router;
