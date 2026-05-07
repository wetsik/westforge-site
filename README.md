# WestForge

Full-stack developer portfolio for `westforge.dev`.

## Stack

- React + TypeScript frontend
- Vite production build
- Express + TypeScript backend
- Zod validation
- Helmet security headers
- Rate limiting
- AES-256-GCM encrypted contact intake
- Persistent admin accounts with cookie sessions
- Static SEO files: `robots.txt`, `sitemap.xml`, manifest, Open Graph image

## Local development

```bash
npm install
npm run dev
npm run server:dev
```

## Production build

```bash
npm run build
```

## Environment

Create `.env`:

```txt
NODE_ENV=production
PORT=4174
PUBLIC_ORIGIN=https://westforge.dev
ADMIN_SESSION_SECRET=PASTE_RANDOM_SECRET
CONTACT_ENCRYPTION_KEY=PASTE_BASE64_32_BYTE_KEY
ADMIN_USERNAME=codex
ADMIN_PASSWORD=westforge-dev-admin
```

Generate the encryption key:

```bash
openssl rand -base64 32
```

## VPS deploy

```bash
cd /opt
sudo git clone https://github.com/wetsik/westforge-site.git westforge-site
cd /opt/westforge-site
sudo npm install
sudo npm run build
sudo npm run start
```

For a real server, run it with `pm2` or a `systemd` service and reverse proxy Nginx to:

```txt
http://127.0.0.1:4174
```

Submit sitemap in Google Search Console:

```txt
https://westforge.dev/sitemap.xml
```

Admin panel:

```txt
https://westforge.dev/admin/login
```

Admin routes:

```txt
/admin/login
/admin/dashboard
```
