import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY)) {
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
  );
}

// The backend uses the service-role key so it can run trusted server-side
// queries. This key bypasses Row Level Security and must NEVER be exposed
// to the frontend - the browser only ever talks to this API.
//
// `realtime.transport` is required on Node < 22: supabase-js builds a Realtime
// client inside createClient() and throws "WebSocket not supported" unless we
// hand it one. We never use Realtime, but the constructor still needs it.
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  }
);
