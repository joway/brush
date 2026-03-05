# Project Maintenance Guide

This document is for maintainers of the Magic Brush project (page-sharing site).

## Architecture Overview

- **Frontend**: Vite + React (`frontend/`)
- **Backend**: Cloudflare Workers (`workers/`)
- **Storage**:
  - HTML and history in R2
  - Relational data in D1
- **Auth**: Email + verification code (Resend) and Google sign-in

---

## Data Model (D1)

Main tables:
- `users` — account profiles
- `sessions` — auth tokens
- `email_codes` — verification codes
- `pages` — published pages
- `page_versions` — HTML version records
- `page_likes` — likes

Migrations live in `workers/migrations/` and are **destructive** after `0003`.

---

## Key APIs (Workers)

Base URL: `https://<worker>.<subdomain>.workers.dev`

Auth
- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/google`
- `GET /api/me`

Pages
- `POST /api/page/save`
- `GET /api/page/:uuid`
- `PATCH /api/page/:uuid`
- `DELETE /api/page/:uuid`
- `GET /api/pages?sort=latest|top&filter=public|mine`
- `POST /api/page/:uuid/like`
- `GET /api/page/:uuid/download`
- `GET /api/page/history/:uuid`
- `POST /api/page/history`

HTML rendering
- `GET /pages/:uuid?version={n}`

---

## Resend Configuration

Set these secrets/vars in Workers:
- `RESEND_API_KEY` (secret)
- `RESEND_FROM_EMAIL` (vars)
- `EMAIL_CODE_SECRET` (vars)
- `GOOGLE_CLIENT_ID` (vars, optional but required for strict Google audience check)

Local dev: use `workers/.dev.vars`.

---

## Admin Deletion

Admins are defined by `ADMIN_EMAILS` (comma-separated). Admins and page owners can delete pages.
Deletion removes:
- DB rows (pages, versions, likes)
- R2 objects (`{uuid}.html`, `{uuid}.history.json`, `{uuid}-v*.html`)

---

## Frontend Build & Deploy

Local build:
```
cd frontend
npm install
npm run build
```

Wrangler static assets deployment:
```
cd frontend
npm run build
npx wrangler deploy
```

## Deployment Checklist

### 1) Backend (Workers API)

1. Set secrets/vars:
```
cd workers
npx wrangler secret put RESEND_API_KEY
```
`workers/wrangler.toml` should include:
```
RESEND_FROM_EMAIL = "no-reply@yourdomain.com"
EMAIL_CODE_SECRET = "your-random-secret"
ADMIN_EMAILS = "admin1@example.com,admin2@example.com"
GOOGLE_CLIENT_ID = "your-google-oauth-client-id.apps.googleusercontent.com"
```

2. Apply migrations:
```
npx wrangler d1 migrations apply brush
```

3. Deploy:
```
npx wrangler deploy
```

### 2) Frontend (Static Assets via Wrangler)

1. Build:
```
cd frontend
npm install
npm run build
```

2. Deploy:
```
npx wrangler deploy
```

### 3) Smoke Tests

- Sign in with email code
- Sign in with Google
- Create a new page
- Toggle Public, Save, and refresh
- Embed iframe in `example.html`
- Like/unlike from Square
- Delete a page as owner/admin

---

## Migrations

Local (dev):
```
cd workers
npx wrangler d1 migrations apply brush --local
```

Production:
```
cd workers
npx wrangler d1 migrations apply brush
```

---

## Common Issues

1) **Email send failed**
- Check `RESEND_API_KEY` and verified sender domain

2) **D1_ERROR: no such table**
- Run migrations for the current environment

3) **CORS errors**
- Ensure DELETE/OPTIONS are allowed in `workers/src/index.ts`

---

## Last Updated

2026-03-05
