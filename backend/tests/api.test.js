import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import serverless from "serverless-http";
import { createApp } from "../src/app.js";
import { createAdmin } from "../src/auth.js";
import { defaultOrganization } from "../src/defaults.js";
import { cleanRichText } from "../src/richText.js";

async function setup() {
  const memory = newDb();
  const { Pool } = memory.adapters.createPg();
  const pool = new Pool();
  const app = await createApp(pool);
  await createAdmin(pool, "admin@example.test", "very-secure-test-password");
  const agent = request.agent(app);
  return { app, pool, agent };
}

const announcement = {
  category: { ar: "أخبار", fr: "Actualités" },
  title: { ar: "عنوان تجريبي", fr: "Titre de test" },
  excerpt: { ar: "ملخص تجريبي", fr: "Résumé de test" },
  body: { ar: ["الفقرة الأولى"], fr: ["Premier paragraphe"] },
  publishedAt: "2026-10-03",
  status: "draft",
  imageId: null,
};

test("Netlify Function adapter preserves API routes", async () => {
  const { app, pool } = await setup();
  const invoke = serverless(app);
  const response = await invoke(
    {
      httpMethod: "GET",
      path: "/api/health",
      headers: { host: "example.netlify.app" },
      requestContext: {},
    },
    {},
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true });
  await pool.end();
});

test("admin login gates edits; drafts stay private until published; dashboard follows state", async () => {
  const { app, pool, agent } = await setup();
  assert.equal((await request(app).get("/api/health")).status, 200);
  assert.equal((await request(app).get("/api/auth/me")).status, 401);
  assert.equal(
    (await request(app).post("/api/admin/announcements").send(announcement))
      .status,
    401,
  );
  assert.equal(
    (
      await agent
        .post("/api/auth/login")
        .send({ email: "admin@example.test", password: "wrong" })
    ).status,
    401,
  );
  assert.equal(
    (
      await agent.post("/api/auth/login").send({
        email: "admin@example.test",
        password: "very-secure-test-password",
      })
    ).status,
    200,
  );
  assert.equal(
    (await agent.get("/api/auth/me")).body.email,
    "admin@example.test",
  );

  const organization = {
    ...defaultOrganization,
    mission: { ar: "رسالة محدّثة", fr: "Mission mise à jour" },
  };
  assert.equal(
    (await agent.put("/api/admin/organization").send(organization)).status,
    200,
  );
  assert.equal(
    (await request(app).get("/api/public/organization")).body.mission.fr,
    "<p>Mission mise à jour</p>",
  );

  const created = await agent
    .post("/api/admin/announcements")
    .send(announcement);
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "draft");
  const id = created.body.id;
  assert.equal(
    (await request(app).get("/api/public/announcements")).body.length,
    0,
  );
  assert.equal(
    (await request(app).get(`/api/public/announcements/${id}`)).status,
    404,
  );

  const updated = await agent
    .put(`/api/admin/announcements/${id}`)
    .send({ ...announcement, status: "published" });
  assert.equal(updated.status, 200);
  assert.equal(
    (await request(app).get("/api/public/announcements")).body[0].title.fr,
    "Titre de test",
  );
  assert.equal(
    (await agent.get("/api/admin/dashboard")).body.counts.announcements
      .published,
    1,
  );
  assert.equal(
    (await agent.delete(`/api/admin/announcements/${id}`)).status,
    204,
  );
  assert.equal(
    (await request(app).get("/api/public/announcements")).body.length,
    0,
  );
  assert.equal((await agent.post("/api/auth/logout")).status, 204);
  assert.equal((await agent.get("/api/auth/me")).status, 401);
  await pool.end();
});

test("validates Arabic records, event times and class order", async () => {
  const { app, pool, agent } = await setup();
  await agent.post("/api/auth/login").send({
    email: "admin@example.test",
    password: "very-secure-test-password",
  });
  assert.equal(
    (
      await agent
        .post("/api/admin/announcements")
        .send({ ...announcement, title: { fr: "Français seulement" } })
    ).status,
    400,
  );
  const event = {
    ...announcement,
    startsAt: "2026-10-03T12:00:00+01:00",
    endsAt: "2026-10-03T11:00:00+01:00",
    location: { ar: "قاعة", fr: "Salle" },
  };
  delete event.publishedAt;
  assert.equal((await agent.post("/api/admin/events").send(event)).status, 400);
  const session = {
    day: 2,
    startsAt: "09:00",
    endsAt: "10:00",
    subject: announcement.title,
    audience: announcement.category,
    instructor: announcement.title,
    room: announcement.category,
    level: announcement.title,
    status: "published",
  };
  assert.equal(
    (await agent.post("/api/admin/classes").send(session)).status,
    201,
  );
  assert.equal(
    (
      await agent
        .post("/api/admin/classes")
        .send({ ...session, day: 1, startsAt: "11:00", endsAt: "12:00" })
    ).status,
    201,
  );
  const classes = (await request(app).get("/api/public/classes")).body;
  assert.deepEqual(
    classes.map((item) => item.day),
    [1, 2],
  );
  assert.equal(
    (await request(app).get("/api/public/events/missing")).status,
    404,
  );
  await pool.end();
});

test("copies missing or blank French content into stored records", async () => {
  const { app, pool, agent } = await setup();
  await agent.post("/api/auth/login").send({
    email: "admin@example.test",
    password: "very-secure-test-password",
  });

  const created = await agent.post("/api/admin/announcements").send({
    ...announcement,
    status: "published",
    category: { ar: "أخبار" },
    title: { ar: "عنوان عربي", fr: "   " },
    excerpt: { ar: "<p>ملخص عربي</p>", fr: "" },
    body: { ar: "<h2>عنوان</h2><p>نص عربي</p>", fr: "<p></p>" },
  });
  assert.equal(created.status, 201);
  const saved = (
    await request(app).get(`/api/public/announcements/${created.body.id}`)
  ).body;
  for (const field of ["category", "title", "excerpt", "body"])
    assert.equal(saved[field].fr, saved[field].ar, field);

  const updated = await agent
    .put(`/api/admin/announcements/${created.body.id}`)
    .send({
      ...announcement,
      status: "published",
      title: { ar: "عنوان جديد", fr: "" },
    });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title.fr, "عنوان جديد");

  const event = { ...announcement };
  delete event.publishedAt;
  const savedEvent = await agent.post("/api/admin/events").send({
    ...event,
    status: "published",
    startsAt: "2026-10-03T11:00:00+01:00",
    endsAt: "2026-10-03T12:00:00+01:00",
    location: { ar: "القاعة", fr: "" },
    body: { ar: ["فقرة عربية"], fr: [] },
  });
  assert.equal(savedEvent.status, 201);
  const publicEvent = (
    await request(app).get(`/api/public/events/${savedEvent.body.id}`)
  ).body;
  assert.equal(publicEvent.location.fr, "القاعة");
  assert.deepEqual(publicEvent.body.fr, ["فقرة عربية"]);

  const savedClass = await agent.post("/api/admin/classes").send({
    day: 3,
    startsAt: "09:00",
    endsAt: "10:00",
    subject: { ar: "التجويد" },
    audience: { ar: "الناشئة", fr: "" },
    instructor: { ar: "الأستاذ" },
    room: { ar: "القاعة الأولى" },
    level: { ar: "المبتدئون" },
    status: "published",
  });
  assert.equal(savedClass.status, 201);
  const publicClass = (await request(app).get("/api/public/classes")).body[0];
  for (const field of ["subject", "audience", "instructor", "room", "level"])
    assert.equal(publicClass[field].fr, publicClass[field].ar, field);

  const savedOrganization = await agent.put("/api/admin/organization").send({
    ...defaultOrganization,
    name: { ar: "اسم المؤسسة" },
    shortName: { ar: "الاسم" },
    tagline: { ar: "شعار", fr: "" },
    mission: { ar: "<p>رسالة</p>", fr: "<p></p>" },
    description: { ar: "<p>تعريف</p>" },
  });
  assert.equal(savedOrganization.status, 200);
  const publicOrganization = (
    await request(app).get("/api/public/organization")
  ).body;
  for (const field of ["name", "shortName", "tagline", "mission", "description"])
    assert.equal(publicOrganization[field].fr, publicOrganization[field].ar, field);

  assert.equal(
    (
      await agent.post("/api/admin/announcements").send({
        ...announcement,
        excerpt: { ar: "", fr: "Résumé français" },
      })
    ).status,
    400,
  );
  await pool.end();
});

test("rich text keeps useful formatting and removes unsafe markup", async () => {
  assert.equal(cleanRichText("A & B"), "<p>A &amp; B</p>");
  const { app, pool, agent } = await setup();
  await agent.post("/api/auth/login").send({
    email: "admin@example.test",
    password: "very-secure-test-password",
  });
  const rich = {
    ...announcement,
    status: "published",
    excerpt: {
      ar: '<p><strong>ملخص</strong><img src=x onerror="alert(1)"></p>',
      fr: "<p><em>Résumé</em></p>",
    },
    body: {
      ar: '<h2>عنوان</h2><p>نص <strong>مهم</strong> <a href="javascript:alert(1)">رابط</a></p><script>alert(1)</script>',
      fr: '<p>Texte <a href="https://example.com">utile</a></p>',
    },
  };
  const created = await agent.post("/api/admin/announcements").send(rich);
  assert.equal(created.status, 201);
  const publicRecord = (
    await request(app).get(`/api/public/announcements/${created.body.id}`)
  ).body;
  assert.match(publicRecord.body.ar, /<h2>عنوان<\/h2>/);
  assert.match(publicRecord.body.ar, /<strong>مهم<\/strong>/);
  assert.match(publicRecord.body.fr, /href="https:\/\/example.com"/);
  assert.doesNotMatch(publicRecord.body.ar, /script|javascript:|alert\(1\)/);
  assert.doesNotMatch(publicRecord.excerpt.ar, /img|onerror/);
  assert.equal(
    (
      await agent.post("/api/admin/announcements").send({
        ...rich,
        body: { ar: "<p></p>", fr: "<p>Valid</p>" },
      })
    ).status,
    400,
  );
  const changed = await agent.put("/api/admin/organization").send({
    ...defaultOrganization,
    description: { ar: "<p>تعريف <em>مهم</em></p>", fr: "<p>Présentation</p>" },
  });
  assert.equal(changed.status, 200);
  assert.match(changed.body.description.ar, /<em>مهم<\/em>/);
  await pool.end();
});

test("local image uploads are authenticated and cannot be deleted while in use", async () => {
  const { app, pool, agent } = await setup();
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
    "base64",
  );
  assert.equal(
    (
      await request(app).post("/api/admin/media").attach("image", image, {
        filename: "test.png",
        contentType: "image/png",
      })
    ).status,
    401,
  );
  await agent.post("/api/auth/login").send({
    email: "admin@example.test",
    password: "very-secure-test-password",
  });
  const oversized = await agent
    .post("/api/admin/media")
    .attach("image", Buffer.alloc(4 * 1024 * 1024 + 1), {
      filename: "oversized.png",
      contentType: "image/png",
    });
  assert.equal(oversized.status, 400);
  assert.equal(oversized.body.error, "Image exceeds 4 MB");
  assert.equal(
    (
      await agent
        .post("/api/admin/media")
        .attach("image", Buffer.from("not an image"), {
          filename: "fake.png",
          contentType: "image/png",
        })
    ).status,
    400,
  );
  const uploaded = await agent
    .post("/api/admin/media")
    .attach("image", image, { filename: "test.png", contentType: "image/png" });
  assert.equal(uploaded.status, 201);
  assert.match(uploaded.body.url, /^\/uploads\//);
  const created = await agent
    .post("/api/admin/announcements")
    .send({ ...announcement, imageId: uploaded.body.id, status: "published" });
  assert.equal(created.status, 201);
  assert.equal(
    (await request(app).get(`/api/public/announcements/${created.body.id}`))
      .body.imageUrl,
    uploaded.body.url,
  );
  assert.equal(
    (await agent.delete(`/api/admin/media/${uploaded.body.id}`)).status,
    409,
  );
  await agent.delete(`/api/admin/announcements/${created.body.id}`);
  assert.equal(
    (await agent.delete(`/api/admin/media/${uploaded.body.id}`)).status,
    204,
  );
  await pool.end();
});
