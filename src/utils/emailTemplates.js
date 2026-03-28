/**
 * Shared brand colours / wrapper used by all templates.
 */
function wrap(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vedah Vital</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VEDAH VITAL</span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 28px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} Vedah Vital. All rights reserved.
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#cbd5e1;">
              This email was sent from vedahvital.com
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Email sent to the support team when a contact form is submitted.
 */
function contactNotificationToSupport({ name, email, message }) {
  const body = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#0f172a;">New Contact Message</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Someone submitted the contact form on your website.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">From</span><br/>
          <span style="font-size:15px;font-weight:600;color:#0f172a;">${name}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
          <a href="mailto:${email}" style="font-size:15px;color:#059669;text-decoration:none;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 20px;">
          <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Message</span><br/>
          <p style="margin:8px 0 0;font-size:15px;color:#334155;line-height:1.6;white-space:pre-wrap;">${message}</p>
        </td>
      </tr>
    </table>

    <a href="mailto:${email}?subject=Re: Your enquiry"
       style="display:inline-block;background:#059669;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
      Reply to ${name}
    </a>`;

  return wrap(body);
}

/**
 * Confirmation email sent to the user after submitting the contact form.
 */
function contactConfirmationToUser({ name, message }) {
  const body = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#0f172a;">Thanks for reaching out, ${name}!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">
      We've received your message and will get back to you as soon as possible.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Your message</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">${message}</p>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.6;">
      In the meantime, you can verify your product authenticity using the QR code on your package.
    </p>
    <p style="margin:0;font-size:14px;color:#94a3b8;">— The Vedah Vital Team</p>`;

  return wrap(body);
}

/**
 * OTP email sent to admin users.
 */
function otpEmail({ otp }) {
  const body = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#0f172a;">Your Login Code</h2>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;">
      Use the code below to sign in to the Vedah Vital Admin dashboard.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#f0fdf4;border:2px dashed #6ee7b7;border-radius:16px;padding:24px 48px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#059669;font-family:'Courier New',monospace;">${otp}</span>
      </div>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Valid for <strong style="color:#0f172a;">5 minutes</strong> only</p>
    </div>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#9a3412;">
        ⚠️ Never share this code with anyone. Vedah Vital staff will never ask for your OTP.
      </p>
    </div>`;

  return wrap(body);
}

module.exports = { contactNotificationToSupport, contactConfirmationToUser, otpEmail };
