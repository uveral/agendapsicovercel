# Psychology Center Scheduling Management System

## Overview

This is a comprehensive scheduling management system designed for a psychology center. The application enables administrators to manage therapists, clients, appointments, and availability schedules. It provides intelligent appointment assignment by matching client availability with therapist calendars, and offers automatic rescheduling suggestions when conflicts arise.

**Primary Purpose**: Streamline appointment scheduling and calendar management for a psychology practice by coordinating therapist availability with client preferences.

**Target Users**: Psychology center administrators and staff managing multiple therapists and client appointments.

## Recent Changes

**October 3, 2025** - Complete Recurring Appointment System Implementation

**Milestone 1: Schema, Permissions & API Foundation**
- Extended appointment schema with recurring appointment support:
  - seriesId: Groups recurring appointments together
  - frequency: "puntual" (one-time), "semanal" (weekly), or "quincenal" (biweekly)
  - durationMinutes: Optional duration override (defaults to 1 hour)
- Implemented therapist-user authorization model:
  - Added therapistId field to users table
  - Role-based permissions: admins manage all appointments, therapists manage only their own
  - Therapists cannot reassign their appointments to other therapists
- Enhanced API authorization:
  - GET /api/appointments routes by role (admin/therapist/client)
  - canManageAppointment middleware for create/update/delete operations
  - Fixed authorization leak in GET /api/therapists/:id/appointments

**Milestone 2: Calendar Foundation**
- Built dual-view calendar system:
  - **Vista General**: Occupancy grid showing 9:00-20:00 × Mon-Sun with color-coded therapist availability
  - **Vista Individual**: Per-therapist weekly calendar with client names in time slots
- Implemented OccupancyGrid component:
  - Small colored squares (one per therapist per hour)
  - Tooltips showing therapist name and availability status
  - Clickable squares to view/edit appointments
- Wired "Ver calendario" button from Therapists page:
  - Navigates to /calendar?therapist=id with pre-selected therapist
  - Automatically switches to Vista Individual view

**Milestone 3: Recurring Appointment Management**
- Created AppointmentEditDialog with full series support:
  - Edit/delete options for recurring appointments:
    - "Solo esta cita": Affects only selected appointment (breaks from series, sets frequency="puntual")
    - "Esta y todas las siguientes": Affects selected appointment and all future occurrences
  - Frequency change feature: Converts series between weekly ↔ biweekly with date recalculation
  - Non-recurring appointments show simplified edit/delete without scope options
- Implemented backend series endpoints:
  - DELETE /api/appointments/:id/series?scope=[this_only|this_and_future]
  - PATCH /api/appointments/:id/series?scope=[this_only|this_and_future]
  - PATCH /api/appointments/:id/frequency (changes frequency for entire series)
- Fixed critical bug: "Delete this only" now actually deletes the appointment instead of leaving it orphaned

**Milestone 4: Client Detail Enhancements**
- Created ClientAvailabilityMatrix component:
  - Interactive 9:00-20:00 × Mon-Sun grid for marking client availability
  - Click cells to toggle availability (selected cells show in primary color)
  - Intelligently merges consecutive hours into time blocks when saving
  - PUT /api/availability/:clientId endpoint for atomic replacement
- Built CreateAppointmentDialog with intelligent scheduling:
  - **Smart Suggestions**: Calculates overlapping time slots between client and therapist availability
  - **Conflict Detection**: Fixed critical bug - now uses proper time interval overlap detection (handles mid-hour appointments, multi-hour slots, partial overlaps)
  - **Recurring Appointment Creation**: 
    - Radio buttons: Puntual | Semanal | Quincenal
    - Session count input (creates series with unique seriesId)
    - Generates multiple appointments with correct date intervals
  - Manual date/time selection fallback if no suggestions match
- Enhanced ClientDetail page:
  - "Editar" button opens availability matrix editor
  - "Dar Cita" button opens smart appointment creation dialog

**Milestone 5: PDF Report Generation with Centro Orienta Branding**
- Implemented professional PDF generation system with embedded real logo:
  - **Logo Embedding**: Uses sharp library to convert SVG logo to PNG (200x100) at runtime
  - **Centro Orienta Branding**: All PDFs include logo at (15, 10) and green branding text
  - **Three Report Types**:
    - Therapist Monthly Report: GET /api/therapists/:therapistId/appointments/pdf?month=YYYY-MM
    - Global Monthly Report: GET /api/reports/monthly-pdf?month=YYYY-MM (admin-only)
    - Daily Report: GET /api/reports/daily-pdf?date=YYYY-MM-DD (admin-only)
  - **Authorization**: Admins see all reports, therapists only their own monthly reports
  - **Error Handling**: Returns HTTP 500 if logo conversion fails (no silent failures)
- Created TherapistDetail page:
  - Therapist profile with appointment history
  - Month selector for PDF download
  - "Ver detalles" button from TherapistCard navigates to /therapists/:id
- Enhanced Dashboard with Reports section:
  - Monthly report download (all therapists)
  - Daily report download (specific date)
  - Month/date selectors with proper validation

**Technical Achievements**:
- Zero authorization leaks across all appointment endpoints
- Proper time interval math prevents double-booking
- Series operations maintain data integrity (atomic deletes, proper detachment)
- PDF generation with real logo embedding using sharp (server-side SVG-to-PNG conversion)
- All features include loading states, error handling, and cache invalidation
- Comprehensive data-testid attributes for testing throughout

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript running on Vite for development and build tooling.

**UI Component System**: 
- Shadcn UI component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for styling with a custom design system
- CSS variables for theming with dark/light mode support
- Material Design + Linear principles for productivity-focused interface

**Routing**: Wouter for lightweight client-side routing

**State Management**:
- TanStack Query (React Query) for server state management and caching
- React hooks for local component state
- Context API for theme management

**Key Design Decisions**:
- **Dark mode first**: Default theme is dark with light mode as alternative, optimized for extended use
- **Responsive layout**: Collapsible sidebar with mobile support using Shadcn's sidebar component
- **Component-driven**: Modular, reusable components for therapists, clients, appointments, and calendars
- **Data-oriented design**: Clear visual hierarchy for scanning complex scheduling information

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful JSON API with the following resource endpoints:
- `/api/auth/*` - User authentication via Replit Auth (OpenID Connect)
- `/api/therapists` - Therapist CRUD operations
- `/api/therapists/:id/schedule` - Therapist working hours management (GET/PUT)
- `/api/therapists/:id/appointments/pdf` - Therapist monthly PDF report generation
- `/api/clients` - Client listing and manual creation (GET/POST)
- `/api/appointments` - Appointment CRUD operations
- `/api/availability` - Client availability preferences with custom time blocks
- `/api/reports/monthly-pdf` - Global monthly PDF report (admin-only)
- `/api/reports/daily-pdf` - Daily PDF report (admin-only)

**Authentication & Authorization**:
- Replit Auth integration using OpenID Connect with Passport.js strategy
- Session-based authentication with PostgreSQL session store
- Role-based access control (admin vs client roles)
- Admin-only routes for creating/modifying therapists

**Middleware**:
- JSON body parsing
- Session management with connect-pg-simple
- Request/response logging for API routes
- Error handling with status code propagation

### Database Architecture

**ORM**: Drizzle ORM with Neon serverless PostgreSQL driver

**Schema Design**:

1. **sessions** - Express session storage (required for authentication)
2. **users** - User accounts with roles (admin/client), linked to Replit Auth
3. **therapists** - Therapist profiles with specialty, contact info
4. **therapist_working_hours** - Therapist work schedules with custom time blocks per day (0-6, Sunday-Saturday)
5. **client_availability** - Client availability preferences with flexible time slots (0-6, Sunday-Saturday)
6. **appointments** - Scheduled sessions linking therapists and clients with status tracking

**Key Architectural Decisions**:
- **UUID primary keys** using PostgreSQL's `gen_random_uuid()` for all entities
- **Timestamp tracking** with `createdAt` and `updatedAt` on mutable entities
- **Enum-based status fields** for appointment states (confirmed, pending, cancelled)
- **Normalized design** with separate tables for availability vs appointments
- **Zod schema validation** generated from Drizzle schemas for type-safe API validation

**Database Connection**:
- Connection pooling via Neon's serverless driver
- WebSocket constructor configured for serverless environments
- Environment variable based configuration

### External Dependencies

**Authentication Service**:
- **Replit Auth (OpenID Connect)**: Primary authentication provider
- Handles user identity, profile data, and session management
- Configured via environment variables: `ISSUER_URL`, `REPL_ID`, `REPLIT_DOMAINS`

**Database**:
- **Neon PostgreSQL**: Serverless PostgreSQL database
- Connection string provided via `DATABASE_URL` environment variable
- Supports connection pooling and WebSocket-based queries

**UI Component Library**:
- **Radix UI Primitives**: Unstyled, accessible component primitives
- **Shadcn UI**: Pre-styled component system built on Radix
- **Lucide React**: Icon library for consistent iconography

**Build & Development Tools**:
- **Vite**: Frontend build tool with HMR and optimized production builds
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Backend bundling for production deployment
- **TypeScript**: Type safety across frontend and backend

**Additional Libraries**:
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **memoizee**: Function memoization for OIDC config caching
- **zod**: Runtime type validation and schema definition

**Font Resources**:
- **Google Fonts**: Inter (primary), Architects Daughter, DM Sans, Fira Code, Geist Mono

**Environment Requirements**:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - Express session encryption key (required)
- `REPL_ID` - Replit deployment identifier (required for auth)
- `REPLIT_DOMAINS` - Allowed domains for OIDC redirect (required for auth)
- `ISSUER_URL` - OIDC issuer URL (defaults to replit.com/oidc)
- `NODE_ENV` - Environment flag (development/production)