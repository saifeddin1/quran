import sanitizeHtml from "sanitize-html";

const inlineTags = ["p", "br", "strong", "em", "u", "a"];
const fullTags = [...inlineTags, "h2", "h3", "ul", "ol", "li", "blockquote"];

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function asHtml(value) {
  if (/<\/?[a-z][^>]*>/i.test(value)) return value;
  return value
    .split(/\n\s*\n/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export function cleanRichText(value, { compact = false } = {}) {
  const cleaned = sanitizeHtml(asHtml(value), {
    allowedTags: compact ? inlineTags : fullTags,
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  }).trim();
  if (cleaned && !/<(?:p|h2|h3|ul|ol|blockquote)\b/i.test(cleaned))
    return `<p>${cleaned}</p>`;
  return cleaned;
}

export function hasRichText(value) {
  const text = sanitizeHtml(cleanRichText(value), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;|&#160;|\s/gi, "")
    .trim();
  return text.length > 0;
}

export function cleanLocalizedRich(value, options) {
  return {
    ar: cleanRichText(value.ar, options),
    fr: cleanRichText(value.fr, options),
  };
}

export function cleanContentRichText(kind, record) {
  if (kind === "classes") return record;
  return {
    ...record,
    excerpt: cleanLocalizedRich(record.excerpt, { compact: true }),
    body: Array.isArray(record.body.ar)
      ? record.body
      : cleanLocalizedRich(record.body),
  };
}

export function cleanOrganizationRichText(record) {
  return {
    ...record,
    mission: cleanLocalizedRich(record.mission, { compact: true }),
    description: cleanLocalizedRich(record.description),
  };
}
