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

async function sendViaGmailAPI(agentId, { to, subject, text, html }) {
  const db = getDb();
  const agent = db.prepare('SELECT gmail_tokens, gmail_email FROM agents WHERE id = ?').get(agentId);
  if (!agent?.gmail_tokens) return false;

  try {
    const tokens = JSON.parse(agent.gmail_tokens);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3001'}/api/gmail/callback`
    );
    oauth2Client.setCredentials(tokens);

    // Refresh token if needed
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      db.prepare('UPDATE agents SET gmail_tokens = ? WHERE id = ?').run(JSON.stringify(credentials), agentId);
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const fromEmail = agent.gmail_email;

    // Build RFC 2822 email
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
    const rawMessage = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64url');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log(`📧 Email sent via Gmail API (${fromEmail}) to ${to}`);
    return true;
  } catch (err) {
    console.error('Gmail API send error:', err.message);
    return false;
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

async function sendFormLink({ to, clientName, agentName, formType, formCategory, link, agentId }) {
  const formLabel = FORM_LABELS[formType] || formType;
  const categoryLabel = formCategory === 'vendor' ? 'Vendor' : 'Buyer';

  await sendEmail(agentId, {
    to,
    subject: `${formLabel} - Action Required | Formz`,
    text: `Hi ${clientName},\n\n${agentName} from Hometown Real Estate has sent you a ${formLabel} form to complete.\n\nPlease click the link below:\n${link}\n\nThis link will expire in 30 days.\n\nKind regards,\nHometown Real Estate`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e3a5f; font-size: 24px; margin: 0;">Formz</h1>
          <p style="color: #3b82f6; font-size: 14px; margin: 4px 0 0;">Hometown Real Estate</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Hi ${clientName},</p>
          <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${agentName} from Hometown Real Estate has sent you a <strong>${categoryLabel} - ${formLabel}</strong> form to complete.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">Open & Complete Form</a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 0;">This link will expire in 30 days.</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">Formz — Hometown Real Estate</p>
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

  await sendEmail(agentId, {
    to,
    subject: `Form Received: ${formLabel} | Hometown Real Estate`,
    text: `Hi ${clientName},\n\nThank you for submitting the ${formLabel} form.\n\nYour agent will review it and be in touch shortly.\n\nKind regards,\nHometown Real Estate`,
    type: 'confirmation'
  });
}

module.exports = { sendFormLink, sendSubmissionNotification, sendConfirmation };
