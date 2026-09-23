import DOMPurify from "dompurify";

const allowedTags = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "a",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
];

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

export function toRichHtml(value) {
  if (Array.isArray(value)) {
    return value.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  }
  if (typeof value !== "string" || !value.trim()) return "";
  if (/<(?:p|br|strong|em|u|a|h2|h3|ul|ol|li|blockquote)\b/i.test(value))
    return value;
  return value
    .split(/\n\s*\n/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export function safeRichHtml(value) {
  return DOMPurify.sanitize(toRichHtml(value), {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ["href"],
  });
}

export function plainRichText(value) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = safeRichHtml(value);
  return wrapper.textContent?.replace(/\s+/g, " ").trim() || "";
}

export function RichText({ value, className = "" }) {
  return (
    <div
      className={`rich-content ${className}`}
      dangerouslySetInnerHTML={{ __html: safeRichHtml(value) }}
    />
  );
}
