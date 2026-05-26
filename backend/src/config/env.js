import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProduction = nodeEnv === 'production';
const isDevelopment = nodeEnv === 'development';

// --- Smart .env Parsing (Since multiple DATABASE_URL exist) ---
let neonUrl = process.env.DATABASE_URL;
let localUrl = process.env.DATABASE_URL;

try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    let currentSection = '';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('PRODUCTION (Neon)')) currentSection = 'NEON';
      if (trimmed.includes('DEVELOPMENT (Local)')) currentSection = 'LOCAL';
      
      if (trimmed.startsWith('DATABASE_URL=')) {
        const url = trimmed.split('=')[1].trim();
        if (currentSection === 'NEON') neonUrl = url;
        if (currentSection === 'LOCAL') localUrl = url;
      }
    });
  }
} catch (err) {
  console.warn('⚠️ Smart .env parser failed, using default process.env.DATABASE_URL');
}

export const env = {
  nodeEnv,
  isProduction,
  isDevelopment,
  port: process.env.PORT || 3000,
  serverBaseUrl: process.env.SERVER_BASE_URL,
  dbUrl: isProduction ? neonUrl : localUrl,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  emailVerificationTokenHours: Number(process.env.EMAIL_VERIFICATION_TOKEN_HOURS || 24),
  mailerSendApiKey: process.env.MAILERSEND_API_KEY,
  mailerSendFromName: process.env.MAILERSEND_FROM_NAME,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  // Mailtrap (Dev)
  mailtrapHost: process.env.MAILTRAP_HOST,
  mailtrapPort: process.env.MAILTRAP_PORT,
  mailtrapUser: process.env.MAILTRAP_USER,
  mailtrapPass: process.env.MAILTRAP_PASS,
  // SMTP (Prod - e.g. Gmail)
  smtpHost: (process.env.SMTP_HOST || process.env.EMAIL_HOST || "").trim(),
  smtpPort: (process.env.SMTP_PORT || process.env.EMAIL_PORT || "").trim(),
  smtpUser: (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim(),
  smtpPass: (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim(),
};
