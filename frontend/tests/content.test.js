import test from "node:test";
import assert from "node:assert/strict";
import {
  getOrganization,
  getAnnouncements,
  getAnnouncement,
  getEvents,
  getEvent,
  getClassSessions,
} from "../src/services/contentService.js";

const locales = ["ar", "fr"];

function assertLocalizedText(record, fields) {
  for (const field of fields) {
    for (const locale of locales) {
      assert.equal(
        typeof record[field]?.[locale],
        "string",
        `${record.id ?? "organization"}.${field}.${locale}`,
      );
      assert.ok(
        record[field][locale].trim(),
        `${field}.${locale} must not be blank`,
      );
    }
  }
}

test("organization identity and every user-facing record have Arabic and French content", async () => {
  const organization = await getOrganization();
  assertLocalizedText(organization, [
    "name",
    "shortName",
    "mission",
    "description",
  ]);
  assert.equal(
    organization.name.ar,
    "الفرع المحلي الإمام الشاطبي للقرآن الكريم بالزراوة",
  );
  assert.equal(
    organization.facebookUrl,
    "https://www.facebook.com/profile.php?id=61592096294810",
  );

  const [announcements, events, sessions] = await Promise.all([
    getAnnouncements(),
    getEvents(),
    getClassSessions(),
  ]);
  for (const record of [...announcements, ...events]) {
    assertLocalizedText(record, ["title", "excerpt", "category"]);
    for (const locale of locales) {
      assert.ok(
        Array.isArray(record.body[locale]) && record.body[locale].length > 0,
      );
      assert.ok(
        record.body[locale].every(
          (paragraph) => typeof paragraph === "string" && paragraph.trim(),
        ),
      );
    }
  }
  for (const event of events) assertLocalizedText(event, ["location"]);
  for (const session of sessions) {
    assertLocalizedText(session, [
      "subject",
      "audience",
      "instructor",
      "room",
      "level",
    ]);
  }
});

test("all stable IDs are unique within their collection and resolve to detail records", async () => {
  for (const [list, detail] of [
    [getAnnouncements, getAnnouncement],
    [getEvents, getEvent],
  ]) {
    const records = await list();
    assert.ok(records.length > 0);
    assert.equal(
      new Set(records.map((record) => record.id)).size,
      records.length,
    );
    for (const record of records)
      assert.deepEqual(await detail(record.id), record);
  }
  const sessions = await getClassSessions();
  assert.equal(
    new Set(sessions.map((session) => session.id)).size,
    sessions.length,
  );
});

test("announcements are returned newest first with valid publication dates", async () => {
  const records = await getAnnouncements();
  for (const record of records)
    assert.ok(Number.isFinite(Date.parse(record.publishedAt)));
  for (let index = 1; index < records.length; index += 1) {
    assert.ok(
      Date.parse(records[index - 1].publishedAt) >=
        Date.parse(records[index].publishedAt),
    );
  }
});

test("events are chronological and always end after they start", async () => {
  const records = await getEvents();
  for (const record of records) {
    assert.match(record.startsAt, /[+-]\d{2}:\d{2}$/);
    assert.ok(Date.parse(record.endsAt) > Date.parse(record.startsAt));
  }
  for (let index = 1; index < records.length; index += 1) {
    assert.ok(
      Date.parse(records[index - 1].startsAt) <=
        Date.parse(records[index].startsAt),
    );
  }
});

test("weekly sessions use valid weekdays and times in chronological order", async () => {
  const sessions = await getClassSessions();
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  for (const session of sessions) {
    assert.ok(
      Number.isInteger(session.day) && session.day >= 1 && session.day <= 7,
    );
    assert.match(session.startsAt, timePattern);
    assert.match(session.endsAt, timePattern);
    assert.ok(
      session.endsAt > session.startsAt,
      `${session.id} must end after it starts`,
    );
  }
  for (let index = 1; index < sessions.length; index += 1) {
    const previous = sessions[index - 1];
    const current = sessions[index];
    assert.ok(
      previous.day < current.day ||
        (previous.day === current.day && previous.startsAt <= current.startsAt),
    );
  }
});

test("missing detail records resolve to null without throwing", async () => {
  for (const id of ["missing-record", "", undefined, null]) {
    assert.equal(await getAnnouncement(id), null);
    assert.equal(await getEvent(id), null);
  }
});

test("mutating a response cannot corrupt content read by another component", async () => {
  const organization = await getOrganization();
  const originalOrganization = await getOrganization();
  organization.name.ar = "Changed organization";
  assert.deepEqual(await getOrganization(), originalOrganization);

  for (const [list, detail] of [
    [getAnnouncements, getAnnouncement],
    [getEvents, getEvent],
  ]) {
    const original = await list();
    const changed = await list();
    const id = changed[0].id;
    changed[0].title.fr = "Changed title";
    changed[0].body.ar.push("Changed paragraph");
    changed.pop();
    assert.deepEqual(await list(), original);

    const detailResponse = await detail(id);
    detailResponse.body.fr[0] = "Changed detail";
    assert.deepEqual(
      await detail(id),
      original.find((record) => record.id === id),
    );
  }

  const originalSessions = await getClassSessions();
  const changedSessions = await getClassSessions();
  changedSessions[0].subject.ar = "Changed subject";
  changedSessions.reverse();
  assert.deepEqual(await getClassSessions(), originalSessions);
});
