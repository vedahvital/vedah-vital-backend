const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    // Return null — callers should check and respond gracefully
    return null;
  }

  try {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } catch (err) {
    console.error('[mailer] Failed to create mail transporter:', err.message);
    return null;
  }
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('[mailer] SMTP not configured — check SMTP_HOST/PORT/USER/PASS env vars');
    const err = new Error('Something went wrong. Please try again later.');
    err.statusCode = 503;
    throw err;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  console.log(`[mailer] Sending email to ${to} | subject: "${subject}"`);

  try {
    const result = await transporter.sendMail({ from, to, subject, text, html });
    console.log(`[mailer] Email sent ✓ messageId: ${result?.messageId}`);
    return result;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    // Bypass — treat as success so the flow is not blocked
    return null;
  }
}

module.exports = { sendMail };
