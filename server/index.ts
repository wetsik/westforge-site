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
const encryptedLog = path.join(dataDir, "contact.encrypted.jsonl");
const port = Number(process.env.PORT || 4174);
const publicOrigin = process.env.PUBLIC_ORIGIN || "https://westforge.dev";
const allowedOrigins = new Set([publicOrigin, "https://westforge.dev", "https://www.westforge.dev"]);
const adminUsername = process.env.ADMIN_USERNAME || "codex";
const adminPassword = process.env.ADMIN_PASSWORD || "password";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(express.json({ limit: "24kb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
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

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(3).max(120),
  message: z.string().trim().min(2).max(1600),
});

const adminSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
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

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "westforge-fullstack",
    security: ["helmet", "rate-limit", "zod", "aes-256-gcm"],
  });
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

app.post("/api/admin/contacts", contactLimiter, async (request, response) => {
  const parsed = adminSchema.safeParse(request.body);

  if (
    !parsed.success ||
    !timingSafeEqualText(parsed.data.username, adminUsername) ||
    !timingSafeEqualText(parsed.data.password, adminPassword)
  ) {
    response.status(401).json({ error: "Wrong admin credentials." });
    return;
  }

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
