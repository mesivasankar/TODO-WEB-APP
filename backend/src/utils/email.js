// import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
// import { env } from '../config/env.js';

// const mailerSend = new MailerSend({
//   apiKey: env.mailerSendApiKey || process.env.MAILERSEND_API_KEY,
// });

// const sentFrom = new Sender(
//   env.mailerSendFromEmail || process.env.MAILERSEND_FROM_EMAIL,
//   env.mailerSendFromName || process.env.MAILERSEND_FROM_NAME
// );


// function buildVerificationEmailHtml(verificationUrl) {
//   return `<!DOCTYPE html>
// <html lang="en">
//   <body style="margin:0; padding:0; background-color:#f4f4f7;">
//     <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
//       <tr>
//         <td align="center">
//           <table width="600" cellpadding="0" cellspacing="0" 
//                  style="background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 4px 12px rgba(15,23,42,0.12); font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            
//             <!-- Header / Logo -->
//             <tr>
//               <td align="center" style="padding-bottom:16px;">
//                 <div style="font-size:26px; font-weight:700; letter-spacing:0.08em; color:#111827;">
//                   ACTDONE
//                 </div>
//                 <div style="font-size:13px; color:#6b7280; margin-top:4px;">
//                   Plan. Act. Get it done.
//                 </div>
//               </td>
//             </tr>

//             <tr><td style="border-bottom:1px solid #e5e7eb; padding-bottom:16px;"></td></tr>
//             <tr><td style="height:16px;"></td></tr>

//             <!-- Main text -->
//             <tr>
//               <td style="font-size:15px; line-height:1.6; color:#374151;">
//                 Hi,
//                 <br><br>
//                 Thanks for signing up for <strong>ACTDONE</strong>. 
//                 Please confirm that this is your email address to activate your account.
//               </td>
//             </tr>

//             <tr><td style="height:24px;"></td></tr>

//             <!-- Button -->
//             <tr>
//               <td align="center">
//                 <a href="${verificationUrl}"
//                    style="background:#4F46E5; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:999px; font-size:15px; font-weight:600; display:inline-block;">
//                   Verify Email
//                 </a>
//               </td>
//             </tr>

//             <tr><td style="height:16px;"></td></tr>

//             <!-- Fallback link -->
//             <tr>
//               <td style="font-size:13px; line-height:1.6; color:#6b7280;">
//                 Or copy and paste this URL into your browser:
//                 <br>
//                 <a href="${verificationUrl}" style="color:#4F46E5; word-break:break-all;">
//                   ${verificationUrl}
//                 </a>
//               </td>
//             </tr>

//             <tr><td style="height:24px;"></td></tr>

//             <!-- Security note -->
//             <tr>
//               <td style="font-size:12px; line-height:1.6; color:#9ca3af;">
//                 If you didn’t create an account, you can safely ignore this email.
//               </td>
//             </tr>

//             <tr><td style="height:32px;"></td></tr>

//             <!-- Footer -->
//             <tr>
//               <td align="center" style="font-size:11px; color:#9ca3af;">
//                 © ${new Date().getFullYear()} ACTDONE. All rights reserved.
//               </td>
//             </tr>

//           </table>
//         </td>
//       </tr>
//     </table>
//   </body>
// </html>`;
// }

// function buildVerificationEmailText(verificationUrl) {
//   return [
//     'Hi,',
//     '',
//     'Thanks for signing up for ACTDONE.',
//     'Please verify your email address by opening the link below:',
//     verificationUrl,
//     '',
//     "If you didn’t create an ACTDONE account, you can ignore this email."
//   ].join('\n');
// }

// export async function sendVerificationEmail(toEmail, verificationUrl) {
//   const recipients = [new Recipient(toEmail, toEmail)];

//   const emailParams = new EmailParams()
//     .setFrom(sentFrom)
//     .setTo(recipients)
//     .setSubject('Verify your email for ACTDONE')
//     .setHtml(buildVerificationEmailHtml(verificationUrl))
//     .setText(buildVerificationEmailText(verificationUrl));

//   try {
//     const response = await mailerSend.email.send(emailParams);
//     console.log('Verification email sent:', response.statusCode);
//   } catch (error) {
//     console.error('Error sending verification email:', error?.message || error);
//     throw new Error('Failed to send verification email');
//   }
// }




import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/* =====================================================
   TRANSPORTERS
===================================================== */

// DEV → Mailtrap Sandbox
const devTransporter = nodemailer.createTransport({
  host: env.mailtrapHost || process.env.MAILTRAP_HOST,
  port: env.mailtrapPort || process.env.MAILTRAP_PORT,
  auth: {
    user: env.mailtrapUser || process.env.MAILTRAP_USER,
    pass: env.mailtrapPass || process.env.MAILTRAP_PASS,
  },
});

// PROD → real SMTP provider (placeholder)
let prodTransporter = null;

if (process.env.NODE_ENV === 'production') {
  prodTransporter = nodemailer.createTransport({
    host: env.smtpHost || process.env.SMTP_HOST,
    port: env.smtpPort || process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.smtpUser || process.env.SMTP_USER,
      pass: env.smtpPass || process.env.SMTP_PASS,
    },
  });
}

/* =====================================================
   EMAIL TEMPLATES
===================================================== */

function buildVerificationEmailHtml(verificationUrl) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f4f4f7;">
    <h2>ACTDONE</h2>
    <p>Please verify your email:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>${verificationUrl}</p>
  </body>
</html>`;
}

function buildVerificationEmailText(verificationUrl) {
  return `Verify your email: ${verificationUrl}`;
}

/* =====================================================
   MAIN FUNCTION (DEV + PROD SAFE)
===================================================== */

export async function sendVerificationEmail(toEmail, verificationUrl) {
  const mailOptions = {
    from: `"ACTDONE" <no-reply@actdone.app>`,
    to: toEmail,
    subject: 'Verify your email for ACTDONE',
    text: buildVerificationEmailText(verificationUrl),
    html: buildVerificationEmailHtml(verificationUrl),
  };

  try {
    // DEVELOPMENT
    if (process.env.NODE_ENV !== 'production') {
      const info = await devTransporter.sendMail(mailOptions);
      console.log('📧 DEV email captured in Mailtrap:', info.messageId);
      return;
    }

    // PRODUCTION
    if (!prodTransporter) {
      console.warn('⚠️ Production email transporter not configured');
      return;
    }

    await prodTransporter.sendMail(mailOptions);
    console.log('📨 Production email sent to:', toEmail);

  } catch (error) {
    console.error('Email sending failed:', error.message);
    // ❗ NEVER throw — email must not break registration
  }
}
 