import "dotenv/config";
import os from "node:os";
import pg from "pg";
import { defaultOrganization } from "./defaults.js";

export const localDatabaseUrl = `postgresql://${encodeURIComponent(os.userInfo().username)}@127.0.0.1:55432/postgres`;

export function createPool(
  connectionString = process.env.DATABASE_URL || localDatabaseUrl,
) {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production.");
  }
  return new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 10000 });
}

export async function migrate(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash text PRIMARY KEY,
      admin_id text NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      email text PRIMARY KEY,
      failures integer NOT NULL,
      window_started timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS media (
      id text PRIMARY KEY,
      url text NOT NULL,
      public_id text,
      storage text NOT NULL,
      mime_type text NOT NULL,
      bytes integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS content_items (
      id text PRIMARY KEY,
      kind text NOT NULL CHECK (kind IN ('announcements','events','classes')),
      status text NOT NULL CHECK (status IN ('draft','published')),
      data jsonb NOT NULL,
      image_id text REFERENCES media(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS content_items_kind_status ON content_items(kind, status);
  `);
  await pool.query(
    "INSERT INTO settings (key, data) VALUES ('organization', $1::jsonb) ON CONFLICT (key) DO NOTHING",
    [JSON.stringify(defaultOrganization)],
  );
}

export async function closePool(pool) {
  if (pool?.end) await pool.end();
}
