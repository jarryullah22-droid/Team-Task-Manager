import { createApp } from '../src/createApp.js';

// Vercel entry point. Every request that reaches this project is rewritten to
// /api (see vercel.json), and Vercel invokes this handler with (req, res).
// An Express app IS a (req, res, next) function, so we can export it directly.
//
// The app is built once per warm function instance and reused across
// invocations, which is what we want: one Postgres pool, one Supabase client.
const app = createApp();

export default app;
