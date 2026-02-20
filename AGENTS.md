# AGENTS.md - Nyumbani Express Plus

## Project Overview

Nyumbani Express Plus is a full-stack real estate platform for property listings in **Bukavu, South Kivu (DRC)**. Users can browse, search, and manage rental and sale properties. The platform supports three user roles: **admin**, **agent**, and **consultant**.

## Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | Next.js 16, React 19, TypeScript, TailwindCSS v4 |
| Backend    | NestJS 11, TypeORM, PostgreSQL               |
| Auth       | JWT (passport-jwt), bcryptjs                 |
| UI         | shadcn/ui (Radix primitives), Lucide icons   |
| API Docs   | Swagger / OpenAPI (`/api-docs/`)             |

## Monorepo Structure

```
/
├── Frontend/          # Next.js 16 application (port 5000)
├── Backend/           # NestJS API server (port 3000)
├── Backend_archived/  # Old Express.js backend (deprecated, do not use)
├── replit.md          # Project documentation for Replit
├── AGENTS.md          # This file (global AI instructions)
└── package.json       # Root workspace (not used for app code)
```

## Architecture

### Request Flow
```
Browser → Frontend (Next.js :5000) → /api/* rewrite → Backend (NestJS :3000) → PostgreSQL
```

The frontend proxies all `/api/*` requests to `http://localhost:3000/api/*` via Next.js rewrites in `Frontend/next.config.mjs`. There is no direct browser-to-backend communication — all API calls go through the frontend proxy.

### Authentication Flow
1. User registers via `POST /api/auth/register` → always creates an **agent** role (public registration never assigns roles)
2. User logs in via `POST /api/auth/login` → returns `{ user, token }`
3. Frontend stores JWT token in a cookie (`token`) and user object in `localStorage`
4. Authenticated requests include `Authorization: Bearer <token>` header
5. Backend validates via `JwtAuthGuard` → `JwtStrategy` → `AuthService.validateUser()`
6. Admin-only routes use `@Roles(UserRole.ADMIN)` + `RolesGuard`

### Security Rules
- Public registration (`POST /api/auth/register`) NEVER accepts a `role` field — always defaults to `AGENT`
- Only admins can create users with specific roles via `POST /api/users`
- Property update/delete checks ownership: only the creator or an admin can modify
- JWT secret: `JWT_SECRET` env var (fallback: `nyumbani-jwt-secret`)
- JWT expiration: 7 days
- Passwords hashed with bcryptjs (10 rounds)

## Database

- **Engine**: PostgreSQL (Replit built-in, Neon-backed)
- **ORM**: TypeORM with `synchronize: true` (auto-schema sync)
- **Connection**: `DATABASE_URL` environment variable

### Entity Relationships
```
User (1) ──→ (N) Property
User (1) ──→ (N) Favorite
User (1) ──→ (N) ActivityLog
Property (1) ──→ (N) PropertyImage
Property (1) ──→ (N) PropertyPhone
Property (1) ──→ (1) RentalProperty (if category=RENT)
Property (1) ──→ (1) SaleProperty (if category=SALE)
Property (1) ──→ (N) Favorite
Property (1) ──→ (N) Proposal
Property (1) ──→ (1) PropertyScore
```

### Key Enums
- **UserRole**: `admin`, `agent`, `consultant`
- **UserStatus**: `ACTIVE`, `INACTIVE`
- **PropertyCategory**: `RENT`, `SALE`
- **PropertyType**: `APPARTEMENT`, `MAISON`, `CONSTRUCTION_DURABLE`, `CONSTRUCTION_SEMI_DURABLE`, `TERRAIN_PLAT`, `TERRAIN_PENTE`

### Primary Key Convention
All entities use auto-incremented bigint IDs with custom column names:
- `User.idUser`, `Property.idProperty`, `PropertyImage.idImage`, etc.
- **Never change primary key column types** — this breaks migrations and existing data.

## API Endpoints

### Auth (public)
| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/api/auth/register`  | Register (always creates agent)    |
| POST   | `/api/auth/login`     | Login, returns JWT token           |

### Users (auth required)
| Method | Endpoint          | Access    | Description              |
|--------|-------------------|-----------|--------------------------|
| GET    | `/api/users/me`   | Any auth  | Current user profile     |
| PUT    | `/api/users/me`   | Any auth  | Update own profile       |
| GET    | `/api/users`      | Admin     | List all users           |
| POST   | `/api/users`      | Admin     | Create user with role    |
| GET    | `/api/users/:id`  | Admin     | Get user by ID           |
| PUT    | `/api/users/:id`  | Admin     | Update any user          |
| DELETE | `/api/users/:id`  | Admin     | Delete user              |

### Properties
| Method | Endpoint                          | Access      | Description              |
|--------|-----------------------------------|-------------|--------------------------|
| GET    | `/api/properties`                 | Public      | List with filters/pagination |
| GET    | `/api/properties/:id`             | Public      | Get property details     |
| POST   | `/api/properties`                 | Auth        | Create property          |
| PUT    | `/api/properties/:id`             | Owner/Admin | Update property          |
| DELETE | `/api/properties/:id`             | Owner/Admin | Delete property          |
| POST   | `/api/properties/:id/images`      | Auth        | Upload images (multer)   |
| DELETE | `/api/properties/images/:imageId` | Auth        | Delete image             |

### Favorites (auth required)
| Method | Endpoint                          | Description          |
|--------|-----------------------------------|----------------------|
| GET    | `/api/users/:userId/favorites`    | Get user favorites   |
| POST   | `/api/users/:userId/favorites`    | Add to favorites     |
| DELETE | `/api/favorites/:favoriteId`      | Remove favorite      |

### Proposals (auth required)
| Method | Endpoint                               | Description            |
|--------|----------------------------------------|------------------------|
| POST   | `/api/properties/:propertyId/proposals`| Create proposal        |
| GET    | `/api/properties/:propertyId/proposals`| Get property proposals |
| GET    | `/api/users/:userId/proposals`         | Get received proposals |
| DELETE | `/api/proposals/:proposalId`           | Delete proposal        |

## Development Commands

```bash
# Frontend
cd Frontend && npm run dev -- -H 0.0.0.0 -p 5000

# Backend (production/compiled)
cd Backend && npm run build && node dist/main.js

# Backend (development with hot reload)
cd Backend && npm run start:dev
```

## Coding Conventions

### Language
- All user-facing text is in **French** (target audience: DRC/Bukavu)
- Code comments, variable names, and API error messages are in French
- Code identifiers (class names, functions) are in English

### Backend Patterns
- NestJS modular architecture: each feature in `src/modules/<feature>/`
- Each module has: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`
- DTOs use `class-validator` decorators for validation
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`
- Custom decorators: `@CurrentUser()` for extracting the authenticated user, `@Roles()` for role-based access
- Guards: `JwtAuthGuard` for authentication, `RolesGuard` for authorization

### Frontend Patterns
- Next.js App Router (`app/` directory)
- Client-side auth with cookies (js-cookie) for JWT token storage
- shadcn/ui components in `components/ui/`
- Custom hooks in `hooks/` (useAuth, useToast, useMobile)
- API calls use either `fetch` with manual headers or `axios` instance from `lib/axios.ts`
- Type definitions in `types/type.ts` and `lib/types.ts`
- Path aliases: `@/*` maps to project root

### Important Rules
1. Never send `role` in public registration requests
2. Always check property ownership before update/delete
3. Always exclude `password` from API responses
4. Image uploads go to `Backend/uploads/properties/` with UUID filenames
5. Frontend must always allow all hosts for Replit proxy compatibility (`allowedDevOrigins` in next.config)
6. Cache-Control headers set to `no-cache, no-store, must-revalidate` for all routes
