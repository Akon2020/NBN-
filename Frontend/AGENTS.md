# AGENTS.md - Frontend (Next.js)

## Quick Reference

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode, bundler module resolution)
- **Styling**: TailwindCSS v4 + shadcn/ui (Radix primitives)
- **Port**: 5000 (must bind to `0.0.0.0`)
- **Dev**: `npm run dev -- -H 0.0.0.0 -p 5000`
- **Build**: `npm run build`

## Directory Structure

```
Frontend/
├── app/
│   ├── layout.tsx                  # Root layout (ThemeProvider, fonts, metadata)
│   ├── page.tsx                    # Landing page (public)
│   ├── globals.css                 # Global styles, Tailwind imports
│   ├── loading.tsx                 # Global loading spinner
│   ├── auth/
│   │   ├── login/page.tsx          # Login page
│   │   └── register/page.tsx       # Public registration (agent role only)
│   └── dashboard/
│       ├── layout.tsx              # Dashboard shell (sidebar, navbar, auth check)
│       ├── page.tsx                # Dashboard home / overview
│       ├── rentals/page.tsx        # Rental properties management
│       ├── sales/page.tsx          # Sale properties management
│       ├── favorites/page.tsx      # User favorites
│       ├── gallery/page.tsx        # Property gallery
│       ├── search/
│       │   └── page.tsx            # Advanced property search
│       ├── settings/page.tsx       # User profile settings
│       └── users/page.tsx          # Admin-only user management
├── components/
│   ├── ui/                         # shadcn/ui components (DO NOT manually edit)
│   ├── property-modals/            # Property CRUD modals
│   ├── user-modals/                # User CRUD modals (add, edit, delete)
│   ├── ProtectedRoute.tsx          # Auth guard wrapper component
│   ├── theme-provider.tsx          # next-themes wrapper
│   └── theme-toggle.tsx            # Dark/light mode toggle
├── hooks/
│   ├── useAuth.ts                  # Authentication hook (check auth, logout)
│   ├── useToast.ts                 # Toast notification hook (shadcn)
│   └── use-mobile.ts              # Mobile detection hook
├── lib/
│   ├── auth.ts                     # Auth utilities (getAuthHeaders, getAuthUser, logout)
│   ├── axios.ts                    # Axios instance with JWT interceptor
│   ├── types.ts                    # Property type interfaces (RentalProperty, SaleProperty)
│   ├── utils.ts                    # cn() utility for class merging
│   └── mock-data.ts                # Legacy mock data (being phased out)
├── types/
│   └── type.ts                     # User, Auth, AuthPayload interfaces
├── actions/
│   ├── auth.ts                     # Server actions for auth
│   └── users.ts                    # Server actions for users
├── next.config.mjs                 # Rewrites, headers, allowedDevOrigins
├── tsconfig.json
├── postcss.config.mjs
├── components.json                 # shadcn/ui configuration
└── package.json
```

## API Communication

### Proxy Setup (next.config.mjs)
All `/api/*` requests are rewritten to `http://localhost:3000/api/*` (the NestJS backend). Never call the backend directly from the browser.

```javascript
async rewrites() {
  return [
    { source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' }
  ];
}
```

### Two API Call Patterns (Both Are Used)

**Pattern 1: fetch() with manual headers** (used in newer code)
```typescript
const token = Cookies.get("token");
const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
const result = await response.json();
```

**Pattern 2: axios instance** (used in older code, via `lib/axios.ts`)
```typescript
import api from "@/lib/axios";
import { getAuthHeaders } from "@/lib/auth";

const response = await api.get("/api/endpoint", {
  headers: getAuthHeaders(),
});
```

When adding new code, prefer **Pattern 1 (fetch)** for consistency with the latest code. Both work fine.

## Authentication System

### Token Storage
- **JWT Token**: stored in browser cookie named `token` (via `js-cookie`)
- **User Object**: stored in `localStorage` key `user` (JSON stringified)

### Auth Utilities (`lib/auth.ts`)
```typescript
getAuthHeaders()   // Returns { Authorization: 'Bearer <token>' }
isAuthenticated()  // Checks if token cookie exists
getAuthUser()      // Parses user from localStorage
logout()           // Clears cookie + localStorage, redirects to login
```

### Auth Hook (`hooks/useAuth.ts`)
- Checks auth on mount via `GET /api/auth/profile/`
- Redirects to `/auth/login` if not authenticated
- Returns `{ isAuthenticated, user, logout }`

### Login Response Format
```typescript
// POST /api/auth/login returns:
{
  user: {
    idUser: number,
    fullName: string,
    email: string,
    role: "admin" | "agent" | "consultant",
    status: "ACTIVE" | "INACTIVE",
    ...
  },
  token: "jwt-string"
}
```

After login, frontend stores:
```typescript
Cookies.set("token", data.token);
localStorage.setItem("user", JSON.stringify(data.user));
```

## Type Definitions

### User Types (`types/type.ts`)
```typescript
type RoleEnum = "admin" | "agent" | "consultant";
type StatusEnum = "ACTIVE" | "INACTIVE";

interface User {
  idUser: number;
  fullName: string;
  email: string;
  role: RoleEnum;
  avatar: string;
  status: StatusEnum;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Property Types (`lib/types.ts`)
- `RentalProperty` — apartment/house with guarantee details
- `SaleProperty` — durable/semi-durable/land with margin

## Component Conventions

### shadcn/ui Components
- Located in `components/ui/`
- Installed via shadcn CLI — **do not manually edit** these files
- Import from `@/components/ui/<component>`
- Use `cn()` from `@/lib/utils` for conditional class merging

### Page Components
- All pages are client components (`"use client"`) when they need interactivity
- Dashboard pages live under `app/dashboard/`
- Auth pages live under `app/auth/`
- Each page manages its own state and API calls

### Modal Pattern (user-modals/, property-modals/)
```typescript
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;  // Callback to refresh parent list
  data?: ExistingData;     // For edit modals
}
```

Modals use:
- `Dialog` from shadcn/ui
- Internal loading/error state
- Call API on submit → on success → `onSuccess()` to refresh parent

## Styling

### TailwindCSS v4
- Config via `postcss.config.mjs` with `@tailwindcss/postcss`
- No `tailwind.config.ts` — uses Tailwind v4 CSS-based config
- Animations via `tw-animate-css`
- Dark mode via `next-themes` (class strategy)

### CSS Variables
Theme colors defined in `globals.css` using CSS custom properties:
- `--background`, `--foreground`, `--primary`, `--secondary`, etc.
- Both light and dark theme variants

## Routing

### Public Routes
- `/` — Landing page
- `/auth/login` — Login
- `/auth/register` — Registration (creates agent role only)

### Protected Routes (require authentication)
- `/dashboard` — Overview
- `/dashboard/rentals` — Rental properties
- `/dashboard/sales` — Sale properties
- `/dashboard/favorites` — User favorites
- `/dashboard/gallery` — Property gallery
- `/dashboard/search` — Advanced search
- `/dashboard/settings` — Profile settings
- `/dashboard/users` — User management (**admin only**)

## Replit-Specific Configuration

### next.config.mjs Requirements
These settings are **mandatory** for Replit compatibility:
```javascript
allowedDevOrigins: [
  'https://*.replit.dev',
  'https://*.picard.replit.dev',
  '*.replit.dev',
],
headers: [{ 'Cache-Control': 'no-cache, no-store, must-revalidate' }],
images: { unoptimized: true },
```

Never remove `allowedDevOrigins` — the user will see a blank page without it.

## Key Dependencies

| Package              | Purpose                              |
|----------------------|--------------------------------------|
| `next`               | Framework (App Router)               |
| `react` / `react-dom`| UI library (v19)                    |
| `tailwindcss`        | Utility-first CSS (v4)              |
| `@radix-ui/*`        | Headless UI primitives (shadcn/ui)  |
| `lucide-react`       | Icon library                         |
| `js-cookie`          | Cookie management (JWT storage)      |
| `axios`              | HTTP client (legacy pattern)         |
| `zod`                | Schema validation                    |
| `react-hook-form`    | Form state management                |
| `recharts`           | Charts for dashboard                 |
| `sonner`             | Toast notifications                  |
| `next-themes`        | Dark/light mode                      |
| `date-fns`           | Date formatting                      |
| `embla-carousel-react` | Image carousels                   |

## Adding a New Dashboard Page

1. Create `app/dashboard/<page-name>/page.tsx`
2. Add `"use client"` directive if interactive
3. Import UI components from `@/components/ui/`
4. Use `Cookies.get("token")` for auth headers
5. Fetch data from `/api/...` endpoints (proxied to backend)
6. Add navigation link in `app/dashboard/layout.tsx` sidebar
7. For admin-only pages, check `user.role === "admin"` and redirect if not

## Common Pitfalls

1. **Never use `localhost:3000` in frontend code** — always use `/api/...` paths (the proxy handles routing)
2. **Never send `role` from the registration page** — only admins can assign roles
3. **Always handle loading and error states** — show skeletons or spinners during data fetches
4. **Token in cookie, user in localStorage** — both must be cleared on logout
5. **shadcn/ui components are in `components/ui/`** — don't recreate existing components
