import serverless from "serverless-http";
import { createApp } from "../../src/app.js";
import { createPool } from "../../src/db.js";

// The Netlify build needs dev dependencies; only the Function runtime is production.
process.env.NODE_ENV = "production";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required for the Netlify API Function.");

const pool = createPool();
let appPromise;

export async function handler(event, context) {
  appPromise ??= createApp(pool, { migrateDatabase: false }).then((app) =>
    serverless(app),
  );
  const invoke = await appPromise;
  return invoke(event, context);
}
