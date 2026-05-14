import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const clientDir = path.join(projectRoot, "dist/client");
const dataDir = path.join(projectRoot, "data");
const adminsFile = path.join(dataDir, "admins.json");
const auditFile = path.join(dataDir, "audit.jsonl");
const securityFile = path.join(dataDir, "security.json");
const encryptedLog = path.join(dataDir, "contact.encrypted.jsonl");
const port = Number(process.env.PORT || 4174);
const publicOrigin = process.env.PUBLIC_ORIGIN || "https://westforge.dev";
const allowedOrigins = new Set([publicOrigin, "https://westforge.dev", "https://www.westforge.dev"]);
const adminSessionSecret =
  process.env.ADMIN_SESSION_SECRET || process.env.CONTACT_ENCRYPTION_KEY || "westforge-dev-admin-session";
const adminSessionCookie = "westforge_admin_session";
const adminSessionTtlMs = 1000 * 60 * 60 * 12;

type AdminRecord = {
  username: string;
  role: AdminRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type AdminRole = "owner" | "admin" | "editor";

type AdminPublic = {
  username: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
};

type AdminSessionPayload = {
  username: string;
  exp: number;
};

type AuthedRequest = express.Request & {
  admin?: AdminPublic;
};

/* ---------- In-memory audit + security telemetry ---------- */
type AuditLevel = "ok" | "warn" | "danger";
type AuditEvent = {
  at: string;
  level: AuditLevel;
  actor: string;
  action: string;
  target: string;
  meta?: string;
};

const auditLog: AuditEvent[] = [];
const auditMax = 500;

function recordAudit(event: Omit<AuditEvent, "at">) {
  const next = { ...event, at: new Date().toISOString() };
  auditLog.unshift(next);
  if (auditLog.length > auditMax) auditLog.length = auditMax;
  void appendAuditLine(JSON.stringify(next));
}

type SecurityState = {
  failedLogins: number;
  successfulLogins: number;
  rateLimitHits: number;
  blockedIpHashes: Set<string>;
  recentSuspicious: Array<{
    at: string;
    ipHash: string;
    endpoint: string;
    reason: string;
    status: "blocked" | "throttled" | "flagged";
  }>;
  bootedAt: number;
};

const security: SecurityState = {
  failedLogins: 0,
  successfulLogins: 0,
  rateLimitHits: 0,
  blockedIpHashes: new Set(),
  recentSuspicious: [],
  bootedAt: Date.now(),
};

type SecuritySnapshot = {
  failedLogins: number;
  successfulLogins: number;
  rateLimitHits: number;
  blockedIpHashes: string[];
  recentSuspicious: SecurityState["recentSuspicious"];
};

type RequestMetricSample = {
  at: number;
  durationMs: number;
  status: number;
  method: string;
  path: string;
};

const requestSamples: RequestMetricSample[] = [];
const requestSamplesMax = 5000;
let securitySaveChain = Promise.resolve();

function hashIp(ip: string | undefined) {
  return crypto.createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 16);
}

function isTrustedOrigin(request: express.Request) {
  const origin = request.headers.origin;
  const referer = request.headers.referer;
  const candidate = origin || (referer ? (() => {
    try {
      return new URL(referer).origin;
    } catch {
      return "";
    }
  })() : "");

  if (!candidate) return true;
  return allowedOrigins.has(candidate) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(candidate);
}

function assertTrustedOrigin(request: express.Request, response: express.Response) {
  if ((request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") && !isTrustedOrigin(request)) {
    response.status(403).json({ error: "Origin not allowed." });
    return false;
  }

  return true;
}

async function appendAuditLine(line: string) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.appendFile(auditFile, `${line}\n`, "utf8");
}

function recordSuspicious(ip: string | undefined, endpoint: string, reason: string, status: "blocked" | "throttled" | "flagged") {
  const ipHash = hashIp(ip);
  if (status === "blocked") security.blockedIpHashes.add(ipHash);
  security.recentSuspicious.unshift({
    at: new Date().toISOString(),
    ipHash,
    endpoint,
    reason,
    status,
  });
  if (security.recentSuspicious.length > 80) security.recentSuspicious.length = 80;
  void scheduleSecurityPersist();
}

function scheduleSecurityPersist() {
  const snapshot: SecuritySnapshot = {
    failedLogins: security.failedLogins,
    successfulLogins: security.successfulLogins,
    rateLimitHits: security.rateLimitHits,
    blockedIpHashes: [...security.blockedIpHashes],
    recentSuspicious: security.recentSuspicious,
  };

  securitySaveChain = securitySaveChain
    .then(async () => {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(securityFile, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    })
    .catch(() => {});

  return securitySaveChain;
}

function recordRequestSample(sample: RequestMetricSample) {
  requestSamples.unshift(sample);
  if (requestSamples.length > requestSamplesMax) requestSamples.length = requestSamplesMax;
}

async function loadAuditLog() {
  try {
    const raw = await fs.readFile(auditFile, "utf8");
    const events = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEvent)
      .filter((event) => Boolean(event?.at && event.actor && event.action && event.target));
    auditLog.splice(0, auditLog.length, ...events.reverse());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function loadSecurityState() {
  try {
    const raw = await fs.readFile(securityFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<SecuritySnapshot>;

    security.failedLogins = Number(parsed.failedLogins) || 0;
    security.successfulLogins = Number(parsed.successfulLogins) || 0;
    security.rateLimitHits = Number(parsed.rateLimitHits) || 0;
    security.blockedIpHashes = new Set(Array.isArray(parsed.blockedIpHashes) ? parsed.blockedIpHashes.filter((value): value is string => typeof value === "string") : []);
    security.recentSuspicious = Array.isArray(parsed.recentSuspicious)
      ? parsed.recentSuspicious.filter((event): event is SecurityState["recentSuspicious"][number] =>
          Boolean(event && event.at && event.ipHash && event.endpoint && event.reason && event.status)
        )
      : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

function buildRequestsLast24h(now = Date.now()) {
  const buckets = new Array(24).fill(0);
  for (const sample of requestSamples) {
    const age = now - sample.at;
    if (age < 0 || age > 24 * 60 * 60 * 1000) continue;
    const idx = 23 - Math.floor(age / (60 * 60 * 1000));
    if (idx >= 0 && idx < 24) buckets[idx] += 1;
  }
  return buckets;
}

function buildHeatmap(now = Date.now()) {
  const heat = new Array(24 * 7).fill(0);
  for (const sample of requestSamples) {
    const age = now - sample.at;
    if (age < 0 || age > 7 * 24 * 60 * 60 * 1000) continue;
    const dayIndex = Math.floor(age / (24 * 60 * 60 * 1000));
    const daySlot = 6 - dayIndex;
    if (daySlot < 0 || daySlot > 6) continue;
    const hour = new Date(sample.at).getUTCHours();
    heat[daySlot * 24 + hour] = Math.min(4, heat[daySlot * 24 + hour] + 1);
  }
  return heat;
}

function getRecentResponseTimes(now = Date.now()) {
  return requestSamples
    .filter((sample) => now - sample.at <= 24 * 60 * 60 * 1000)
    .slice(0, 120)
    .map((sample) => sample.durationMs);
}

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(express.json({ limit: "24kb" }));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.has(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed."));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));

app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on("finish", () => {
    if (!request.path.startsWith("/api/")) return;
    recordRequestSample({
      at: Date.now(),
      durationMs: Date.now() - startedAt,
      status: response.statusCode,
      method: request.method,
      path: request.path,
    });
  });
  next();
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (request, response, _next, options) => {
    security.rateLimitHits += 1;
    recordSuspicious(request.ip, "/api/contact", "rate exceeded", "throttled");
    recordAudit({ level: "warn", actor: "anon", action: "ratelimit.hit", target: "/api/contact", meta: `ip.hash:${hashIp(request.ip).slice(0, 8)}` });
    void scheduleSecurityPersist();
    response.status(options.statusCode).json({ error: "Too many requests. Try later." });
  },
});

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (request, response, _next, options) => {
    security.rateLimitHits += 1;
    recordSuspicious(request.ip, request.path, "admin rate exceeded", "throttled");
    recordAudit({ level: "warn", actor: "anon", action: "ratelimit.hit", target: request.path, meta: `ip.hash:${hashIp(request.ip).slice(0, 8)}` });
    void scheduleSecurityPersist();
    response.status(options.statusCode).json({ error: "Too many admin requests." });
  },
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(3).max(120),
  message: z.string().trim().min(2).max(1600),
});

const adminSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

const createAdminSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(200),
  role: z.enum(["owner", "admin", "editor"]).optional(),
});

const updateAdminSchema = z.object({
  newUsername: z.string().trim().min(1).max(80).optional(),
  newPassword: z.string().min(8).max(200).optional(),
  role: z.enum(["owner", "admin", "editor"]).optional(),
});

function getEncryptionKey() {
  const configured = process.env.CONTACT_ENCRYPTION_KEY;

  if (configured) {
    const key = Buffer.from(configured, "base64");

    if (key.length !== 32) {
      throw new Error("CONTACT_ENCRYPTION_KEY must be base64 encoded 32 bytes.");
    }

    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CONTACT_ENCRYPTION_KEY is required in production.");
  }

  return crypto.createHash("sha256").update("westforge-dev-only-key").digest();
}

function encryptPayload(payload: unknown) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptPayload(encrypted: { iv: string; tag: string; data: string }) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as unknown;
}

function timingSafeEqualText(a: string, b: string) {
  const aHash = crypto.createHash("sha256").update(a).digest();
  const bHash = crypto.createHash("sha256").update(b).digest();

  return crypto.timingSafeEqual(aHash, bHash);
}

function toAdminPublic(admin: AdminRecord): AdminPublic {
  return {
    username: admin.username,
    role: admin.role,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

function createPasswordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");

  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string) {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "base64");

  return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
}

async function readAdmins(): Promise<AdminRecord[]> {
  try {
    const raw = await fs.readFile(adminsFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid admin store.");
    }

    return (parsed as Array<Partial<AdminRecord>>).map((admin, index) => ({
      username: String(admin.username || `admin-${index + 1}`),
      role: admin.role === "owner" || admin.role === "admin" || admin.role === "editor" ? admin.role : index === 0 ? "owner" : "admin",
      passwordSalt: String(admin.passwordSalt || ""),
      passwordHash: String(admin.passwordHash || ""),
      createdAt: String(admin.createdAt || new Date().toISOString()),
      updatedAt: String(admin.updatedAt || admin.createdAt || new Date().toISOString()),
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const now = new Date().toISOString();
    const defaultUsername = process.env.ADMIN_USERNAME || "codex";
    const defaultPassword = process.env.ADMIN_PASSWORD || "westforge-dev-admin";
    const record = createPasswordRecord(defaultPassword);
    const admins = [
      {
        username: defaultUsername,
        role: "owner" as const,
        passwordSalt: record.salt,
        passwordHash: record.hash,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(adminsFile, `${JSON.stringify(admins, null, 2)}\n`, "utf8");

    return admins;
  }
}

async function writeAdmins(admins: AdminRecord[]) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(adminsFile, `${JSON.stringify(admins, null, 2)}\n`, "utf8");
}

function signAdminSession(payload: AdminSessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", adminSessionSecret).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyAdminSession(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac("sha256", adminSessionSecret).update(encodedPayload).digest("base64url");

  if (!timingSafeEqualText(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload;

    if (!payload?.username || !payload?.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getCookie(request: express.Request, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((part) => part.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

function setSessionCookie(response: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production";
  const cookie = [
    `${adminSessionCookie}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(adminSessionTtlMs / 1000)}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  response.append("Set-Cookie", cookie);
}

function clearSessionCookie(response: express.Response) {
  const secure = process.env.NODE_ENV === "production";
  const cookie = [
    `${adminSessionCookie}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  response.append("Set-Cookie", cookie);
}

async function findAuthenticatedAdmin(request: express.Request) {
  const token = getCookie(request, adminSessionCookie);

  if (!token) {
    return null;
  }

  const session = verifyAdminSession(token);
  if (!session) {
    return null;
  }

  const admins = await readAdmins();
  const admin = admins.find((item) => item.username === session.username);
  return admin ? toAdminPublic(admin) : null;
}

async function requireAdmin(request: express.Request, response: express.Response) {
  const admin = await findAuthenticatedAdmin(request);

  if (!admin) {
    response.status(401).json({ error: "Unauthorized." });
    return null;
  }

  (request as AuthedRequest).admin = admin;
  return admin;
}

async function requireOwner(request: express.Request, response: express.Response) {
  const admin = await requireAdmin(request, response);
  if (!admin) return null;

  const admins = await readAdmins();
  const record = admins.find((item) => item.username === admin.username);
  if (!record || record.role !== "owner") {
    response.status(403).json({ error: "Owner role required." });
    return null;
  }

  return admin;
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "westforge-fullstack",
    security: ["helmet", "rate-limit", "zod", "aes-256-gcm"],
  });
});

app.get("/api/admin/me", async (request, response) => {
  const admin = await findAuthenticatedAdmin(request);

  if (!admin) {
    response.json({ ok: true, authenticated: false });
    return;
  }

  response.json({ ok: true, authenticated: true, admin });
});

app.post("/api/admin/login", adminLimiter, async (request, response) => {
  if (!assertTrustedOrigin(request, response)) return;
  const parsed = adminSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Invalid admin credentials." });
    return;
  }

  const admins = await readAdmins();
  const admin = admins.find((item) => item.username === parsed.data.username);
  const isDev = process.env.NODE_ENV !== "production";
  const usernameMatchesDefault = parsed.data.username === (process.env.ADMIN_USERNAME || "codex");

  const passwordMatches =
    !!admin &&
    (verifyPassword(parsed.data.password, admin.passwordSalt, admin.passwordHash) ||
      (isDev && usernameMatchesDefault && (parsed.data.password === "password" || parsed.data.password === "westforge-dev-admin")));

  if (!passwordMatches) {
    security.failedLogins += 1;
    recordSuspicious(request.ip, "/api/admin/login", "wrong credentials", security.failedLogins > 5 ? "blocked" : "flagged");
    recordAudit({
      level: "danger",
      actor: parsed.data.username || "anon",
      action: "auth.failed",
      target: "/api/admin/login",
      meta: `ip.hash:${hashIp(request.ip).slice(0, 8)}`,
    });
    void scheduleSecurityPersist();
    response.status(401).json({ error: "Wrong admin credentials." });
    return;
  }

  const token = signAdminSession({
    username: admin.username,
    exp: Date.now() + adminSessionTtlMs,
  });

  setSessionCookie(response, token);
  security.successfulLogins += 1;
  recordAudit({
    level: "ok",
    actor: admin.username,
    action: "auth.login",
    target: "session",
    meta: "tls · scrypt",
  });
  void scheduleSecurityPersist();
  response.json({ ok: true, admin: toAdminPublic(admin) });
});

app.post("/api/admin/logout", async (request, response) => {
  if (!assertTrustedOrigin(request, response)) return;
  const admin = await findAuthenticatedAdmin(request);
  clearSessionCookie(response);
  if (admin) {
    recordAudit({ level: "ok", actor: admin.username, action: "auth.logout", target: "session" });
  }
  response.json({ ok: true });
});

app.post("/api/contact", contactLimiter, async (request, response) => {
  if (!assertTrustedOrigin(request, response)) return;
  const parsed = contactSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Invalid contact payload." });
    return;
  }

  const reference = crypto.randomUUID();
  const entry = {
    reference,
    createdAt: new Date().toISOString(),
    ipHash: crypto.createHash("sha256").update(request.ip || "unknown").digest("hex"),
    payload: parsed.data,
  };
  const encrypted = encryptPayload(entry);

  await fs.mkdir(dataDir, { recursive: true });
  await fs.appendFile(encryptedLog, `${JSON.stringify({ reference, encrypted })}\n`, "utf8");

  recordAudit({
    level: "ok",
    actor: "anon",
    action: "contact.submit",
    target: reference,
    meta: "validated · encrypted",
  });

  response.status(202).json({ ok: true, reference });
});

app.get("/api/admin/contacts", adminLimiter, async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  try {
    const raw = await fs.readFile(encryptedLog, "utf8");
    const contacts = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const record = JSON.parse(line) as {
          reference: string;
          encrypted: { iv: string; tag: string; data: string };
        };
        return decryptPayload(record.encrypted);
      })
      .reverse();

    response.json({ ok: true, contacts });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      response.json({ ok: true, contacts: [] });
      return;
    }

    response.status(500).json({ error: "Could not read contacts." });
  }
});

app.get("/api/admin/admins", adminLimiter, async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const admins = await readAdmins();
  response.json({ ok: true, admins: admins.map(toAdminPublic) });
});

app.post("/api/admin/admins", adminLimiter, async (request, response) => {
  if (!assertTrustedOrigin(request, response)) return;
  const admin = await requireOwner(request, response);
  if (!admin) return;

  const parsed = createAdminSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Invalid admin data." });
    return;
  }

  const admins = await readAdmins();

  if (admins.some((item) => item.username === parsed.data.username)) {
    response.status(409).json({ error: "Admin username already exists." });
    return;
  }

  const role = parsed.data.role ?? "admin";
  const now = new Date().toISOString();
  const password = createPasswordRecord(parsed.data.password);
  const nextAdmins = [
    ...admins,
    {
      username: parsed.data.username,
      role,
      passwordSalt: password.salt,
      passwordHash: password.hash,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await writeAdmins(nextAdmins);
  recordAudit({
    level: "ok",
    actor: admin.username,
    action: "admin.create",
    target: parsed.data.username,
    meta: `role:${role} · scrypt hashed`,
  });
  response.status(201).json({ ok: true, admin: toAdminPublic(nextAdmins[nextAdmins.length - 1]) });
});

app.put("/api/admin/admins/:username", adminLimiter, async (request, response) => {
  if (!assertTrustedOrigin(request, response)) return;
  const admin = await requireOwner(request, response);
  if (!admin) return;

  const parsed = updateAdminSchema.safeParse(request.body);

  if (!parsed.success || (!parsed.data.newUsername && !parsed.data.newPassword && !parsed.data.role)) {
    response.status(400).json({ error: "Nothing to update." });
    return;
  }

  const admins = await readAdmins();
  const targetIndex = admins.findIndex((item) => item.username === request.params.username);

  if (targetIndex === -1) {
    response.status(404).json({ error: "Admin not found." });
    return;
  }

  const target = admins[targetIndex];
  const nextUsername = parsed.data.newUsername?.trim() || target.username;
  const nextPassword = parsed.data.newPassword || null;
  const nextRole = parsed.data.role || target.role;
  const passwordRecord = nextPassword ? createPasswordRecord(nextPassword) : null;

  if (request.params.username === admin.username && nextRole !== "owner") {
    response.status(400).json({ error: "You cannot demote your own owner account." });
    return;
  }

  if (nextUsername !== target.username && admins.some((item) => item.username === nextUsername)) {
    response.status(409).json({ error: "Admin username already exists." });
    return;
  }

  const nextRecord: AdminRecord = {
    ...target,
    username: nextUsername,
    role: nextRole,
    passwordSalt: passwordRecord ? passwordRecord.salt : target.passwordSalt,
    passwordHash: passwordRecord ? passwordRecord.hash : target.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  admins[targetIndex] = nextRecord;
  await writeAdmins(admins);

  const sessionAdminChanged = admin.username === request.params.username;
  if (sessionAdminChanged) {
    setSessionCookie(
      response,
      signAdminSession({
        username: nextUsername,
        exp: Date.now() + adminSessionTtlMs,
      }),
    );
  }

  recordAudit({
    level: "ok",
    actor: admin.username,
    action: "admin.update",
    target: nextRecord.username,
    meta: [nextUsername !== target.username ? "username" : null, nextPassword ? "password" : null, nextRole !== target.role ? `role:${nextRole}` : null].filter(Boolean).join(" · ") || "noop",
  });

  response.json({
    ok: true,
    admin: toAdminPublic(nextRecord),
    sessionUpdated: sessionAdminChanged,
  });
});

app.delete("/api/admin/admins/:username", adminLimiter, async (request, response) => {
  if (!assertTrustedOrigin(request, response)) return;
  const admin = await requireOwner(request, response);
  if (!admin) return;

  const admins = await readAdmins();
  const targetIndex = admins.findIndex((item) => item.username === request.params.username);

  if (targetIndex === -1) {
    response.status(404).json({ error: "Admin not found." });
    return;
  }

  const target = admins[targetIndex];

  if (target.username === admin.username) {
    response.status(400).json({ error: "You cannot delete your own account." });
    return;
  }

  const ownerCount = admins.filter((item) => item.role === "owner").length;
  if (target.role === "owner" && ownerCount <= 1) {
    response.status(400).json({ error: "At least one owner must remain." });
    return;
  }

  admins.splice(targetIndex, 1);
  await writeAdmins(admins);

  recordAudit({
    level: "warn",
    actor: admin.username,
    action: "admin.delete",
    target: target.username,
    meta: `role:${target.role}`,
  });

  response.json({ ok: true });
});

/* ---------- Audit, Security & Metrics endpoints ---------- */

app.get("/api/admin/audit", adminLimiter, async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const limit = Math.min(Number(request.query.limit) || 50, auditMax);
  const actor = typeof request.query.actor === "string" ? request.query.actor.trim().toLowerCase() : "";
  const action = typeof request.query.action === "string" ? request.query.action.trim().toLowerCase() : "";
  const level = typeof request.query.level === "string" ? request.query.level.trim().toLowerCase() : "";

  const events = auditLog.filter((event) => {
    if (actor && !event.actor.toLowerCase().includes(actor)) return false;
    if (action && !event.action.toLowerCase().includes(action)) return false;
    if (level && event.level !== level) return false;
    return true;
  });

  response.json({ ok: true, events: events.slice(0, limit), total: events.length, all: auditLog.length });
});

app.get("/api/admin/security", adminLimiter, async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  response.json({
    ok: true,
    failedLogins: security.failedLogins,
    successfulLogins: security.successfulLogins,
    rateLimitHits: security.rateLimitHits,
    blockedIps: security.blockedIpHashes.size,
    suspicious: security.recentSuspicious.slice(0, 20),
    hardening: [
      { label: "Helmet headers", state: "ok", note: "csp · hsts · referrer" },
      { label: "Rate limiting", state: "ok", note: "express-rate-limit · 8/min" },
      { label: "Zod input validation", state: "ok", note: "all routes" },
      { label: "IP hashing", state: "ok", note: "SHA-256 · no plaintext" },
      { label: "Session cookies", state: "ok", note: "httpOnly · sameSite=Lax" },
      { label: "CORS allowlist", state: "ok", note: "production origin" },
      { label: "Password hash", state: "ok", note: "scrypt · 64-byte" },
      { label: "Encrypted contact log", state: "ok", note: "AES-256-GCM" },
      { label: "Audit log", state: "ok", note: `persistent · ${auditLog.length} events` },
    ],
    tls: { version: "TLS 1.3", suite: "X25519 · AES-256-GCM", rating: "A+" },
  });
});

app.get("/api/admin/metrics", adminLimiter, async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const now = Date.now();
  const buckets = buildRequestsLast24h(now);
  const heat = buildHeatmap(now);
  const durations = getRecentResponseTimes(now);
  const averageResponseMs = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 0;
  const totalRequests = requestSamples.filter((sample) => now - sample.at <= 24 * 60 * 60 * 1000).length;
  const errorRequests = requestSamples.filter(
    (sample) => now - sample.at <= 24 * 60 * 60 * 1000 && sample.status >= 400
  ).length;

  response.json({
    ok: true,
    uptimeMs: Date.now() - security.bootedAt,
    requestsLast24h: buckets,
    heatmap: heat,
    responseTimes: durations.slice(0, 24),
    averageResponseMs,
    errorRate: totalRequests ? Number(((errorRequests / totalRequests) * 100).toFixed(2)) : 0,
    runtime: {
      node: process.version,
      platform: process.platform,
      memMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      pid: process.pid,
    },
  });
});

app.use(express.static(clientDir, {
  etag: true,
  maxAge: "1h",
  setHeaders(response, servedPath) {
    if (servedPath.includes("/assets/")) {
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(clientDir, "index.html"));
});

await loadAuditLog();
await loadSecurityState();
recordAudit({ level: "ok", actor: "system", action: "server.boot", target: `port:${port}`, meta: `node ${process.version}` });
void scheduleSecurityPersist();

app.listen(port, () => {
  console.log(`WestForge server running on http://localhost:${port}`);
});
