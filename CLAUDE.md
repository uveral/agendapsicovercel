# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgendaPsico is a psychology clinic scheduling management system built for Centro Orienta. It manages therapist schedules, client appointments, availability tracking, and includes intelligent appointment suggestion/swap functionality when conflicts arise.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: Radix UI + Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query) + Zustand (for specific UI state)
- **PDF Generation**: jsPDF + jsPDF-autoTable
- **Deployment**: Vercel
- **Type Safety**: TypeScript + Zod validation

## Architecture

### Project Structure
```
app/                    # Next.js App Router
  (auth)/              # Auth route group (login, signup)
  (dashboard)/         # Dashboard route group with shared layout
    layout.tsx         # Sidebar navigation layout
    dashboard/         # Main dashboard
    therapists/        # Therapist management
    clients/           # Client management
    appointments/      # Appointment management
    calendar/          # Calendar views (multiple implementations: calendar through calendar11)
    availability/      # Client availability management
    settings/          # App settings
  api/                 # API Routes (Next.js Route Handlers)
  layout.tsx           # Root layout
  page.tsx             # Landing page
components/            # React components (includes ui/ for shadcn)
lib/                   # Utilities and configuration
  supabase/           # Supabase client utilities
    client.ts         # Client-side Supabase client
    server.ts         # Server-side Supabase client
    middleware.ts     # Auth middleware helpers
  api/                # API client functions
  queryClient.ts      # TanStack Query configuration
  utils.ts            # Shared utilities (cn, etc.)
  types.ts            # Shared TypeScript types and Zod schemas
  therapistSchedule.ts # Therapist schedule utilities
hooks/                # Custom React hooks
  useAppSettings.ts   # App settings management
  useDiagnosticCalendarData.ts # Calendar diagnostic data
types/                # TypeScript definitions
  supabase.ts         # Auto-generated Supabase types
shared/               # Shared data and utilities
  diagnosticCalendarData.ts # Calendar diagnostic/testing data
  sampleCalendarData.ts    # Sample calendar data
supabase/             # Database migrations and seeds
  migrations/         # SQL migration files
  seed.sql           # Initial seed data
middleware.ts         # Next.js middleware (auth session management)
```

### Database Layer

- **Database**: Supabase PostgreSQL (serverless)
- **ORM**: Supabase Client (built-in query builder)
- **Type Generation**: Types auto-generated from Supabase schema in `types/supabase.ts`
- **Validation**: Zod schemas in `lib/types.ts` for runtime validation
- **Migrations**: SQL files in `supabase/migrations/`, run via `npm run db:migrate`

### Authentication & Authorization

- **Provider**: Supabase Auth (email-based)
- **Session Management**: Cookie-based sessions via Supabase SSR
- **Middleware**: Auth session refresh in `middleware.ts` using `lib/supabase/middleware.ts`
- **Server Client**: Use `createClient()` from `lib/supabase/server.ts` in Server Components and API Routes
- **Admin Client**: Use `createAdminClient()` for service-role operations (bypasses RLS)
- **Client Client**: Use client from `lib/supabase/client.ts` in Client Components

Three user roles:
- **admin**: Full access to all resources and settings
- **therapist**: Manage own schedule and appointments (restrictions via RLS)
- **client**: View own appointments and manage availability

Role-based access is enforced via:
1. Supabase Row Level Security (RLS) policies in migrations
2. Manual checks in API route handlers when needed

### Key Data Models

- **users**: Auth users (from `auth.users`) with custom fields (role, therapistId, firstName, lastName)
- **therapists**: Therapy practitioners with name, specialty, email, phone, color
- **clients**: Alias/view of users with role='client'
- **appointments**: Scheduled sessions with series support, status tracking, optimization
- **client_availability**: Weekly time slots when clients are available (dayOfWeek 0-6, startTime, endTime)
- **therapist_working_hours**: Weekly schedules defining when therapists work
- **settings**: Key-value store for app configuration

### Appointment Series Logic

- Appointments can be one-time (`puntual`) or recurring (`semanal`, `quincenal`)
- Series appointments share a `seriesId`
- Update/delete operations support scope: `this_only` or `this_and_future`
- Frequency changes propagate through series

### Smart Scheduling Features

- Conflict detection when creating appointments
- Automatic suggestions for alternative time slots based on:
  - Client availability matrix
  - Therapist working hours
  - Existing appointment conflicts
- Swap suggestions when conflicts detected
- Optimization scoring for appointment quality

## Common Commands

### Development
```bash
npm run dev           # Start Next.js dev server (port 3000)
npm run build         # Build for production
npm start             # Run production build locally
npm run lint          # Run ESLint
npm run type-check    # TypeScript type checking
```

### Database
```bash
npm run db:migrate    # Run Supabase migrations (via scripts/migrate.js)
```

Note: Migrations are SQL files in `supabase/migrations/`. The migrate script executes them against your Supabase project.

## Environment Variables

Required environment variables (in `.env.local` for local dev):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Server-only

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your app URL

# Admin Configuration (optional)
ADMIN_EMAILS=admin@example.com,other-admin@example.com  # Comma-separated emails that get auto-admin role
```

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. The `ADMIN_EMAILS` variable automatically grants admin role to specified email addresses on signup.

## Design System

Material Design + Linear inspired design with Centro Orienta branding:

- **Brand Color**: Centro Orienta green `#B7CD95` (HSL: 95 35% 70%)
- **Dark Mode First**: Primary theme is dark mode with custom color scheme
- **Typography**: Inter font family throughout
- **Component Library**: Radix UI primitives + shadcn/ui styling
- **Spacing**: Tailwind spacing scale
- **Icons**: lucide-react

Full design guidelines in `design_guidelines.md`.

## API Structure

API routes use Next.js Route Handlers (App Router). Located in `app/api/`:

- **Auth**: Handled automatically by Supabase (login/signup via Supabase client)
- **User**: `GET /api/user` - Current user info
- **Therapists**: `GET|POST /api/therapists`, `GET|PUT|DELETE /api/therapists/[id]`
- **Clients**: `GET|POST /api/clients`, `GET|PUT|DELETE /api/clients/[id]`
- **Appointments**: `GET|POST /api/appointments`, `GET|PUT|DELETE /api/appointments/[id]`
- **Working Hours**: `GET|PUT /api/therapists/[id]/schedule`
- **Therapist Working Hours**: `GET|POST|DELETE /api/therapist-working-hours`
- **App Settings**: `GET|PUT /api/app-settings` - Global app configuration

Authorization patterns:
- Get current user via `await supabase.auth.getUser()`
- RLS policies automatically filter data based on user role
- Use `createAdminClient()` only when you need to bypass RLS (rare)

## Frontend Patterns

### State Management
- **Server State**: TanStack Query (configured in `lib/queryClient.ts`)
- **UI State**: React hooks (useState, useReducer)
- **Global UI State**: Zustand for specific calendar and UI state (used selectively, not globally)

### Data Fetching
- **Server Components**: Fetch directly with Supabase client (no React Query needed)
- **Client Components**: Use TanStack Query with custom hooks or API client functions
- **API Client**: Helper functions in `lib/api/index.ts`

### Routing
- **Next.js App Router**: File-based routing in `app/` directory
- **Route Groups**: `(auth)` and `(dashboard)` for layout organization
- **Dynamic Routes**: `[id]` folders for dynamic segments

### Forms
- **React Hook Form** + Zod validation via `@hookform/resolvers/zod`
- Reuse Zod schemas from `lib/types.ts` for consistency
- shadcn/ui form components with Radix UI primitives

### Theme
- **next-themes**: Dark/light mode switching
- Theme persisted in localStorage
- Toggle component in sidebar

## Important Development Notes

- **Windows Environment**: Primary development on Windows (check path separators)
- **Port**: Always uses port 3000 (Next.js default)
- **Supabase Required**: Must configure Supabase project and environment variables
- **RLS Policies**: Database security enforced via Row Level Security policies in migrations
- **Migration from Express**: This project was migrated from Express + Vite + Drizzle to Next.js + Supabase (see `MIGRATION_GUIDE.md`)
- **Calendar Pages**: Multiple calendar implementations (calendar through calendar11) for testing different approaches. The main calendar route (`/calendar`) is the primary implementation.
- **Testing Data**: Use `shared/diagnosticCalendarData.ts` and `shared/sampleCalendarData.ts` for testing calendar functionality

## Testing Appointments Logic

When testing appointment creation/editing:
1. Ensure therapist working hours are set for target day/time
2. Check client availability overlaps with proposed time
3. Test series operations (semanal, quincenal) with scope parameters
4. Verify RLS policies enforce correct access (therapists can't see other therapists' appointments unless admin)
5. Test conflict detection and suggestion generation

## Common Pitfalls

- **Timezone Handling**: Dates stored as timestamps; frontend displays in user's local timezone
- **Server vs Client Components**: Remember which components can use `createClient()` from server.ts vs client.ts
- **RLS Policies**: Don't use admin client unless absolutely necessary (bypasses security)
- **Auth State**: Use Supabase auth hooks/methods, not manual session management
- **Environment Variables**: `NEXT_PUBLIC_*` exposed to browser, others are server-only
- **Dynamic Routes**: Use proper Next.js 15 async params pattern: `async function Page({ params }: { params: Promise<{ id: string }> })`
