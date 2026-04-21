const express = require('express');
const { google } = require('googleapis');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3001'}/api/gmail/callback`
  );
}

// Start OAuth flow
router.get('/connect', authenticate, (req, res) => {
  console.log('[Gmail OAuth] Config:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? '✓ set' : '✗ missing',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✓ set' : '✗ missing',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3001'}/api/gmail/callback`
  });
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state: String(req.agent.id)
  });
  console.log('[Gmail OAuth] Generated auth URL:', url);
  res.json({ url });
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const agentId = parseInt(state);

  if (!code || !agentId) {
    return res.redirect('/?gmail=error&reason=missing_params');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get the Gmail email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    const gmailEmail = data.email;

    // Store tokens in DB
    const db = getDb();
    await db.prepare('UPDATE agents SET gmail_tokens = ?, gmail_email = ? WHERE id = ?').run(
      JSON.stringify(tokens), gmailEmail, agentId
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    res.redirect(`${appUrl}/settings?gmail=connected&email=${encodeURIComponent(gmailEmail)}`);
  } catch (err) {
    console.error('Gmail OAuth error:', err);
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    res.redirect(`${appUrl}/settings?gmail=error&reason=${encodeURIComponent(err.message)}`);
  }
});

// Get Gmail connection status
router.get('/status', authenticate, async (req, res) => {
  const db = getDb();
  const agent = await db.prepare('SELECT gmail_email, gmail_tokens FROM agents WHERE id = ?').get(req.agent.id);
  const hasEmail = !!agent?.gmail_email;
  const hasTokens = !!agent?.gmail_tokens;
  const connected = hasEmail && hasTokens;
  const needs_reconnect = hasEmail && !hasTokens;
  res.json({
    connected,
    email: agent?.gmail_email || null,
    needs_reconnect
  });
});

// Disconnect Gmail
router.post('/disconnect', authenticate, async (req, res) => {
  const db = getDb();
  await db.prepare('UPDATE agents SET gmail_tokens = NULL, gmail_email = NULL WHERE id = ?').run(req.agent.id);
  res.json({ message: 'Gmail disconnected' });
});

module.exports = router;
