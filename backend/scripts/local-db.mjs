import "dotenv/config";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

if (process.env.DATABASE_URL) {
  console.log("Using DATABASE_URL; local PostgreSQL is not needed.");
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".data", "postgres");
const homebrewBin = "/opt/homebrew/opt/postgresql@18/bin";
function binary(name) {
  const test = spawnSync("which", [name], { encoding: "utf8" });
  return test.status === 0 ? test.stdout.trim() : path.join(homebrewBin, name);
}
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${path.basename(command)} failed (${result.status})`);
}
const pgCtl = binary("pg_ctl");
if (process.argv[2] === "stop") {
  const status = spawnSync(pgCtl, ["-D", dataDir, "status"], {
    stdio: "ignore",
  });
  if (status.status === 0) run(pgCtl, ["-D", dataDir, "stop", "-m", "fast"]);
  else console.log("Local PostgreSQL is already stopped.");
  process.exit(0);
}
try {
  await stat(path.join(dataDir, "PG_VERSION"));
} catch {
  await mkdir(path.dirname(dataDir), { recursive: true });
  run(binary("initdb"), [
    "-D",
    dataDir,
    "--username",
    os.userInfo().username,
    "--auth-local=trust",
    "--auth-host=trust",
  ]);
}
const status = spawnSync(pgCtl, ["-D", dataDir, "status"], { stdio: "ignore" });
if (status.status !== 0)
  run(pgCtl, [
    "-D",
    dataDir,
    "-o",
    "-h 127.0.0.1 -p 55432",
    "-l",
    path.join(root, ".data", "postgres.log"),
    "start",
  ]);
console.log("Local PostgreSQL is running on 127.0.0.1:55432.");
