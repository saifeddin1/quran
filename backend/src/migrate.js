import { createPool, migrate, closePool } from "./db.js";

const pool = createPool();
try {
  await migrate(pool);
  console.log("Database schema is ready.");
} finally {
  await closePool(pool);
}
