# KomfyAz - After-Sales & Warranty Activation Platform

A secure, scalable warranty activation and after-sales support platform for KomfyAz mattress products.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design, database schema, API endpoints, and security documentation.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod validation
- **Database**: PostgreSQL 15
- **Cache/Sessions**: Redis 7
- **File Storage**: Local filesystem (S3-compatible in production)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for database services)

### 1. Start Infrastructure

```bash
docker compose up -d postgres redis
```

### 2. Set Up Backend

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

The API server starts at `http://localhost:4000`.

### 3. Set Up Frontend

```bash
cd client
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

### Full Docker Setup

To run everything in Docker:

```bash
docker compose up --build
```

## Default Admin Account

After seeding:

- **Email**: admin@komfyaz.com
- **Password**: Admin123!

## Project Structure

```
KomfyAz/
├── server/                    # Backend API
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data
│   └── src/
│       ├── config/            # Environment, database, Redis config
│       ├── controllers/       # Route handlers
│       ├── middleware/         # Auth, validation, upload, rate limiting
│       ├── routes/            # Express route definitions
│       ├── services/          # Business logic (notifications)
│       ├── types/             # TypeScript types & Zod schemas
│       ├── utils/             # Helpers (OTP, tokens, hashing, logger)
│       ├── jobs/              # Background jobs (warranty expiry)
│       └── index.ts           # App entry point
├── client/                    # Frontend (Next.js)
│   └── src/
│       ├── app/               # App Router pages
│       │   ├── auth/          # Login, register, verify
│       │   ├── dashboard/     # Customer portal
│       │   └── admin/         # Admin panel
│       ├── components/        # Shared UI components
│       ├── hooks/             # State management
│       ├── lib/               # API client
│       └── types/             # TypeScript types
├── docker-compose.yml
└── ARCHITECTURE.md
```

## API Endpoints

| Group | Base Path | Auth Required |
|---|---|---|
| Authentication | `/api/auth/*` | No (public) |
| Products | `/api/products/*` | Yes (customer) |
| Warranty | `/api/warranty/*` | Yes (customer) |
| Support | `/api/support/*` | Yes (customer) |
| Profile | `/api/profile` | Yes (customer) |
| Admin | `/api/admin/*` | Yes (admin only) |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete endpoint reference.
