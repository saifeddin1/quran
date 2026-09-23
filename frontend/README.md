# Imam Al-Châtibi frontend

Arabic-first React/Vite public pages and a bilingual staff interface. The public site has `/ar` and `/fr` routes for announcements, events, and weekly classes. Staff sign in at `/woloj` and use `/admin` for the dashboard and content editors.

## Run locally

Start the Express backend first; see [the backend guide](../backend/README.md). From `frontend/`:

```sh
npm install
npm run dev
```

Open the URL Vite prints. Its development proxy sends `/api` and local `/uploads` requests to `http://127.0.0.1:3001`. The frontend reads live content from the local API in development and production. `npm run build` creates `dist/`; nothing is deployed automatically.

## Content and translations

Edit announcements, events, weekly classes, and organization text through `/admin`. Arabic is required, while French is optional; saving copies Arabic into each blank French field, and both are stored in the database record. The longer fields use a simple rich-text editor with emphasis, lists, headings, quotes, links, and undo/redo; short titles and labels remain plain text. Drafts are private; published records appear on the public site. Images attached to announcements and events appear on cards and detail pages.

`src/locales/messages.js` holds public interface labels; `src/admin/AdminApp.jsx` holds admin labels. `src/data/content.js` is the illustrative seed source for local development and a fallback used by isolated frontend tests. The live content adapter is `src/services/contentService.js`. Shared public styling is in `src/styles.css`; admin styling is in `src/admin/admin.css`.

Fonts are bundled locally: Amiri headings, Noto Naskh Arabic body, and Noto Sans French. `public/quran-hero.jpg` is an illustrative generated image, not a photograph of the organization.

## Routes and behavior

The root defaults to Arabic. Public language switching preserves detail IDs and timetable `?day=` selection; the selected language is remembered in localStorage. The admin area uses the same Arabic/French preference. The admin login page is `/woloj`; successful login opens `/admin`. The Express API enforces authentication for private endpoints regardless of the frontend route guard.

## Verification

```sh
npm test
npm run build
```

Tests cover content contracts, date formatting, public loading and empty states, locale switching, and a regression check for admin routes that overlap public paths. For a text-enlargement check, visit `/tests/fixtures/text-enlargement.html` on the development server. The root `netlify.toml` provides a SPA fallback to `index.html` for direct routes after deployment.

## Hero image provenance

Created with the built-in Imagegen tool and saved as `public/quran-hero.jpg`. Prompt:

> Photorealistic quiet close-up of a closed elegant dark sage green Quran with fine gold geometric ornamentation and absolutely no readable writing or lettering, resting respectfully on a carved wooden book stand. Softly sunlit cream mosque room, subtle soft-focus architectural arch and teal geometric window shadow behind the book, faint olive greenery at the edge. Square photograph; Quran and stand in center lower half for a tall-arch crop. Real leather and wood grain, warm morning sunlight, peaceful ivory/turquoise/sage palette. No people, text, writing, calligraphy, lettering, watermark, logos, or UI.

The image is illustrative; the cover contains decorative gold script-like ornament.
