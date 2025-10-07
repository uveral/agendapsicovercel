# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgendaPsico is a psychology clinic scheduling management system built for Centro Orienta. It manages therapist schedules, client appointments, availability tracking, and includes intelligent appointment suggestion/swap functionality when conflicts arise.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Wouter (routing) + TanStack Query
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Neon (serverless) with Drizzle ORM
- **Auth**: Simple session-based authentication (no Replit dependencies)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui components
- **PDF Generation**: jsPDF + jsPDF-autoTable

## Architecture

### Monorepo Structure
```
client/          # React frontend (Vite root)
  src/
    pages/       # Route pages (Dashboard, Therapists, Clients, Calendar, etc.)
    components/  # React components (including ui/ for shadcn components)
    lib/         # Utilities (queryClient, ThemeProvider)
    hooks/       # Custom hooks (useAuth, use-mobile, etc.)
server/          # Express backend
  index.ts       # Server entry point
  routes.ts      # All API route definitions
  storage.ts     # Database operations layer (IStorage interface)
  db.ts          # Drizzle database connection
  mockAuth.ts    # Simple authentication middleware
  vite.ts        # Vite dev server integration
shared/          # Code shared between client and server
  schema.ts      # Drizzle schemas + Zod validation schemas
```

### Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Database Layer
- All database operations are abstracted through the `IStorage` interface in `server/storage.ts`
- Database schema definitions live in `shared/schema.ts` using Drizzle ORM
- Zod schemas for validation are also in `shared/schema.ts`
- Schema changes require running `npm run db:push` to sync with database

### Authentication & Authorization
- Uses simple session-based authentication (PostgreSQL session store)
- Login via email (POST /api/login with { email })
- First user and emails with "admin@" prefix automatically get admin role
- Three user roles: `admin`, `therapist`, `client`
- Middleware: `isAuthenticated`, `isAdmin`, `canManageAppointment` (defined in `server/routes.ts`)
- Users table stores role and optional `therapistId` (links user accounts to therapist records)
- Role switching is allowed ONLY in development mode (NODE_ENV=development or ALLOW_ROLE_SWITCHING=true)
- Session secret defaults to "dev-secret-key-change-in-production" if SESSION_SECRET env var not set

### Key Data Models
- **Users**: Auth users with roles (admin/therapist/client), linked to therapist records via `therapistId`
- **Therapists**: Therapy practitioners with name, specialty, email, phone, color code
- **Appointments**: Scheduled sessions with series support (puntual/semanal/quincenal), status tracking (pending/confirmed/cancelled), and optimization features
- **ClientAvailability**: Weekly time slots when clients are available (dayOfWeek 0-6, startTime, endTime)
- **TherapistWorkingHours**: Weekly schedules defining when therapists work
- **Settings**: Key-value store for app configuration (e.g., `therapists_can_edit_others`)

### Appointment Series Logic
- Appointments can be one-time (`puntual`) or recurring (`semanal`, `quincenal`)
- Series appointments share a `seriesId`
- Update/delete operations support scope: `this_only` or `this_and_future`
- Frequency changes propagate through the series

### Smart Scheduling Features
- Conflict detection when creating appointments
- Automatic suggestions for alternative time slots based on:
  - Client availability matrix
  - Therapist working hours
  - Existing appointment conflicts
- Swap suggestions when conflicts are detected
- Optimization scoring for appointment quality

## Common Commands

### Development
```bash
npm run dev           # Start dev server (client + backend hot reload)
npm run check         # Type check TypeScript without emitting files
npm run build         # Build for production (Vite + esbuild bundle)
npm start             # Run production build
```

### Database
```bash
npm run db:push       # Push schema changes to database (Drizzle Kit)
```

Note: Database migrations are generated in `./migrations/` but the primary workflow is `db:push` for schema sync.

## Design System

The app follows a Material Design + Linear inspired design system with specific branding:

- **Brand Color**: Centro Orienta green `#B7CD95` (HSL: 95 35% 70%)
- **Dark Mode First**: Primary theme is dark mode with custom color scheme
- **Typography**: Inter font family throughout
- **Component Library**: Radix UI primitives + shadcn/ui styling
- **Spacing**: Tailwind spacing scale (2, 4, 6, 8, 12, 16)
- **Icons**: Heroicons (outline for navigation, solid for actions)

Full design guidelines are in `design_guidelines.md`.

## API Structure

All API routes are defined in `server/routes.ts`. Key patterns:

- **Auth routes**: `/api/login` (POST), `/api/logout` (POST), `/api/auth/user`, `/api/auth/user/role`
- **Resource CRUD**: `/api/therapists`, `/api/clients`, `/api/appointments`
- **Nested resources**: `/api/therapists/:id/appointments`, `/api/clients/:id/appointments`
- **Working hours**: `/api/therapists/:id/schedule`
- **Availability**: `/api/availability` (current user), `/api/availability/:userId` (admin only)
- **Series operations**: `/api/appointments/:id/series` (PATCH/DELETE with ?scope query param)
- **PDF Reports**: `/api/therapists/:therapistId/appointments/pdf?month=YYYY-MM`
- **Suggestions**: `/api/appointments/suggest` (POST with clientId, currentAppointmentId)

Authorization:
- Therapists can only view/manage their own appointments by default
- Setting `therapists_can_edit_others` (boolean) controls cross-therapist editing
- Admins have full access to all resources
- Clients can only view their own appointments and manage their availability

## Frontend Patterns

### State Management
- TanStack Query for server state (configured in `client/src/lib/queryClient.ts`)
- React hook state for local UI state
- No global state library (Redux, Zustand, etc.)

### Routing
- Uses Wouter (lightweight client-side routing)
- Routes defined in `client/src/App.tsx`
- Page components in `client/src/pages/`

### Forms
- React Hook Form + Zod validation via `@hookform/resolvers`
- Reuse Zod schemas from `@shared/schema` for consistency

### Theme
- Dark/light mode via `next-themes` (ThemeProvider in `client/src/lib/ThemeProvider.tsx`)
- ThemeToggle component for switching

## Important Development Notes

- **Windows Environment**: This codebase is primarily developed on Windows (see path separators in working directory)
- **Database Required**: Must have `DATABASE_URL` env var set to Neon PostgreSQL connection string
- **Port**: Always uses PORT env var (default 5000) - other ports are firewalled in production
- **Session Storage**: Uses PostgreSQL for session storage (table: `sessions`)
- **Session Secret**: Set SESSION_SECRET env var for production (defaults to "dev-secret-key-change-in-production")
- **Logo Handling**: SVG logo is converted to PNG for PDF generation using Sharp (see `getLogoPNGDataURI()` in routes.ts)
- **No Replit Dependencies**: System no longer requires REPLIT_DOMAINS, REPL_ID, or other Replit-specific env vars

## Testing Appointments Logic

When testing appointment creation/editing:
1. Ensure therapist working hours are set for the target day/time
2. Check client availability overlaps with proposed time
3. Test series operations (semanal, quincenal) with scope parameters
4. Verify authorization (therapists can't reassign appointments to other therapists unless setting allows)
5. Test conflict detection and suggestion generation

## Common Pitfalls

- **Timezone Handling**: Dates are stored as timestamps; frontend displays in local timezone
- **Series Deletion**: Use `/api/appointments/:id/series` endpoint with scope, NOT the regular delete endpoint for recurring appointments
- **Role Permissions**: Always check user role before showing UI elements (e.g., admin-only features)
- **Database Schema**: After modifying `shared/schema.ts`, run `npm run db:push` to sync
- **Validation**: Keep Zod schemas in `shared/schema.ts` in sync with database schema
