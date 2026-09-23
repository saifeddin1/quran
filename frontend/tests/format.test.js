import test from "node:test";
import assert from "node:assert/strict";
import { formatTime, languagePath, selectedDay } from "../src/lib/format.js";

test("language paths preserve detail IDs and do not replace unrelated text", () => {
  assert.equal(
    languagePath("/ar/announcements/autumn-learning-season", "fr"),
    "/fr/announcements/autumn-learning-season",
  );
  assert.equal(languagePath("/fr/classes", "ar"), "/ar/classes");
  assert.equal(languagePath("/archive", "fr"), "/archive");
});

test("schedule accepts only actual weekday selections", () => {
  for (let day = 1; day <= 7; day++)
    assert.equal(selectedDay(String(day)), day);
  for (const invalid of [null, "", "0", "8", "-1", "1.5", "01", "monday"])
    assert.equal(selectedDay(invalid), 0);
});

test("event times use Tunis time consistently in both languages", () => {
  for (const locale of ["ar", "fr"])
    assert.equal(formatTime("2026-10-03T08:00:00Z", locale), "09:00");
});
