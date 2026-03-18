# Eventhost (Supabase-free VPS Edition)

Eventhost is now structured to run fully on a self-hosted Hostinger VPS stack without Supabase.

## 1) Audit Summary

### Framework and runtime
- Frontend: **React 18 + Vite + Tailwind**
- Router: **react-router-dom**
- UI: Radix + custom components
- Backend (new): **Node.js + Express API**
- Data store (new): **self-hosted JSON DB file (`server/data/db.json`)** with SQL migration blueprint for PostgreSQL/MySQL in `server/migrations/001_init.sql`

### What depended on Supabase
- Auth/session in `src/context/SupabaseAuthContext.jsx`
- DB queries across pages/hooks/components via `supabase.from(...)`
- Storage uploads via `supabase.storage`
- RPC + edge functions via `supabase.rpc(...)` and `supabase.functions.invoke(...)`
- Realtime via `supabase.channel(...)`
- Hardcoded credentials in `src/lib/customSupabaseClient.js`

### Broken/incomplete issues fixed by this migration
- Removed exposed hardcoded Supabase URL/anon key
- Removed direct Supabase SDK dependency
- Added deployable backend API for auth, CRUD, storage, RPC/function equivalents
- Added environment templates for frontend and backend
- Added migration schema blueprint
- Removed hardcoded Stripe test key fallback in app bootstrap

## 2) Why this replacement stack

Chosen stack for Hostinger VPS:
- **Node.js + Express**: stable, lightweight, easy to run behind Nginx + PM2
- **Self-hosted file-backed DB**: zero external dependency for immediate deployment
- **SQL schema file included**: `server/migrations/001_init.sql` to migrate to PostgreSQL/MySQL when scaling
- **JWT + bcryptjs auth**: secure password hashing and stateless auth on VPS

This keeps the existing React UI/UX intact while replacing Supabase with self-managed infrastructure.

## 3) Updated Folder Structure

```text
.
├── src/
│   └── lib/customSupabaseClient.js   # compatibility client to new backend API
├── server/
│   ├── index.js                      # Express backend
│   ├── lib/db.js                     # file-db utilities
│   ├── data/db.json                  # persistent data store (auto-created)
│   ├── uploads/                      # uploaded assets served by backend
│   ├── migrations/001_init.sql       # SQL schema blueprint
│   └── .env.example
├── .env.example
└── package.json
```

## 4) Migration Strategy Implemented

- **Auth replacement**
  - Supabase auth methods replaced with API-backed methods:
    - `signUp`, `signInWithPassword`, `signOut`, `getSession`, `updateUser`, `signInWithOtp`, `resetPasswordForEmail`
- **Database replacement**
  - `supabase.from(...).select/insert/update/delete/upsert` now routed to `/api/query`
  - Filtering supports `eq`, `neq`, `in`, `ilike`, `match`, `or`, ordering and single/maybeSingle
- **Storage replacement**
  - `supabase.storage.from(bucket).upload(...)` now uploads to backend and stores files under `server/uploads`
  - public URLs served from `/uploads/...`
- **RPC replacement**
  - `vote_qa`, `vote_poll`, `get_user_emails`, `get_conversations` via `/api/rpc/:name`
- **Function replacement**
  - `generate-ticket`, `send-communication-email`, `update-user-by-admin` via `/api/functions/:name`
- **Realtime replacement**
  - Supabase channels replaced with local in-app channel bus compatible with existing hooks/components

## 5) Environment Variables

### Frontend (`.env`)
```bash
VITE_API_BASE_URL=http://localhost:4000
VITE_STRIPE_PUBLISHABLE_KEY=...
VITE_PAYPAL_CLIENT_ID=...
```

### Backend (`server/.env`)
```bash
PORT=4000
JWT_SECRET=replace-with-a-long-random-secret
API_ORIGIN=http://localhost:3000
```

## 6) Setup, Build, Run, Migrate

```bash
npm install
```

Run frontend:
```bash
npm run dev
```

Run backend:
```bash
npm run dev:api
```

Build frontend:
```bash
npm run build
```

Start backend in production:
```bash
npm run start:api
```

Migrate schema to PostgreSQL/MySQL manually:
```bash
# apply SQL in server/migrations/001_init.sql to your DB instance
```

Seed data:
- First sign-up call seeds `users` + `profiles` automatically.

## 7) Server Deployment Checklist (Any VPS/PaaS)

- [ ] Use Node.js **20.19.1** (see `.nvmrc`) or a compatible Node 20 LTS runtime.
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Configure frontend `.env` and backend `server/.env` for your domain and secrets.
- [ ] Build frontend assets:
  ```bash
  npm run build
  ```
- [ ] Start backend API in production:
  ```bash
  npm run start:api
  ```
- [ ] Run backend with a process manager (PM2/systemd/container restart policy).
- [ ] Serve `dist/` as static files (Nginx/Apache/CDN/object storage).
- [ ] Reverse proxy `/api` and `/uploads` to the backend port.
- [ ] Enable HTTPS and firewall rules for production.

## 8) Bugs Fixed List

- [x] Removed all direct Supabase SDK usage from runtime client.
- [x] Removed leaked hardcoded Supabase credentials.
- [x] Added backend API for auth/database/storage/function/RPC flows.
- [x] Added env templates for production-safe config.
- [x] Removed hardcoded Stripe test key fallback.

## 9) Final QA Checklist

- [ ] User sign-up and login
- [ ] Protected route redirects
- [ ] Event creation/editing/listing/details
- [ ] Ticket purchase/checkout and payment status updates
- [ ] Admin dashboards and user/event management
- [ ] File uploads (profile/event/sponsor/recording)
- [ ] Messaging and virtual event interactions
- [ ] Notifications and communications
- [ ] Production deployment smoke test on target server

## 10) Troubleshooting

- If frontend cannot call API, verify `VITE_API_BASE_URL`.
- If auth fails after deployment, rotate and verify `JWT_SECRET`.
- If uploads fail, ensure `server/uploads` is writable by the Node process.
- If CORS errors occur, set `API_ORIGIN` to your frontend domain.
