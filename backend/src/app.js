import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { migrate } from "./db.js";
import {
  cookieName,
  hashToken,
  sessionCookieOptions,
  startSession,
  verifyPassword,
} from "./auth.js";
import {
  loginSchema,
  organizationSchema,
  schemas,
  validate,
} from "./validation.js";
import { cleanContentRichText, cleanOrganizationRichText } from "./richText.js";

const uploadDirectory = path.resolve(process.env.LOCAL_UPLOAD_DIR || "uploads");
const mimeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
function hasImageSignature(file) {
  const bytes = file.buffer;
  if (file.mimetype === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/jpeg")
    return (
      bytes.length >= 4 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[bytes.length - 2] === 255 &&
      bytes[bytes.length - 1] === 217
    );
  if (file.mimetype === "image/webp")
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  return false;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, done) {
    done(null, Boolean(mimeExtensions[file.mimetype]));
  },
});

const allowedKinds = new Set(["announcements", "events", "classes"]);
const asData = (value) =>
  typeof value === "string" ? JSON.parse(value) : value;
const asyncRoute = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

function mapItem(row, isAdmin = false) {
  const { status: _status, imageId: _imageId, ...data } = asData(row.data);
  return {
    id: row.id,
    ...data,
    imageUrl: row.image_url || null,
    ...(isAdmin
      ? {
          status: row.status,
          imageId: row.image_id || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : {}),
  };
}

function sortItems(kind, items) {
  if (kind === "announcements")
    return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (kind === "events")
    return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return items.sort(
    (a, b) => a.day - b.day || a.startsAt.localeCompare(b.startsAt),
  );
}

async function listItems(pool, kind, isAdmin) {
  const query = `SELECT c.*, m.url AS image_url FROM content_items c LEFT JOIN media m ON m.id=c.image_id WHERE c.kind=$1 ${isAdmin ? "" : "AND c.status='published'"}`;
  const result = await pool.query(query, [kind]);
  return sortItems(
    kind,
    result.rows.map((row) => mapItem(row, isAdmin)),
  );
}

async function getItem(pool, kind, id, isAdmin) {
  const result = await pool.query(
    `SELECT c.*, m.url AS image_url FROM content_items c LEFT JOIN media m ON m.id=c.image_id WHERE c.kind=$1 AND c.id=$2 ${isAdmin ? "" : "AND c.status='published'"}`,
    [kind, id],
  );
  return result.rows[0] ? mapItem(result.rows[0], isAdmin) : null;
}

async function checkImage(pool, imageId) {
  if (!imageId) return true;
  const result = await pool.query("SELECT id FROM media WHERE id=$1", [
    imageId,
  ]);
  return result.rowCount > 0;
}

async function storeImage(file) {
  if (process.env.CLOUDINARY_URL) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "shatibi", resource_type: "image" },
        (error, data) => (error ? reject(error) : resolve(data)),
      );
      stream.end(file.buffer);
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      storage: "cloudinary",
    };
  }
  if (process.env.NODE_ENV === "production") {
    const error = new Error("Image storage is not configured");
    error.status = 503;
    throw error;
  }
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${mimeExtensions[file.mimetype]}`;
  await writeFile(path.join(uploadDirectory, filename), file.buffer, {
    flag: "wx",
  });
  return { url: `/uploads/${filename}`, publicId: filename, storage: "local" };
}

async function deleteImage(row) {
  if (row.storage === "cloudinary")
    await cloudinary.uploader.destroy(row.public_id, {
      resource_type: "image",
    });
  if (row.storage === "local")
    await unlink(
      path.join(uploadDirectory, path.basename(row.public_id)),
    ).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}

function enforceOrigin(request, response, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  const origin = request.get("origin");
  if (!origin) return next();
  const allowed = new Set([
    `${request.protocol}://${request.get("host")}`,
    process.env.APP_ORIGIN,
    ...(process.env.NODE_ENV === "production"
      ? []
      : ["http://127.0.0.1:5173", "http://localhost:5173"]),
  ]);
  if (!allowed.has(origin))
    return response.status(403).json({ error: "Origin not allowed" });
  next();
}

export async function createApp(pool, { migrateDatabase = true } = {}) {
  if (migrateDatabase) await migrate(pool);
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "300kb" }));
  app.use(cookieParser());
  app.use(enforceOrigin);
  if (process.env.NODE_ENV !== "production")
    app.use("/uploads", express.static(uploadDirectory));

  app.get("/api/health", (_request, response) => response.json({ ok: true }));

  app.get(
    "/api/public/organization",
    asyncRoute(async (_request, response) => {
      const result = await pool.query(
        "SELECT data FROM settings WHERE key='organization'",
      );
      response.json(asData(result.rows[0].data));
    }),
  );

  app.get(
    "/api/public/:kind",
    asyncRoute(async (request, response) => {
      const { kind } = request.params;
      if (!allowedKinds.has(kind))
        return response.status(404).json({ error: "Not found" });
      response.json(await listItems(pool, kind, false));
    }),
  );

  app.get(
    "/api/public/:kind/:id",
    asyncRoute(async (request, response) => {
      const { kind, id } = request.params;
      if (!allowedKinds.has(kind) || kind === "classes")
        return response.status(404).json({ error: "Not found" });
      const item = await getItem(pool, kind, id, false);
      if (!item) return response.status(404).json({ error: "Not found" });
      response.json(item);
    }),
  );

  app.post(
    "/api/auth/login",
    asyncRoute(async (request, response) => {
      const parsed = validate(loginSchema, request.body);
      if (parsed.error)
        return response.status(400).json({ error: "Invalid credentials" });
      const { email, password } = parsed.value;
      const prior = await pool.query(
        "SELECT failures,window_started FROM login_attempts WHERE email=$1",
        [email],
      );
      const old = prior.rows[0];
      const withinWindow =
        old &&
        Date.now() - new Date(old.window_started).getTime() < 15 * 60 * 1000;
      if (withinWindow && old.failures >= 5)
        return response
          .status(429)
          .json({ error: "Too many attempts. Try again later." });
      const result = await pool.query(
        "SELECT id,email,password_hash FROM admins WHERE email=$1",
        [email],
      );
      const admin = result.rows[0];
      if (!admin || !(await verifyPassword(password, admin.password_hash))) {
        const failures = withinWindow ? old.failures + 1 : 1;
        await pool.query(
          "INSERT INTO login_attempts (email,failures,window_started) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET failures=$2,window_started=$3",
          [
            email,
            failures,
            withinWindow ? old.window_started : new Date().toISOString(),
          ],
        );
        return response.status(401).json({ error: "Invalid credentials" });
      }
      await pool.query("DELETE FROM login_attempts WHERE email=$1", [email]);
      const token = await startSession(pool, admin.id);
      response.cookie(cookieName, token, sessionCookieOptions());
      response.json({ id: admin.id, email: admin.email });
    }),
  );

  const requireAdmin = asyncRoute(async (request, response, next) => {
    const token = request.cookies[cookieName];
    if (!token) return response.status(401).json({ error: "Login required" });
    const result = await pool.query(
      "SELECT a.id,a.email FROM admin_sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at > $2",
      [hashToken(token), new Date().toISOString()],
    );
    if (!result.rows[0])
      return response.status(401).json({ error: "Login required" });
    request.admin = result.rows[0];
    next();
  });

  app.get("/api/auth/me", requireAdmin, (request, response) =>
    response.json(request.admin),
  );
  app.post(
    "/api/auth/logout",
    requireAdmin,
    asyncRoute(async (request, response) => {
      await pool.query("DELETE FROM admin_sessions WHERE token_hash=$1", [
        hashToken(request.cookies[cookieName]),
      ]);
      response.clearCookie(cookieName, {
        path: "/api",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      response.status(204).end();
    }),
  );

  app.use("/api/admin", requireAdmin);

  app.get(
    "/api/admin/organization",
    asyncRoute(async (_request, response) => {
      const result = await pool.query(
        "SELECT data FROM settings WHERE key='organization'",
      );
      response.json(asData(result.rows[0].data));
    }),
  );
  app.put(
    "/api/admin/organization",
    asyncRoute(async (request, response) => {
      const parsed = validate(organizationSchema, request.body);
      if (parsed.error)
        return response
          .status(400)
          .json({ error: "Validation failed", fields: parsed.error });
      const cleaned = cleanOrganizationRichText(parsed.value);
      await pool.query(
        "UPDATE settings SET data=$1::jsonb,updated_at=now() WHERE key='organization'",
        [JSON.stringify(cleaned)],
      );
      response.json(cleaned);
    }),
  );

  app.get(
    "/api/admin/dashboard",
    asyncRoute(async (_request, response) => {
      const result = await pool.query(
        "SELECT kind,status,data FROM content_items",
      );
      const counts = {
        announcements: { published: 0, draft: 0 },
        events: { published: 0, draft: 0 },
        classes: { published: 0, draft: 0 },
      };
      const weekdayClasses = [0, 0, 0, 0, 0, 0, 0];
      const monthlyAnnouncements = {};
      let upcomingEvents = 0;
      for (const item of result.rows) {
        counts[item.kind][item.status]++;
        const data = asData(item.data);
        if (item.kind === "classes" && item.status === "published")
          weekdayClasses[data.day - 1]++;
        if (
          item.kind === "events" &&
          item.status === "published" &&
          Date.parse(data.endsAt) >= Date.now()
        )
          upcomingEvents++;
        if (item.kind === "announcements" && item.status === "published") {
          const month = data.publishedAt.slice(0, 7);
          monthlyAnnouncements[month] = (monthlyAnnouncements[month] || 0) + 1;
        }
      }
      response.json({
        counts,
        upcomingEvents,
        weekdayClasses,
        monthlyAnnouncements,
      });
    }),
  );

  app.get(
    "/api/admin/:kind",
    asyncRoute(async (request, response, next) => {
      const { kind } = request.params;
      if (!allowedKinds.has(kind)) return next();
      response.json(await listItems(pool, kind, true));
    }),
  );

  app.post(
    "/api/admin/:kind",
    asyncRoute(async (request, response, next) => {
      const { kind } = request.params;
      if (!allowedKinds.has(kind)) return next();
      const parsed = validate(schemas[kind], request.body);
      if (parsed.error)
        return response
          .status(400)
          .json({ error: "Validation failed", fields: parsed.error });
      const {
        status,
        imageId = null,
        ...data
      } = cleanContentRichText(kind, parsed.value);
      if (!(await checkImage(pool, imageId)))
        return response.status(400).json({ error: "Image not found" });
      const id = randomUUID();
      await pool.query(
        "INSERT INTO content_items (id,kind,status,data,image_id) VALUES ($1,$2,$3,$4::jsonb,$5)",
        [id, kind, status, JSON.stringify(data), imageId],
      );
      response.status(201).json(await getItem(pool, kind, id, true));
    }),
  );

  app.put(
    "/api/admin/:kind/:id",
    asyncRoute(async (request, response, next) => {
      const { kind, id } = request.params;
      if (!allowedKinds.has(kind)) return next();
      const parsed = validate(schemas[kind], request.body);
      if (parsed.error)
        return response
          .status(400)
          .json({ error: "Validation failed", fields: parsed.error });
      const {
        status,
        imageId = null,
        ...data
      } = cleanContentRichText(kind, parsed.value);
      if (!(await checkImage(pool, imageId)))
        return response.status(400).json({ error: "Image not found" });
      const result = await pool.query(
        "UPDATE content_items SET status=$1,data=$2::jsonb,image_id=$3,updated_at=now() WHERE id=$4 AND kind=$5",
        [status, JSON.stringify(data), imageId, id, kind],
      );
      if (!result.rowCount)
        return response.status(404).json({ error: "Not found" });
      response.json(await getItem(pool, kind, id, true));
    }),
  );

  app.delete(
    "/api/admin/:kind/:id",
    asyncRoute(async (request, response, next) => {
      const { kind, id } = request.params;
      if (!allowedKinds.has(kind)) return next();
      const result = await pool.query(
        "DELETE FROM content_items WHERE id=$1 AND kind=$2",
        [id, kind],
      );
      if (!result.rowCount)
        return response.status(404).json({ error: "Not found" });
      response.status(204).end();
    }),
  );

  app.get(
    "/api/admin/media",
    asyncRoute(async (_request, response) => {
      const result = await pool.query(
        "SELECT * FROM media ORDER BY created_at DESC",
      );
      response.json(
        result.rows.map((row) => ({
          id: row.id,
          url: row.url,
          mimeType: row.mime_type,
          bytes: row.bytes,
          createdAt: row.created_at,
        })),
      );
    }),
  );

  app.post(
    "/api/admin/media",
    upload.single("image"),
    asyncRoute(async (request, response) => {
      if (!request.file)
        return response
          .status(400)
          .json({ error: "Choose a JPEG, PNG, or WebP image up to 4 MB" });
      if (!hasImageSignature(request.file))
        return response.status(400).json({ error: "Invalid image file" });
      const stored = await storeImage(request.file);
      const id = randomUUID();
      try {
        await pool.query(
          "INSERT INTO media (id,url,public_id,storage,mime_type,bytes) VALUES ($1,$2,$3,$4,$5,$6)",
          [
            id,
            stored.url,
            stored.publicId,
            stored.storage,
            request.file.mimetype,
            request.file.size,
          ],
        );
      } catch (error) {
        await deleteImage({
          storage: stored.storage,
          public_id: stored.publicId,
        }).catch(() => {});
        throw error;
      }
      response.status(201).json({
        id,
        url: stored.url,
        mimeType: request.file.mimetype,
        bytes: request.file.size,
      });
    }),
  );

  app.delete(
    "/api/admin/media/:id",
    asyncRoute(async (request, response) => {
      const result = await pool.query("SELECT * FROM media WHERE id=$1", [
        request.params.id,
      ]);
      const item = result.rows[0];
      if (!item) return response.status(404).json({ error: "Not found" });
      const inUse = await pool.query(
        "SELECT id FROM content_items WHERE image_id=$1 LIMIT 1",
        [item.id],
      );
      if (inUse.rowCount)
        return response.status(409).json({ error: "Image is in use" });
      await deleteImage(item);
      await pool.query("DELETE FROM media WHERE id=$1", [item.id]);
      response.status(204).end();
    }),
  );

  app.use("/api", (_request, response) =>
    response.status(404).json({ error: "Not found" }),
  );
  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError)
      return response.status(400).json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "Image exceeds 4 MB"
            : "Invalid upload",
      });
    console.error(error);
    response
      .status(error.status || 500)
      .json({ error: error.status === 503 ? error.message : "Server error" });
  });
  return app;
}
