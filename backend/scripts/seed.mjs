import "dotenv/config";
import {
  organization,
  announcements,
  events,
  classSessions,
} from "../../frontend/src/data/content.js";
import { createPool, migrate, closePool } from "../src/db.js";

if (process.env.DATABASE_URL && !process.argv.includes("--allow-remote")) {
  throw new Error(
    "Demo records are local-only. Pass --allow-remote only if you intentionally want fictional content in a remote database.",
  );
}
const pool = createPool();
try {
  await migrate(pool);
  await pool.query(
    "UPDATE settings SET data=$1::jsonb WHERE key='organization'",
    [JSON.stringify(organization)],
  );
  for (const [kind, records] of [
    ["announcements", announcements],
    ["events", events],
    ["classes", classSessions],
  ]) {
    for (const { id, ...data } of records) {
      await pool.query(
        "INSERT INTO content_items (id,kind,status,data) VALUES ($1,$2,'published',$3::jsonb) ON CONFLICT (id) DO NOTHING",
        [id, kind, JSON.stringify(data)],
      );
    }
  }
  console.log("Illustrative content is available in the local database.");
} finally {
  await closePool(pool);
}
