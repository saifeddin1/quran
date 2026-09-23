import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const cookieName = "shatibi_session";
export const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, expected] = stored?.split(":") || [];
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = await scrypt(password, salt, 64);
  const previous = Buffer.from(expected, "hex");
  return previous.length === actual.length && timingSafeEqual(previous, actual);
}

export async function createAdmin(pool, email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (password.length < 12)
    throw new Error("Use at least 12 characters for the password.");
  const id = randomUUID();
  await pool.query(
    "INSERT INTO admins (id,email,password_hash) VALUES ($1,$2,$3)",
    [id, email.toLowerCase(), await hashPassword(password)],
  );
  return { id, email: email.toLowerCase() };
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(pool, adminId) {
  const token = randomBytes(32).toString("hex");
  await pool.query("DELETE FROM admin_sessions WHERE expires_at <= $1", [
    new Date().toISOString(),
  ]);
  await pool.query(
    "INSERT INTO admin_sessions (token_hash,admin_id,expires_at) VALUES ($1,$2,$3)",
    [
      hashToken(token),
      adminId,
      new Date(Date.now() + sessionLifetimeMs).toISOString(),
    ],
  );
  return token;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: sessionLifetimeMs,
  };
}
