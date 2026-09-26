<div align="center">

# 🦄 Unicorn Backend

**Car Rental Management System — Node.js / Express API**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A RESTful API powering the Unicorn Car Rental Platform. Built with Node.js, Express, Prisma ORM, and PostgreSQL.

</div>

---

## 📖 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database & Prisma](#-database--prisma)
- [Available Scripts](#-available-scripts)
- [API Modules](#-api-modules)
- [Authentication](#-authentication)

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) | JavaScript runtime |
| [Express.js](https://expressjs.com/) | Web framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Prisma ORM](https://www.prisma.io/) | Database ORM & schema management |
| [PostgreSQL](https://www.postgresql.org/) | Relational database |
| [Zod](https://zod.dev/) | Schema validation |
| [JWT](https://github.com/auth0/node-jsonwebtoken) | Authentication tokens |
| [Stripe](https://stripe.com/) | Payment processing |
| [Nodemailer](https://nodemailer.com/) | Email sending |
| [Multer](https://github.com/expressjs/multer) | File uploads |
| [Winston](https://github.com/winstonjs/winston) | Logging |
| [Helmet](https://helmetjs.github.io/) | Security headers |
| [Jest](https://jestjs.io/) | Testing framework |

---

## 📂 Project Structure

```text
├── src/
│   ├── app/
│   │   ├── config/              # App configuration (env, constants)
│   │   ├── errors/              # Custom error classes
│   │   ├── interfaces/          # TypeScript interfaces
│   │   ├── middlewares/         # Express middlewares (auth, validation, error handling, etc.)
│   │   ├── modules/             # Domain modules (feature-based architecture)
│   │   │   ├── activity/
│   │   │   ├── analytics/
│   │   │   ├── auth/
│   │   │   ├── booking/
│   │   │   ├── document/
│   │   │   ├── driver/
│   │   │   ├── dropOffCharge/
│   │   │   ├── feature/
│   │   │   ├── location/
│   │   │   ├── notification/
│   │   │   ├── payment/
│   │   │   ├── pricing/
│   │   │   ├── setting/
│   │   │   ├── support/
│   │   │   ├── user/
│   │   │   └── vehicle/
│   │   ├── routes/              # Central route registry
│   │   ├── types/               # Global type declarations
│   │   └── utils/               # Utilities (prisma, logger, email, upload, etc.)
│   ├── app.ts                   # Express app setup
│   ├── server.ts                # Server entry point
│   └── app.test.ts              # App-level tests
├── prisma/
│   ├── schema.prisma            # Prisma schema definition
│   └── seed.ts                  # Database seed script
├── uploads/                     # Uploaded file storage
├── dist/                        # Compiled output (TypeScript → JavaScript)
├── .env.example                 # Example environment file
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** >= 14.x (running locally or accessible remotely)

### Installation

```bash
cd unicorn/backend

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Fill in the required values (see [Environment Variables](#-environment-variables) below).

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed the database
npm run prisma:seed
```

### Start Development Server

```bash
npm run dev
```

The API will be available at [http://localhost:5000](http://localhost:5000).

> The Swagger API documentation is available at `/api/docs` when the server is running.

---

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Server port | `5000` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `FRONTEND_URL` | Public frontend URL | `http://localhost:3000` |
| `TRUST_PROXY` | Trust proxy hops | `1` |
| `COOKIE_DOMAIN` | Cookie domain (production) | `unicorn.app` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/unicorn?schema=public` |
| `ADMIN_EMAIL` | Initial admin email (for seed) | `admin@example.com` |
| `ADMIN_PASSWORD` | Initial admin password (for seed) | `SecurePassword123` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `TAX_PERCENTAGE` | Default tax percentage | `16` |
| `MODIFICATION_FEE` | Booking modification fee | `0` |
| `JWT_ACCESS_SECRET` | JWT access token secret | `replace_with_a_long_random_secret` |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `1d` |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | `replace_with_a_long_random_secret` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` |
| `JWT_RESET_SECRET` | Password reset token secret | `replace_with_a_long_random_secret` |
| `JWT_RESET_EXPIRES_IN` | Reset token expiry | `15m` |
| `SMTP_HOST` | SMTP server host | `smtp.example.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `your_smtp_user` |
| `SMTP_PASS` | SMTP password | `your_smtp_password` |
| `SMTP_FROM` | Sender email address | `noreply@example.com` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `PAYMENT_CURRENCY` | Default payment currency | `kes` |

---

## 🗄 Database & Prisma

### Schema

The database schema is defined in `prisma/schema.prisma` and includes models for:

- **Users** (customers & admins)
- **Vehicles** (fleet management)
- **Drivers** (assigned drivers)
- **Bookings** (rental reservations)
- **Payments** (Stripe transactions)
- **Locations** (pickup / drop-off points)
- **Notifications**, **Support Tickets**, **Documents**, **Activity Logs**, etc.

### Useful Prisma Commands

```bash
# Open Prisma Studio (GUI)
npm run prisma:studio

# Generate client after schema changes
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Deploy migrations in production
npm run prisma:deploy

# Format schema file
npm run prisma:format

# Seed database
npm run prisma:seed
```

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Start production server (`node dist/server.js`) |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm test` | Run Jest tests |
| `npm run check` | Run lint + test + build (CI) |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:deploy` | Deploy migrations (production) |
| `npm run prisma:seed` | Seed database |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:format` | Format Prisma schema |

---

## 🔌 API Modules

| Endpoint | Module | Description |
|----------|--------|-------------|
| `/api/v1/auth` | Auth | Login, register, token refresh, password reset |
| `/api/v1/users` | User | User profile & management |
| `/api/v1/vehicles` | Vehicle | Fleet & vehicle catalog |
| `/api/v1/drivers` | Driver | Driver assignment & management |
| `/api/v1/locations` | Location | Pickup / drop-off locations |
| `/api/v1/bookings` | Booking | Rental reservations & status |
| `/api/v1/payments` | Payment | Stripe checkout & webhooks |
| `/api/v1/pricing` | Pricing | Rental pricing rules |
| `/api/v1/settings` | Setting | System configuration |
| `/api/v1/notifications` | Notification | User notifications |
| `/api/v1/support` | Support | Customer support tickets |
| `/api/v1/analytics` | Analytics | Dashboard metrics |
| `/api/v1/activity` | Activity | Activity logs |
| `/api/v1/documents` | Document | File uploads & documents |
| `/api/v1/drop-off-charges` | DropOffCharge | Extra location fees |
| `/api/v1/features` | Feature | Vehicle features |

> Full interactive API docs are available via Swagger at `/api/docs` when running the server.

---

## 🔐 Authentication

The API uses a **JWT-based authentication** strategy:

1. **Access Token**: Short-lived token included in `Authorization: Bearer <token>` header.
2. **Refresh Token**: Long-lived token stored in an HTTP-only cookie for session persistence.
3. **Password Reset**: Time-limited token sent via email for secure password resets.

### Middleware

- `auth.ts` — Validates access tokens and attaches user to the request.
- `optionalAuth.ts` — Optionally authenticates the user (for public routes that benefit from user context).
- `validateRequest.ts` — Validates incoming request bodies against Zod schemas.
- `globalErrorHandler.ts` — Centralized error handling for consistent API responses.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

The test suite uses **Jest** with **Supertest** for HTTP integration tests.

---

<div align="center">

Built with ❤️ for the Unicorn Car Rental Platform

</div>
