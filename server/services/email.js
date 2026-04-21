const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { getDb } = require('../db');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
    });
  } else if (process.env.SMTP_USER && process.env.SMTP_USER !== 'your-email@gmail.com') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  } else {
    transporter = {
      sendMail: async (options) => {
        console.log('\n📧 EMAIL (dev mode - not actually sent):');
        console.log(`  To: ${options.to}`);
        console.log(`  Subject: ${options.subject}\n`);
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }
  return transporter;
}

async function sendViaMake(payload) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('Make.com webhook failed:', err);
    return false;
  }
}

function isAuthError(err) {
  if (!err) return false;
  const code = err.code || err.response?.status;
  if (code === 401 || code === 403) return true;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('invalid_grant') || msg.includes('invalid credentials') || msg.includes('token expired') || msg.includes('unauthorized');
}

function buildRawMessage({ fromEmail, to, subject, text, html }) {
  const boundary = 'boundary_' + Date.now();
  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text || '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html || text || '',
    `--${boundary}--`
  ];
  return Buffer.from(messageParts.join('\r\n')).toString('base64url');
}

async function sendViaGmailAPI(agentId, { to, subject, text, html }) {
  const db = getDb();
  const agent = await db.prepare('SELECT gmail_tokens, gmail_email FROM agents WHERE id = ?').get(agentId);
  if (!agent?.gmail_tokens) return false;

  let tokens;
  try {
    tokens = JSON.parse(agent.gmail_tokens);
  } catch (err) {
    console.error('Gmail tokens malformed for agent', agentId, '- clearing and requiring reconnect.');
    await db.prepare('UPDATE agents SET gmail_tokens = NULL WHERE id = ?').run(agentId);
    return false;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3001'}/api/gmail/callback`
  );
  oauth2Client.setCredentials(tokens);

  const fromEmail = agent.gmail_email;
  const encodedMessage = buildRawMessage({ fromEmail, to, subject, text, html });

  // Proactive refresh if we know the token is expired
  if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const merged = { ...tokens, ...credentials, refresh_token: credentials.refresh_token || tokens.refresh_token };
      oauth2Client.setCredentials(merged);
      await db.prepare('UPDATE agents SET gmail_tokens = ? WHERE id = ?').run(JSON.stringify(merged), agentId);
    } catch (err) {
      console.error('Gmail proactive refresh failed for agent', agentId, '-', err.message);
      await db.prepare('UPDATE agents SET gmail_tokens = NULL WHERE id = ?').run(agentId);
      return false;
    }
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const attemptSend = () => gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });

  try {
    await attemptSend();
    console.log(`📧 Email sent via Gmail API (${fromEmail}) to ${to}`);
    return true;
  } catch (err) {
    if (!isAuthError(err)) {
      console.error('Gmail API send error:', err.message);
      return false;
    }

    // Auth error on send — try a reactive refresh + retry once
    if (!tokens.refresh_token) {
      console.error('Gmail auth error and no refresh_token available for agent', agentId);
      await db.prepare('UPDATE agents SET gmail_tokens = NULL WHERE id = ?').run(agentId);
      return false;
    }

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const merged = { ...tokens, ...credentials, refresh_token: credentials.refresh_token || tokens.refresh_token };
      oauth2Client.setCredentials(merged);
      await db.prepare('UPDATE agents SET gmail_tokens = ? WHERE id = ?').run(JSON.stringify(merged), agentId);
    } catch (refreshErr) {
      console.error('Gmail refresh failed for agent', agentId, '-', refreshErr.message);
      await db.prepare('UPDATE agents SET gmail_tokens = NULL WHERE id = ?').run(agentId);
      return false;
    }

    try {
      await attemptSend();
      console.log(`📧 Email sent via Gmail API after refresh (${fromEmail}) to ${to}`);
      return true;
    } catch (retryErr) {
      console.error('Gmail API send error after refresh:', retryErr.message);
      if (isAuthError(retryErr)) {
        await db.prepare('UPDATE agents SET gmail_tokens = NULL WHERE id = ?').run(agentId);
      }
      return false;
    }
  }
}

async function sendEmail(agentId, emailData) {
  // Priority: Gmail API → Make.com → SMTP/Resend → Console
  if (agentId) {
    const sent = await sendViaGmailAPI(agentId, emailData);
    if (sent) return;
  }

  if (process.env.MAKE_WEBHOOK_URL) {
    const sent = await sendViaMake({ ...emailData, type: emailData.type || 'email' });
    if (sent) return;
  }

  const t = getTransporter();
  await t.sendMail({
    from: emailData.from || `"Formz" <${process.env.FROM_EMAIL || 'noreply@formflow.co.nz'}>`,
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html
  });
}

const FORM_LABELS = {
  market_appraisal: 'Market Appraisal',
  vendor_disclosure: 'Vendor Disclosure',
  agency_agreement: 'Agency Agreement',
  purchaser_acknowledgement: 'Purchaser Acknowledgement',
  sale_purchase_agreement: 'Sale & Purchase Agreement'
};

async function getAgencyRow(agentId) {
  if (!agentId) return null;
  return await getDb().prepare(`
    SELECT ag.name AS brand_name, ag.logo_url, ag.primary_color, ag.accent_color, ag.contact_email AS brand_contact_email, ag.contact_phone, ag.email_footer
    FROM agents a LEFT JOIN agencies ag ON ag.id = a.agency_id
    WHERE a.id = ?
  `).get(agentId);
}

async function sendFormLink({ to, clientName, agentName, formType, formCategory, link, agentId }) {
  const formLabel = FORM_LABELS[formType] || formType;
  const categoryLabel = formCategory === 'vendor' ? 'Vendor' : 'Buyer';
  const agencyRow = await getAgencyRow(agentId);
  const brand = process.env.APP_NAME || agencyRow?.brand_name || 'Formz';
  const primaryColor = agencyRow?.primary_color || '#3b82f6';
  const emailFooter = agencyRow?.email_footer || `Kind regards,\n${brand}`;
  const emailFooterHtml = emailFooter.replace(/\n/g, '<br>');

  await sendEmail(agentId, {
    to,
    subject: `${formLabel} - Action Required | Formz`,
    text: `Hi ${clientName},\n\n${agentName} from ${brand} has sent you a ${formLabel} form to complete.\n\nPlease click the link below:\n${link}\n\nThis link will expire in 30 days.\n\n${emailFooter}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e3a5f; font-size: 24px; margin: 0;">Formz</h1>
          <p style="color: ${primaryColor}; font-size: 14px; margin: 4px 0 0;">${brand}</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Hi ${clientName},</p>
          <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${agentName} from ${brand} has sent you a <strong>${categoryLabel} - ${formLabel}</strong> form to complete.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">Open & Complete Form</a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 0;">This link will expire in 30 days.</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">Formz — ${brand}</p>
        ${agencyRow?.email_footer ? `<p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 12px;">${emailFooterHtml}</p>` : ''}
      </div>
    `,
    type: 'form_link'
  });
}

async function sendSubmissionNotification({ to, agentName, clientName, formType, formCategory, agentId }) {
  const formLabel = FORM_LABELS[formType] || formType;

  await sendEmail(agentId, {
    to,
    subject: `Form Submitted: ${formLabel} from ${clientName}`,
    text: `Hi ${agentName},\n\n${clientName} has submitted their ${formLabel} form.\n\nLog in to Formz to review.\n\nKind regards,\nFormz`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
          <h2 style="color: #1e3a5f; margin: 0 0 16px;">New Form Submission</h2>
          <p style="color: #334155;">${clientName} has submitted their <strong>${formLabel}</strong> form.</p>
          <p style="color: #334155;">Log in to Formz to review the submission and AI-generated summary.</p>
        </div>
      </div>
    `,
    type: 'submission_notification'
  });
}

async function sendConfirmation({ to, clientName, formType, agentId }) {
  const formLabel = FORM_LABELS[formType] || formType;
  const agencyRow = await getAgencyRow(agentId);
  const brand = process.env.APP_NAME || agencyRow?.brand_name || 'Formz';
  const emailFooter = agencyRow?.email_footer || `Kind regards,\n${brand}`;

  await sendEmail(agentId, {
    to,
    subject: `Form Received: ${formLabel} | ${brand}`,
    text: `Hi ${clientName},\n\nThank you for submitting the ${formLabel} form.\n\nYour agent will review it and be in touch shortly.\n\n${emailFooter}`,
    type: 'confirmation'
  });
}

module.exports = { sendFormLink, sendSubmissionNotification, sendConfirmation };
