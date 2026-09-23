import "dotenv/config";
import { createApp } from "./app.js";
import { closePool, createPool, localDatabaseUrl } from "./db.js";

const pool = createPool();
try {
  const app = await createApp(pool);
  const port = Number(process.env.PORT || 3001);
  const host =
    process.env.HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  const server = app.listen(port, host, () => {
    console.log(`API ready at http://${host}:${port}`);
    if (!process.env.DATABASE_URL)
      console.log(`Local database: ${localDatabaseUrl}`);
  });
  const shutdown = async () => {
    server.close();
    await closePool(pool);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error("Backend startup failed:", error);
  await closePool(pool);
  process.exitCode = 1;
}
