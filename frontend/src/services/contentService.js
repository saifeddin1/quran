import {
  organization,
  announcements,
  events,
  classSessions,
} from "../data/content.js";

const copy = (value) => structuredClone(value);
const apiMode =
  import.meta.env?.PROD === true ||
  import.meta.env?.VITE_CONTENT_SOURCE === "api";

async function getApi(path) {
  const response = await fetch(`/api/public/${path}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
  return response.json();
}

export async function getOrganization() {
  if (apiMode) return getApi("organization");
  return copy(organization);
}

export async function getAnnouncements() {
  if (apiMode) return getApi("announcements");
  return copy(announcements).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export async function getAnnouncement(id) {
  if (apiMode) return getApi(`announcements/${encodeURIComponent(id)}`);
  return copy(
    announcements.find((announcement) => announcement.id === id) ?? null,
  );
}

export async function getEvents() {
  if (apiMode) return getApi("events");
  return copy(events).sort(
    (a, b) => new Date(a.startsAt) - new Date(b.startsAt),
  );
}

export async function getEvent(id) {
  if (apiMode) return getApi(`events/${encodeURIComponent(id)}`);
  return copy(events.find((event) => event.id === id) ?? null);
}

export async function getClassSessions() {
  if (apiMode) return getApi("classes");
  return copy(classSessions).sort(
    (a, b) => a.day - b.day || a.startsAt.localeCompare(b.startsAt),
  );
}
