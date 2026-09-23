# Hosting preparation

The intended stack is one Netlify site for the Vite frontend and Express API, Neon PostgreSQL for content and admin sessions, and Cloudinary for uploaded images. The API runs as a Netlify Function at `/api/*`; `/ar`, `/fr`, `/woloj`, and `/admin` remain same-origin routes. This repository is configured for a root-level Netlify project with no base directory. [Netlify's Express guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/) describes this Function pattern.

## Before the first deploy

1. Sign in to Netlify, Neon, and Cloudinary. Create one project/site on each free plan. Keep the Netlify Function and Neon database in nearby regions when the consoles offer a choice.
2. In Neon, copy the **pooled** PostgreSQL connection string, including `sslmode=require`. Keep it private. The backend uses ordinary `pg` connections against this URL. [Neon's connection-pooling guidance](https://neon.com/docs/connect/connection-pooling) explains the pooled endpoint.
3. In Cloudinary, copy the server-side `CLOUDINARY_URL` from API settings. It contains the API secret and must never be prefixed `VITE_` or placed in the frontend. [Cloudinary's Node SDK guide](https://cloudinary.com/documentation/node_integration) documents this setting.
4. Create or link the Netlify site using the repository root as its base directory. The checked-in [netlify.toml](netlify.toml) defines the build, publish folder, Function, and rewrites. Add `DATABASE_URL`, `CLOUDINARY_URL`, and `APP_ORIGIN` in Netlify's environment-variable UI; use the site's HTTPS origin for `APP_ORIGIN`. Netlify Function runtime variables must be set in the UI, CLI, or API, not only in `netlify.toml`. On Netlify's Free plan, variables apply to all scopes, so the secret names must remain server-side and must not start with `VITE_`. [Netlify environment-variable docs](https://docs.netlify.com/build/functions/environment-variables/).
5. Before invoking the deployed API, use the Neon URL from a trusted local terminal to run `npm run db:migrate` in `backend/`. Then run `npm run admin:create` to create a **new production admin**. The local test admin, sessions, and passwords are not copied. The Netlify Function deliberately skips schema migration on cold starts.
6. Build and test a Netlify draft deploy first. Verify `/api/public/organization` (database connectivity), `/woloj` login, `/admin`, direct page refreshes, Arabic/French pages, and a test image upload and deletion. Once content is approved, publish a production deploy.

Do not run `npm run db:seed` against Neon: the seed records are illustrative. Decide which, if any, locally edited records should be moved to production before migration. Local images must be uploaded to Cloudinary; paths under `backend/uploads/` will not work on Netlify. Admin content edits after launch write to Neon and Cloudinary immediately and do not require a new Netlify deploy.

## Local and production differences

- Local development still runs `npm run dev` separately in `backend/` and `frontend/`, with local PostgreSQL and local image files. A stopped backend server stays stopped until you run it again.
- Netlify builds with Node 22 via `.nvmrc` and installs dependencies from both package lockfiles. The Function sets production mode and reuses a small PostgreSQL pool across warm invocations. Run schema changes explicitly before code deployments that depend on them.
- Images are limited to 4 MB, leaving room under [Netlify's 6 MB buffered Function request limit](https://docs.netlify.com/build/functions/configuration/) after binary data is base64-encoded.
- `backend/.env` is ignored by Git and is suitable for local commands that need the Neon URL. Never commit credentials. Netlify stores live variables separately from source code.
- Free plans have usage limits. The current [Netlify pricing](https://www.netlify.com/pricing/), [Neon Free-plan information](https://neon.com/blog/neon-backend-is-ga), and [Cloudinary pricing](https://cloudinary.com/pricing) should be checked in the account dashboards before launch and monitored after launch.
