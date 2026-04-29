const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { isValidEmail } = require('../utils/validators');
const { uploadAgentPhoto } = require('../middleware/upload');
const { processAgentPhoto, removeAgentPhoto } = require('../services/agentPhotoPipeline');

const JWT_SECRET = process.env.JWT_SECRET || 'formflow-re-default-jwt-secret-change-me';
const router = express.Router();

router.post('/login', async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const agent = await db.prepare('SELECT * FROM agents WHERE email = ?').get(email);
  if (!agent) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, agent.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: agent.id, email: agent.email, name: agent.name, is_admin: agent.is_admin || 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const agency = agent.agency_id
    ? await db.prepare('SELECT id, name, logo_url, primary_color, accent_color, contact_email, contact_phone, email_footer FROM agencies WHERE id = ?').get(agent.agency_id)
    : null;

  res.json({ token, agent: { id: agent.id, email: agent.email, name: agent.name, phone: agent.phone, company: agent.company, photo_url: agent.photo_url || null, bio: agent.bio || null, is_admin: agent.is_admin || 0, agency_id: agent.agency_id || null }, agency });
});

router.post('/signup', async (req, res) => {
  const db = getDb();
  const { email, password, name, phone, company } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await db.prepare('SELECT id FROM agents WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const seedAgency = await db.prepare('SELECT id FROM agencies ORDER BY id ASC LIMIT 1').get();
  const seedAgencyId = seedAgency ? seedAgency.id : null;
  const result = await db.prepare('INSERT INTO agents (email, password, name, phone, company, is_admin, agency_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(email, hash, name, phone || null, company || null, 0, seedAgencyId);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, name, is_admin: 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const agency = seedAgencyId
    ? await db.prepare('SELECT id, name, logo_url, primary_color, accent_color, contact_email, contact_phone, email_footer FROM agencies WHERE id = ?').get(seedAgencyId)
    : null;

  res.json({ token, agent: { id: result.lastInsertRowid, email, name, phone: phone || null, company: company || null, is_admin: 0, agency_id: seedAgencyId }, agency });
});

router.get('/me', authenticate, async (req, res) => {
  const db = getDb();
  const agent = await db.prepare('SELECT id, email, name, phone, company, photo_url, bio, is_admin, gmail_email, agency_id, created_at FROM agents WHERE id = ?').get(req.agent.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const agency = agent.agency_id
    ? await db.prepare('SELECT id, name, logo_url, primary_color, accent_color, contact_email, contact_phone, email_footer FROM agencies WHERE id = ?').get(agent.agency_id)
    : null;
  res.json({ ...agent, agency });
});

router.put('/me', authenticate, async (req, res) => {
  const db = getDb();
  const { name, phone, company, bio, currentPassword, newPassword } = req.body;
  const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').get(req.agent.id);

  const nextBio = bio === undefined ? agent.bio : (typeof bio === 'string' ? bio.trim().slice(0, 5000) || null : null);

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, agent.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE agents SET name = ?, phone = ?, company = ?, bio = ?, password = ? WHERE id = ?').run(name || agent.name, phone || agent.phone, company || agent.company, nextBio, hash, req.agent.id);
  } else {
    await db.prepare('UPDATE agents SET name = ?, phone = ?, company = ?, bio = ? WHERE id = ?').run(name || agent.name, phone || agent.phone, company || agent.company, nextBio, req.agent.id);
  }

  res.json({ message: 'Profile updated' });
});

router.post('/me/photo', authenticate, (req, res) => {
  uploadAgentPhoto.single('photo')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Photo must be 8 MB or less' });
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) return res.status(400).json({ error: 'No photo provided' });

    const db = getDb();
    try {
      const agent = await db.prepare('SELECT photo_url FROM agents WHERE id = ?').get(req.agent.id);
      const result = await processAgentPhoto(req.file.buffer, { agentId: req.agent.id });
      await db.prepare('UPDATE agents SET photo_url = ? WHERE id = ?').run(result.url, req.agent.id);
      if (agent?.photo_url && agent.photo_url !== result.url) {
        removeAgentPhoto(agent.photo_url);
      }
      res.json({ photo_url: result.url });
    } catch (e) {
      console.error('[auth] photo upload failed', e);
      res.status(500).json({ error: 'Failed to process photo' });
    }
  });
});

router.delete('/me/photo', authenticate, async (req, res) => {
  const db = getDb();
  const agent = await db.prepare('SELECT photo_url FROM agents WHERE id = ?').get(req.agent.id);
  if (agent?.photo_url) removeAgentPhoto(agent.photo_url);
  await db.prepare('UPDATE agents SET photo_url = NULL WHERE id = ?').run(req.agent.id);
  res.json({ photo_url: null });
});

router.get('/admin/agents', authenticate, async (req, res) => {
  const db = getDb();
  const requestor = await db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agents = await db.prepare(`
    SELECT a.id, a.email, a.name, a.phone, a.company, a.photo_url, a.is_admin, a.gmail_email, a.agency_id, a.created_at,
      (SELECT COUNT(*) FROM clients WHERE agent_id = a.id) as client_count,
      (SELECT COUNT(*) FROM form_tokens WHERE agent_id = a.id) as forms_sent,
      (SELECT COUNT(*) FROM submissions WHERE agent_id = a.id) as submissions_count
    FROM agents a
    ORDER BY a.created_at DESC
  `).all();

  res.json(agents);
});

router.delete('/admin/agents/:id', authenticate, async (req, res) => {
  const db = getDb();
  const requestor = await db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agentId = parseInt(req.params.id);
  if (agentId === req.agent.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  await db.prepare('DELETE FROM e_signatures WHERE submission_id IN (SELECT id FROM submissions WHERE agent_id = ?)').run(agentId);
  await db.prepare('DELETE FROM submissions WHERE agent_id = ?').run(agentId);
  await db.prepare('DELETE FROM form_tokens WHERE agent_id = ?').run(agentId);
  await db.prepare('DELETE FROM clients WHERE agent_id = ?').run(agentId);
  await db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);
  res.json({ message: 'Agent and all their data deleted' });
});

router.put('/admin/agents/:id/toggle-admin', authenticate, async (req, res) => {
  const db = getDb();
  const requestor = await db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(req.agent.id);
  if (!requestor?.is_admin) return res.status(403).json({ error: 'Admin access required' });

  const agentId = parseInt(req.params.id);
  if (agentId === req.agent.id) return res.status(400).json({ error: 'You cannot change your own admin status' });
  const target = await db.prepare('SELECT is_admin FROM agents WHERE id = ?').get(agentId);
  if (!target) return res.status(404).json({ error: 'Agent not found' });

  const newStatus = target.is_admin ? 0 : 1;
  await db.prepare('UPDATE agents SET is_admin = ? WHERE id = ?').run(newStatus, agentId);
  res.json({ message: `Admin status ${newStatus ? 'granted' : 'revoked'}`, is_admin: newStatus });
});

module.exports = router;
