# Team Task Manager - Frontend

React + Vite + Tailwind CSS.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview
```

## How it talks to the backend

All requests go through the axios instance in `src/lib/api.js`:

```js
baseURL: import.meta.env.VITE_API_URL || ''
```

That one line covers all three setups:

| Setup | `VITE_API_URL` | Result |
|-------|----------------|--------|
| Local dev | *(empty)* | `vite.config.js` proxies `/auth`, `/teams`, `/tasks` to `http://localhost:5000` |
| Single Vercel project | *(empty)* | Same origin - Vercel rewrites the API paths to the serverless function |
| Split Vercel projects | `https://your-api.vercel.app` | Direct cross-origin calls (needs CORS + `CLIENT_ORIGIN` on the backend) |

`withCredentials: true` is set on the instance so the HTTP-only session cookie
is sent with every request.

## Deploying

**Split deploy:** create a Vercel project with **Root Directory = `frontend`**.
Set the `VITE_API_URL` environment variable to your backend URL and redeploy.

**Single-project deploy:** deploy the repository root instead - the root
`vercel.json` builds this app into `frontend/dist` and serves it as static
assets. Do not set `VITE_API_URL` in that case.

## Structure

- `src/lib/api.js` - axios instance + endpoint helpers
- `src/context/AuthContext.jsx` - session state (login/register/logout/me)
- `src/components/` - Navbar, TeamList, TaskList, TaskModal, FilterBar, ProtectedRoute
- `src/pages/` - Login, Register, Dashboard
