const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateSummary } = require('../services/ai');
const { sendSubmissionNotification, sendConfirmation } = require('../services/email');

const router = express.Router();

function deriveSignerRole(label) {
  if (!label) return null;
  const lower = String(label).toLowerCase();
  if (lower.includes('vendor')) return 'vendor';
  if (lower.includes('buyer') || lower.includes('purchaser')) return 'buyer';
  if (lower.includes('agent')) return 'agent';
  return label;
}

router.post('/public/:token', async (req, res) => {
  const db = getDb();
  const tokenRow = await db.prepare(`
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

  const serializedFormData = JSON.stringify(formData);
  const result = await db.prepare(`
    INSERT INTO submissions (token_id, client_id, agent_id, form_type, form_category, form_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tokenRow.id, tokenRow.client_id, tokenRow.agent_id, tokenRow.form_type, tokenRow.form_category, serializedFormData);

  // E-signature audit trail (NZ ETA 2002)
  try {
    const submissionId = result.lastInsertRowid;
    const dataHash = crypto.createHash('sha256').update(serializedFormData).digest('hex');
    const signerIp = req.ip || null;
    const signerUa = req.get('User-Agent') || null;

    const insertSig = db.prepare(`
      INSERT INTO e_signatures (
        submission_id, signer_name, signer_role, signer_ip, signer_ua,
        data_hash, signature_png, client_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const key of Object.keys(formData)) {
      if (!key.startsWith('sig_')) continue;
      const label = key.slice(4);
      const signaturePng = formData[key];
      if (!signaturePng) continue;
      const signerName = formData['name_' + label] || null;
      const clientTimestamp = formData['ts_' + label] || null;
      const signerRole = deriveSignerRole(label);
      await insertSig.run(
        submissionId, signerName, signerRole, signerIp, signerUa,
        dataHash, signaturePng, clientTimestamp
      );
    }
  } catch (err) {
    console.error('E-signature audit capture error:', err);
  }

  await db.prepare("UPDATE form_tokens SET status = 'submitted' WHERE id = ?").run(tokenRow.id);

  sendConfirmation({
    to: tokenRow.client_email,
    clientName: tokenRow.client_name,
    formType: tokenRow.form_type,
    agentId: tokenRow.agent_id
  }).catch(err => console.error('Confirmation email error:', err));

  sendSubmissionNotification({
    to: tokenRow.agent_email,
    agentName: tokenRow.agent_name,
    clientName: tokenRow.client_name,
    formType: tokenRow.form_type,
    formCategory: tokenRow.form_category,
    agentId: tokenRow.agent_id
  }).catch(err => console.error('Notification email error:', err));

  res.json({ message: 'Form submitted successfully', submission_id: result.lastInsertRowid });
});

router.get('/stats/overview', authenticate, async (req, res) => {
  const db = getDb();
  const totalClients = (await db.prepare('SELECT COUNT(*) as count FROM clients WHERE agent_id = ?').get(req.agent.id)).count;
  const formsSentMonth = (await db.prepare("SELECT COUNT(*) as count FROM form_tokens WHERE agent_id = ? AND created_at >= date('now', '-30 days')").get(req.agent.id)).count;
  const formsSubmitted = (await db.prepare("SELECT COUNT(*) as count FROM submissions WHERE agent_id = ?").get(req.agent.id)).count;
  const formsPending = (await db.prepare("SELECT COUNT(*) as count FROM form_tokens WHERE agent_id = ? AND status = 'pending'").get(req.agent.id)).count;

  res.json({
    totalClients: Number(totalClients),
    formsSentMonth: Number(formsSentMonth),
    formsSubmitted: Number(formsSubmitted),
    formsPending: Number(formsPending)
  });
});

router.get('/', authenticate, async (req, res) => {
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
  const submissions = await db.prepare(query).all(...params);
  res.json(submissions);
});

router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const submission = await db.prepare(`
    SELECT s.*, c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM submissions s
    JOIN clients c ON c.id = s.client_id
    WHERE s.id = ? AND s.agent_id = ?
  `).get(parseInt(req.params.id), req.agent.id);

  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  submission.form_data = JSON.parse(submission.form_data);
  const signatures = await db.prepare('SELECT * FROM e_signatures WHERE submission_id = ? ORDER BY signed_at').all(submission.id);
  submission.signatures = signatures;
  res.json(submission);
});

router.post('/:id/summary', authenticate, async (req, res) => {
  const db = getDb();
  const submission = await db.prepare('SELECT * FROM submissions WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const formData = JSON.parse(submission.form_data);
  const result = await generateSummary(formData, submission.form_type, submission.form_category);

  await db.prepare('UPDATE submissions SET ai_summary = ? WHERE id = ?').run(result.summary, submission.id);
  res.json({ summary: result.summary, generated: result.generated });
});

router.put('/:id/review', authenticate, async (req, res) => {
  const db = getDb();
  const { notes } = req.body;
  const submission = await db.prepare('SELECT * FROM submissions WHERE id = ? AND agent_id = ?').get(parseInt(req.params.id), req.agent.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  await db.prepare("UPDATE submissions SET status = 'reviewed', agent_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?").run(notes || null, submission.id);
  res.json({ message: 'Marked as reviewed' });
});

module.exports = router;
