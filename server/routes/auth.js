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
    { id: agent.id, email: agent.email, name: agent.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, agent: { id: agent.id, email: agent.email, name: agent.name, phone: agent.phone } });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT id, email, name, phone, created_at FROM agents WHERE id = ?').get(req.agent.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

router.put('/me', authenticate, (req, res) => {
  const db = getDb();
  const { name, phone, currentPassword, newPassword } = req.body;
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, agent.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE agents SET name = ?, phone = ?, password = ? WHERE id = ?').run(name || agent.name, phone || agent.phone, hash, req.agent.id);
  } else {
    db.prepare('UPDATE agents SET name = ?, phone = ? WHERE id = ?').run(name || agent.name, phone || agent.phone, req.agent.id);
  }

  res.json({ message: 'Profile updated' });
});

module.exports = router;
