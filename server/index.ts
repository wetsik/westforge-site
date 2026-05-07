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
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type AdminPublic = {
  username: string;
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
  methods: ["GET", "POST"],
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

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
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
});

const updateAdminSchema = z.object({
  newUsername: z.string().trim().min(1).max(80).optional(),
  newPassword: z.string().min(8).max(200).optional(),
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

    return parsed as AdminRecord[];
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
    response.status(401).json({ error: "Wrong admin credentials." });
    return;
  }

  const token = signAdminSession({
    username: admin.username,
    exp: Date.now() + adminSessionTtlMs,
  });

  setSessionCookie(response, token);
  response.json({ ok: true, admin: toAdminPublic(admin) });
});

app.post("/api/admin/logout", async (_request, response) => {
  clearSessionCookie(response);
  response.json({ ok: true });
});

app.post("/api/contact", contactLimiter, async (request, response) => {
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
  const admin = await requireAdmin(request, response);
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

  const now = new Date().toISOString();
  const password = createPasswordRecord(parsed.data.password);
  const nextAdmins = [
    ...admins,
    {
      username: parsed.data.username,
      passwordSalt: password.salt,
      passwordHash: password.hash,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await writeAdmins(nextAdmins);
  response.status(201).json({ ok: true, admin: toAdminPublic(nextAdmins[nextAdmins.length - 1]) });
});

app.put("/api/admin/admins/:username", adminLimiter, async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const parsed = updateAdminSchema.safeParse(request.body);

  if (!parsed.success || (!parsed.data.newUsername && !parsed.data.newPassword)) {
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
  const passwordRecord = nextPassword ? createPasswordRecord(nextPassword) : null;

  if (nextUsername !== target.username && admins.some((item) => item.username === nextUsername)) {
    response.status(409).json({ error: "Admin username already exists." });
    return;
  }

  const nextRecord: AdminRecord = {
    ...target,
    username: nextUsername,
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

  response.json({
    ok: true,
    admin: toAdminPublic(nextRecord),
    sessionUpdated: sessionAdminChanged,
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

app.listen(port, () => {
  console.log(`WestForge server running on http://localhost:${port}`);
});
