import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

// Serverless-friendly connection pool.
//
// Every Vercel function instance is its own Node process. A large pool per
// instance would multiply into hundreds of Postgres connections, so we keep it
// at max:1 and let the Supabase pooler multiplex across instances.
//
// Point DATABASE_URL at the Supabase *pooler* connection string (see
// .env.example) - the direct db.<ref>.supabase.co host is IPv6-only and will
// not resolve from most Vercel regions.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  // Lets the process go idle and be frozen/evicted between invocations.
  allowExitOnIdle: true,
  ssl: config.pgSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[pg] Unexpected error on idle client', err);
});
