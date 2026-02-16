# KomfyAz - After-Sales & Warranty Activation Platform

## 1. High-Level System Architecture

```
                                   +------------------+
                                   |   CDN / WAF      |
                                   |  (CloudFlare)    |
                                   +--------+---------+
                                            |
                                   +--------+---------+
                                   |  Load Balancer   |
                                   |    (Nginx)       |
                                   +----+--------+----+
                                        |        |
                          +-------------+        +-------------+
                          |                                    |
                 +--------+---------+              +-----------+--------+
                 |   Frontend       |              |   Backend API      |
                 |   Next.js 14     |              |   Node.js/Express  |
                 |   Port 3000      |              |   Port 4000        |
                 +------------------+              +----+----------+----+
                                                        |          |
                                          +-------------+          +----------+
                                          |                                   |
                                 +--------+---------+            +------------+--------+
                                 |   PostgreSQL     |            |   Object Storage    |
                                 |   Primary DB     |            |   (S3-compatible)   |
                                 |   Port 5432      |            |   Product photos    |
                                 +------------------+            |   Invoices          |
                                          |                      +---------------------+
                                 +--------+---------+
                                 |   Redis          |
                                 |   Cache/Sessions |
                                 |   OTP Store      |
                                 |   Port 6379      |
                                 +------------------+
```

## 2. Tech Stack

### Frontend
| Technology | Purpose | Reasoning |
|---|---|---|
| **Next.js 14** | SSR/SSG React framework | SEO for public pages, fast hydration, API routes as BFF |
| **TypeScript** | Type safety | Catches errors at compile time, self-documenting |
| **Tailwind CSS** | Utility-first styling | Rapid UI development, consistent design system |
| **React Hook Form + Zod** | Form handling + validation | Performant forms, shared validation schemas |
| **TanStack Query** | Server state management | Caching, deduplication, background refetching |
| **Zustand** | Client state | Lightweight, no boilerplate |

### Backend
| Technology | Purpose | Reasoning |
|---|---|---|
| **Node.js + Express** | HTTP server | Mature ecosystem, excellent for I/O-heavy workloads |
| **TypeScript** | Type safety | Shared types with frontend |
| **Prisma** | ORM | Type-safe queries, migration system, introspection |
| **Zod** | Runtime validation | Shared schemas between frontend/backend |
| **Multer + Sharp** | File upload & image processing | Resize/compress product photos before storage |
| **Nodemailer + Twilio** | Email/SMS delivery | OTP verification, warranty confirmations |
| **Bull (BullMQ)** | Job queue | Async email/SMS delivery, image processing |
| **Winston** | Logging | Structured logging for production debugging |
| **Helmet + cors** | Security middleware | HTTP header hardening |

### Data
| Technology | Purpose | Reasoning |
|---|---|---|
| **PostgreSQL 15** | Primary database | ACID compliance, JSONB for flexible metadata, mature |
| **Redis 7** | Cache + session store | OTP TTL storage, rate limiting, session cache |
| **S3 / MinIO** | Object storage | Scalable file storage, presigned URLs for secure access |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Local development, consistent environments |
| **Nginx** | Reverse proxy, SSL termination |
| **GitHub Actions** | CI/CD pipeline |

## 3. Database Schema

### Entity Relationship Diagram

```
users 1──N product_registrations
users 1──N support_tickets
product_registrations 1──1 warranties
product_registrations 1──N registration_photos
support_tickets 1──N ticket_messages
ticket_messages 1──N ticket_attachments
admin_notes N──1 product_registrations
admin_notes N──1 support_tickets
mattress_models (reference table)
purchase_sources (reference table)
```

### Tables

See `server/prisma/schema.prisma` for the full schema definition.

Key design decisions:
- **Soft deletes** on user-facing records (deletedAt timestamp)
- **Separate warranty table** from product_registration for clean lifecycle tracking
- **Photo hashing** (perceptual + SHA256) for fraud detection
- **Enum-based statuses** for type-safe state machines
- **Audit columns** (createdAt, updatedAt) on all tables
- **UUID primary keys** to prevent enumeration attacks

## 4. API Endpoint Structure

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email or phone |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/login` | Login with email/phone + password |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Customer - Product Registration
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products/models` | List available mattress models |
| GET | `/api/products/sources` | List purchase sources |
| POST | `/api/products/register` | Submit product registration |
| GET | `/api/products/my` | List customer's registered products |
| GET | `/api/products/:id` | Get registration details |
| POST | `/api/products/:id/photos` | Upload additional photos |

### Customer - Warranty
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/warranty/:registrationId` | Get warranty status & details |

### Customer - Support
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/support/tickets` | Create support ticket |
| GET | `/api/support/tickets` | List customer's tickets |
| GET | `/api/support/tickets/:id` | Get ticket details + messages |
| POST | `/api/support/tickets/:id/messages` | Send message in ticket |

### Customer - Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get profile |
| PATCH | `/api/profile` | Update phone/email |

### Admin - Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/registrations` | List all registrations (filterable) |
| GET | `/api/admin/registrations/:id` | Get registration detail |
| PATCH | `/api/admin/registrations/:id/status` | Approve/reject/request-info |
| POST | `/api/admin/registrations/:id/notes` | Add internal note |
| GET | `/api/admin/fraud/duplicates` | View duplicate detection results |

### Admin - Support
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/tickets` | List all tickets (filterable) |
| GET | `/api/admin/tickets/:id` | Get ticket detail |
| PATCH | `/api/admin/tickets/:id/status` | Update ticket status |
| POST | `/api/admin/tickets/:id/messages` | Reply to ticket |
| PATCH | `/api/admin/tickets/:id/tags` | Tag/categorize ticket |

### Admin - Management
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/users` | List all customers |
| GET | `/api/admin/users/:id` | Customer detail view |

## 5. Authentication & Security Flow

### Registration Flow
```
Customer → POST /auth/register (email/phone + password)
         → Server creates unverified user
         → Server sends OTP via email/SMS
         → Customer submits OTP → POST /auth/verify-otp
         → User marked as verified
         → JWT access token + refresh token issued
```

### Login Flow
```
Customer → POST /auth/login (email/phone + password)
         → Server validates credentials
         → If 2FA enabled: send OTP, require verification
         → JWT access token (15min) + refresh token (7d) issued
         → Refresh token stored in httpOnly cookie
```

### Token Architecture
- **Access Token**: JWT, 15-minute expiry, stored in memory
- **Refresh Token**: Opaque token, 7-day expiry, httpOnly cookie, rotated on use
- **OTP**: 6-digit numeric, 5-minute TTL, stored in Redis, max 3 attempts

### Security Measures
- Rate limiting: 5 login attempts/15min per IP, 3 OTP attempts per session
- Password hashing: bcrypt with cost factor 12
- CSRF protection via SameSite cookies + custom header
- Input sanitization on all endpoints
- File upload validation: type checking (magic bytes), size limits (10MB)
- SQL injection prevention via parameterized queries (Prisma)
- XSS prevention via React's default escaping + CSP headers
- CORS restricted to known origins

## 6. Key Edge Cases & Validation Rules

### Product Registration
- **Duplicate prevention**: Hash uploaded invoice images (perceptual hash). Flag if hash matches existing registration within similarity threshold.
- **Purchase date validation**: Cannot be in the future. Cannot be older than the model's release date. Cannot be older than 1 year (configurable).
- **Model validation**: Must exist in the active mattress_models table.
- **Photo requirements**: Minimum 1 label photo + 1 invoice photo. Max file size 10MB. Accepted formats: JPEG, PNG, HEIC, WebP.
- **One warranty per serial/invoice**: Prevent the same invoice from activating multiple warranties.

### Warranty
- **Auto-calculation**: End date = purchase date + warranty duration (from model config).
- **Status machine**: PENDING_REVIEW → ACTIVE / REJECTED. No going back from REJECTED without new submission.
- **Expired check**: Background job daily to flip ACTIVE → EXPIRED based on end date.

### Support Tickets
- **Cannot create ticket without active registration**: Customer must have at least one registered product.
- **Closed tickets**: Cannot add messages to RESOLVED tickets older than 30 days.
- **Attachment limits**: Max 5 attachments per message, 10MB each.

### GDPR Compliance
- **Data export**: Customer can request full data export (JSON).
- **Account deletion**: Soft-delete with 30-day grace period, then hard purge.
- **Consent tracking**: Store explicit consent timestamps for marketing communications.
- **Data minimization**: Only collect fields necessary for warranty activation.
