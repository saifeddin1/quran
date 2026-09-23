import { expect, test } from "vitest";
import {
  plainRichText,
  safeRichHtml,
  toRichHtml,
} from "../src/lib/richText.jsx";

test("legacy paragraphs and plain descriptions become safe rich text", () => {
  expect(toRichHtml(["أولًا", "ثانيًا"])).toBe("<p>أولًا</p><p>ثانيًا</p>");
  expect(toRichHtml("3 < 5 & more")).toBe("<p>3 &lt; 5 &amp; more</p>");
  expect(plainRichText("<p>Important <strong>text</strong></p>")).toBe(
    "Important text",
  );
});

test("public rendering strips unsafe HTML and links", () => {
  const clean = safeRichHtml(
    '<p><strong>Hello</strong><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad</a></p>',
  );
  expect(clean).toContain("<strong>Hello</strong>");
  expect(clean).not.toMatch(/<img|onerror|javascript:/);
});
