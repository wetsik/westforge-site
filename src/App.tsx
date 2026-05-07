import { FormEvent, useEffect, useRef, useState } from "react";

type ContactStatus = "idle" | "sending" | "sent" | "error";
type AdminContact = {
  reference: string;
  createdAt: string;
  ipHash: string;
  payload: {
    name: string;
    contact: string;
    message: string;
  };
};

type AdminUser = {
  username: string;
  createdAt: string;
  updatedAt: string;
};

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";
const apiBaseUrl = configuredApiBaseUrl;

const services = [
  {
    eyebrow: "01",
    title: "Landing pages that convert",
    text: "Focused pages for launches, services, and personal brands with strong hierarchy, polished motion, and a clear CTA.",
  },
  {
    eyebrow: "02",
    title: "Fullstack products",
    text: "Modern web apps with frontend, backend, auth, data flow, and deployment handled by one person from start to finish.",
  },
  {
    eyebrow: "03",
    title: "Admin dashboards",
    text: "Clean internal tools for operations, content, CRM, order flows, analytics, and business management.",
  },
  {
    eyebrow: "04",
    title: "Backend integrations",
    text: "APIs, forms, automations, webhooks, payment flows, and third-party services connected with care.",
  },
];

const processSteps = [
  {
    title: "Discovery and structure",
    text: "We define the goal, audience, pages, key actions, and what the business needs the site to do.",
  },
  {
    title: "Design direction",
    text: "I shape the visual system, motion style, and layout logic before writing production-ready code.",
  },
  {
    title: "Build and integrate",
    text: "Frontend, backend, forms, content, and any needed automation are assembled into one working product.",
  },
  {
    title: "Launch and refine",
    text: "We test, deploy, tune performance, and polish the final details before handoff or ongoing support.",
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
  "REST APIs",
  "Webhooks",
  "Nginx",
  "SEO",
  "Motion",
];

const proof = [
  { value: "1", label: "independent developer" },
  { value: "3", label: "delivery lanes: design, build, deploy" },
  { value: "∞", label: "direct communication, no account layers" },
];

const differentiators = [
  "Premium visual language without pretending to be a large agency",
  "Clear architecture and maintainable code instead of throwaway templates",
  "Fast, modern pages that still feel custom and crafted",
];

const contactWays = [
  { label: "Telegram", value: "@pooreshechqa", href: "https://t.me/pooreshechqa" },
  { label: "GitHub", value: "wetsik", href: "https://github.com/wetsik" },
];

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    const message = text.includes("<!DOCTYPE") || text.includes("<html")
      ? "Backend API is not available on this address. Start the server or set VITE_API_BASE_URL."
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
  return fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    ...init,
  });
}

function getAdminRoute(pathname: string) {
  if (pathname.startsWith("/admin/dashboard")) {
    return "dashboard";
  }

  return "login";
}

function ForgeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      const count = Math.max(34, Math.floor((width * height) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: 0.8 + Math.random() * 1.4,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const backdrop = ctx.createLinearGradient(0, 0, width, height);
      backdrop.addColorStop(0, "#020305");
      backdrop.addColorStop(0.45, "#050914");
      backdrop.addColorStop(1, "#020305");
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width * 0.72, height * 0.16, 0, width * 0.72, height * 0.16, width * 0.55);
      glow.addColorStop(0, "rgba(88, 166, 255, 0.16)");
      glow.addColorStop(0.45, "rgba(167, 139, 250, 0.10)");
      glow.addColorStop(1, "rgba(2, 3, 5, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -24) particle.x = width + 24;
        if (particle.x > width + 24) particle.x = -24;
        if (particle.y < -24) particle.y = height + 24;
        if (particle.y > height + 24) particle.y = -24;
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (distance < 130) {
            ctx.strokeStyle = `rgba(126, 168, 255, ${0.11 * (1 - distance / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const particle of particles) {
        ctx.fillStyle = "rgba(245, 248, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="forge-canvas" ref={canvasRef} aria-hidden="true" />;
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="section-copy">{text}</p>
    </div>
  );
}

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

      if (!response.ok) {
        throw new Error(data.error || "Could not send the request.");
      }

      setStatus("sent");
      setNote(`Request received. Reference: ${data.reference}`);
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not send the request.");
    }
  }

  return (
    <form className="secure-form" onSubmit={submit}>
      <label>
        Name
        <input name="name" placeholder="Your name" maxLength={80} required />
      </label>
      <label>
        Contact
        <input name="contact" placeholder="Email or Telegram" maxLength={120} required />
      </label>
      <label>
        Project brief
        <textarea
          name="message"
          placeholder="Tell me what you want to build, who it is for, and what success looks like."
          maxLength={1600}
          required
        />
      </label>
      <button className="primary-action" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Start the conversation"}
      </button>
      {note && <p className={`form-note ${status}`}>{note}</p>}
    </form>
  );
}

type AdminRoute = "login" | "dashboard";

function AdminLoginPage({
  onAuthenticated,
}: {
  onAuthenticated: (admin: AdminUser) => void;
}) {
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

      if (!response.ok || !data.admin) {
        throw new Error(data.error || "Could not sign in.");
      }

      setStatus("sent");
      setNote(`Signed in as ${data.admin.username}.`);
      onAuthenticated(data.admin);
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not sign in.");
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-hero-card">
        <p className="eyebrow">Private admin</p>
        <h1>WestForge admin login.</h1>
        <p className="section-copy">
          Sign in to manage contact requests, add admins, edit usernames and passwords, and log out safely.
        </p>
      </div>

      <form className="admin-login" onSubmit={submit}>
        <label>
          Login
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            value={password}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="password"
          />
        </label>
        <button className="primary-action" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Signing in..." : "Open admin dashboard"}
        </button>
        <p className="admin-hint">
          Dev login: <strong>codex</strong> / <strong>westforge-dev-admin</strong>. Legacy <strong>password</strong> also works locally.
        </p>
        {note && <p className={`form-note ${status}`}>{note}</p>}
      </form>
    </div>
  );
}

function AdminDashboardPage({
  admin,
  onLogout,
  onSessionUpdate,
}: {
  admin: AdminUser;
  onLogout: () => void;
  onSessionUpdate: (admin: AdminUser) => void;
}) {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activeContact, setActiveContact] = useState<AdminContact | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [note, setNote] = useState("");

  async function loadDashboard() {
    setStatus("sending");
    setNote("");

    try {
      const [contactsResponse, adminsResponse] = await Promise.all([
        apiFetch("/api/admin/contacts"),
        apiFetch("/api/admin/admins"),
      ]);

      if (contactsResponse.status === 401 || adminsResponse.status === 401) {
        onLogout();
        return;
      }

      const contactsData = await readJsonResponse<{ ok?: boolean; contacts?: AdminContact[]; error?: string }>(contactsResponse);
      const adminsData = await readJsonResponse<{ ok?: boolean; admins?: AdminUser[]; error?: string }>(adminsResponse);
      const nextContacts = contactsData.contacts || [];
      const nextAdmins = adminsData.admins || [];

      setContacts(nextContacts);
      setActiveContact(nextContacts[0] ?? null);
      setAdmins(nextAdmins);

      if (nextAdmins.length > 0) {
        const nextSelected = nextAdmins.some((item) => item.username === selectedAdmin)
          ? selectedAdmin
          : nextAdmins[0].username;
        setSelectedAdmin(nextSelected);
        const selected = nextAdmins.find((item) => item.username === nextSelected) || nextAdmins[0];
        setEditUsername(selected.username);
        setEditPassword("");
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
    const selected = admins.find((item) => item.username === selectedAdmin);
    if (selected) {
      setEditUsername(selected.username);
      setEditPassword("");
    }
  }, [admins, selectedAdmin]);

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setNote("");

    try {
      const response = await apiFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newAdminUsername,
          password: newAdminPassword,
        }),
      });
      const data = await readJsonResponse<{ ok?: boolean; admin?: AdminUser; error?: string }>(response);

      if (!response.ok || !data.admin) {
        throw new Error(data.error || "Could not add admin.");
      }

      setNewAdminUsername("");
      setNewAdminPassword("");
      await loadDashboard();
      setSelectedAdmin(data.admin.username);
      setStatus("sent");
      setNote(`Admin ${data.admin.username} added.`);
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
      const response = await apiFetch(`/api/admin/admins/${encodeURIComponent(selectedAdmin)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newUsername: editUsername,
          newPassword: editPassword || undefined,
        }),
      });
      const data = await readJsonResponse<{ ok?: boolean; admin?: AdminUser; error?: string; sessionUpdated?: boolean }>(response);

      if (!response.ok || !data.admin) {
        throw new Error(data.error || "Could not update admin.");
      }

      setSelectedAdmin(data.admin.username);
      setEditUsername(data.admin.username);
      setEditPassword("");
      await loadDashboard();
      if (data.sessionUpdated) {
        onSessionUpdate(data.admin);
      }
      setStatus("sent");
      setNote(`Admin ${data.admin.username} updated.`);
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not update admin.");
    }
  }

  async function signOut() {
    await apiFetch("/api/admin/logout", { method: "POST" });
    onLogout();
  }

  const totalRequests = contacts.length;
  const latestRequest = contacts[0];
  const uniqueContacts = new Set(contacts.map((item) => item.payload.contact)).size;

  return (
    <div className="admin-dashboard">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Authenticated admin</p>
          <h2>WestForge dashboard.</h2>
          <p className="section-copy">Signed in as {admin.username}.</p>
        </div>
        <button className="secondary-action" type="button" onClick={() => void signOut()}>
          Log out
        </button>
      </div>

      <div className="admin-stats">
        <article>
          <span>Total requests</span>
          <strong>{totalRequests}</strong>
        </article>
        <article>
          <span>Unique contacts</span>
          <strong>{uniqueContacts}</strong>
        </article>
        <article>
          <span>Latest request</span>
          <strong>{latestRequest ? new Date(latestRequest.createdAt).toLocaleDateString() : "вЂ”"}</strong>
        </article>
      </div>

      <div className="admin-grid">
        <section className="admin-list-panel">
          <div className="admin-section-title">
            <h4>Recent requests</h4>
            <p>{totalRequests ? `${totalRequests} item(s) loaded` : "No requests yet"}</p>
          </div>
          <div className="contact-table" aria-live="polite">
            {contacts.length === 0 ? (
              <article className="contact-row empty-state">
                <p>No requests received yet.</p>
              </article>
            ) : (
              contacts.map((item) => (
                <button
                  className={`contact-row contact-row-button ${activeContact?.reference === item.reference ? "is-active" : ""}`}
                  key={item.reference}
                  type="button"
                  onClick={() => setActiveContact(item)}
                >
                  <div>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <strong>{item.payload.name}</strong>
                  </div>
                  <div>
                    <span>Contact</span>
                    <strong>{item.payload.contact}</strong>
                  </div>
                  <p>{item.payload.message}</p>
                  <small>{item.reference}</small>
                </button>
              ))
            )}
          </div>
        </section>

        <aside className="admin-detail-panel">
          <div className="admin-section-title">
            <h4>Request details</h4>
            <p>{activeContact ? activeContact.reference : "Select a request"}</p>
          </div>
          {activeContact ? (
            <div className="admin-detail-card">
              <div>
                <span>Created</span>
                <strong>{new Date(activeContact.createdAt).toLocaleString()}</strong>
              </div>
              <div>
                <span>Name</span>
                <strong>{activeContact.payload.name}</strong>
              </div>
              <div>
                <span>Contact</span>
                <a href={`mailto:${activeContact.payload.contact}`}>{activeContact.payload.contact}</a>
              </div>
              <div>
                <span>Message</span>
                <p>{activeContact.payload.message}</p>
              </div>
              <div>
                <span>IP hash</span>
                <code>{activeContact.ipHash}</code>
              </div>
            </div>
          ) : (
            <div className="admin-detail-card empty-state">
              <p>No request selected.</p>
            </div>
          )}
        </aside>
      </div>

      <div className="admin-management">
        <section className="admin-card">
          <div className="admin-section-title">
            <h4>Admin accounts</h4>
            <p>Manage logins and passwords</p>
          </div>
          <div className="admin-list">
            {admins.map((item) => (
              <button
                key={item.username}
                type="button"
                className={`admin-list-item ${selectedAdmin === item.username ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedAdmin(item.username);
                  setEditUsername(item.username);
                  setEditPassword("");
                }}
              >
                <strong>{item.username}</strong>
                <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-section-title">
            <h4>Edit admin</h4>
            <p>Change username or password</p>
          </div>
          <form className="admin-form" onSubmit={updateAdmin}>
            <label>
              Username
              <input value={editUsername} onChange={(event) => setEditUsername(event.target.value)} />
            </label>
            <label>
              New password
              <input
                value={editPassword}
                type="password"
                onChange={(event) => setEditPassword(event.target.value)}
                placeholder="Leave blank to keep current password"
              />
            </label>
            <button className="primary-action" type="submit" disabled={status === "sending" || !selectedAdmin}>
              {status === "sending" ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-section-title">
            <h4>Add admin</h4>
            <p>Create another login</p>
          </div>
          <form className="admin-form" onSubmit={createAdmin}>
            <label>
              Username
              <input value={newAdminUsername} onChange={(event) => setNewAdminUsername(event.target.value)} />
            </label>
            <label>
              Password
              <input
                value={newAdminPassword}
                type="password"
                onChange={(event) => setNewAdminPassword(event.target.value)}
                placeholder="Minimum 8 characters"
              />
            </label>
            <button className="secondary-action" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Adding..." : "Add admin"}
            </button>
          </form>
        </section>
      </div>

      <button className="secondary-action refresh-button" type="button" onClick={() => void loadDashboard()}>
        Refresh data
      </button>

      {note && <p className={`form-note ${status}`}>{note}</p>}
    </div>
  );
}

function AdminArea() {
  const [route, setRoute] = useState<AdminRoute>(getAdminRoute(window.location.pathname));
  const [session, setSession] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  function navigate(pathname: string, replace = false) {
    if (replace) {
      window.history.replaceState({}, "", pathname);
    } else {
      window.history.pushState({}, "", pathname);
    }

    setRoute(getAdminRoute(pathname));
  }

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getAdminRoute(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        const response = await apiFetch("/api/admin/me");

        const data = await readJsonResponse<{ ok?: boolean; authenticated?: boolean; admin?: AdminUser }>(response);

        if (alive && data.authenticated && data.admin) {
          setSession(data.admin);
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
        if (alive) {
          setCheckingSession(false);
        }
      }
    }

    void boot();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (checkingSession) {
      return;
    }

    if (!session && route === "dashboard") {
      navigate("/admin/login", true);
    }

    if (session && route === "login") {
      navigate("/admin/dashboard", true);
    }
  }, [checkingSession, route, session]);

  async function logout() {
    await apiFetch("/api/admin/logout", { method: "POST" });
    setSession(null);
    navigate("/admin/login", true);
  }

  if (checkingSession) {
    return (
      <>
        <ForgeCanvas />
        <div className="stage-glow" aria-hidden="true" />
        <div className="scanlines" aria-hidden="true" />
        <main className="admin-page">
          <section className="admin admin-standalone entrance entrance-delay-2">
            <div className="section-heading">
              <p className="eyebrow">Private admin</p>
              <h1>Loading admin area.</h1>
              <p className="section-copy">Checking your session and preparing the dashboard.</p>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <ForgeCanvas />
      <div className="stage-glow" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <main className="admin-page">
        <section className="admin-page-shell entrance entrance-delay-2">
          {route === "login" || !session ? (
            <AdminLoginPage
              onAuthenticated={(admin) => {
                setSession(admin);
                navigate("/admin/dashboard", true);
              }}
            />
          ) : (
            <AdminDashboardPage
              admin={session}
              onLogout={() => {
                setSession(null);
                navigate("/admin/login", true);
              }}
              onSessionUpdate={(admin) => setSession(admin)}
            />
          )}
          <div className="admin-back-link-wrap">
            <a className="secondary-action admin-home-link" href="/">
              Back to site
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

function App() {
  const isAdminPage = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16 },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  if (isAdminPage) {
    return <AdminArea />;
  }

  return (
    <>
      <ForgeCanvas />
      <div className="stage-glow" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <header className="topbar entrance entrance-delay-1">
        <a className="brand" href="#top" aria-label="WestForge home">
          <strong>WestForge</strong>
          <span>independent dev studio</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#stack">Stack</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-link" href="#contact">
          Start a project
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow entrance entrance-delay-2">Premium web development</p>
            <h1 className="entrance entrance-delay-3">Premium web development by an independent developer.</h1>
            <p className="hero-text entrance entrance-delay-4">
              I build clean, scalable and modern web products for businesses, startups and personal brands.
              From landing pages to fullstack platforms with admin dashboards, each project is handled directly,
              without layers between idea and delivery.
            </p>
            <div className="hero-actions entrance entrance-delay-5">
              <a className="primary-action" href="#contact">
                Start a project
              </a>
              <a className="secondary-action" href="#services">
                View services
              </a>
            </div>
            <div className="trust-row entrance entrance-delay-6">
              {proof.map((item) => (
                <div key={item.label} className="trust-item">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="hero-panel entrance entrance-delay-6" aria-label="WestForge studio overview">
            <div className="panel-top">
              <span className="live-dot" />
              <strong>WestForge studio</strong>
              <em>available for select work</em>
            </div>
            <div className="panel-display">
              <span>What I do</span>
              <strong>Design, frontend, backend and deployment in one focused workflow.</strong>
            </div>
            <div className="metric-grid">
              <div>
                <strong>Fast</strong>
                <span>Focused execution</span>
              </div>
              <div>
                <strong>Clean</strong>
                <span>Premium details</span>
              </div>
              <div>
                <strong>Direct</strong>
                <span>One person, one point of contact</span>
              </div>
            </div>
            <div className="panel-list">
              {differentiators.map((item) => (
                <div key={item}>
                  <span />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="stack-rail" aria-label="Technology stack" data-reveal>
          {stack.map((item, index) => (
            <span style={{ "--i": index } as React.CSSProperties} key={item}>
              {item}
            </span>
          ))}
        </section>

        <section className="section services" id="services" data-reveal>
          <SectionHeading
            eyebrow="Services"
            title="The scope is broad, but the execution stays focused."
            text="I help businesses and founders ship a premium web presence that looks sharp, feels credible, and is ready to grow."
          />
          <div className="service-grid">
            {services.map((item, index) => (
              <article className="service-card" data-reveal style={{ "--i": index } as React.CSSProperties} key={item.title}>
                <span>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section split-section" data-reveal>
          <div>
            <p className="eyebrow">Positioning</p>
            <h2>Looks like a studio. Works like a single strong developer.</h2>
            <p className="section-copy">
              WestForge is intentionally presented as a premium independent studio: polished enough for serious
              clients, direct enough to keep communication fast, and lean enough to stay practical.
            </p>
          </div>
          <div className="summary-card">
            <div className="summary-kpi">
              <strong>Custom</strong>
              <span>No generic templates</span>
            </div>
            <div className="summary-kpi">
              <strong>Modern</strong>
              <span>Current design and code</span>
            </div>
            <div className="summary-kpi">
              <strong>Reliable</strong>
              <span>Clear structure and handoff</span>
            </div>
          </div>
        </section>

        <section className="section process" id="process" data-reveal>
          <SectionHeading
            eyebrow="Process"
            title="A straightforward path from idea to launch."
            text="The work is not noisy or bloated. It moves through a clear sequence so the result is predictable and polished."
          />
          <div className="process-grid">
            {processSteps.map((step, index) => (
              <article className="process-card" data-reveal style={{ "--i": index } as React.CSSProperties} key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section metrics-panel" data-reveal>
          <div>
            <p className="eyebrow">Why WestForge</p>
            <h2>Premium output without the agency overhead.</h2>
          </div>
          <div className="metrics-grid">
            <div>
              <strong>End-to-end</strong>
              <span>Design, code, backend, deployment</span>
            </div>
            <div>
              <strong>Business-minded</strong>
              <span>Built around goals, not just visuals</span>
            </div>
            <div>
              <strong>Direct communication</strong>
              <span>You talk to the person doing the work</span>
            </div>
          </div>
        </section>

        <section className="section contact" id="contact" data-reveal>
          <div className="contact-copy">
            <p className="eyebrow">Contact</p>
            <h2>Have a project in mind? Let's shape it properly.</h2>
            <p className="section-copy">
              Send a short brief and I'll reply with the next step, a realistic scope, and the best way to move
              forward.
            </p>
            <div className="contact-links">
              {contactWays.map((item) => (
                <a key={item.label} href={item.href}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </a>
              ))}
            </div>
          </div>
          <ContactForm />
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <strong>WestForge</strong>
          <p>Premium web development by an independent developer.</p>
          <small>Copyright 2026 WestForge. All rights reserved.</small>
        </div>
        <div className="footer-links" aria-label="Footer links">
          <a href="https://github.com/wetsik">GitHub</a>
          <a href="https://t.me/pooreshechqa">Telegram</a>
          <a href="/admin/login">Admin</a>
        </div>
      </footer>
    </>
  );
}

export default App;

