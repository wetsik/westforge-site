import { FormEvent, useEffect, useRef, useState } from "react";

type ContactStatus = "idle" | "sending" | "sent" | "error";

const stack = [
  "React",
  "TypeScript",
  "Node.js",
  "Express",
  "Zod",
  "AES-GCM",
  "Helmet",
  "Rate limit",
  "Nginx",
  "VPS",
];

const modules = [
  {
    tag: "Frontend",
    title: "React systems with motion discipline",
    text: "Interfaces that look sharp, stay responsive, and avoid random decoration. Motion exists to guide attention.",
  },
  {
    tag: "Backend",
    title: "APIs, validation, and encrypted intake",
    text: "A Node.js backend validates payloads, rate-limits abuse, and stores contact requests as encrypted records.",
  },
  {
    tag: "Deploy",
    title: "Production path, not just screenshots",
    text: "Built for VPS deployment behind Nginx with HTTPS, security headers, health checks, and clean environment config.",
  },
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

      const count = Math.max(54, Math.floor((width * height) / 17000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.42,
        vy: (Math.random() - 0.5) * 0.42,
        r: 1 + Math.random() * 1.7,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#030305");
      bg.addColorStop(0.54, "#070b12");
      bg.addColorStop(1, "#020203");
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

          if (distance < 210) {
            p.x += dx * 0.003;
            p.y += dy * 0.003;
          }
        }
      }

      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const a = points[i];
          const b = points[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (distance < 135) {
            ctx.strokeStyle = `rgba(89, 176, 255, ${0.13 * (1 - distance / 135)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.fillStyle = "rgba(245, 248, 255, 0.72)";
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
    const form = new FormData(event.currentTarget);
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
        throw new Error(data.error || "Request failed");
      }

      setStatus("sent");
      setNote(`Encrypted intake stored. Reference: ${data.reference}`);
      event.currentTarget.reset();
    } catch (error) {
      setStatus("error");
      setNote(error instanceof Error ? error.message : "Could not send message");
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
        <textarea name="message" placeholder="What should WestForge build?" maxLength={1600} required />
      </label>
      <button className="primary-action" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Encrypting..." : "Send encrypted request"}
      </button>
      {note && <p className={`form-note ${status}`}>{note}</p>}
    </form>
  );
}

function App() {
  return (
    <>
      <ForgeCanvas />
      <div className="scanlines" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="WestForge home">
          <span>WF</span>
          WestForge
        </a>
        <nav aria-label="Primary navigation">
          <a href="#architecture">Architecture</a>
          <a href="#security">Security</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-link" href="https://t.me/pooreshechqa">Telegram</a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">React / TypeScript / Backend / Security</p>
            <h1>WestForge is a one-person full-stack forge.</h1>
            <p className="hero-text">
              Dark developer-grade UI, encrypted contact intake, strict validation, security headers,
              rate limiting, and a backend that proves the site is more than a static screenshot.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#contact">Build with WestForge</a>
              <a className="secondary-action" href="#architecture">Inspect architecture</a>
            </div>
          </div>

          <aside className="system-core" aria-label="Full-stack system status">
            <div className="core-header">
              <span className="live-dot" />
              <strong>fullstack.kernel</strong>
              <em>secure</em>
            </div>
            <div className="core-grid">
              <div>
                <span>Frontend</span>
                <strong>React TS</strong>
              </div>
              <div>
                <span>Backend</span>
                <strong>Express</strong>
              </div>
              <div>
                <span>Crypto</span>
                <strong>AES-GCM</strong>
              </div>
              <div>
                <span>Defense</span>
                <strong>Helmet</strong>
              </div>
            </div>
            <pre>{`POST /api/contact
validate(zod)
rateLimit(10m)
encrypt(AES-256-GCM)
append(encrypted.jsonl)`}</pre>
          </aside>
        </section>

        <section className="rail" aria-label="Technology stack">
          {stack.map((item) => <span key={item}>{item}</span>)}
        </section>

        <section className="section" id="architecture">
          <div className="section-heading">
            <p className="eyebrow">Architecture</p>
            <h2>Not a template. A deployable full-stack system.</h2>
          </div>
          <div className="module-grid">
            {modules.map((module) => (
              <article className="module-card" key={module.title}>
                <span>{module.tag}</span>
                <h3>{module.title}</h3>
                <p>{module.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section security" id="security">
          <div className="security-copy">
            <p className="eyebrow">Security posture</p>
            <h2>Protected by defaults, honest about limits.</h2>
            <p>
              The backend uses input validation, request size limits, Helmet security headers,
              CORS control, rate limiting, and AES-256-GCM encrypted storage for contact messages.
              HTTPS still belongs at Nginx/Certbot level, which you already started correctly.
            </p>
          </div>
          <div className="security-list">
            <div><b>01</b><span>Encrypted contact payloads at rest</span></div>
            <div><b>02</b><span>Rate limits against spam bursts</span></div>
            <div><b>03</b><span>Strict schema validation with Zod</span></div>
            <div><b>04</b><span>Production headers via Helmet</span></div>
          </div>
        </section>

        <section className="section contact" id="contact">
          <div>
            <p className="eyebrow">Encrypted intake</p>
            <h2>Send the project signal.</h2>
            <p>
              Use the form for encrypted backend intake, or message Telegram directly if you want it fast:
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
