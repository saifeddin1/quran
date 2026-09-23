import "dotenv/config";
import readline from "node:readline/promises";
import { createAdmin } from "../src/auth.js";
import { closePool, createPool, migrate } from "../src/db.js";

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
let pool;
try {
  const email =
    process.env.ADMIN_EMAIL || (await input.question("Admin email: "));
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (!process.stdin.isTTY)
      throw new Error("Set ADMIN_PASSWORD when running without a terminal.");
    input.close();
    password = await new Promise((resolve, reject) => {
      let value = "";
      process.stdout.write("Password (12+ characters): ");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      const onData = (chunk) => {
        for (const character of chunk.toString()) {
          if (character === "\r" || character === "\n") {
            process.stdin.off("data", onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write("\n");
            resolve(value);
            return;
          }
          if (character === "\u0003") {
            process.stdin.off("data", onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            reject(new Error("Cancelled"));
            return;
          }
          if (character === "\u007f") {
            value = value.slice(0, -1);
          } else if (character >= " ") {
            value += character;
          }
        }
      };
      process.stdin.on("data", onData);
    });
  }
  pool = createPool();
  await migrate(pool);
  const admin = await createAdmin(pool, email.trim(), password);
  console.log(`Created admin ${admin.email}.`);
} catch (error) {
  console.error(
    error.code === "23505"
      ? "An admin with that email already exists."
      : error.message,
  );
  process.exitCode = 1;
} finally {
  input.close();
  await closePool(pool);
}
