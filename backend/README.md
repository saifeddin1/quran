# Express backend

The Express API powers the Arabic/French presentation site and the staff area. PostgreSQL stores admins, sessions, organization details, content, and uploaded-image references. The local database is persistent; Neon can replace its connection URL for deployment. Cloudinary stores production images; local development saves images in `uploads/`.

## Local start

Use Node.js 22+ and PostgreSQL 18 on macOS. This project's local start script finds PostgreSQL binaries on `PATH` or at `/opt/homebrew/opt/postgresql@18/bin`. It starts a private cluster bound only to `127.0.0.1:55432` under `.data/`.

```sh
npm install
npm run dev
```

Start the React frontend separately with `cd ../frontend && npm run dev`. If this is a fresh database, create a staff account and optionally seed fictional examples:

```sh
npm run admin:create
npm run db:seed
```

`admin:create` prompts for an email and a password of at least 12 characters; use this account at `http://127.0.0.1:5173/woloj`. `db:seed` is deliberately local-only by default and can be run more than once without duplicating records. It copies illustrative records from `frontend/src/data/content.js`. Do not treat those sample dates or places as official information.

Run `npm test` for API integration tests. `npm run db:stop` stops the local PostgreSQL process. Deleting `.data/` resets local data, but do that only when you intentionally want a fresh database.

## Admin workflow

The protected `/admin` React area has a dashboard with content and weekly-class charts, plus bilingual editors for announcements, events, classes, and organization text. Editors can save drafts or publish. Public endpoints expose only published records. Announcement and event images can be uploaded from their editors, changed, or removed from a record. Unused images can be deleted in the media library. The same account can access all content; create another admin with `npm run admin:create` if needed.

Browser sessions use an HTTP-only, SameSite cookie and server-side token hashes. Passwords use salted scrypt hashes. Login attempts are limited per email. Requests validate content and require an admin session for every private endpoint. Write requests check the browser origin. Uploaded images must be JPEG, PNG, or WebP and at most 4 MB so uploads fit Netlify Functions' request limit.

## API outline

- `GET /api/health`
- `GET /api/public/organization`, `/announcements`, `/announcements/:id`, `/events`, `/events/:id`, `/classes`
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/admin/dashboard`, `GET/PUT /api/admin/organization`
- `GET/POST /api/admin/{announcements|events|classes}` and `PUT/DELETE /api/admin/{kind}/:id`
- `GET/POST /api/admin/media`, `DELETE /api/admin/media/:id`

Content uses stable IDs and localized `{ ar, fr }` fields. Arabic content is required. French content is optional; when a French field is missing or blank, the API copies its Arabic counterpart into the French field before saving. Newly edited announcement/event bodies, excerpts, and organization descriptions use limited HTML from the rich-text editor. Older illustrative article bodies stored as paragraph arrays remain readable and editable. The API sanitizes HTML before storing it; the public frontend sanitizes it again before rendering. Event timestamps include an offset; class weekdays use Monday=1 through Sunday=7. The API returns `404` for unknown records, `400` for invalid input, and `401` for missing admin sessions.

## Netlify deployment

Copy `.env.example` to `.env` locally if you need custom settings. Never commit `.env`. The Netlify Function sets production mode itself and requires `DATABASE_URL` (Neon pooled PostgreSQL URL); set `APP_ORIGIN` to the site's HTTPS origin and `CLOUDINARY_URL` for image uploads. Without Cloudinary, production uploads return `503` rather than writing to ephemeral disk. Run `npm run db:migrate` once against Neon before the first deployment; the Function deliberately does not run schema changes on cold starts. Then create the first production admin with `npm run admin:create` from a trusted local terminal using the same Neon connection. Do not run `db:seed` on production. See [the deployment guide](../DEPLOYMENT.md) for the full sequence.

The Netlify Function entry point is `backend/netlify/functions/api.mjs`; the root `netlify.toml` maps `/api/*` to it and serves the Vite build.
