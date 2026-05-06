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

const stack = ["React", "TypeScript", "Node", "Express", "Zod", "AES-GCM", "Helmet", "Nginx"];

const metrics = [
  ["01", "Solo studio"],
  ["24/7", "VPS ready"],
  ["AES", "Encrypted intake"],
];

const capabilities = [
  {
    label: "Interface",
    title: "Premium dark UI systems",
    text: "Sharp layouts, responsive rhythm, restrained motion, and screens that feel built for a real product.",
  },
  {
    label: "Backend",
    title: "APIs with validation and defense",
    text: "Express endpoints, schema validation, rate limiting, security headers, and clean production config.",
  },
  {
    label: "Deploy",
    title: "From repo to live domain",
    text: "Builds ship through GitHub, PM2, Nginx, HTTPS, health checks, and repeatable server commands.",
  },
];

const process = [
  "Research the product and user flow",
  "Design the interface system",
  "Build React and backend APIs",
  "Secure, deploy, measure, refine",
];

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
    let points: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    const pointer = { x: 0, y: 0, active: false };

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      const count = Math.max(42, Math.floor((width * height) / 22000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: 1 + Math.random() * 1.4,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#030305");
      bg.addColorStop(0.48, "#070a10");
      bg.addColorStop(1, "#010102");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 180) {
            p.x += dx * 0.0026;
            p.y += dy * 0.0026;
          }
        }
      }

      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const a = points[i];
          const b = points[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (distance < 122) {
            ctx.strokeStyle = `rgba(86, 163, 255, ${0.12 * (1 - distance / 122)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.fillStyle = "rgba(245, 248, 255, 0.65)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas className="forge-canvas" ref={canvasRef} aria-hidden="true" />;
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send the request.");
      }

      setStatus("sent");
      setNote(`Request encrypted and stored. Reference: ${data.reference}`);
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
        <input name="contact" placeholder="@telegram or email" maxLength={120} required />
      </label>
      <label>
        Project signal
        <textarea name="message" placeholder="Website, app, bot, automation, API..." maxLength={1600} required />
      </label>
      <button className="primary-action" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Encrypting..." : "Send encrypted request"}
      </button>
      {note && <p className={`form-note ${status}`}>{note}</p>}
    </form>
  );
}

function AdminPanel() {
  const [username, setUsername] = useState("codex");
  const [password, setPassword] = useState("");
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [note, setNote] = useState("");

  async function loadContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setNote("");

    try {
      const response = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not open admin panel.");
      }

      setContacts(data.contacts || []);
      setStatus("sent");
      setNote(data.contacts?.length ? `Loaded ${data.contacts.length} contacts.` : "No contacts yet.");
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not open admin panel.");
    }
  }

  return (
    <div className="admin-shell">
      <form className="admin-login" onSubmit={loadContacts}>
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
          {status === "sending" ? "Opening..." : "Open admin"}
        </button>
      </form>

      {note && <p className={`form-note ${status}`}>{note}</p>}

      <div className="contact-table" aria-live="polite">
        {contacts.map((item) => (
          <article className="contact-row" key={item.reference}>
            <div>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
              <strong>{item.payload.name}</strong>
            </div>
            <div>
              <span>Contact</span>
              <a href={`mailto:${item.payload.contact}`}>{item.payload.contact}</a>
            </div>
            <p>{item.payload.message}</p>
            <small>{item.reference}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function App() {
  const isAdminPage = window.location.pathname === "/admin";

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
    return (
      <>
        <ForgeCanvas />
        <div className="stage-glow" aria-hidden="true" />
        <div className="scanlines" aria-hidden="true" />

        <main className="admin-page">
          <section className="admin admin-standalone entrance entrance-delay-2">
            <div className="section-heading">
              <p className="eyebrow">Private admin</p>
              <h1>Contact requests dashboard.</h1>
              <p>Login with your admin credentials to decrypt and read submitted contact requests.</p>
              <a className="secondary-action admin-home-link" href="/">Back to site</a>
            </div>
            <AdminPanel />
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

      <header className="topbar entrance entrance-delay-1">
        <a className="brand" href="#top" aria-label="WestForge home">
          <span>WF</span>
          <strong>WestForge</strong>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#architecture">Architecture</a>
          <a href="#security">Security</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-link" href="https://t.me/pooreshechqa">Telegram</a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow entrance entrance-delay-2">One-person full-stack studio</p>
            <h1 className="entrance entrance-delay-3">Premium web products with a secure backend core.</h1>
            <p className="hero-text entrance entrance-delay-4">
              WestForge designs and builds serious dark interfaces, React systems, APIs, encrypted intake,
              production deployment, and automation from one focused developer.
            </p>
            <div className="hero-actions entrance entrance-delay-5">
              <a className="primary-action" href="#contact">Start a build</a>
              <a className="secondary-action" href="#architecture">View system</a>
            </div>
          </div>

          <aside className="hero-panel entrance entrance-delay-6" aria-label="WestForge system preview">
            <div className="panel-top">
              <span className="live-dot" />
              <strong>westforge.dev</strong>
              <em>online</em>
            </div>
            <div className="panel-display">
              <span>build pipeline</span>
              <strong>design to code to secure to deploy</strong>
            </div>
            <div className="metric-grid">
              {metrics.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <pre>{`POST /api/contact
 validate with zod
 rate limit requests
 encrypt AES-256-GCM
 store private payload`}</pre>
          </aside>
        </section>

        <section className="stack-rail" aria-label="Technology stack" data-reveal>
          {stack.map((item, index) => (
            <span style={{ "--i": index } as React.CSSProperties} key={item}>{item}</span>
          ))}
        </section>

        <section className="showcase section" id="work" data-reveal>
          <div>
            <p className="eyebrow">Output</p>
            <h2>Looks premium, behaves like infrastructure.</h2>
          </div>
          <div className="showcase-board" aria-hidden="true">
            <div className="board-window board-primary">
              <span />
              <span />
              <span />
              <strong>Secure product interface</strong>
            </div>
            <div className="board-window board-secondary">
              <b>API</b>
              <p>health: ok</p>
              <p>headers: locked</p>
              <p>payload: encrypted</p>
            </div>
          </div>
        </section>

        <section className="section" id="architecture">
          <div className="section-heading" data-reveal>
            <p className="eyebrow">Architecture</p>
            <h2>Everything needed for a real launch.</h2>
          </div>
          <div className="capability-grid">
            {capabilities.map((item, index) => (
              <article className="capability-card" data-reveal style={{ "--i": index } as React.CSSProperties} key={item.title}>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section split" id="security" data-reveal>
          <div>
            <p className="eyebrow">Security</p>
            <h2>Secure defaults, clear boundaries.</h2>
            <p>
              The app uses Helmet headers, request limits, schema validation, controlled CORS,
              encrypted contact storage, and HTTPS through Nginx. It is not just a static landing page.
            </p>
          </div>
          <div className="process-list">
            {process.map((item, index) => (
              <div key={item}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section contact" id="contact" data-reveal>
          <div className="contact-copy">
            <p className="eyebrow">Contact</p>
            <h2>Send the project signal.</h2>
            <p>
              The form stores requests through the encrypted backend. For fast messages:
              <a href="https://t.me/pooreshechqa"> @pooreshechqa</a>.
            </p>
          </div>
          <ContactForm />
        </section>

      </main>

      <footer>
        <span>WestForge</span>
        <span>One-person full-stack studio</span>
        <a href="https://github.com/wetsik">GitHub</a>
        <a href="https://t.me/pooreshechqa">Telegram</a>
      </footer>
    </>
  );
}

export default App;
