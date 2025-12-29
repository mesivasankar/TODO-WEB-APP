import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const env = {
   nodeEnv,
  isProduction,
  port: process.env.PORT || 3000,
    serverBaseUrl: process.env.SERVER_BASE_URL,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  emailVerificationTokenHours: Number(process.env.EMAIL_VERIFICATION_TOKEN_HOURS || 24),
  mailerSendApiKey: process.env.MAILERSEND_API_KEY,
  mailerSendFromName: process.env.MAILERSEND_FROM_NAME,
   googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
};
