# Eventhost (Self-Hosted VPS Edition)

Eventhost is a full-stack event management platform built to run entirely on a self-hosted VPS (e.g. Hostinger) with no third-party backend dependencies.

## 1) Architecture

### Framework and runtime
- Frontend: **React 18 + Vite + Tailwind**
- Router: **react-router-dom**
- UI: Radix + custom components
- Backend: **Node.js + Express API**
- Data store: **self-hosted JSON DB file (`server/data/db.json`)** with SQL migration blueprint for PostgreSQL/MySQL in `server/migrations/001_init.sql`

### Key capabilities
- Auth/session via JWT + bcrypt password hashing
- DB queries via Express API (`/api/query`)
- Storage uploads via Express API (`/api/storage/upload`)
- RPC + custom functions via Express API
- In-app realtime channel bus for live event features

## 2) Stack Details

Chosen stack for Hostinger VPS:
- **Node.js + Express**: stable, lightweight, easy to run behind Nginx + PM2
- **Self-hosted file-backed DB**: zero external dependency for immediate deployment
- **SQL schema file included**: `server/migrations/001_init.sql` to migrate to PostgreSQL/MySQL when scaling
- **JWT + bcryptjs auth**: secure password hashing and stateless auth on VPS

## 3) Folder Structure

```text
.
├── src/
│   ├── lib/client.js              # backend API client
│   ├── lib/backendClient.js       # app-facing backend client alias
│   └── context/AuthContext.jsx    # auth context provider
├── server/
│   ├── index.js                   # Express backend
│   ├── lib/db.js                  # file-db utilities
│   ├── data/db.json               # persistent data store (auto-created)
│   ├── uploads/                   # uploaded assets served by backend
│   ├── migrations/001_init.sql    # SQL schema blueprint
│   └── .env.example
├── .env.example
└── package.json
```

## 4) Features

- **Auth**: `signUp`, `signInWithPassword`, `signOut`, `getSession`, `updateUser`, `signInWithOtp`, `resetPasswordForEmail`
- **Database**: Query builder for `select/insert/update/delete/upsert` routed to `/api/query` with filtering (`eq`, `neq`, `in`, `ilike`, `match`, `or`), ordering, and single/maybeSingle
- **Storage**: File uploads via `/api/storage/upload`, public URLs served from `/uploads/...`
- **RPC**: `vote_qa`, `vote_poll`, `get_user_emails`, `get_conversations` via `/api/rpc/:name`
- **Functions**: `generate-ticket`, `send-communication-email`, `update-user-by-admin` via `/api/functions/:name`
- **Realtime**: Local in-app channel bus compatible with existing hooks/components

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

## 6) Setup, Build, Run

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

## 8) QA Checklist

- [ ] User sign-up and login
- [ ] Protected route redirects
- [ ] Event creation/editing/listing/details
- [ ] Ticket purchase/checkout and payment status updates
- [ ] Admin dashboards and user/event management
- [ ] File uploads (profile/event/sponsor/recording)
- [ ] Messaging and virtual event interactions
- [ ] Notifications and communications
- [ ] Production deployment smoke test on target server

## 9) Troubleshooting

- If frontend cannot call API, verify `VITE_API_BASE_URL`.
- If auth fails after deployment, rotate and verify `JWT_SECRET`.
- If uploads fail, ensure `server/uploads` is writable by the Node process.
- If CORS errors occur, set `API_ORIGIN` to your frontend domain.
