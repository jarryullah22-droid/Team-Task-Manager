import 'dotenv/config';

// Fail loudly only for values the app truly cannot run without.
const REQUIRED = ['SUPABASE_URL', 'SESSION_SECRET', 'DATABASE_URL'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(
    `[env] Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in your Supabase credentials.'
  );
}

export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  sessionMaxAge: Number(process.env.SESSION_MAX_AGE || 86400000),
  databaseUrl: process.env.DATABASE_URL,
  pgSsl: (process.env.PGSSLMODE || 'require') === 'require',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
};
