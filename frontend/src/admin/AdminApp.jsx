import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor.jsx";
import { toRichHtml } from "../lib/richText.jsx";
import "./admin.css";

const labels = {
  ar: {
    admin: "لوحة الإدارة",
    login: "دخول المشرفين",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "دخول",
    signingIn: "جارٍ الدخول…",
    logout: "خروج",
    viewSite: "عرض الموقع",
    dashboard: "نظرة عامة",
    announcements: "الإعلانات",
    events: "الفعاليات",
    classes: "الدروس",
    organization: "بيانات المؤسسة",
    media: "مكتبة الصور",
    loading: "جارٍ التحميل…",
    retry: "إعادة المحاولة",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    add: "إضافة",
    edit: "تعديل",
    remove: "حذف",
    published: "منشور",
    draft: "مسودة",
    title: "العنوان",
    category: "التصنيف",
    excerpt: "الملخص",
    body: "النص الكامل",
    formatting: "تنسيق النص",
    bold: "عريض",
    italic: "مائل",
    underline: "تحته خط",
    bullets: "قائمة نقطية",
    numbers: "قائمة مرقّمة",
    heading2: "عنوان رئيسي",
    heading3: "عنوان فرعي",
    quote: "اقتباس",
    link: "رابط",
    linkPrompt:
      "أدخل الرابط (https:// أو mailto:). اتركه فارغًا لإزالة الرابط.",
    linkInvalid: "استخدم رابطًا يبدأ بـ https:// أو http:// أو mailto:.",
    undo: "تراجع",
    redo: "إعادة",
    date: "تاريخ النشر",
    start: "البداية",
    end: "النهاية",
    location: "المكان",
    subject: "المادة",
    audience: "الفئة",
    instructor: "المدرّس",
    room: "القاعة",
    level: "المستوى",
    day: "اليوم",
    status: "حالة النشر",
    cover: "الصورة",
    upload: "رفع صورة",
    removeCover: "إزالة الصورة",
    imageHelp: "JPEG أو PNG أو WebP، حتى 4 ميغابايت",
    imageTooLarge: "الصورة أكبر من 4 ميغابايت.",
    uploadBusy: "جارٍ رفع الصورة…",
    saveSuccess: "تم الحفظ بنجاح.",
    deleteConfirm: "هل تريد حذف هذا السجل؟",
    imageDeleteConfirm: "هل تريد حذف هذه الصورة؟",
    empty: "لا توجد سجلات بعد.",
    total: "الإجمالي",
    upcoming: "فعاليات قادمة",
    publishedContent: "المحتوى المنشور",
    drafts: "المسودات",
    byType: "المحتوى حسب النوع",
    weeklyClasses: "الدروس حسب اليوم",
    announcementsByMonth: "الإعلانات حسب الشهر",
    noChartData: "لا توجد بيانات للرسم بعد.",
    name: "الاسم الكامل",
    shortName: "الاسم المختصر",
    tagline: "الوصف المختصر",
    mission: "الرسالة",
    description: "التعريف",
    facebookUrl: "رابط فيسبوك",
    arabic: "العربية",
    french: "الفرنسية",
    frenchOptional: "الفرنسية اختيارية. سيُنسخ النص العربي إلى أي حقل فرنسي فارغ عند الحفظ.",
    newRecord: "سجل جديد",
    chooseImage: "اختر صورة",
    imageInUse: "الصورة مستخدمة في محتوى منشور أو مسودة.",
    timezone: "الأوقات حسب توقيت تونس (+01:00).",
    days: [
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
      "الأحد",
    ],
  },
  fr: {
    admin: "Administration",
    login: "Connexion administrateur",
    email: "Adresse e-mail",
    password: "Mot de passe",
    signIn: "Se connecter",
    signingIn: "Connexion…",
    logout: "Déconnexion",
    viewSite: "Voir le site",
    dashboard: "Vue d’ensemble",
    announcements: "Annonces",
    events: "Événements",
    classes: "Cours",
    organization: "Organisation",
    media: "Médiathèque",
    loading: "Chargement…",
    retry: "Réessayer",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    add: "Ajouter",
    edit: "Modifier",
    remove: "Supprimer",
    published: "Publié",
    draft: "Brouillon",
    title: "Titre",
    category: "Catégorie",
    excerpt: "Résumé",
    body: "Texte complet",
    formatting: "Mise en forme",
    bold: "Gras",
    italic: "Italique",
    underline: "Souligné",
    bullets: "Liste à puces",
    numbers: "Liste numérotée",
    heading2: "Titre principal",
    heading3: "Sous-titre",
    quote: "Citation",
    link: "Lien",
    linkPrompt:
      "Saisissez un lien (https:// ou mailto:). Laissez vide pour le retirer.",
    linkInvalid:
      "Utilisez un lien commençant par https://, http:// ou mailto:.",
    undo: "Annuler",
    redo: "Rétablir",
    date: "Date de publication",
    start: "Début",
    end: "Fin",
    location: "Lieu",
    subject: "Matière",
    audience: "Public",
    instructor: "Enseignant",
    room: "Salle",
    level: "Niveau",
    day: "Jour",
    status: "Publication",
    cover: "Image",
    upload: "Importer une image",
    removeCover: "Retirer l’image",
    imageHelp: "JPEG, PNG ou WebP, jusqu’à 4 Mo",
    imageTooLarge: "L’image dépasse 4 Mo.",
    uploadBusy: "Importation…",
    saveSuccess: "Enregistré avec succès.",
    deleteConfirm: "Supprimer cet élément ?",
    imageDeleteConfirm: "Supprimer cette image ?",
    empty: "Aucun élément pour le moment.",
    total: "Total",
    upcoming: "Événements à venir",
    publishedContent: "Contenu publié",
    drafts: "Brouillons",
    byType: "Contenu par type",
    weeklyClasses: "Cours par jour",
    announcementsByMonth: "Annonces par mois",
    noChartData: "Pas encore de données pour ce graphique.",
    name: "Nom complet",
    shortName: "Nom court",
    tagline: "Accroche",
    mission: "Mission",
    description: "Présentation",
    facebookUrl: "Lien Facebook",
    arabic: "Arabe",
    french: "Français",
    frenchOptional: "Le français est facultatif. Le texte arabe sera copié dans chaque champ français vide lors de l’enregistrement.",
    newRecord: "Nouvel élément",
    chooseImage: "Choisir une image",
    imageInUse: "Cette image est utilisée par un contenu.",
    timezone: "Horaires en heure de Tunisie (+01:00).",
    days: [
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ],
  },
};

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    credentials: "same-origin",
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
  });
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== "auth/login" && path !== "auth/me")
      window.location.assign("/woloj");
    throw new Error(
      payload?.fields
        ?.map((field) => `${field.field}: ${field.message}`)
        .join("; ") ||
        payload?.error ||
        `HTTP ${response.status}`,
    );
  }
  return payload;
}

const bi = () => ({ ar: "", fr: "" });
function blank(kind) {
  if (kind === "classes")
    return {
      day: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      subject: bi(),
      audience: bi(),
      instructor: bi(),
      room: bi(),
      level: bi(),
      status: "draft",
    };
  const shared = {
    title: bi(),
    category: bi(),
    excerpt: bi(),
    body: bi(),
    status: "draft",
    imageId: null,
    imageUrl: null,
  };
  if (kind === "events")
    return { ...shared, startsAt: "", endsAt: "", location: bi() };
  return { ...shared, publishedAt: new Date().toISOString().slice(0, 10) };
}

function localizedField(record, setRecord, name, locale, value) {
  setRecord((old) => ({ ...old, [name]: { ...old[name], [locale]: value } }));
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  required = true,
  type = "text",
  hint,
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          rows={multiline === "body" ? 7 : 3}
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function BilingualFields({ record, setRecord, names, t }) {
  const richFields = new Set(["body", "excerpt", "mission", "description"]);
  return (
    <div className="admin-languages">
      {["ar", "fr"].map((locale) => (
        <fieldset key={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
          <legend>{locale === "ar" ? t.arabic : t.french}</legend>
          {locale === "fr" && <p className="admin-language-hint">{t.frenchOptional}</p>}
          {names.map((name) =>
            richFields.has(name) ? (
              <RichTextEditor
                key={name}
                label={t[name]}
                locale={locale}
                t={t}
                compact={name === "excerpt" || name === "mission"}
                value={record[name]?.[locale]}
                onChange={(value) =>
                  localizedField(record, setRecord, name, locale, value)
                }
              />
            ) : (
              <Field
                key={name}
                label={t[name]}
                value={record[name]?.[locale]}
                required={locale === "ar"}
                onChange={(value) =>
                  localizedField(record, setRecord, name, locale, value)
                }
              />
            ),
          )}
        </fieldset>
      ))}
    </div>
  );
}

function Login({ locale, t, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const admin = await api("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(admin);
      navigate("/admin", { replace: true });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-login" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="admin-login-card">
        <span className="admin-brand-icon">
          <BookOpen size={34} strokeWidth={1.3} />
        </span>
        <p className="admin-eyebrow">{t.admin}</p>
        <h1>{t.login}</h1>
        <form onSubmit={submit}>
          <Field
            label={t.email}
            value={email}
            onChange={setEmail}
            type="email"
          />
          <label className="admin-field">
            <span>{t.password}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="admin-alert" role="alert">
              {error}
            </p>
          )}
          <button className="admin-primary" disabled={busy}>
            {busy ? t.signingIn : t.signIn}
          </button>
        </form>
        <Link to={`/${locale}`} className="admin-back">
          {t.viewSite}
        </Link>
      </div>
    </main>
  );
}

function Dashboard({ t }) {
  const [state, setState] = useState({ loading: true, value: null, error: "" });
  useEffect(() => {
    let active = true;
    api("admin/dashboard")
      .then((value) => active && setState({ loading: false, value, error: "" }))
      .catch(
        (error) =>
          active &&
          setState({ loading: false, value: null, error: error.message }),
      );
    return () => {
      active = false;
    };
  }, []);
  if (state.loading) return <p role="status">{t.loading}</p>;
  if (state.error)
    return (
      <p role="alert" className="admin-alert">
        {state.error}
      </p>
    );
  const { counts, upcomingEvents, weekdayClasses, monthlyAnnouncements } =
    state.value;
  const published = Object.values(counts).reduce(
    (sum, item) => sum + item.published,
    0,
  );
  const drafts = Object.values(counts).reduce(
    (sum, item) => sum + item.draft,
    0,
  );
  const byType = Object.entries(counts).map(([key, value]) => ({
    label: t[key],
    value: value.published + value.draft,
  }));
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{t.admin}</p>
          <h1>{t.dashboard}</h1>
        </div>
      </div>
      <div className="admin-stat-grid">
        <Stat label={t.publishedContent} value={published} />
        <Stat label={t.drafts} value={drafts} />
        <Stat label={t.upcoming} value={upcomingEvents} />
        <Stat label={t.total} value={published + drafts} />
      </div>
      <div className="admin-chart-grid">
        <BarChart title={t.byType} rows={byType} empty={t.noChartData} />
        <BarChart
          title={t.weeklyClasses}
          rows={weekdayClasses.map((value, index) => ({
            label: t.days[index],
            value,
          }))}
          empty={t.noChartData}
        />
        <BarChart
          title={t.announcementsByMonth}
          rows={Object.entries(monthlyAnnouncements)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, value]) => ({ label, value }))}
          empty={t.noChartData}
        />
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function BarChart({ title, rows, empty }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="admin-panel admin-chart">
      <h2>{title}</h2>
      {rows.some((row) => row.value) ? (
        <div className="admin-bars">
          {rows.map((row) => (
            <div className="admin-bar-row" key={row.label}>
              <span>{row.label}</span>
              <div className="admin-bar-track">
                <div style={{ width: `${(row.value / maximum) * 100}%` }} />
              </div>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function ContentManager({ kind, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [record, setRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      setItems(await api(`admin/${kind}`));
      setError("");
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    setRecord(null);
    setNotice("");
  }, [kind]);
  function startEdit(item) {
    const next = item ? structuredClone(item) : blank(kind);
    if (kind !== "classes" && item) {
      next.body = {
        ar: toRichHtml(item.body.ar),
        fr: toRichHtml(item.body.fr),
      };
    }
    setRecord(next);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const { id, imageUrl, createdAt, updatedAt, ...payload } = record;
    if (kind === "events") {
      payload.startsAt = `${record.startsAt.slice(0, 16)}:00+01:00`;
      payload.endsAt = `${record.endsAt.slice(0, 16)}:00+01:00`;
    }
    if (kind === "classes") payload.day = Number(record.day);
    try {
      await api(`admin/${kind}${id ? `/${encodeURIComponent(id)}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setRecord(null);
      setNotice(true);
      await refresh();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(item) {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await api(`admin/${kind}/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      setNotice(true);
      await refresh();
    } catch (issue) {
      setError(issue.message);
    }
  }
  async function uploadImage(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError(t.imageTooLarge);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const image = await api("admin/media", { method: "POST", body });
      setRecord((old) => ({ ...old, imageId: image.id, imageUrl: image.url }));
    } catch (issue) {
      setError(issue.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{t.admin}</p>
          <h1>{t[kind]}</h1>
        </div>
        {!record && (
          <button className="admin-primary" onClick={() => startEdit(null)}>
            <Plus size={17} />
            {t.add}
          </button>
        )}
      </div>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-success" role="status">
          {t.saveSuccess}
        </p>
      )}
      {record ? (
        <section className="admin-panel admin-editor">
          <div className="admin-editor-heading">
            <h2>{record.id ? t.edit : t.newRecord}</h2>
            <button
              type="button"
              className="admin-icon"
              onClick={() => setRecord(null)}
              aria-label={t.cancel}
            >
              <X size={19} />
            </button>
          </div>
          <form onSubmit={save}>
            {kind === "classes" ? (
              <>
                <div className="admin-form-row">
                  <label className="admin-field">
                    <span>{t.day}</span>
                    <select
                      value={record.day}
                      onChange={(event) =>
                        setRecord({
                          ...record,
                          day: Number(event.target.value),
                        })
                      }
                    >
                      {t.days.map((day, index) => (
                        <option key={day} value={index + 1}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label={t.start}
                    type="time"
                    value={record.startsAt}
                    onChange={(value) =>
                      setRecord({ ...record, startsAt: value })
                    }
                  />
                  <Field
                    label={t.end}
                    type="time"
                    value={record.endsAt}
                    onChange={(value) =>
                      setRecord({ ...record, endsAt: value })
                    }
                  />
                </div>
                <BilingualFields
                  record={record}
                  setRecord={setRecord}
                  names={["subject", "audience", "instructor", "room", "level"]}
                  t={t}
                />
              </>
            ) : (
              <>
                <div className="admin-form-row">
                  {kind === "announcements" ? (
                    <Field
                      label={t.date}
                      type="date"
                      value={record.publishedAt}
                      onChange={(value) =>
                        setRecord({ ...record, publishedAt: value })
                      }
                    />
                  ) : (
                    <>
                      <Field
                        label={t.start}
                        type="datetime-local"
                        value={record.startsAt.slice(0, 16)}
                        onChange={(value) =>
                          setRecord({ ...record, startsAt: value })
                        }
                      />
                      <Field
                        label={t.end}
                        type="datetime-local"
                        value={record.endsAt.slice(0, 16)}
                        onChange={(value) =>
                          setRecord({ ...record, endsAt: value })
                        }
                      />
                    </>
                  )}
                </div>
                {kind === "events" && (
                  <p className="admin-hint">{t.timezone}</p>
                )}
                <BilingualFields
                  record={record}
                  setRecord={setRecord}
                  names={
                    kind === "events"
                      ? ["title", "category", "excerpt", "location", "body"]
                      : ["title", "category", "excerpt", "body"]
                  }
                  t={t}
                />
                <div className="admin-image-field">
                  <strong>{t.cover}</strong>
                  {record.imageUrl && <img src={record.imageUrl} alt="" />}
                  <label className="admin-upload">
                    {uploading ? t.uploadBusy : t.chooseImage}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        uploadImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                      disabled={uploading}
                    />
                  </label>
                  {record.imageId && (
                    <button
                      type="button"
                      className="admin-text-button"
                      onClick={() =>
                        setRecord({ ...record, imageId: null, imageUrl: null })
                      }
                    >
                      {t.removeCover}
                    </button>
                  )}
                  <small>{t.imageHelp}</small>
                </div>
              </>
            )}
            <div className="admin-form-actions">
              <label className="admin-field">
                <span>{t.status}</span>
                <select
                  value={record.status}
                  onChange={(event) =>
                    setRecord({ ...record, status: event.target.value })
                  }
                >
                  <option value="draft">{t.draft}</option>
                  <option value="published">{t.published}</option>
                </select>
              </label>
              <button className="admin-primary" disabled={saving || uploading}>
                <Save size={17} />
                {saving ? t.saving : t.save}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setRecord(null)}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="admin-panel">
          {loading ? (
            <p role="status">{t.loading}</p>
          ) : items.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{kind === "classes" ? t.subject : t.title}</th>
                    <th>
                      {kind === "classes"
                        ? t.day
                        : kind === "events"
                          ? t.start
                          : t.date}
                    </th>
                    <th>{t.status}</th>
                    <th>
                      <span className="sr-only">{t.edit}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {kind === "classes" ? item.subject.ar : item.title.ar}
                        </strong>
                        <small>
                          {kind === "classes" ? item.subject.fr : item.title.fr}
                        </small>
                      </td>
                      <td>
                        <bdi>
                          {kind === "classes"
                            ? `${t.days[item.day - 1]} · ${item.startsAt}`
                            : kind === "events"
                              ? item.startsAt.slice(0, 16).replace("T", " · ")
                              : item.publishedAt}
                        </bdi>
                      </td>
                      <td>
                        <span className={`admin-status ${item.status}`}>
                          {t[item.status]}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            onClick={() => startEdit(item)}
                            aria-label={`${t.edit}: ${item.title?.ar || item.subject?.ar}`}
                          >
                            {t.edit}
                          </button>
                          <button
                            onClick={() => remove(item)}
                            aria-label={`${t.remove}: ${item.title?.ar || item.subject?.ar}`}
                          >
                            {t.remove}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>{t.empty}</p>
          )}
        </section>
      )}
    </>
  );
}

function OrganizationEditor({ t }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api("admin/organization")
      .then(setRecord)
      .catch((issue) => setError(issue.message));
  }, []);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      setRecord(
        await api("admin/organization", {
          method: "PUT",
          body: JSON.stringify(record),
        }),
      );
      setNotice(true);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{t.admin}</p>
          <h1>{t.organization}</h1>
        </div>
      </div>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-success" role="status">
          {t.saveSuccess}
        </p>
      )}
      {!record ? (
        <p>{t.loading}</p>
      ) : (
        <section className="admin-panel admin-editor">
          <form onSubmit={save}>
            <BilingualFields
              record={record}
              setRecord={setRecord}
              names={["name", "shortName", "tagline", "mission", "description"]}
              t={t}
            />
            <Field
              label={t.facebookUrl}
              type="url"
              value={record.facebookUrl}
              onChange={(value) => setRecord({ ...record, facebookUrl: value })}
            />
            <button className="admin-primary" disabled={saving}>
              <Save size={17} />
              {saving ? t.saving : t.save}
            </button>
          </form>
        </section>
      )}
    </>
  );
}

function MediaLibrary({ t }) {
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    try {
      setImages(await api("admin/media"));
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function remove(image) {
    if (!window.confirm(t.imageDeleteConfirm)) return;
    try {
      await api(`admin/media/${image.id}`, { method: "DELETE" });
      await refresh();
    } catch (issue) {
      setError(
        issue.message === "Image is in use" ? t.imageInUse : issue.message,
      );
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{t.admin}</p>
          <h1>{t.media}</h1>
        </div>
      </div>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      <section className="admin-panel">
        {loading ? (
          <p>{t.loading}</p>
        ) : images.length ? (
          <div className="admin-media-grid">
            {images.map((image) => (
              <div className="admin-media-card" key={image.id}>
                <img src={image.url} alt="" />
                <div>
                  <small>{Math.round(image.bytes / 1024)} KB</small>
                  <button onClick={() => remove(image)} aria-label={t.remove}>
                    <Trash2 size={17} />
                    {t.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>{t.empty}</p>
        )}
      </section>
    </>
  );
}

export default function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [locale, setLocale] = useState(() => {
    try {
      return localStorage.getItem("shatibi-language") === "fr" ? "fr" : "ar";
    } catch {
      return "ar";
    }
  });
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const t = labels[locale];
  const loginPage = location.pathname === "/woloj";
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = `${t.admin} | الإمام الشاطبي`;
  }, [locale, t]);
  useEffect(() => {
    api("auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  function toggleLanguage() {
    const next = locale === "ar" ? "fr" : "ar";
    setLocale(next);
    try {
      localStorage.setItem("shatibi-language", next);
    } catch {
      /* optional preference */
    }
  }
  async function logout() {
    try {
      await api("auth/logout", { method: "POST" });
    } finally {
      setAdmin(null);
      navigate("/woloj", { replace: true });
    }
  }
  if (checking)
    return (
      <main className="admin-loading" role="status">
        {t.loading}
      </main>
    );
  if (loginPage)
    return admin ? (
      <Navigate to="/admin" replace />
    ) : (
      <>
        <button className="admin-language-floating" onClick={toggleLanguage}>
          {locale === "ar" ? "Français" : "العربية"}
        </button>
        <Login locale={locale} t={t} onLogin={setAdmin} />
      </>
    );
  if (!admin) return <Navigate to="/woloj" replace />;
  const links = [
    ["/admin", t.dashboard, LayoutDashboard],
    ["/admin/announcements", t.announcements, FileText],
    ["/admin/events", t.events, CalendarDays],
    ["/admin/classes", t.classes, BookOpen],
    ["/admin/organization", t.organization, Settings],
    ["/admin/media", t.media, Images],
  ];
  const section = location.pathname.split("/")[2] || "dashboard";
  return (
    <div className="admin-app" dir={locale === "ar" ? "rtl" : "ltr"}>
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="admin-sidebar-top">
          <Link to="/admin" className="admin-brand">
            <span className="admin-brand-icon">
              <BookOpen strokeWidth={1.3} />
            </span>
            <span>
              الإمام الشاطبي<small>{t.admin}</small>
            </span>
          </Link>
          <button
            className="admin-icon admin-mobile-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label={t.admin}>
          {links.map(([url, label, Icon]) => (
            <Link
              key={url}
              to={url}
              className={location.pathname === url ? "active" : ""}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to={`/${locale}`}>{t.viewSite}</Link>
          <button onClick={logout}>
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="admin-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-icon admin-menu-button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </button>
          <span className="admin-topbar-name">{t.admin}</span>
          <div>
            <button className="admin-language" onClick={toggleLanguage}>
              {locale === "ar" ? "Français" : "العربية"}
            </button>
            <span className="admin-user">{admin.email}</span>
          </div>
        </header>
        <main className="admin-content" id="admin-content">
          {section === "dashboard" ? (
            <Dashboard t={t} />
          ) : ["announcements", "events", "classes"].includes(section) ? (
            <ContentManager key={section} kind={section} t={t} />
          ) : section === "organization" ? (
            <OrganizationEditor t={t} />
          ) : section === "media" ? (
            <MediaLibrary t={t} />
          ) : (
            <Navigate to="/admin" replace />
          )}
        </main>
      </div>
    </div>
  );
}
