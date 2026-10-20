# Team Task Manager - Backend (Vercel serverless)

Express + Passport.js + Supabase, packaged as a single Vercel serverless
function.

## How the serverless setup works

```
api/index.js        <- Vercel entry point, exports the Express app
vercel.json         <- rewrites every path to /api
src/createApp.js    <- builds and returns the Express app
src/dev-server.js   <- local `npm run dev` only (never runs on Vercel)
```

Vercel's Node runtime calls the exported handler with `(req, res)`. An Express
app is exactly such a function, so `api/index.js` exports it directly. The
catch-all rewrite `/(.*) -> /api` sends every request to that one function
while preserving the original `req.url`, so Express routes normally.

The app (and its Postgres pool + Supabase client) is created once per warm
function instance and reused, which is why `pool` is capped at `max: 1`.

## Files that matter for deployment

| File              | Purpose                                              |
|-------------------|------------------------------------------------------|
| `api/index.js`    | Serverless handler Vercel invokes                    |
| `vercel.json`     | Rewrites + function memory/timeout                   |
| `.vercelignore`   | Keeps `.env`, logs and `node_modules` out of the build |
| `.env.example`    | Every variable you must set in the Vercel dashboard  |

## Deploy to Vercel

### 1. Database

In the Supabase SQL Editor run `src/db/schema.sql`. This creates `users`,
`teams`, `team_members` and `tasks` (the `session` table is created
automatically by `connect-pg-simple`).

### 2. Get a pooler connection string

Supabase dashboard -> **Connect** -> **Transaction pooler** and copy the URI:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Use the pooler, not `db.<project-ref>.supabase.co` - the direct host is
IPv6-only and will not resolve from Vercel. Note the username is
`postgres.<project-ref>`.

### 3. Environment variables

In Vercel -> Project -> Settings -> Environment Variables add:

| Name                        | Value                                            |
|-----------------------------|--------------------------------------------------|
| `NODE_ENV`                  | `production`                                     |
| `SUPABASE_URL`              | from Supabase -> API                             |
| `SUPABASE_ANON_KEY`         | from Supabase -> API                             |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase -> API (server-only!)              |
| `DATABASE_URL`              | the pooler URI from step 2                       |
| `PGSSLMODE`                 | `require`                                        |
| `SESSION_SECRET`            | a long random string (32+ chars)                 |
| `SESSION_MAX_AGE`           | `86400000`                                       |
| `CLIENT_ORIGIN`             | your deployed frontend URL, e.g. `https://app.vercel.app` |

`NODE_ENV=production` matters: it switches the session cookie to
`secure` + `SameSite=None`, which is required when the frontend is on a
different domain.

### 4. Deploy

```bash
npm i -g vercel
cd backend
vercel            # preview deployment
vercel --prod     # production
```

Or push the folder to GitHub and import it in the Vercel dashboard. Set the
**Root Directory** to `backend` if the repo contains the frontend too.

### 5. Local development

```bash
npm install
cp .env.example .env    # NODE_ENV=development locally
npm run dev             # http://localhost:5000
```

Locally the cookie is `SameSite=Lax` over http, so it works without HTTPS.

## Troubleshooting

**Login succeeds, but every request after it returns 401.**

The session cookie is not making it back to the server. Check in this order:

1. **`NODE_ENV`.** It must be `production` on Vercel, or unset. If it is
   `development`, the cookie is issued `SameSite=Lax`, and browsers never send a
   Lax cookie on a cross-origin XHR - so `/auth/me`, `/teams` and `/tasks` all
   come back 401. The app now also detects `VERCEL=1` and forces
   `Secure; SameSite=None` there, so this works either way.
2. **`CLIENT_ORIGIN`.** Must be the frontend's exact origin - scheme + host, no
   trailing slash. Several origins go in one comma-separated value.
3. **Look at the cookie.** DevTools -> Network -> the `POST /auth/login`
   response -> `Set-Cookie`. It should contain `Secure` and `SameSite=None`.
   DevTools -> Application -> Cookies should list `ttm.sid` under the API's
   domain.
4. **Still missing?** The frontend and API are on different sites and the
   browser is blocking third-party cookies (Safari blocks them by default).
   Deploy both as one Vercel project instead - same origin, no CORS, cookie is
   first-party.

Every cold start logs the resolved policy, so the function logs show exactly
what was used:

```
[session] secure=true sameSite=none maxAge=86400000ms corsOrigin=https://app.vercel.app
```

## Routes

Every route below requires an authenticated session except the two auth entry
points.

| Method | Path                          | Auth | Description                    |
|--------|-------------------------------|------|--------------------------------|
| POST   | /auth/register                | No   | Create account + session       |
| POST   | /auth/login                   | No   | Log in                         |
| POST   | /auth/logout                  | Yes  | Destroy session                |
| GET    | /auth/me                      | Yes  | Current user                   |
| GET    | /teams                        | Yes  | List my teams (with members)   |
| POST   | /teams                        | Yes  | Create a team                  |
| GET    | /teams/:id                    | Yes  | Team detail                    |
| POST   | /teams/:id/members            | Yes  | Add member by email (admin)    |
| DELETE | /teams/:id/members/:userId    | Yes  | Remove member (admin)          |
| DELETE | /teams/:id                    | Yes  | Delete team (owner only)       |
| GET    | /tasks                        | Yes  | List tasks (filters supported) |
| POST   | /tasks                        | Yes  | Create task                    |
| GET    | /tasks/:id                    | Yes  | Task detail                    |
| PATCH  | /tasks/:id                    | Yes  | Update task                    |
| DELETE | /tasks/:id                    | Yes  | Delete task                    |

Task filters: `?team_id=&assignee_id=&status=&priority=&search=`

## Notes

- **bcrypt** is a native module. It ships prebuilt binaries and normally works
  on Vercel's Node 20 runtime. If a build ever fails on it, swap the import to
  `bcryptjs` (pure JS, same API) - `import bcrypt from 'bcryptjs'`.
- **Session writes:** `rolling` is `false` so a request does not rewrite the
  session row on every call. Set it to `true` in `src/createApp.js` if you want
  sliding expiry at the cost of a DB write per request.
- **Serverless timeouts:** the function is configured for 10s. Cold starts that
  also open a fresh Postgres connection are the slowest path.
