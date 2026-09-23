export function formatDate(value, locale, options = {}) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-TN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Tunis",
    numberingSystem: "latn",
    ...options,
  }).format(new Date(value));
}

export function formatTime(value, locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Tunis",
    numberingSystem: "latn",
  }).format(new Date(value));
}

export function getInitialLocale() {
  try {
    return localStorage.getItem("shatibi-language") === "fr" ? "fr" : "ar";
  } catch {
    return "ar";
  }
}

export function languagePath(pathname, locale) {
  return pathname.replace(/^\/(ar|fr)(?=\/|$)/, `/${locale}`);
}

export function selectedDay(value) {
  return /^[1-7]$/.test(value ?? "") ? Number(value) : 0;
}
