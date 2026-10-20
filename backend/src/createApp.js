import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/env.js';
import passport from './config/passport.js';
import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import taskRoutes from './routes/tasks.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  const PgStore = connectPgSimple(session);

  // Vercel sets VERCEL=1 in the runtime environment, so treat that as
  // production regardless of what NODE_ENV happens to be. Getting this wrong
  // is what breaks the split (two-project) deploy: with NODE_ENV unset or set
  // to "development", the session cookie is issued as SameSite=Lax, browsers
  // never send a Lax cookie on a cross-origin XHR, and every request after
  // login comes back 401.
  const secureCookies = config.isProd || !!process.env.VERCEL;

  // Vercel terminates TLS in front of the function, so trust its proxy header.
  // Without this, express-session refuses to set a `secure` cookie in production.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.isProd ? 'combined' : 'dev'));

  app.use(
    cors({
      origin: config.clientOrigins,
      credentials: true,
    })
  );

  // Sessions live in Postgres (Supabase) and the session id travels in an
  // HTTP-only cookie. The store creates its `session` table on first use, so
  // schema.sql only needs to provide users / teams / team_members / tasks.
  app.use(
    session({
      name: 'ttm.sid',
      store: new PgStore({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
        // Clean up expired rows hourly instead of every minute - far less
        // write traffic from serverless invocations.
        pruneSessionInterval: 60 * 60,
      }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      // rolling:false means we do not rewrite the session on every request.
      // On serverless that removes a database write per API call. Set it back
      // to true if you want the session to slide forward with activity.
      rolling: false,
      cookie: {
        httpOnly: true,
        // Same-origin (single project) works with either setting, but a
        // cross-site frontend needs Secure + SameSite=None.
        secure: secureCookies,
        sameSite: secureCookies ? 'none' : 'lax',
        maxAge: config.sessionMaxAge,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Printed once per cold start - check the Vercel function logs if login
  // succeeds but every later request comes back 401.
  console.log(
    `[session] secure=${secureCookies} sameSite=${secureCookies ? 'none' : 'lax'} ` +
      `maxAge=${config.sessionMaxAge}ms corsOrigin=${config.clientOrigins.join(',')}`
  );

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.use('/auth', authRoutes);
  app.use('/teams', teamRoutes);
  app.use('/tasks', taskRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
