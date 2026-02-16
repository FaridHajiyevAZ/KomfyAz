# Deployment Guide

This guide covers deploying the KomfyAz platform to production using free/low-cost cloud services.

## Recommended Stack (Free Tier Friendly)

| Component | Service | Free Tier |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Unlimited for personal projects |
| **Backend API** | [Railway](https://railway.app) or [Render](https://render.com) | $5/mo credit (Railway) or free with sleep (Render) |
| **PostgreSQL** | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | 0.5GB free |
| **Redis** | [Upstash](https://upstash.com) | 10K commands/day free |
| **File Storage** | [Cloudflare R2](https://cloudflare.com/r2) | 10GB free |

---

## Option A: Vercel (Frontend) + Railway (Backend + DB + Redis)

This is the simplest approach — Railway handles backend, database, and Redis in one place.

### Step 1: Set Up Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `KomfyAz` repo
4. Railway will detect the monorepo. Set the **root directory** to `server`

**Add PostgreSQL:**
1. In the same project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-provisions and gives you `DATABASE_URL`

**Add Redis:**
1. Click **"+ New"** → **"Database"** → **"Redis"**
2. Railway auto-provisions and gives you `REDIS_URL`

**Configure Environment Variables:**

In your server service, go to **Variables** and add:

```
DATABASE_URL          → (auto-linked from PostgreSQL service)
REDIS_URL             → (auto-linked from Redis service)
JWT_ACCESS_SECRET     → (generate: openssl rand -hex 32)
JWT_REFRESH_SECRET    → (generate: openssl rand -hex 32)
NODE_ENV              → production
PORT                  → 4000
FRONTEND_URL          → https://your-app.vercel.app
CORS_ORIGINS          → https://your-app.vercel.app
STORAGE_TYPE          → local
STORAGE_LOCAL_PATH    → /app/uploads
SMTP_HOST             → (your email provider)
SMTP_PORT             → 587
SMTP_USER             → (your email)
SMTP_PASS             → (your email password)
SMTP_FROM             → KomfyAz <noreply@komfyaz.com>
```

**Set the build & start commands:**
```
Build:  npm install && npx prisma generate && npm run build
Start:  npx prisma migrate deploy && node dist/index.js
```

### Step 2: Seed the Database

After the first deploy, open Railway's shell for your server service:

```bash
npm run db:seed
```

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** → import your `KomfyAz` repo
3. Set **Root Directory** to `client`
4. Set **Framework Preset** to `Next.js`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL → https://your-server.railway.app
```

**Update `next.config.js` for production:**

The current config uses a local proxy rewrite. For production, update the rewrite destination to your Railway backend URL. You can use an environment variable:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

5. Click **Deploy**

Your app will be live at `https://your-project.vercel.app`.

---

## Option B: Render (All-in-One)

Render offers free web services (with cold starts) and managed PostgreSQL/Redis.

### Step 1: Create Services on Render

Go to [render.com](https://render.com) and create:

**1. PostgreSQL Database:**
- Click **"New +"** → **"PostgreSQL"**
- Name: `komfyaz-db`
- Free plan
- Copy the **Internal Database URL**

**2. Redis:**
- Click **"New +"** → **"Redis"**
- Name: `komfyaz-redis`
- Free plan
- Copy the **Internal Redis URL**

**3. Backend Web Service:**
- Click **"New +"** → **"Web Service"**
- Connect your GitHub repo
- **Root Directory:** `server`
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `npx prisma migrate deploy && node dist/index.js`
- Add all environment variables (same as Railway list above)

**4. Frontend Static Site:**
- Click **"New +"** → **"Static Site"**
- Connect your GitHub repo
- **Root Directory:** `client`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `.next`
- (Or use **"Web Service"** for SSR with `npm start`)

### Step 2: Seed

Open Render's shell for the backend service:
```bash
npm run db:seed
```

---

## Option C: Single VPS (DigitalOcean / Hetzner)

For full control, deploy everything on a $4-6/mo VPS.

### Step 1: Provision Server

1. Create a VPS (Ubuntu 22.04, 1GB RAM minimum)
2. SSH in and install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

3. Install Docker Compose:
```bash
sudo apt install docker-compose-plugin
```

### Step 2: Clone and Configure

```bash
git clone https://github.com/FaridHajiyevAZ/KomfyAz.git
cd KomfyAz
```

Create `server/.env` with production values (generate secrets with `openssl rand -hex 32`).

### Step 3: Deploy

```bash
docker compose up -d --build
```

### Step 4: Set Up Nginx + SSL

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Configure nginx
sudo tee /etc/nginx/sites-available/komfyaz << 'NGINX'
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/komfyaz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Step 5: Seed

```bash
docker compose exec server npm run db:seed
```

---

## Post-Deployment Checklist

- [ ] Generate strong JWT secrets (`openssl rand -hex 32`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP for email delivery (SendGrid, Mailgun, or AWS SES)
- [ ] Set CORS_ORIGINS to your actual frontend domain
- [ ] Run database seed to create admin account and reference data
- [ ] Change the default admin password immediately
- [ ] Set up file storage (S3/R2) for production photo uploads
- [ ] Configure a cron job or worker for warranty expiry checks
- [ ] Set up monitoring (Uptime Robot, Better Stack, or similar)
- [ ] Enable database backups (automatic on Railway/Render/Neon)

---

## Domain Setup

1. Buy a domain (e.g., `komfyaz.az` or `warranty.komfyaz.com`)
2. Point DNS:
   - If using **Vercel**: Add domain in Vercel dashboard, update DNS A/CNAME records
   - If using **Railway**: Add custom domain in service settings
   - If using **VPS**: Point A record to your server IP
3. SSL is automatic on Vercel/Railway/Render. For VPS, Certbot handles it.
