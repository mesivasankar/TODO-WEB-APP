import { Resend } from 'resend';
import { env } from '../config/env.js';

// ─────────────────────────────────────────────────────────────────────────────
// Resend client (production)
// Free tier from address: onboarding@resend.dev (works without domain setup)
// ─────────────────────────────────────────────────────────────────────────────
const resend = new Resend(env.resendApiKey || process.env.RESEND_API_KEY);

const FROM_ADDRESS = 'ACTDONE <onboarding@resend.dev>';

/* =====================================================
   EMAIL TEMPLATE
===================================================== */

function buildVerificationEmailHtml(verificationUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0; padding:0; background-color:#000000; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:80px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#111111; border-radius:4px; border:1px solid #222222;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:60px 40px 30px 40px;">
              <div style="font-size:32px; font-weight:800; color:#ffffff; letter-spacing:0.3em; text-transform:uppercase; margin-bottom:10px;">
                ACTDONE
              </div>
              <div style="font-size:11px; font-weight:500; color:#888888; letter-spacing:0.4em; text-transform:uppercase;">
                PLAN, ACT, GET IT DONE...
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:0 40px 60px 40px; text-align:center;">
              <div style="height:1px; background:#222222; margin:30px 0 40px 0;"></div>

              <p style="margin:0; font-size:16px; line-height:26px; color:#ffffff; font-weight:400;">
                To finalize your registration, please verify your email address.
                This ensures your account is secure and ready for use.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}"
                       style="background:#ffffff; color:#000000; padding:18px 40px; border-radius:2px; font-size:14px; font-weight:800; text-decoration:none; display:inline-block; letter-spacing:0.15em; text-transform:uppercase;">
                      VERIFY ACCOUNT
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback -->
              <div style="margin-top:50px;">
                <p style="margin:0; font-size:11px; color:#666666; line-height:18px;">
                  If the button is not active, please use this link:<br>
                  <a href="${verificationUrl}" style="color:#888888; word-break:break-all; text-decoration:underline;">${verificationUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 40px 40px; text-align:center;">
              <p style="margin:0; font-size:11px; color:#555555; line-height:1.5;">
                If you did not create an account with ACTDONE,<br>please disregard this message.
              </p>
              <p style="margin:20px 0 0 0; font-size:10px; color:#444444; letter-spacing:0.1em; text-transform:uppercase;">
                &copy; ${new Date().getFullYear()} ACTDONE. ALL RIGHTS RESERVED.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVerificationEmailText(verificationUrl) {
  return [
    'Welcome to ACTDONE!',
    '',
    'Please verify your email address by opening the link below:',
    verificationUrl,
    '',
    "If you didn't create an account, you can safely ignore this email.",
  ].join('\n');
}

/* =====================================================
   MAIN EXPORT
===================================================== */

export async function sendVerificationEmail(toEmail, verificationUrl) {
  // ── Development: just log the link, no real email sent ───────────────────
  if (!env.isProduction) {
    console.log('\n📧 [DEV] Verification email skipped (not production).');
    console.log('   Copy this link to verify manually:', verificationUrl, '\n');
    return;
  }

  // ── Production: send via Resend REST API ─────────────────────────────────
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: 'Verify your ACTDONE account',
      html: buildVerificationEmailHtml(verificationUrl),
      text: buildVerificationEmailText(verificationUrl),
    });

    if (error) {
      console.error('📧 Resend error:', error);
      throw new Error(error.message || 'Resend failed to send email');
    }

    console.log('📨 Verification email sent via Resend. ID:', data?.id, '→', toEmail);
  } catch (err) {
    console.error('📧 sendVerificationEmail failed:', err.message);
    throw err;
  }
}