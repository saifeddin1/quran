# Imam Al-Châtibi website

This repository contains an Arabic-first React/Vite website and a JavaScript/Express backend. The public pages are at `/ar` and `/fr`. Staff sign in at `/woloj` and manage content at `/admin`.

## Test locally

The project is configured for this Mac's local PostgreSQL 18. In one terminal:

```sh
cd backend
npm install
npm run dev
```

`npm run dev` starts a PostgreSQL instance stored in `backend/.data/` and the API at `http://127.0.0.1:3001`. In another terminal, run `npm run db:seed` once if you want the illustrative content. Run `npm run admin:create` to create your own admin login; it prompts for an email and a password of at least 12 characters. These commands are run from `backend/`.

In a third terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the Vite URL, then visit `/woloj`. The frontend proxies `/api` and local uploaded images to Express. Edits are saved to the local database and remain after restarts. To stop the database later, run `npm run db:stop` from `backend/`.

There is already a **local-only test admin** in this machine's development database: `local-test@example.test` / `LocalTestPassword2026!`. It is not part of the source code or a future deployment.

## Structure

- [Frontend guide](frontend/README.md): public pages, bilingual admin interface, and UI tests.
- [Backend guide](backend/README.md): content API, authentication, PostgreSQL, and image storage.

Nothing has been deployed yet. [The deployment guide](DEPLOYMENT.md) covers the prepared Netlify site and Function, Neon PostgreSQL, Cloudinary image storage, and the remaining account setup.
