const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendFormLink } = require('../services/email');

const router = express.Router();

const FORM_TYPES = {
  vendor: ['market_appraisal', 'vendor_disclosure', 'agency_agreement'],
  buyer: ['purchaser_acknowledgement', 'sale_purchase_agreement']
};

// Send forms — now sends a single link per category (buyer or vendor)
router.post('/send', authenticate, (req, res) => {
  const db = getDb();
  const { client_id, form_category } = req.body;
  if (!client_id || !form_category) {
    return res.status(400).json({ error: 'client_id and form_category are required' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND agent_id = ?').get(client_id, req.agent.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const validTypes = FORM_TYPES[form_category];
  if (!validTypes) return res.status(400).json({ error: 'Invalid form category. Must be "buyer" or "vendor".' });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const token = uuidv4();

  // Create a single token for the entire form category
  const formType = form_category === 'vendor' ? 'vendor_forms' : 'buyer_forms';
  db.prepare('INSERT INTO form_tokens (token, client_id, agent_id, form_type, form_category, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(token, client_id, req.agent.id, formType, form_category, expiresAt);

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const link = `${appUrl}/form/${token}`;

  sendFormLink({
    to: client.email,
    clientName: client.name,
    agentName: req.agent.name,
    formType: formType,
    formCategory: form_category,
    link,
    agentId: req.agent.id
  }).catch(err => console.error('Email send error:', err));

  res.json({ message: `${form_category} forms sent successfully`, token, link });
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

// Serve raw HTML form with injected submission logic
router.get('/html/:token', (req, res) => {
  const db = getDb();
  const tokenRow = db.prepare(`
    SELECT ft.*, c.name as client_name, c.email as client_email, a.name as agent_name
    FROM form_tokens ft
    JOIN clients c ON c.id = ft.client_id
    JOIN agents a ON a.id = ft.agent_id
    WHERE ft.token = ?
  `).get(req.params.token);

  if (!tokenRow) return res.status(404).send('<h1>Form not found</h1>');
  if (tokenRow.status === 'submitted') return res.status(400).send('<h1>This form has already been submitted</h1>');
  if (new Date(tokenRow.expires_at) < new Date()) return res.status(400).send('<h1>This form link has expired</h1>');

  const formFile = tokenRow.form_category === 'vendor' ? 'vendor_forms.html' : 'buyer_forms.html';
  const htmlPath = path.join(__dirname, '..', 'public', 'forms', formFile);

  if (!fs.existsSync(htmlPath)) {
    return res.status(500).send('<h1>Form template not found</h1>');
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Inject submission script before </body>
  const injectedScript = `
<script>
// Override the existing submitForm function to POST data to the API
window._originalSubmitForm = window.submitForm;
window.submitForm = async function(formId) {
  // Gather all form data from the page
  const formData = {};

  // Collect all input fields
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="date"], input[type="number"], textarea, select').forEach(el => {
    const label = el.closest('.field-group')?.querySelector('label')?.textContent?.trim() || el.name || el.id || '';
    if (label && el.value) {
      formData[label] = el.value;
    }
  });

  // Collect radio buttons
  document.querySelectorAll('input[type="radio"]:checked').forEach(el => {
    const group = el.closest('.field-group');
    const label = group?.querySelector('label:first-of-type')?.textContent?.trim() || el.name || '';
    if (label) formData[label] = el.value;
  });

  // Collect checkboxes
  const checkboxGroups = {};
  document.querySelectorAll('input[type="checkbox"]:checked').forEach(el => {
    const label = el.closest('label')?.textContent?.trim() || el.name || '';
    if (label) {
      const section = el.closest('.field-group')?.querySelector('label:first-of-type')?.textContent?.trim() || 'Selections';
      if (!checkboxGroups[section]) checkboxGroups[section] = [];
      checkboxGroups[section].push(label);
    }
  });
  Object.assign(formData, checkboxGroups);

  // Collect signatures as base64 images
  document.querySelectorAll('canvas').forEach(canvas => {
    const block = canvas.closest('.sig-block');
    const sigLabel = block?.querySelector('h4')?.textContent?.trim() || canvas.id;
    const nameInput = block?.querySelector('input[type="text"]');
    const tsEl = block?.querySelector('.timestamp');

    // Check if canvas has been drawn on
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawing = imageData.data.some((val, i) => i % 4 === 3 && val > 0);

    if (hasDrawing) {
      formData['sig_' + sigLabel] = canvas.toDataURL('image/png');
      if (nameInput?.value) formData['name_' + sigLabel] = nameInput.value;
      if (tsEl?.textContent) formData['ts_' + sigLabel] = tsEl.textContent;
    }
  });

  // Add metadata
  formData._formId = formId;
  formData._formCategory = '${tokenRow.form_category}';
  formData._clientName = '${tokenRow.client_name.replace(/'/g, "\\'")}';
  formData._submittedAt = new Date().toISOString();

  // Collect which tab is active
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) formData._activeTab = activeTab.id;

  // Submit to API
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    const response = await fetch('/api/submissions/public/${tokenRow.token}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Submission failed');
    }

    // Show success
    const successEl = document.getElementById(formId + '-success');
    if (successEl) {
      successEl.style.display = 'block';
      successEl.innerHTML = '<h3 style="color:#2e7d32;font-size:20px;margin-bottom:8px;">Form Submitted Successfully!</h3><p style="color:#555;">Thank you. Your form has been received and the agent will be notified.</p>';
    }

    // Hide submit buttons
    document.querySelectorAll('.btn-submit').forEach(btn => btn.style.display = 'none');

    // Scroll to success
    if (successEl) successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (err) {
    alert('Error submitting form: ' + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Form';
    }
  }
};
</script>
`;

  html = html.replace('</body>', injectedScript + '\n</body>');
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
