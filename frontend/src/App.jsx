import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Flower2,
  Globe2,
  HeartHandshake,
  Leaf,
  MapPin,
  Menu,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { messages } from "./locales/messages.js";
import {
  formatDate,
  formatTime,
  getInitialLocale,
  languagePath,
  selectedDay,
} from "./lib/format.js";
import {
  getOrganization,
  getAnnouncements,
  getEvents,
  getClassSessions,
} from "./services/contentService.js";
import { plainRichText, RichText } from "./lib/richText.jsx";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));
const AdminRoute = () => <Suspense fallback={<main role="status">{getInitialLocale() === "fr" ? "Chargement…" : "جارٍ التحميل…"}</main>}><AdminApp /></Suspense>;

const ContentContext = createContext(null);
const LocaleContext = createContext(null);
const useSite = () => useContext(LocaleContext);
const useContent = () => useContext(ContentContext);
function ContentProvider({ children }) {
  const [state, setState] = useState({ status: "loading", data: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    Promise.all([
      getOrganization(),
      getAnnouncements(),
      getEvents(),
      getClassSessions(),
    ])
      .then(([organization, announcements, events, sessions]) => {
        if (active)
          setState({
            status: "ready",
            data: { organization, announcements, events, sessions },
          });
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null });
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <ContentContext.Provider
      value={{ ...state, retry: () => setAttempt((a) => a + 1) }}
    >
      {children}
    </ContentContext.Provider>
  );
}

function Forward({ size = 18, ...props }) {
  const { locale } = useSite();
  return locale === "ar" ? (
    <ArrowLeft size={size} aria-hidden="true" {...props} />
  ) : (
    <ArrowRight size={size} aria-hidden="true" {...props} />
  );
}

function Brand({ footer = false }) {
  const { locale, t } = useSite();
  const { data } = useContent();
  const name = data?.organization.shortName[locale] || t.brand;
  const tagline = data?.organization.tagline?.[locale] || t.brandSub;
  return (
    <Link
      to={`/${locale}`}
      className={`brand ${footer ? "brand-footer" : ""}`}
      aria-label={`${name} — ${t.home}`}
    >
      <span className="brand-mark" aria-hidden="true">
        <BookOpen strokeWidth={1.35} />
      </span>
      <span className="brand-copy">
        <strong>{name}</strong>
        <span>{tagline}</span>
      </span>
    </Link>
  );
}

function Header() {
  const { locale, t } = useSite();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const links = [
    ["", t.home],
    ["/announcements", t.announcements],
    ["/events", t.events],
    ["/classes", t.classes],
  ];
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  function switchLanguage() {
    const next = locale === "ar" ? "fr" : "ar";
    try {
      localStorage.setItem("shatibi-language", next);
    } catch {
      /* Preferences are optional. */
    }
    navigate(
      languagePath(location.pathname, next) + location.search + location.hash,
    );
  }
  return (
    <>
      <div className="invocation">
        <span className="tiny-diamond" />
        {t.bismillah}
        <span className="tiny-diamond" />
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label={t.quickLinks}>
            {links.map(([path, label]) => (
              <NavLink key={path} to={`/${locale}${path}`} end={!path}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="language-button"
              onClick={switchLanguage}
              aria-label={t.switchLanguage}
            >
              <Globe2 size={17} aria-hidden="true" />
              <span lang={locale === "ar" ? "fr" : "ar"}>
                {locale === "ar" ? "Français" : "العربية"}
              </span>
            </button>
            <button
              ref={menuRef}
              className="menu-toggle icon-button"
              aria-controls="mobile-navigation"
              aria-expanded={open}
              aria-label={open ? t.closeMenu : t.menu}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            className="mobile-nav"
            id="mobile-navigation"
            aria-label={t.quickLinks}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                menuRef.current?.focus();
              }
            }}
          >
            {links.map(([path, label]) => (
              <NavLink key={path} to={`/${locale}${path}`} end={!path}>
                {label}
                <Forward />
              </NavLink>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}

function Footer() {
  const { locale, t } = useSite();
  const { data } = useContent();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Brand footer />
          <p>{data?.organization.name[locale] || t.brand}</p>
          <RichText value={data?.organization.description[locale] || t.footerDescription} className="footer-description" />
        </div>
        <div>
          <h2>{t.quickLinks}</h2>
          <nav className="footer-links" aria-label={t.quickLinks}>
            <Link to={`/${locale}/announcements`}>{t.announcements}</Link>
            <Link to={`/${locale}/events`}>{t.events}</Link>
            <Link to={`/${locale}/classes`}>{t.classes}</Link>
          </nav>
        </div>
        <div>
          <h2>{t.stayConnected}</h2>
          <a
            className="social-link"
            href={
              data?.organization.facebookUrl ||
              "https://www.facebook.com/profile.php?id=61592096294810"
            }
            target="_blank"
            rel="noreferrer"
          >
            {t.facebook}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          <p className="footer-flourish">{t.footerNote}</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()}{" "}
          {data?.organization.shortName[locale] || t.brand}
        </span>
        <span>{data?.organization.tagline?.[locale] || t.brandSub}</span>
      </div>
    </footer>
  );
}

function Layout() {
  const { locale } = useParams();
  if (!["ar", "fr"].includes(locale))
    return <Navigate to={`/${getInitialLocale()}/not-found`} replace />;
  return (
    <LocaleContext.Provider value={{ locale, t: messages[locale] }}>
      <LocalizedLayout />
    </LocaleContext.Provider>
  );
}

function LocalizedLayout() {
  const { locale, t } = useSite();
  const location = useLocation();
  const { status, retry, data } = useContent();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        plainRichText(data?.organization.description[locale] || t.footerDescription),
      );
  }, [locale, t, data]);
  useEffect(() => {
    if (location.hash)
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t.skip}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {status === "loading" ? (
          <div className="state-panel" role="status">
            <span className="loading-ring" />
            {t.loading}
          </div>
        ) : status === "error" ? (
          <div className="state-panel" role="alert">
            <BookOpen size={36} />
            <h1>{t.errorTitle}</h1>
            <p>{t.errorText}</p>
            <button className="button primary" onClick={retry}>
              <RefreshCw size={18} />
              {t.retry}
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </>
  );
}

function PageTitle({ title }) {
  const { locale, t } = useSite();
  const { data } = useContent();
  const brand = data?.organization.shortName[locale] || t.brand;
  useEffect(() => {
    document.title = `${title} | ${brand}`;
  }, [title, brand]);
  return null;
}

function SectionHeading({ eyebrow, title, link, linkText }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {link && (
        <Link className="text-link" to={link}>
          {linkText}
          <Forward />
        </Link>
      )}
    </div>
  );
}

function AnnouncementCard({ item, index = 0 }) {
  const { locale, t } = useSite();
  const icons = [BookOpen, Leaf, Users, Sparkles];
  const Icon = icons[index % icons.length];
  return (
    <article className={`announcement-card tone-${index % 3}`}>
      <div className="card-top">
        <span className="category">{item.category[locale]}</span>
        <span className="card-emblem">
          <Icon size={23} strokeWidth={1.25} aria-hidden="true" />
        </span>
      </div>
      {item.imageUrl && <img className="announcement-image" src={item.imageUrl} alt="" loading="lazy" />}
      <time dateTime={item.publishedAt}>
        {formatDate(item.publishedAt, locale)}
      </time>
      <h3>
        <Link to={`/${locale}/announcements/${item.id}`}>
          {item.title[locale]}
        </Link>
      </h3>
      <RichText value={item.excerpt[locale]} className="card-excerpt" />
      <Link
        className="text-link card-link"
        to={`/${locale}/announcements/${item.id}`}
      >
        {t.readMore}
        <Forward size={17} />
      </Link>
    </article>
  );
}

function EventRow({ item, past = false }) {
  const { locale, t } = useSite();
  return (
    <article className={`event-row ${past ? "is-past" : ""}`}>
      <div className="event-date" aria-hidden="true">
        <strong>
          {formatDate(item.startsAt, locale, {
            day: "2-digit",
            month: undefined,
            year: undefined,
          })}
        </strong>
        <span>
          {formatDate(item.startsAt, locale, {
            day: undefined,
            month: "short",
            year: undefined,
          })}
        </span>
      </div>
      {item.imageUrl && <img className="event-thumb" src={item.imageUrl} alt="" loading="lazy" />}
      <div className="event-info">
        <span className="event-category">{item.category[locale]}</span>
        <h3>
          <Link to={`/${locale}/events/${item.id}`}>{item.title[locale]}</Link>
        </h3>
        <div className="event-meta">
          <span>
            <Clock3 size={15} aria-hidden="true" />
            <time dateTime={item.startsAt}>
              {formatDate(item.startsAt, locale)} ·{" "}
              <bdi>{formatTime(item.startsAt, locale)}</bdi>
            </time>
          </span>
          <span>
            <MapPin size={15} aria-hidden="true" />
            {item.location[locale]}
          </span>
        </div>
      </div>
      <Link
        className="round-link"
        to={`/${locale}/events/${item.id}`}
        aria-label={`${t.eventDetails}: ${item.title[locale]}`}
      >
        <Forward size={21} />
      </Link>
    </article>
  );
}

function EmptyState({ children }) {
  return (
    <div className="empty-state">
      <Flower2 size={27} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function Home() {
  const { locale, t } = useSite();
  const { data } = useContent();
  const upcoming = data.events
    .filter((item) => new Date(item.endsAt) >= new Date())
    .slice(0, 2);
  return (
    <>
      <PageTitle title={t.home} />
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>
              {t.heroFirst}
              <span>{t.heroSecond}</span>
            </h1>
            <p className="hero-description">{t.heroDescription}</p>
            <div className="hero-actions">
              <Link className="button primary" to={`/${locale}/classes`}>
                {t.exploreClasses}
                <Forward />
              </Link>
              <a className="button subtle" href="#about">
                {t.aboutLink}
                <span className="small-down" aria-hidden="true">
                  ↓
                </span>
              </a>
            </div>
            <div className="hero-note">
              <span className="note-line" />
              <Flower2 size={19} strokeWidth={1.4} aria-hidden="true" />
              <span>{t.heroNote}</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="arch-line" aria-hidden="true" />
            <div className="hero-photo">
              <img
                src="/quran-hero.jpg"
                alt={t.imageAlt}
                width="1254"
                height="1254"
                fetchPriority="high"
              />
            </div>
            <span className="ornament ornament-one" aria-hidden="true">
              ✧
            </span>
            <span className="ornament ornament-two" aria-hidden="true">
              ✧
            </span>
            <div className="image-caption">
              <span className="caption-icon">
                <BookOpen size={25} strokeWidth={1.3} aria-hidden="true" />
              </span>
              <div>
                <strong>{t.imageCaption}</strong>
                <span>{t.imageSmall}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mission-section" id="about">
        <div className="container">
          <div className="mission-intro">
            <p className="eyebrow">{t.missionEyebrow}</p>
            <h2>{t.missionTitle}</h2>
            <RichText value={data.organization.mission[locale]} className="mission-copy" />
          </div>
          <div className="values-grid">
            {t.values.map((value, i) => {
              const Icon = [BookOpen, Leaf, HeartHandshake][i];
              return (
                <div className="value-item" key={value.title}>
                  <span className="value-icon">
                    <Icon size={26} strokeWidth={1.3} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow={t.newsEyebrow}
          title={t.latestNews}
          link={`/${locale}/announcements`}
          linkText={t.allAnnouncements}
        />
        <div className="announcements-grid">
          {data.announcements.slice(0, 3).map((item, index) => (
            <AnnouncementCard key={item.id} item={item} index={index} />
          ))}
        </div>
        {!data.announcements.length && (
          <EmptyState>{t.emptyAnnouncements}</EmptyState>
        )}
      </section>
      <section className="events-section">
        <div className="container">
          <SectionHeading
            eyebrow={t.eventsEyebrow}
            title={t.upcomingEvents}
            link={`/${locale}/events`}
            linkText={t.allEvents}
          />
          <div className="event-list">
            {upcoming.map((item) => (
              <EventRow key={item.id} item={item} />
            ))}
            {!upcoming.length && <EmptyState>{t.emptyEvents}</EmptyState>}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="timetable-callout">
          <div>
            <p className="eyebrow">{t.timetableEyebrow}</p>
            <h2>{t.timetableTitle}</h2>
            <p>{t.timetableText}</p>
          </div>
          <Link className="button primary" to={`/${locale}/classes`}>
            {t.viewTimetable}
            <Forward />
          </Link>
          <CalendarDays
            className="callout-icon"
            size={160}
            strokeWidth={0.65}
            aria-hidden="true"
          />
        </div>
      </section>
    </>
  );
}

function PageIntro({ eyebrow, title, description }) {
  const { locale, t } = useSite();
  return (
    <section className="page-intro">
      <div className="container">
        <div className="breadcrumb">
          <Link to={`/${locale}`}>{t.home}</Link>
          {locale === "ar" ? (
            <ChevronLeft size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          <span>{eyebrow}</span>
        </div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
        <span className="intro-flower" aria-hidden="true">
          ✧
        </span>
      </div>
    </section>
  );
}

function Announcements() {
  const { t } = useSite();
  const { data } = useContent();
  return (
    <>
      <PageTitle title={t.announcements} />
      <PageIntro
        eyebrow={t.announcements}
        title={t.announcementsHeading}
        description={t.announcementsIntro}
      />
      <section className="section container">
        <div className="announcements-grid">
          {data.announcements.map((item, index) => (
            <AnnouncementCard key={item.id} item={item} index={index} />
          ))}
        </div>
        {!data.announcements.length && (
          <EmptyState>{t.emptyAnnouncements}</EmptyState>
        )}
      </section>
    </>
  );
}

function Events() {
  const { t } = useSite();
  const { data } = useContent();
  const now = new Date();
  const upcoming = data.events.filter((item) => new Date(item.endsAt) >= now);
  const past = data.events
    .filter((item) => new Date(item.endsAt) < now)
    .reverse();
  return (
    <>
      <PageTitle title={t.events} />
      <PageIntro
        eyebrow={t.events}
        title={t.eventsHeading}
        description={t.eventsIntro}
      />
      <section className="section container event-page-section">
        <h2>{t.upcomingEvents}</h2>
        <div className="event-list">
          {upcoming.map((item) => (
            <EventRow key={item.id} item={item} />
          ))}
          {!upcoming.length && <EmptyState>{t.emptyEvents}</EmptyState>}
        </div>
        <h2 className="past-heading">{t.pastEvents}</h2>
        <div className="event-list">
          {past.map((item) => (
            <EventRow key={item.id} item={item} past />
          ))}
          {!past.length && <EmptyState>{t.emptyEvents}</EmptyState>}
        </div>
      </section>
    </>
  );
}

function Detail({ type }) {
  const { id } = useParams();
  const { locale, t } = useSite();
  const { data } = useContent();
  const event = type === "events";
  const item = data[type].find((record) => record.id === id);
  if (!item) return <NotFound />;
  return (
    <>
      <PageTitle title={item.title[locale]} />
      <PageIntro
        eyebrow={event ? t.events : t.announcements}
        title={item.title[locale]}
      />
      <div className={`container detail-layout ${event ? "with-sidebar" : ""}`}>
        <article className="article-body">
          <span className="category">{item.category[locale]}</span>
          {item.imageUrl && <img className="detail-image" src={item.imageUrl} alt="" />}
          {!event && (
            <p className="published">
              <CalendarDays size={16} aria-hidden="true" />
              {t.published}{" "}
              <time dateTime={item.publishedAt}>
                {formatDate(item.publishedAt, locale)}
              </time>
            </p>
          )}
          <RichText value={item.excerpt[locale]} className="article-lead" />
          <RichText value={item.body[locale]} className="article-copy" />
          <Link className="text-link back-link" to={`/${locale}/${type}`}>
            <Forward />
            {event ? t.backEvents : t.backAnnouncements}
          </Link>
        </article>
        {event && (
          <aside className="event-sidebar">
            <span className="category">
              {new Date(item.endsAt) < new Date()
                ? t.pastEvent
                : t.upcomingEvent}
            </span>
            <dl>
              <div>
                <dt>
                  <CalendarDays size={18} />
                  {t.date}
                </dt>
                <dd>{formatDate(item.startsAt, locale)}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={18} />
                  {t.time}
                </dt>
                <dd>
                  <bdi>
                    {formatTime(item.startsAt, locale)} –{" "}
                    {formatTime(item.endsAt, locale)}
                  </bdi>
                </dd>
              </div>
              <div>
                <dt>
                  <MapPin size={18} />
                  {t.location}
                </dt>
                <dd>{item.location[locale]}</dd>
              </div>
            </dl>
          </aside>
        )}
      </div>
    </>
  );
}

function ClassCard({ session }) {
  const { locale, t } = useSite();
  return (
    <article className="class-card">
      <div className="class-time">
        <Clock3 size={14} aria-hidden="true" />
        <bdi>
          {session.startsAt} – {session.endsAt}
        </bdi>
      </div>
      <h3>{session.subject[locale]}</h3>
      <span className="class-audience">
        <Users size={14} aria-hidden="true" />
        {session.audience[locale]}
      </span>
      <dl>
        <div>
          <dt>{t.instructor}</dt>
          <dd>{session.instructor[locale]}</dd>
        </div>
        <div>
          <dt>{t.room}</dt>
          <dd>{session.room[locale]}</dd>
        </div>
        <div>
          <dt>{t.level}</dt>
          <dd>{session.level[locale]}</dd>
        </div>
      </dl>
    </article>
  );
}

function Classes() {
  const { t } = useSite();
  const { data } = useContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const day = selectedDay(searchParams.get("day"));
  const visibleDays = day ? [day] : [1, 2, 3, 4, 5, 6, 7];
  function setDay(next) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("day", next);
    else params.delete("day");
    setSearchParams(params, { replace: true, preventScrollReset: true });
  }
  return (
    <>
      <PageTitle title={t.classes} />
      <PageIntro
        eyebrow={t.classes}
        title={t.classesHeading}
        description={t.classesIntro}
      />
      <section className="section container schedule-section">
        <div className="schedule-heading">
          <h2>{t.weeklySchedule}</h2>
          <span>
            <Clock3 size={16} aria-hidden="true" />
            {t.timezone}
          </span>
        </div>
        <div className="day-filters" role="group" aria-label={t.weeklySchedule}>
          <button onClick={() => setDay(0)} aria-pressed={!day}>
            {t.allDays}
          </button>
          {t.days.map((label, index) => (
            <button
              key={label}
              onClick={() => setDay(index + 1)}
              aria-pressed={day === index + 1}
            >
              {label}
              {day === index + 1 && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <div className={`week-grid ${day ? "single-day" : ""}`}>
          {visibleDays.map((value) => {
            const sessions = data.sessions.filter((item) => item.day === value);
            return (
              <section className="day-column" key={value}>
                <div className="day-heading">
                  <h3>{t.days[value - 1]}</h3>
                  <span>{sessions.length}</span>
                </div>
                <div className="day-sessions">
                  {sessions.map((session) => (
                    <ClassCard session={session} key={session.id} />
                  ))}
                  {!sessions.length && (
                    <p className="no-class">{t.emptyClasses}</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        {!data.sessions.length && <EmptyState>{t.emptyWeek}</EmptyState>}
      </section>
    </>
  );
}

function NotFound() {
  const { locale, t } = useSite();
  return (
    <div className="state-panel not-found">
      <PageTitle title={t.notFoundTitle} />
      <span className="not-found-number">404</span>
      <h1>{t.notFoundTitle}</h1>
      <p>{t.notFoundText}</p>
      <Link to={`/${locale}`} className="button primary">
        {t.backHome}
        <Forward />
      </Link>
    </div>
  );
}

export default function App() {
  return (
      <Routes>
        <Route path="/woloj" element={<AdminRoute />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/admin/announcements" element={<AdminRoute />} />
        <Route path="/admin/events" element={<AdminRoute />} />
        <Route path="/admin/classes" element={<AdminRoute />} />
        <Route path="/admin/organization" element={<AdminRoute />} />
        <Route path="/admin/media" element={<AdminRoute />} />
        <Route
          path="/"
          element={<Navigate to={`/${getInitialLocale()}`} replace />}
        />
        <Route path="/:locale" element={<ContentProvider><Layout /></ContentProvider>}>
          <Route index element={<Home />} />
          <Route path="announcements" element={<Announcements />} />
          <Route
            path="announcements/:id"
            element={<Detail type="announcements" />}
          />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<Detail type="events" />} />
          <Route path="classes" element={<Classes />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={`/${getInitialLocale()}/not-found`} replace />}
        />
      </Routes>
  );
}
