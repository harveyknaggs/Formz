const nodemailer = require('nodemailer');

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
    // Dev mode: log emails to console
    transporter = {
      sendMail: async (options) => {
        console.log('\n📧 EMAIL (dev mode - not actually sent):');
        console.log(`  To: ${options.to}`);
        console.log(`  Subject: ${options.subject}`);
        console.log(`  Body: ${options.text || '(HTML email)'}\n`);
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }
  return transporter;
}

async function sendFormLink({ to, clientName, agentName, formType, formCategory, link }) {
  const t = getTransporter();
  const categoryLabel = formCategory === 'vendor' ? 'Vendor' : 'Buyer';
  const formLabels = {
    market_appraisal: 'Market Appraisal',
    vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement',
    purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase Agreement'
  };
  const formLabel = formLabels[formType] || formType;

  await t.sendMail({
    from: `"FormFlow RE - Hometown Real Estate" <${process.env.FROM_EMAIL || 'noreply@formflow.co.nz'}>`,
    to,
    subject: `${formLabel} - Action Required | Hometown Real Estate`,
    text: `Hi ${clientName},\n\n${agentName} from Hometown Real Estate (@realty) has sent you a ${formLabel} form to complete.\n\nPlease click the link below to fill out and sign the form:\n${link}\n\nThis link will expire in 30 days.\n\nIf you have any questions, please contact your agent directly.\n\nKind regards,\nHometown Real Estate\n@realty`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #003087; font-size: 24px; margin: 0;">Hometown Real Estate</h1>
          <p style="color: #0099cc; font-size: 14px; margin: 4px 0 0;">@realty</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Hi ${clientName},</p>
          <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${agentName} from Hometown Real Estate has sent you a <strong>${categoryLabel} - ${formLabel}</strong> form to complete.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="background: #0099cc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">Open & Complete Form</a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 0;">This link will expire in 30 days. If you have any questions, please contact your agent directly.</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">FormFlow RE — Hometown Real Estate | @realty</p>
      </div>
    `
  });
}

async function sendSubmissionNotification({ to, agentName, clientName, formType, formCategory }) {
  const t = getTransporter();
  const formLabels = {
    market_appraisal: 'Market Appraisal',
    vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement',
    purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase Agreement'
  };
  const formLabel = formLabels[formType] || formType;

  await t.sendMail({
    from: `"FormFlow RE" <${process.env.FROM_EMAIL || 'noreply@formflow.co.nz'}>`,
    to,
    subject: `Form Submitted: ${formLabel} from ${clientName}`,
    text: `Hi ${agentName},\n\n${clientName} has submitted their ${formLabel} form.\n\nLog in to FormFlow RE to review the submission and AI summary.\n\nKind regards,\nFormFlow RE`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
          <h2 style="color: #003087; margin: 0 0 16px;">New Form Submission</h2>
          <p style="color: #334155;">${clientName} has submitted their <strong>${formLabel}</strong> form.</p>
          <p style="color: #334155;">Log in to FormFlow RE to review the submission and AI-generated summary.</p>
        </div>
      </div>
    `
  });
}

async function sendConfirmation({ to, clientName, formType }) {
  const t = getTransporter();
  const formLabels = {
    market_appraisal: 'Market Appraisal',
    vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement',
    purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase Agreement'
  };
  const formLabel = formLabels[formType] || formType;

  await t.sendMail({
    from: `"FormFlow RE - Hometown Real Estate" <${process.env.FROM_EMAIL || 'noreply@formflow.co.nz'}>`,
    to,
    subject: `Form Received: ${formLabel} | Hometown Real Estate`,
    text: `Hi ${clientName},\n\nThank you for completing and submitting the ${formLabel} form.\n\nYour agent will review the form and be in touch shortly.\n\nKind regards,\nHometown Real Estate\n@realty`,
  });
}

module.exports = { sendFormLink, sendSubmissionNotification, sendConfirmation };
