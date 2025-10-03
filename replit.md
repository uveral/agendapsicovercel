# Psychology Center Scheduling Management System

## Overview

This is a comprehensive scheduling management system designed for a psychology center. The application enables administrators to manage therapists, clients, appointments, and availability schedules. It provides intelligent appointment assignment by matching client availability with therapist calendars, and offers automatic rescheduling suggestions when conflicts arise.

**Primary Purpose**: Streamline appointment scheduling and calendar management for a psychology practice by coordinating therapist availability with client preferences.

**Target Users**: Psychology center administrators and staff managing multiple therapists and client appointments.

## Recent Changes

**October 3, 2025** - Complete Feature Set Implementation
- **Schedule Management Improvements**:
  - Fixed TherapistScheduleDialog to display Monday as first day of week (with DB conversion)
  - Fixed disappearing time blocks issue by adjusting useEffect dependencies
  - Relaxed therapist schedule viewing permissions (any authenticated user can view)
  - Admin-only requirement maintained for editing therapist schedules
  
- **Client Management Enhancements**:
  - Added client detail page with full profile, availability, and appointment history
  - Implemented "Ver detalles" button navigation from client cards
  - Added delete functionality for clients with confirmation dialog
  - Any authenticated user can view and create clients
  
- **Therapist Management**:
  - Added delete functionality for therapists with confirmation dialog
  - Maintained admin-only requirement for therapist creation/deletion
  
- **Appointment System**:
  - Implemented appointment creation dialog with full form validation
  - Admin-only access for creating appointments (security requirement)
  - Fixed React key warning in WeekCalendar component
  
- **Development Tools**:
  - Added role switching capability (admin ↔ client) for testing in development
  - Protected by ALLOW_ROLE_SWITCHING flag and NODE_ENV check
  - Hidden in production for security
  
- All features tested end-to-end successfully with comprehensive test coverage

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
- `/api/clients` - Client listing and manual creation (GET/POST)
- `/api/appointments` - Appointment CRUD operations
- `/api/availability` - Client availability preferences with custom time blocks

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