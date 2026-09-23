import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../src/App.jsx";
import {
  organization,
  announcements,
  events,
  classSessions,
} from "../src/data/content.js";
import { messages } from "../src/locales/messages.js";
import * as service from "../src/services/contentService.js";

vi.mock("../src/services/contentService.js", () => ({
  getOrganization: vi.fn(),
  getAnnouncements: vi.fn(),
  getEvents: vi.fn(),
  getClassSessions: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="current-location">
      {location.pathname}
      {location.search}
      {location.hash}
    </div>
  );
}

function openApp(path = "/ar") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  service.getOrganization.mockResolvedValue(structuredClone(organization));
  service.getAnnouncements.mockResolvedValue(structuredClone(announcements));
  service.getEvents.mockResolvedValue(structuredClone(events));
  service.getClassSessions.mockResolvedValue(structuredClone(classSessions));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("admin routes stay in the admin app beside similarly named public routes", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url) => new Response(
    JSON.stringify(String(url).endsWith("/auth/me") ? { id: "test", email: "admin@example.test" } : []),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )));
  openApp("/admin/events");
  expect(await screen.findByRole("heading", { name: "الفعاليات", level: 1 })).toBeTruthy();
  expect(screen.getByTestId("current-location").textContent).toBe("/admin/events");
  expect(screen.queryByRole("heading", { name: messages.ar.notFoundTitle })).toBeNull();
});

test("admin editor marks only Arabic text inputs as required", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url) => new Response(
    JSON.stringify(String(url).endsWith("/auth/me")
      ? { id: "test", email: "admin@example.test" }
      : organization),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )));
  openApp("/admin/organization");
  expect(await screen.findByRole("heading", { name: "بيانات المؤسسة", level: 1 })).toBeTruthy();
  await waitFor(() =>
    expect(document.querySelector('.admin-languages fieldset[dir="ltr"]')).not.toBeNull(),
  );
  const french = document.querySelector('.admin-languages fieldset[dir="ltr"]');
  const arabic = document.querySelector('.admin-languages fieldset[dir="rtl"]');
  expect(french?.textContent).toContain("الفرنسية اختيارية");
  expect([...french.querySelectorAll("input")].every((input) => !input.required)).toBe(true);
  expect([...arabic.querySelectorAll("input")].every((input) => input.required)).toBe(true);
});

test("first visits default to Arabic and show a loading state until content arrives", async () => {
  let finishLoading;
  service.getOrganization.mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoading = resolve;
    }),
  );
  openApp("/");

  expect(screen.getByRole("status").textContent).toContain(messages.ar.loading);
  expect(screen.getByTestId("current-location").textContent).toBe("/ar");
  expect(document.documentElement.lang).toBe("ar");
  expect(document.documentElement.dir).toBe("rtl");

  await act(async () => finishLoading(structuredClone(organization)));
  expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
});

test("a rejected service displays an error and retry recovers the requested page", async () => {
  service.getEvents.mockRejectedValueOnce(new Error("Temporary API failure"));
  openApp("/fr/announcements");

  expect((await screen.findByRole("alert")).textContent).toContain(
    messages.fr.errorTitle,
  );
  fireEvent.click(screen.getByRole("button", { name: messages.fr.retry }));

  expect(
    await screen.findByRole("heading", {
      name: messages.fr.announcementsHeading,
      level: 1,
    }),
  ).toBeTruthy();
  expect(service.getEvents).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByTestId("current-location").textContent).toBe(
    "/fr/announcements",
  );
});

test("empty collections show usable announcements, events and weekly timetable states", async () => {
  service.getAnnouncements.mockResolvedValue([]);
  service.getEvents.mockResolvedValue([]);
  service.getClassSessions.mockResolvedValue([]);

  for (const [route, emptyMessage, count] of [
    ["/ar/announcements", messages.ar.emptyAnnouncements, 1],
    ["/fr/events", messages.fr.emptyEvents, 2],
    ["/ar/classes", messages.ar.emptyWeek, 1],
  ]) {
    const view = openApp(route);
    expect((await screen.findAllByText(emptyMessage)).length).toBe(count);
    expect(screen.queryByRole("alert")).toBeNull();
    if (route.endsWith("classes")) {
      expect(screen.getAllByText(messages.ar.emptyClasses)).toHaveLength(7);
      expect(
        screen
          .getByRole("button", { name: messages.ar.allDays })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    }
    view.unmount();
  }
});

test("unknown pages and missing details provide a localized path back home", async () => {
  for (const path of [
    "/ar/unknown-page",
    "/ar/announcements/missing",
    "/ar/events/missing",
  ]) {
    const view = openApp(path);
    expect(
      await screen.findByRole("heading", {
        name: messages.ar.notFoundTitle,
        level: 1,
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: messages.ar.backHome }));
    await waitFor(() =>
      expect(screen.getByTestId("current-location").textContent).toBe("/ar"),
    );
    expect(
      screen.queryByRole("heading", { name: messages.ar.notFoundTitle }),
    ).toBeNull();
    view.unmount();
  }
});

test("switching language preserves announcement and event IDs and translates their content", async () => {
  for (const [collection, record] of [
    ["announcements", announcements[0]],
    ["events", events[0]],
  ]) {
    const view = openApp(`/ar/${collection}/${record.id}?source=preview`);
    expect(
      await screen.findByRole("heading", { name: record.title.ar, level: 1 }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: messages.ar.switchLanguage }),
    );
    expect(
      await screen.findByRole("heading", { name: record.title.fr, level: 1 }),
    ).toBeTruthy();
    expect(screen.getByTestId("current-location").textContent).toBe(
      `/fr/${collection}/${record.id}?source=preview`,
    );
    expect(document.documentElement.lang).toBe("fr");
    expect(document.documentElement.dir).toBe("ltr");
    expect(localStorage.getItem("shatibi-language")).toBe("fr");
    view.unmount();
  }
});

test("switching language preserves the chosen timetable day and unrelated query parameters", async () => {
  openApp("/ar/classes?source=preview");
  await screen.findByRole("heading", {
    name: messages.ar.classesHeading,
    level: 1,
  });
  fireEvent.click(screen.getByRole("button", { name: messages.ar.days[2] }));
  expect(
    screen
      .getByRole("button", { name: messages.ar.days[2] })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByTestId("current-location").textContent).toBe(
    "/ar/classes?source=preview&day=3",
  );

  fireEvent.click(
    screen.getByRole("button", { name: messages.ar.switchLanguage }),
  );
  expect(
    await screen.findByRole("heading", {
      name: messages.fr.classesHeading,
      level: 1,
    }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: messages.fr.days[2] })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen
      .getByRole("button", { name: messages.fr.allDays })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  expect(screen.getByTestId("current-location").textContent).toBe(
    "/fr/classes?source=preview&day=3",
  );
  expect(
    screen.getAllByRole("heading", { level: 3, name: messages.fr.days[2] }),
  ).toHaveLength(1);
  expect(
    screen.queryByRole("heading", { level: 3, name: messages.fr.days[1] }),
  ).toBeNull();
});

test("an explicitly chosen language is remembered on later root visits", async () => {
  const view = openApp("/ar/announcements");
  await screen.findByRole("heading", {
    name: messages.ar.announcementsHeading,
    level: 1,
  });
  fireEvent.click(
    screen.getByRole("button", { name: messages.ar.switchLanguage }),
  );
  await screen.findByRole("heading", {
    name: messages.fr.announcementsHeading,
    level: 1,
  });
  view.unmount();

  openApp("/");
  await screen.findByRole("heading", { level: 1 });
  expect(screen.getByTestId("current-location").textContent).toBe("/fr");
  expect(document.documentElement.dir).toBe("ltr");
});
