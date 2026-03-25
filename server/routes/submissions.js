const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateSummary } = require('../services/ai');
const { sendSubmissionNotification, sendConfirmation } = require('../services/email');

const router = express.Router();

// Public: Submit a form
router.post('/public/:token', (req, res) => {
  const db = getDb();
  const tokenRow = db.prepare(`
    SELECT ft.*, c.name as client_name, c.email as client_email,
      a.name as agent_name, a.email as agent_email
    FROM form_tokens ft
    JOIN clients c ON c.id = ft.client_id
    JOIN agents a ON a.id = ft.agent_id
    WHERE ft.token = ?
  `).get(req.params.token);

  if (!tokenRow) return res.status(404).json({ error: 'Form not found' });
  if (tokenRow.status === 'submitted') return res.status(400).json({ error: 'This form has already been submitted' });
  if (new Date(tokenRow.expires_at) < new Date()) return res.status(400).json({ error: 'This form link has expired' });

  const { formData } = req.body;
  if (!formData) return res.status(400).json({ error: 'Form data is required' });

  const result = db.prepare(`
    INSERT INTO submissions (token_id, client_id, agent_id, form_type, form_category, form_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tokenRow.id, tokenRow.client_id, tokenRow.agent_id, tokenRow.form_type, tokenRow.form_category, JSON.stringify(formData));

  db.prepare("UPDATE form_tokens SET status = 'submitted' WHERE id = ?").run(tokenRow.id);

  sendConfirmation({
    to: tokenRow.client_email,
    clientName: tokenRow.client_name,
    formType: tokenRow.form_type
  }).catch(err => console.error('Confirmation email error:', err));

  sendSubmissionNotification({
    to: tokenRow.agent_email,
    agentName: tokenRow.agent_name,
    clientName: tokenRow.client_name,
    formType: tokenRow.form_type,
    formCategory: tokenRow.form_category
  }).catch(err => console.error('Notification email error:', err));

  res.json({ message: 'Form submitted successfully', submission_id: result.lastInsertRowid });
});

// Agent: Dashboard stats — must be before /:id to avoid matching "stats" as an id
router.get('/stats/overview', authenticate, (req, res) => {
  const db = getDb();
  const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE agent_id = ?').get(req.agent.id).count;
  const formsSentMonth = db.prepare("SELECT COUNT(*) as count FROM form_tokens WHERE agent_id = ? AND created_at >= date('now', '-30 days')").get(req.agent.id).count;
  const formsSubmitted = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE agent_id = ?").get(req.agent.id).count;
  const formsPending = db.prepare("SELECT COUNT(*) as count FROM form_tokens WHERE agent_id = ? AND status = 'pending'").get(req.agent.id).count;

  res.json({ totalClients, formsSentMonth, formsSubmitted, formsPending });
});

// Agent: Get all submissions
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { form_type, form_category, status } = req.query;
  let query = `
    SELECT s.*, c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM submissions s
    JOIN clients c ON c.id = s.client_id
    WHERE s.agent_id = ?
  `;
  const params = [req.agent.id];

  if (form_type) { query += ' AND s.form_type = ?'; params.push(form_type); }
  if (form_category) { query += ' AND s.form_category = ?'; params.push(form_category); }
  if (status) { query += ' AND s.status = ?'; params.push(status); }

  query += ' ORDER BY s.submitted_at DESC';
  const submissions = db.prepare(query).all(...params);
  res.json(submissions);
});

// Agent: Get single submission
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const submission = db.prepare(`
    SELECT s.*, c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM submissions s
    JOIN clients c ON c.id = s.client_id
    WHERE s.id = ? AND s.agent_id = ?
  `).get(parseInt(req.params.id), req.agent.id);

  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  submission.form_data = JSON.parse(submission.form_data);
  res.json(submission);
});

// Agent: Generate/regenerate AI summary
router.post('/:id/summary', authenticate, async (req, res) => {
  const db = getDb();
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const formData = JSON.parse(submission.form_data);
  const result = await generateSummary(formData, submission.form_type, submission.form_category);

  db.prepare('UPDATE submissions SET ai_summary = ? WHERE id = ?').run(result.summary, submission.id);
  res.json({ summary: result.summary, generated: result.generated });
});

// Agent: Mark as reviewed
router.put('/:id/review', authenticate, (req, res) => {
  const db = getDb();
  const { notes } = req.body;
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  db.prepare("UPDATE submissions SET status = 'reviewed', agent_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?").run(notes || null, submission.id);
  res.json({ message: 'Marked as reviewed' });
});

module.exports = router;
