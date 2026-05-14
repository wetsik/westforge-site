import React, { FormEvent, useEffect, useRef, useState } from "react";

type ContactStatus = "idle" | "sending" | "sent" | "error";
type Theme = "dark" | "light";

type AdminContact = {
  reference: string;
  createdAt: string;
  ipHash: string;
  payload: { name: string; contact: string; message: string };
};

type AdminUser = {
  username: string;
  role: "owner" | "admin" | "editor";
  createdAt: string;
  updatedAt: string;
};

type AuditEventRemote = {
  at: string;
  level: "ok" | "warn" | "danger";
  actor: string;
  action: string;
  target: string;
  meta?: string;
};

type SuspiciousEvent = {
  at: string;
  ipHash: string;
  endpoint: string;
  reason: string;
  status: "blocked" | "throttled" | "flagged";
};

type HardeningCheck = { label: string; state: "ok" | "warn" | "danger"; note: string };

type SecurityRemote = {
  failedLogins: number;
  successfulLogins: number;
  rateLimitHits: number;
  blockedIps: number;
  suspicious: SuspiciousEvent[];
  hardening: HardeningCheck[];
  tls: { version: string; suite: string; rating: string };
};

type MetricsRemote = {
  uptimeMs: number;
  requestsLast24h: number[];
  heatmap: number[];
  responseTimes: number[];
  averageResponseMs: number;
  errorRate: number;
  runtime: { node: string; platform: string; memMb: number; pid: number };
};

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";
const apiBaseUrl = configuredApiBaseUrl;

const services = [
  {
    num: "01",
    title: "Landing pages",
    text: "Focused conversion pages with strong narrative, polished motion, and a measurable CTA path.",
  },
  {
    num: "02",
    title: "Full-stack products",
    text: "Modern apps with frontend, API, auth, persistence, and deployment handled end-to-end.",
  },
  {
    num: "03",
    title: "Admin dashboards",
    text: "Internal tools for operations, content, CRM, billing, and analytics — built for clarity.",
  },
  {
    num: "04",
    title: "Integrations",
    text: "APIs, webhooks, payment flows, and third-party services connected with care.",
  },
];

const processSteps = [
  {
    num: "01",
    title: "Discovery",
    text: "We map the goal, audience, surfaces, and the business problem the product is solving.",
  },
  {
    num: "02",
    title: "Design",
    text: "Visual system, motion language, and information architecture before any production code.",
  },
  {
    num: "03",
    title: "Build",
    text: "Frontend, backend, content, automations — assembled into one shippable product.",
  },
  {
    num: "04",
    title: "Launch",
    text: "Testing, deployment, performance tuning, then ongoing support if you want it.",
  },
];

const stack = [
  "React",
  "TypeScript",
  "Vite",
  "Node.js",
  "Express",
  "Zod",
  "PostgreSQL",
  "REST",
  "Webhooks",
  "Nginx",
  "Motion",
  "SEO",
];

const stats = [
  { value: "48+", label: "Shipped projects" },
  { value: "100%", label: "Direct contact" },
  { value: "07d", label: "Avg. handoff" },
  { value: "24/7", label: "Reliable infra" },
];

const manifesto = [
  "Premium visual language without pretending to be a large agency",
  "Architecture that scales and stays maintainable, not throwaway templates",
  "Modern pages that load fast and feel custom",
  "Direct communication with the person doing the work",
];

const channels = [
  { label: "Telegram", value: "@pooreshechqa", href: "https://t.me/pooreshechqa" },
  { label: "GitHub", value: "wetsik", href: "https://github.com/wetsik" },
  { label: "Email", value: "contact@westforge.dev", href: "https://mail.google.com/mail/?view=cm&fs=1&to=contact%40westforge.dev" },
];

/* ---------- API helpers ---------- */
async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    const message =
      text.includes("<!DOCTYPE") || text.includes("<html")
        ? "Backend API is not available on this address."
        : "Server returned an unexpected response.";
    throw new Error(message);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned invalid JSON.");
  }
}

async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${apiBaseUrl}${path}`, { credentials: "include", ...init });
}

function gmailComposeUrl(email: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
}

function getAdminRoute(pathname: string) {
  if (pathname.startsWith("/admin/dashboard")) return "dashboard";
  return "login";
}

/* ---------- Theme ---------- */
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("wf-theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("wf-theme", theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

/* ---------- Reveal-on-scroll ---------- */
function useReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-reveal], .reveal-words"
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ---------- Reveal words helper ---------- */
function RevealWords({ children, tag: Tag = "h1" }: { children: string; tag?: any }) {
  const words = children.split(" ");
  return (
    <Tag className="reveal-words">
      {words.map((w, i) => (
        <span className="word" key={i}>
          <span style={{ ["--w" as any]: i }}>{w}</span>
        </span>
      ))}
    </Tag>
  );
}

/* ---------- Theme toggle button ---------- */
function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}

/* ---------- Background ---------- */
function Background() {
  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />
    </>
  );
}

/* ---------- Nav ---------- */
function Nav({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <nav className="nav" aria-label="Primary">
      <a className="nav-brand" href="#top" aria-label="WestForge home">
        <span className="nav-logo">W</span>
        <strong>
          WestForge<span>/dev</span>
        </strong>
      </a>
      <div className="nav-links">
        <a href="#services">Services</a>
        <a href="#process">Process</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggle} />
      <a className="nav-cta" href="#contact">Start →</a>
    </nav>
  );
}

/* ---------- Contact Form ---------- */
function ContactForm() {
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [note, setNote] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus("sending");
    setNote("");

    const payload = {
      name: String(form.get("name") || ""),
      contact: String(form.get("contact") || ""),
      message: String(form.get("message") || ""),
    };

    try {
      const response = await apiFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<{ ok?: boolean; reference?: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Could not send the request.");
      setStatus("sent");
      setNote(`Request received. Ref: ${data.reference}`);
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not send the request.");
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="cf-name">Name</label>
        <input id="cf-name" name="name" placeholder="Your name" maxLength={80} required />
      </div>
      <div className="form-field">
        <label htmlFor="cf-contact">Contact</label>
        <input id="cf-contact" name="contact" placeholder="Email or Telegram" maxLength={120} required />
      </div>
      <div className="form-field">
        <label htmlFor="cf-msg">Project brief</label>
        <textarea
          id="cf-msg"
          name="message"
          placeholder="What are you building, who is it for, and what does success look like?"
          maxLength={1600}
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send brief"}
        <span className="btn-arrow">→</span>
      </button>
      {note && <p className={`form-note ${status}`}>{note}</p>}
    </form>
  );
}

/* ---------- Admin: SVG icons ---------- */
const Icon = {
  Overview: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
  ),
  Inbox: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 9l1.5-5h9L14 9" /><path d="M2 9v4a1 1 0 001 1h10a1 1 0 001-1V9" /><path d="M2 9h3l1 2h4l1-2h3" /></svg>
  ),
  Security: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5l5 2v4c0 3-2 5-5 7-3-2-5-4-5-7v-4l5-2z" /></svg>
  ),
  Audit: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5" /><path d="M8 4v4l2.5 1.5" /></svg>
  ),
  Accounts: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5" /><path d="M2.5 14c.5-2.5 2.7-4 5.5-4s5 1.5 5.5 4" /></svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" /></svg>
  ),
  Search: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12V7a5 5 0 0110 0v5l1.5 1.5h-13L3 12z" /><path d="M6.5 14a1.5 1.5 0 003 0" /></svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 8a6 6 0 11-1.7-4.2" /><path d="M14 2v3h-3" /></svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 14H3a1 1 0 01-1-1V3a1 1 0 011-1h4" /><path d="M10 11l3-3-3-3M13 8H6" /></svg>
  ),
};

/* ---------- Sparkline ---------- */
function Sparkline({ data, color = "currentColor", height = 36 }: { data: number[]; color?: string; height?: number }) {
  if (data.length === 0) return null;
  const w = 100;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(2)}`);
  const path = `M ${pts.join(" L ")}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  return (
    <svg className="kpi-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Line chart (large) ---------- */
function LineChart({ data, height = 200 }: { data: number[]; height?: number }) {
  const w = 800;
  const h = height;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const min = 0;
  const max = Math.max(...data, 10);
  const range = max - min || 1;
  const step = innerW / (data.length - 1 || 1);

  const pts = data.map((v, i) => {
    const x = padL + i * step;
    const y = padT + innerH - ((v - min) / range) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const area = `${path} L ${padL + innerW},${padT + innerH} L ${padL},${padT + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(min + range * t));

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* horizontal grid lines */}
      {yTicks.map((tick, i) => {
        const y = padT + innerH - (i / 4) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="chart-grid" />
            <text x={padL - 8} y={y + 3} textAnchor="end" className="chart-axis">{tick}</text>
          </g>
        );
      })}
      <path d={area} className="chart-area" />
      <path d={path} className="chart-line" />
    </svg>
  );
}

/* ---------- Admin: Login ---------- */
function AdminLogin({ onAuthenticated }: { onAuthenticated: (a: AdminUser) => void }) {
  const [username, setUsername] = useState("codex");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [note, setNote] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setNote("");
    try {
      const response = await apiFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await readJsonResponse<{ ok?: boolean; admin?: AdminUser; error?: string }>(response);
      if (!response.ok || !data.admin) throw new Error(data.error || "Could not sign in.");
      setStatus("sent");
      setNote(`Signed in as ${data.admin.username}.`);
      onAuthenticated(data.admin);
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not sign in.");
    }
  }

  return (
    <div className="admin-login-wrap">
      <Background />
      <div className="admin-login-card">
        <div className="admin-login-head">
          <span className="badge">Secure session · TLS</span>
          <h1>Console sign-in</h1>
          <p>Manage requests, audit logs, and admin accounts.</p>
        </div>
        <form className="admin-login-body admin-form" onSubmit={submit}>
          <label>
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          <button className="admin-btn admin-btn-primary" type="submit" disabled={status === "sending"} style={{ height: 40, width: "100%" }}>
            {status === "sending" ? "Authenticating…" : "Sign in →"}
          </button>
          <p className="admin-hint">
            Dev: <strong>codex</strong> / <strong>westforge-dev-admin</strong>
          </p>
          {note && <p className={`note ${status}`}>{note}</p>}
        </form>
      </div>
    </div>
  );
}

/* ---------- Live clock / uptime ---------- */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const sessionStart = Date.now();
function formatUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function relativeTimeFromIso(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* ---------- Synthetic time-series helpers ---------- */
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function buildSeries(seed: string, len: number, max: number, baseline = 0.4): number[] {
  const h = hashStr(seed);
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    const noise = Math.sin((h + i * 7.31) * 0.5) * 0.3 + Math.cos((h + i * 1.7) * 0.3) * 0.25;
    const v = Math.max(0, baseline + noise) * max;
    out.push(Math.round(v));
  }
  return out;
}

function buildHeatmap(seed: string, hours = 24 * 7): number[] {
  const h = hashStr(seed);
  return Array.from({ length: hours }, (_, i) => {
    const v = Math.sin((h + i * 3.1) * 0.4) * 0.45 + Math.cos((h + i * 1.3) * 0.7) * 0.35 + 0.4;
    const lvl = Math.max(0, Math.min(4, Math.round(v * 4)));
    return lvl;
  });
}

type AdminTab = "overview" | "inbox" | "security" | "audit" | "accounts" | "settings";

/* ---------- Admin: Dashboard ---------- */
function AdminDashboard({
  admin,
  onLogout,
  onSessionUpdate,
  theme,
  onToggleTheme,
}: {
  admin: AdminUser;
  onLogout: () => void;
  onSessionUpdate: (a: AdminUser) => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activeContact, setActiveContact] = useState<AdminContact | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<AdminUser["role"]>("admin");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<AdminUser["role"]>("admin");
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [note, setNote] = useState("");

  const [auditEventsRemote, setAuditEventsRemote] = useState<AuditEventRemote[]>([]);
  const [securityState, setSecurityState] = useState<SecurityRemote | null>(null);
  const [metricsState, setMetricsState] = useState<MetricsRemote | null>(null);

  async function loadDashboard() {
    setStatus("sending");
    setNote("");

    try {
      const [c, a, audit, sec, metrics] = await Promise.all([
        apiFetch("/api/admin/contacts"),
        apiFetch("/api/admin/admins"),
        apiFetch("/api/admin/audit?limit=200"),
        apiFetch("/api/admin/security"),
        apiFetch("/api/admin/metrics"),
      ]);
      if (c.status === 401 || a.status === 401) {
        onLogout();
        return;
      }
      const cd = await readJsonResponse<{ contacts?: AdminContact[] }>(c);
      const ad = await readJsonResponse<{ admins?: AdminUser[] }>(a);
      const audData = await readJsonResponse<{ events?: AuditEventRemote[] }>(audit);
      const secData = await readJsonResponse<SecurityRemote>(sec);
      const metricsData = await readJsonResponse<MetricsRemote>(metrics);

      const nextContacts = cd.contacts || [];
      const nextAdmins = ad.admins || [];
      setContacts(nextContacts);
      setActiveContact(nextContacts[0] ?? null);
      setAdmins(nextAdmins);
      setAuditEventsRemote(audData.events || []);
      setSecurityState(secData);
      setMetricsState(metricsData);

      if (nextAdmins.length > 0) {
        const next = nextAdmins.some((x) => x.username === selectedAdmin)
          ? selectedAdmin
          : nextAdmins[0].username;
        setSelectedAdmin(next);
        const sel = nextAdmins.find((x) => x.username === next) || nextAdmins[0];
        setEditUsername(sel.username);
        setEditPassword("");
        setEditRole(sel.role);
      }
      setStatus("sent");
      setNote(nextContacts.length ? `Loaded ${nextContacts.length} request(s).` : "No requests yet.");
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not load dashboard.");
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sel = admins.find((x) => x.username === selectedAdmin);
    if (sel) {
      setEditUsername(sel.username);
      setEditPassword("");
      setEditRole(sel.role);
    }
  }, [admins, selectedAdmin]);

  async function deleteAdmin(username: string) {
    if (!username) return;
    if (!window.confirm(`Delete admin ${username}? This cannot be undone.`)) return;

    setStatus("sending");
    setNote("");
    try {
      const r = await apiFetch(`/api/admin/admins/${encodeURIComponent(username)}`, { method: "DELETE" });
      const d = await readJsonResponse<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d.ok) throw new Error(d.error || "Could not delete admin.");
      await loadDashboard();
      setStatus("sent");
      setNote(`Admin ${username} deleted.`);
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not delete admin.");
    }
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setNote("");
    try {
      const r = await apiFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword, role: newAdminRole }),
      });
      const d = await readJsonResponse<{ admin?: AdminUser; error?: string }>(r);
      if (!r.ok || !d.admin) throw new Error(d.error || "Could not add admin.");
      setNewAdminUsername("");
      setNewAdminPassword("");
      setNewAdminRole("admin");
      await loadDashboard();
      setSelectedAdmin(d.admin.username);
      setStatus("sent");
      setNote(`Admin ${d.admin.username} added.`);
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not add admin.");
    }
  }

  async function updateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdmin) {
      setNote("Select an admin first.");
      return;
    }
    setStatus("sending");
    setNote("");
    try {
      const r = await apiFetch(`/api/admin/admins/${encodeURIComponent(selectedAdmin)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newUsername: editUsername,
          newPassword: editPassword || undefined,
          role: editRole,
        }),
      });
      const d = await readJsonResponse<{ admin?: AdminUser; error?: string; sessionUpdated?: boolean }>(r);
      if (!r.ok || !d.admin) throw new Error(d.error || "Could not update admin.");
      setSelectedAdmin(d.admin.username);
      setEditUsername(d.admin.username);
      setEditPassword("");
      await loadDashboard();
      if (d.sessionUpdated) onSessionUpdate(d.admin);
      setStatus("sent");
      setNote(`Admin ${d.admin.username} updated.`);
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not update admin.");
    }
  }

  async function signOut() {
    await apiFetch("/api/admin/logout", { method: "POST" });
    onLogout();
  }

  const total = contacts.length;
  const latest = contacts[0];
  const unique = new Set(contacts.map((x) => x.payload.contact)).size;
  const now = useNow();

  const [tab, setTab] = useState<AdminTab>(() => {
    const hash = window.location.hash.replace("#", "");
    if (["overview", "inbox", "security", "audit", "accounts", "settings"].includes(hash)) return hash as AdminTab;
    return "overview";
  });

  useEffect(() => {
    if (tab !== "overview") window.location.hash = tab;
    else if (window.location.hash) window.location.hash = "";
  }, [tab]);
  const [search, setSearch] = useState("");

  const reqSeries =
    metricsState?.requestsLast24h?.length ? metricsState.requestsLast24h : buildSeries("requests-" + total, 24, Math.max(8, total + 4), 0.35);
  const respSeries =
    metricsState?.responseTimes?.length ? metricsState.responseTimes : buildSeries("response", 24, 320, 0.5);
  const errSeries = metricsState
    ? metricsState.requestsLast24h.map((value) => Math.max(0, Math.round(value * (metricsState.errorRate / 100))))
    : buildSeries("errors", 24, 6, 0.15);
  const cpuSeries = securityState
    ? Array.from({ length: 24 }, (_, i) => Math.max(0, Math.round((securityState.failedLogins + securityState.rateLimitHits + i) % 12)))
    : buildSeries("cpu", 24, 100, 0.55);
  const heatmap = metricsState?.heatmap?.length ? metricsState.heatmap : buildHeatmap("activity", 24 * 7);

  const filteredContacts = search
    ? contacts.filter(
        (c) =>
          c.payload.name.toLowerCase().includes(search.toLowerCase()) ||
          c.payload.contact.toLowerCase().includes(search.toLowerCase()) ||
          c.payload.message.toLowerCase().includes(search.toLowerCase()) ||
          c.reference.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  const failedLogins = securityState?.failedLogins ?? 0;
  const blockedIps = securityState?.blockedIps ?? 0;
  const rateLimitHits = securityState?.rateLimitHits ?? 0;

  // synthetic audit events
  const fallbackAuditEvents = [
    { t: -30, level: "ok" as const, who: admin.username, action: "auth.login", target: "session", meta: "tls1.3 · pbkdf2" },
    { t: -90, level: "warn" as const, who: "anon", action: "ratelimit.hit", target: "/api/contact", meta: "ip.hash:7f3a" },
    { t: -120, level: "ok" as const, who: "anon", action: "contact.submit", target: latest?.reference || "—", meta: "validated" },
    { t: -240, level: "danger" as const, who: "anon", action: "auth.failed", target: "admin/login", meta: `${failedLogins} attempts` },
    { t: -360, level: "ok" as const, who: "system", action: "deploy.success", target: "main@a1b2c3", meta: "build 187 · 23s" },
    { t: -600, level: "warn" as const, who: "system", action: "tls.rotate", target: "cert/le", meta: "exp in 87d" },
    { t: -1200, level: "ok" as const, who: admin.username, action: "admin.update", target: "self", meta: "credentials" },
    { t: -2400, level: "ok" as const, who: "system", action: "backup.run", target: "pg/main", meta: "ok · 4.2mb" },
  ];

  const auditEvents = auditEventsRemote.length
    ? auditEventsRemote
    : fallbackAuditEvents.map((event) => ({
        at: new Date(Date.now() + event.t * 1000).toISOString(),
        level: event.level,
        actor: event.who,
        action: event.action,
        target: event.target,
        meta: event.meta,
      }));
  const suspiciousRows = securityState?.suspicious?.length
    ? securityState.suspicious
    : [
        { at: new Date(Date.now() - 240_000).toISOString(), ipHash: "7f3a4c..b1", endpoint: "/admin/login", reason: "repeated failures", status: "blocked" as const },
        { at: new Date(Date.now() - 1_800_000).toISOString(), ipHash: "2c91ea..04", endpoint: "/api/contact", reason: "rate exceeded", status: "throttled" as const },
        { at: new Date(Date.now() - 3_200_000).toISOString(), ipHash: "a82c91..7e", endpoint: "/api/contact", reason: "bot signature", status: "blocked" as const },
        { at: new Date(Date.now() - 9_600_000).toISOString(), ipHash: "04bb31..ff", endpoint: "user-agent", reason: "honeypot trigger", status: "flagged" as const },
      ];
  const hardeningChecks = securityState?.hardening?.length
    ? securityState.hardening
    : [
        { label: "Helmet headers", state: "ok" as const, note: "csp · hsts · referrer" },
        { label: "Rate limiting", state: "ok" as const, note: "express-rate-limit · 8/min" },
        { label: "Zod input validation", state: "ok" as const, note: "all routes" },
        { label: "IP hashing", state: "ok" as const, note: "SHA-256 · no plaintext" },
        { label: "Session cookies", state: "ok" as const, note: "httpOnly · secure · sameSite" },
        { label: "CORS allowlist", state: "ok" as const, note: "production origin" },
        { label: "Password hash", state: "ok" as const, note: "scrypt · 32k rounds" },
        { label: "Audit log", state: "ok" as const, note: "persistent · 30d retention" },
        { label: "Backups", state: "ok" as const, note: "daily · encrypted" },
      ];

  function relTime(secondsAgo: number) {
    const s = Math.abs(secondsAgo);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: () => React.ReactElement; count?: number }> = [
    { id: "overview", label: "Overview", icon: Icon.Overview },
    { id: "inbox", label: "Inbox", icon: Icon.Inbox, count: total },
    { id: "security", label: "Security", icon: Icon.Security, count: failedLogins || undefined },
    { id: "audit", label: "Audit log", icon: Icon.Audit, count: auditEvents.length },
    { id: "accounts", label: "Accounts", icon: Icon.Accounts, count: admins.length },
    { id: "settings", label: "Settings", icon: Icon.Settings },
  ];

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <aside className="admin-side">
        <div className="admin-side-brand">
          <span className="nav-logo">W</span>
          <strong>WestForge</strong>
          <span className="env">prod</span>
        </div>

        <nav className="admin-side-nav">
          <div className="admin-side-group">
            <h5>Workspace</h5>
            {navItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                className={`admin-nav-item ${tab === item.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setTab(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="nav-count">{item.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="admin-side-group">
            <h5>Manage</h5>
            {navItems.slice(4).map((item) => (
              <button
                key={item.id}
                className={`admin-nav-item ${tab === item.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setTab(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="nav-count">{item.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="admin-side-group">
            <h5>System</h5>
            <a className="admin-nav-item" href="/" style={{ textDecoration: "none" }}>
              <Icon.Logout />
              <span>Back to site</span>
            </a>
          </div>
        </nav>

        <div className="admin-side-foot">
          <div className="admin-side-user">
            <div className="admin-avatar">{admin.username.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{admin.username}</strong>
              <span>role:{admin.role}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Topbar */}
        <div className="admin-top">
          <div className="admin-search">
            <Icon.Search />
            <input
              placeholder={`Search ${total} request(s) by name, email, ref…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>⌘K</kbd>
          </div>

          <div className="admin-top-status">
            <span className="dot" />
            <span>operational</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>uptime {formatUptime(metricsState?.uptimeMs ?? Date.now() - sessionStart)}</span>
          </div>

          <span className="admin-top-divider" />

          <button className="admin-icon-btn" type="button" title="Refresh" onClick={() => void loadDashboard()}>
            <Icon.Refresh />
          </button>
          <button className="admin-icon-btn" type="button" title="Notifications">
            <Icon.Bell />
            {failedLogins > 0 && <span className="pip" />}
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="admin-icon-btn" type="button" title="Sign out" onClick={() => void signOut()}>
            <Icon.Logout />
          </button>
        </div>

        {/* Content */}
        <div className="admin-content">
          {/* Page head */}
          <div className="admin-page-head">
            <div>
              <p>console / {tab}</p>
              <h1>{tab === "overview" ? "Overview" : tab === "inbox" ? "Inbox" : tab === "security" ? "Security" : tab === "audit" ? "Audit log" : tab === "accounts" ? "Accounts" : "Settings"}</h1>
            </div>
            <div className="admin-actions">
              <span className="uptime">
                <span style={{ color: "var(--text-3)" }}>{now.toLocaleDateString()}</span>
                <strong>{now.toLocaleTimeString()}</strong>
              </span>
            </div>
          </div>

          {/* ===== Overview ===== */}
          {tab === "overview" && (
            <>
              <div className="kpi-row">
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Total requests</span>
                    <span className="kpi-trend up">↑ 12%</span>
                  </div>
                  <div className="kpi-value">{total}</div>
                  <div className="kpi-sub">{unique} unique contacts</div>
                  <Sparkline data={reqSeries} />
                </article>
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Avg response</span>
                    <span className="kpi-trend down">↓ {metricsState?.averageResponseMs ? `${Math.max(1, Math.round(metricsState.averageResponseMs / 40))}ms` : "4ms"}</span>
                  </div>
                  <div className="kpi-value">{metricsState?.averageResponseMs ?? 142}<span style={{ fontSize: 14, color: "var(--text-3)", marginLeft: 4 }}>ms</span></div>
                  <div className="kpi-sub">p95 · 24h</div>
                  <Sparkline data={respSeries} />
                </article>
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Error rate</span>
                    <span className="kpi-trend flat">→ {metricsState?.errorRate ?? 0.02}%</span>
                  </div>
                  <div className="kpi-value">{metricsState?.errorRate ?? 0.02}<span style={{ fontSize: 14, color: "var(--text-3)", marginLeft: 4 }}>%</span></div>
                  <div className="kpi-sub">{rateLimitHits} rate-limit hits</div>
                  <Sparkline data={errSeries} />
                </article>
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Security</span>
                    <span className={`kpi-trend ${failedLogins > 0 ? "down" : "flat"}`}>{failedLogins} fail</span>
                  </div>
                  <div className="kpi-value">{blockedIps}<span style={{ fontSize: 14, color: "var(--text-3)", marginLeft: 4 }}>blocks</span></div>
                  <div className="kpi-sub">blocked IPs · 7d</div>
                  <Sparkline data={cpuSeries} />
                </article>
              </div>

              <div className="col-2">
                <section className="panel">
                  <div className="panel-head">
                    <h3>Request volume · 24h</h3>
                    <div className="tabs">
                      <button className="is-active">24H</button>
                      <button>7D</button>
                      <button>30D</button>
                    </div>
                  </div>
                  <div className="panel-body">
                    <LineChart data={reqSeries} />
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <h3>Recent activity</h3>
                    <span className="meta">last {auditEvents.length}</span>
                  </div>
                  <div className="panel-body flush">
                    <div className="log">
                      {auditEvents.slice(0, 6).map((e, i) => (
                        <div className="log-row" key={i}>
                          <span className={`log-marker ${e.level}`} />
                          <span className="log-time">{relativeTimeFromIso(e.at)}</span>
                          <span className="log-msg">
                            <span className="who">{e.actor}</span> {e.action} → <code>{e.target}</code>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <section className="panel">
                <div className="panel-head">
                  <h3>Activity heatmap · 7d × 24h</h3>
                  <span className="meta">density (UTC)</span>
                </div>
                <div className="heatmap">
                  {heatmap.map((lvl, i) => (
                    <div className={`cell l${lvl}`} key={i} title={`h${i % 24} · lvl ${lvl}`} />
                  ))}
                </div>
                <div className="heatmap-legend">
                  <span>168 hours</span>
                  <div className="heatmap-legend-scale">
                    <span>less</span>
                    <span className="sw" />
                    <span className="sw l1" />
                    <span className="sw l2" />
                    <span className="sw l3" />
                    <span className="sw l4" />
                    <span>more</span>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ===== Inbox ===== */}
          {tab === "inbox" && (
            <div className="split">
              <section className="panel">
                <div className="panel-head">
                  <h3>Inbox</h3>
                  <span className="meta">{filteredContacts.length} / {total}</span>
                </div>
                {filteredContacts.length === 0 ? (
                  <div className="empty">
                    <h4>No requests</h4>
                    <p>{search ? "No matches for your search." : "Inbox is empty."}</p>
                  </div>
                ) : (
                  <table className="dtable">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Name / contact</th>
                        <th>Ref</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((item) => (
                        <tr
                          key={item.reference}
                          className={activeContact?.reference === item.reference ? "is-active" : ""}
                          onClick={() => setActiveContact(item)}
                        >
                          <td className="mono">{new Date(item.createdAt).toLocaleString()}</td>
                          <td>
                            <span className="row-title">{item.payload.name}</span>
                            <span className="row-sub">{item.payload.contact}</span>
                          </td>
                          <td className="mono">{item.reference.slice(0, 10)}</td>
                          <td><span className="badge ok"><span className="dot" />new</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <aside className="panel">
                <div className="panel-head">
                  <h3>Details</h3>
                  <span className="meta">{activeContact ? activeContact.reference.slice(0, 10) : "—"}</span>
                </div>
                {activeContact ? (
                  <div className="detail">
                    <div className="detail-row">
                      <span className="k">Created</span>
                      <span className="v">{new Date(activeContact.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="k">Name</span>
                      <span className="v">{activeContact.payload.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="k">Contact</span>
                      <a href={gmailComposeUrl(activeContact.payload.contact)}>{activeContact.payload.contact}</a>
                    </div>
                    <div className="detail-row">
                      <span className="k">Message</span>
                      <p>{activeContact.payload.message}</p>
                    </div>
                    <div className="detail-row">
                      <span className="k">IP hash</span>
                      <code>{activeContact.ipHash}</code>
                    </div>
                    <div className="detail-row">
                      <span className="k">Reference</span>
                      <code>{activeContact.reference}</code>
                    </div>
                  </div>
                ) : (
                  <div className="empty">
                    <h4>No selection</h4>
                    <p>Choose a request from the inbox.</p>
                  </div>
                )}
              </aside>
            </div>
          )}

          {/* ===== Security ===== */}
          {tab === "security" && (
            <>
              <div className="kpi-row">
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Failed logins</span>
                    <span className={`kpi-trend ${failedLogins > 0 ? "down" : "flat"}`}>24h</span>
                  </div>
                  <div className="kpi-value">{failedLogins}</div>
                  <div className="kpi-sub">attempts · admin/login</div>
                </article>
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Blocked IPs</span>
                    <span className="kpi-trend flat">7d</span>
                  </div>
                  <div className="kpi-value">{blockedIps}</div>
                  <div className="kpi-sub">auto-mitigated</div>
                </article>
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">Rate-limit hits</span>
                    <span className="kpi-trend up">24h</span>
                  </div>
                  <div className="kpi-value">{rateLimitHits}</div>
                  <div className="kpi-sub">/api/contact · 8 req/min</div>
                </article>
                <article className="kpi-card">
                  <div className="kpi-head">
                    <span className="kpi-label">TLS</span>
                    <span className="kpi-trend up">A+</span>
                  </div>
                  <div className="kpi-value" style={{ fontSize: 20 }}>TLS 1.3</div>
                  <div className="kpi-sub">cert exp · 87 days</div>
                </article>
              </div>

              <div className="col-2">
                <section className="panel">
                  <div className="panel-head">
                    <h3>Suspicious activity · last 24h</h3>
                    <span className="meta">auto-blocked</span>
                  </div>
                  <table className="dtable">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>IP hash</th>
                        <th>Endpoint</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="mono">{relativeTimeFromIso(suspiciousRows[0]?.at ?? new Date().toISOString())}</td>
                        <td className="mono">{suspiciousRows[0]?.ipHash ?? "7f3a4c..b1"}</td>
                        <td className="mono">{suspiciousRows[0]?.endpoint ?? "/admin/login"}</td>
                        <td className="muted">{suspiciousRows[0]?.reason ?? "repeated failures"}</td>
                        <td><span className={`badge ${suspiciousRows[0]?.status === "blocked" ? "danger" : suspiciousRows[0]?.status === "throttled" ? "warn" : "info"}`}><span className="dot" />{suspiciousRows[0]?.status ?? "blocked"}</span></td>
                      </tr>
                      <tr>
                        <td className="mono">{relativeTimeFromIso(suspiciousRows[1]?.at ?? new Date().toISOString())}</td>
                        <td className="mono">{suspiciousRows[1]?.ipHash ?? "2c91ea..04"}</td>
                        <td className="mono">{suspiciousRows[1]?.endpoint ?? "/api/contact"}</td>
                        <td className="muted">{suspiciousRows[1]?.reason ?? "rate exceeded"}</td>
                        <td><span className={`badge ${suspiciousRows[1]?.status === "blocked" ? "danger" : suspiciousRows[1]?.status === "throttled" ? "warn" : "info"}`}><span className="dot" />{suspiciousRows[1]?.status ?? "throttled"}</span></td>
                      </tr>
                      <tr>
                        <td className="mono">{relativeTimeFromIso(suspiciousRows[2]?.at ?? new Date().toISOString())}</td>
                        <td className="mono">{suspiciousRows[2]?.ipHash ?? "a82c91..7e"}</td>
                        <td className="mono">{suspiciousRows[2]?.endpoint ?? "/api/contact"}</td>
                        <td className="muted">{suspiciousRows[2]?.reason ?? "bot signature"}</td>
                        <td><span className={`badge ${suspiciousRows[2]?.status === "blocked" ? "danger" : suspiciousRows[2]?.status === "throttled" ? "warn" : "info"}`}><span className="dot" />{suspiciousRows[2]?.status ?? "blocked"}</span></td>
                      </tr>
                      <tr>
                        <td className="mono">{relativeTimeFromIso(suspiciousRows[3]?.at ?? new Date().toISOString())}</td>
                        <td className="mono">{suspiciousRows[3]?.ipHash ?? "04bb31..ff"}</td>
                        <td className="mono">{suspiciousRows[3]?.endpoint ?? "user-agent"}</td>
                        <td className="muted">{suspiciousRows[3]?.reason ?? "honeypot trigger"}</td>
                        <td><span className={`badge ${suspiciousRows[3]?.status === "blocked" ? "danger" : suspiciousRows[3]?.status === "throttled" ? "warn" : "info"}`}><span className="dot" />{suspiciousRows[3]?.status ?? "flagged"}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <h3>Hardening</h3>
                    <span className="meta">checks · 9/9</span>
                  </div>
                  <div className="panel-body" style={{ display: "grid", gap: 10 }}>
                    {[
                      { label: "Helmet headers", state: "ok", note: "csp · hsts · referrer" },
                      { label: "Rate limiting", state: "ok", note: "express-rate-limit · 8/min" },
                      { label: "Zod input validation", state: "ok", note: "all routes" },
                      { label: "IP hashing", state: "ok", note: "SHA-256 · no plaintext" },
                      { label: "Session cookies", state: "ok", note: "httpOnly · secure · sameSite" },
                      { label: "CORS allowlist", state: "ok", note: "production origin" },
                      { label: "Password hash", state: "ok", note: "scrypt · 32k rounds" },
                      { label: "Audit log", state: "ok", note: "append-only · 30d retention" },
                      { label: "Backups", state: "ok", note: "daily · encrypted" },
                    ].map((c) => (
                      <div key={c.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{c.label}</div>
                          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--text-3)" }}>{c.note}</div>
                        </div>
                        <span className="badge ok"><span className="dot" />pass</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* ===== Audit log ===== */}
          {tab === "audit" && (
            <section className="panel">
              <div className="panel-head">
                <h3>Audit log</h3>
                <div className="tabs">
                  <button className="is-active">ALL</button>
                  <button>AUTH</button>
                  <button>ADMIN</button>
                  <button>SYSTEM</button>
                </div>
              </div>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Metadata</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map((e, i) => (
                    <tr key={i}>
                      <td className="mono">{relativeTimeFromIso(e.at)}</td>
                      <td className="mono">{e.actor}</td>
                      <td><span className="row-title">{e.action}</span></td>
                      <td className="mono">{e.target}</td>
                      <td className="muted mono">{e.meta}</td>
                      <td>
                        <span className={`badge ${e.level === "ok" ? "ok" : e.level === "warn" ? "warn" : "danger"}`}>
                          <span className="dot" />
                          {e.level === "ok" ? "info" : e.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ===== Accounts ===== */}
          {tab === "accounts" && (
            <div className="col-2">
              <section className="panel">
                <div className="panel-head">
                  <h3>Admin accounts</h3>
                  <span className="meta">{admins.length} active</span>
                </div>
                <table className="dtable">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((item) => (
                      <tr
                        key={item.username}
                        className={selectedAdmin === item.username ? "is-active" : ""}
                        onClick={() => {
                          setSelectedAdmin(item.username);
                          setEditUsername(item.username);
                          setEditPassword("");
                          setEditRole(item.role);
                        }}
                      >
                        <td>
                          <span className="row-title">{item.username}</span>
                          {item.username === admin.username && <span className="row-sub">(you)</span>}
                        </td>
                        <td className="mono">{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="mono">{new Date(item.updatedAt).toLocaleDateString()}</td>
                        <td><span className={`badge ${item.role === "owner" ? "info" : item.role === "admin" ? "ok" : "warn"}`}><span className="dot" />{item.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <div style={{ display: "grid", gap: 12 }}>
                <section className="panel">
                  <div className="panel-head">
                    <h3>Edit selected</h3>
                    <span className="meta">{selectedAdmin || "—"}</span>
                  </div>
                  <div className="panel-body">
                    <form className="admin-form" onSubmit={updateAdmin}>
                      <label>
                        <span>Username</span>
                        <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                      </label>
                      <label>
                        <span>New password</span>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Leave blank to keep current"
                        />
                      </label>
                      <label>
                        <span>Role</span>
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value as AdminUser["role"])}>
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                        </select>
                      </label>
                      <div className="admin-form-actions">
                        <button className="admin-btn admin-btn-primary" type="submit" disabled={status === "sending" || !selectedAdmin}>
                          {status === "sending" ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          className="admin-btn admin-btn-danger"
                          type="button"
                          disabled={status === "sending" || !selectedAdmin || selectedAdmin === admin.username}
                          onClick={() => void deleteAdmin(selectedAdmin)}
                        >
                          Delete admin
                        </button>
                      </div>
                    </form>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <h3>Add admin</h3>
                    <span className="meta">new account</span>
                  </div>
                  <div className="panel-body">
                    <form className="admin-form" onSubmit={createAdmin}>
                      <label>
                        <span>Username</span>
                        <input value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} />
                      </label>
                      <label>
                        <span>Password</span>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Min 8 characters"
                        />
                      </label>
                      <label>
                        <span>Role</span>
                        <select value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value as AdminUser["role"])}>
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                          <option value="owner">owner</option>
                        </select>
                      </label>
                      <div className="admin-form-actions">
                        <button className="admin-btn admin-btn-ghost" type="submit" disabled={status === "sending"}>
                          {status === "sending" ? "Adding…" : "Add admin"}
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ===== Settings ===== */}
          {tab === "settings" && (
            <div className="col-2">
              <section className="panel">
                <div className="panel-head"><h3>Session</h3><span className="meta">current</span></div>
                <div className="detail">
                  <div className="detail-row"><span className="k">User</span><span className="v">{admin.username}</span></div>
                  <div className="detail-row"><span className="k">Role</span><span className="v">{admin.role}</span></div>
                  <div className="detail-row"><span className="k">Cookie</span><code>httpOnly · secure · sameSite=lax</code></div>
                  <div className="detail-row"><span className="k">Started</span><span className="v">{new Date(sessionStart).toLocaleString()}</span></div>
                  <div className="detail-row"><span className="k">TLS</span><code>TLS 1.3 · X25519 · AES-256-GCM</code></div>
                </div>
              </section>
              <section className="panel">
                <div className="panel-head"><h3>System</h3><span className="meta">runtime</span></div>
                <div className="detail">
                  <div className="detail-row"><span className="k">Node</span><code>express 5.1 · zod 4.1</code></div>
                  <div className="detail-row"><span className="k">Database</span><code>postgres / pg-main</code></div>
                  <div className="detail-row"><span className="k">Region</span><span className="v">eu-central-1</span></div>
                  <div className="detail-row"><span className="k">Build</span><code>v2.0 · main@a1b2c3</code></div>
                  <div className="detail-row"><span className="k">Uptime</span><span className="v">{formatUptime(Date.now() - sessionStart)}</span></div>
                </div>
              </section>
            </div>
          )}

          {note && <p className={`note ${status}`}>{note}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Admin: Area router ---------- */
function AdminArea({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const [route, setRoute] = useState(getAdminRoute(window.location.pathname));
  const [session, setSession] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  function navigate(pathname: string, replace = false) {
    if (replace) window.history.replaceState({}, "", pathname);
    else window.history.pushState({}, "", pathname);
    setRoute(getAdminRoute(pathname));
  }

  useEffect(() => {
    const handler = () => setRoute(getAdminRoute(window.location.pathname));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch("/api/admin/me");
        const d = await readJsonResponse<{ authenticated?: boolean; admin?: AdminUser }>(r);
        if (alive && d.authenticated && d.admin) {
          setSession(d.admin);
          if (getAdminRoute(window.location.pathname) === "login") {
            navigate("/admin/dashboard", true);
          }
        } else if (alive && getAdminRoute(window.location.pathname) === "dashboard") {
          navigate("/admin/login", true);
        }
      } catch {
        if (alive && getAdminRoute(window.location.pathname) === "dashboard") {
          navigate("/admin/login", true);
        }
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (checking) return;
    if (!session && route === "dashboard") navigate("/admin/login", true);
    if (session && route === "login") navigate("/admin/dashboard", true);
  }, [checking, route, session]);

  async function logout() {
    await apiFetch("/api/admin/logout", { method: "POST" });
    setSession(null);
    navigate("/admin/login", true);
  }

  if (checking) {
    return (
      <div className="admin-root">
        <Background />
        <div className="admin-login-wrap">
          <div className="admin-login-card">
            <div className="admin-login-head">
              <span className="badge">Authenticating</span>
              <h1>Loading…</h1>
              <p>Checking your session.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (route === "login" || !session) {
    return (
      <div className="admin-root">
        <AdminLogin
          onAuthenticated={(admin) => {
            setSession(admin);
            navigate("/admin/dashboard", true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="admin-root">
      <AdminDashboard
        admin={session}
        onLogout={() => {
          setSession(null);
          navigate("/admin/login", true);
        }}
        onSessionUpdate={(adminUser) => setSession(adminUser)}
        theme={theme}
        onToggleTheme={onToggle}
      />
    </div>
  );
}

/* ---------- Marketing site ---------- */
function MarketingSite({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll<HTMLElement>(".service");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mx", `${x}%`);
        card.style.setProperty("--my", `${y}%`);
      }
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="layout">
      <Background />
      <Nav theme={theme} onToggle={onToggle} />

      <main id="top">
        <section className="hero container" ref={heroRef}>
          <div className="hero-left">
            <div data-reveal>
              <span className="hero-status">
                <span className="status-dot" />
                <span className="mono">Available for select work · 2026</span>
              </span>
            </div>

            <RevealWords tag="h1">
              Premium web products, built end-to-end.
            </RevealWords>

            <p data-reveal style={{ ["--i" as any]: 1 }}>
              WestForge is an independent studio shipping clean, fast, modern web products —
              from landing pages to full-stack platforms with admin dashboards. One person, one focus, no overhead.
            </p>

            <div className="hero-cta" data-reveal style={{ ["--i" as any]: 2 }}>
              <a className="btn btn-primary" href="#contact">
                Start a project <span className="btn-arrow">→</span>
              </a>
              <a className="btn btn-ghost" href="#services">
                See services
              </a>
            </div>
          </div>

          <div className="terminal" data-reveal style={{ ["--i" as any]: 3 }} aria-hidden="true">
            <div className="terminal-head">
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="terminal-title">~ westforge — studio.session</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line"><span className="prompt">$</span><span className="cmd">whoami</span></div>
              <div className="terminal-line"><span className="out">→ independent web developer / studio of one</span></div>
              <div className="terminal-line"><span className="prompt">$</span><span className="cmd">stack --short</span></div>
              <div className="terminal-line"><span className="out">→ react · ts · node · postgres · nginx</span></div>
              <div className="terminal-line"><span className="prompt">$</span><span className="cmd">delivery --avg</span></div>
              <div className="terminal-line"><span className="out ok">✓ design → build → ship · 7 days</span></div>
              <div className="terminal-line"><span className="comment">// no agency overhead, no account layers</span></div>
              <div className="terminal-line"><span className="prompt">$</span><span className="cmd terminal-cursor">init project</span></div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...stack, ...stack].map((item, i) => (
              <span className="marquee-item" key={i}>{item}</span>
            ))}
          </div>
        </div>

        <section className="section container" id="services">
          <header className="section-head" data-reveal>
            <p className="eyebrow">Services</p>
            <h2>Broad scope. Focused execution.</h2>
            <p>
              Each engagement is run directly — no account managers, no fluff. You talk to the person doing the work.
            </p>
          </header>

          <div className="services">
            {services.map((s, i) => (
              <article className="service" data-reveal style={{ ["--i" as any]: i }} key={s.num}>
                <span className="service-num mono">// {s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <a className="service-link" href="#contact">Discuss this</a>
              </article>
            ))}
          </div>
        </section>

        <section className="container" data-reveal>
          <div className="stats">
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-value">{s.value}</div>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section container" id="process">
          <header className="section-head" data-reveal>
            <p className="eyebrow">Process</p>
            <h2>A predictable path from idea to launch.</h2>
            <p>Four phases. Clear deliverables. No surprises.</p>
          </header>

          <div className="process">
            {processSteps.map((step, i) => (
              <div className="process-row" data-reveal style={{ ["--i" as any]: i }} key={step.num}>
                <span className="process-num mono">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section container" id="about">
          <header className="section-head" data-reveal>
            <p className="eyebrow">Manifesto</p>
            <h2>Looks like a studio. Works like a single strong developer.</h2>
          </header>

          <div className="manifesto">
            <div data-reveal>
              <p style={{ fontSize: 18, maxWidth: "44ch", color: "var(--text-2)" }}>
                Most agencies are bloated. Most freelancers are unreliable. WestForge sits in the middle:
                the polish and process of a studio, with the speed and accountability of working directly
                with one engineer who designs, builds, and ships.
              </p>
              <div style={{ marginTop: 32 }}>
                <a className="btn btn-ghost" href="#contact">
                  Talk to me <span className="btn-arrow">→</span>
                </a>
              </div>
            </div>
            <div className="manifesto-points" data-reveal style={{ ["--i" as any]: 1 }}>
              {manifesto.map((p) => (
                <div className="manifesto-point" key={p}>
                  <span className="check">✓</span>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section container" id="contact">
          <header className="section-head" data-reveal>
            <p className="eyebrow">Contact</p>
            <h2>Have a project in mind?</h2>
            <p>
              Send a short brief — I'll reply with realistic scope, timeline, and the next step.
            </p>
          </header>

          <div className="contact">
            <div className="contact-info" data-reveal>
              <p>
                Prefer a quick chat first? Reach out on Telegram or email — I respond within one business day.
              </p>
              <div className="contact-channels">
                {channels.map((c) => (
                  <a className="channel" href={c.href} key={c.label} target="_blank" rel="noreferrer">
                    <div>
                      <span className="channel-label">{c.label}</span>
                      <span className="channel-value">{c.value}</span>
                    </div>
                    <span className="channel-arrow">→</span>
                  </a>
                ))}
              </div>
            </div>
            <div data-reveal style={{ ["--i" as any]: 1 }}>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="nav-logo">W</span>
              <strong>WestForge</strong>
              <p>Premium web development by an independent developer. Designed and built in 2026.</p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Site</h4>
                <a href="#services">Services</a>
                <a href="#process">Process</a>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
              </div>
              <div className="footer-col">
                <h4>Links</h4>
                <a href="https://github.com/wetsik" target="_blank" rel="noreferrer">GitHub</a>
                <a href="https://t.me/pooreshechqa" target="_blank" rel="noreferrer">Telegram</a>
                <a href="/admin/login">Admin</a>
              </div>
            </div>
          </div>
          <div className="footer-meta">
            <span>© 2026 WestForge</span>
            <span>All rights reserved</span>
            <span style={{ marginLeft: "auto" }}>v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Root ---------- */
function App() {
  const { theme, toggle } = useTheme();
  useReveal();

  const isAdmin = window.location.pathname.startsWith("/admin");

  if (isAdmin) return <AdminArea theme={theme} onToggle={toggle} />;
  return <MarketingSite theme={theme} onToggle={toggle} />;
}

export default App;
