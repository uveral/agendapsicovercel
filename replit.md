# Psychology Center Scheduling Management System

## Overview

This project is a comprehensive scheduling management system designed for a psychology center. Its primary purpose is to streamline appointment scheduling and calendar management by coordinating therapist availability with client preferences. The system enables administrators to manage therapists, clients, appointments, and availability schedules, offering intelligent appointment assignment and automatic rescheduling suggestions. The goal is to enhance efficiency in psychology practices by providing robust tools for managing therapist and client interactions, with a focus on ease of use for administrators and staff.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It utilizes Shadcn UI (New York style) built on Radix UI primitives, styled with Tailwind CSS, supporting dark/light mode. Wouter handles client-side routing. State management is primarily done with TanStack Query for server state and React hooks for local component state. A key design decision is a "dark mode first" approach, emphasizing a responsive, component-driven, and data-oriented design.

### Backend Architecture

The backend is an Express.js application with TypeScript, running on Node.js. It provides a RESTful JSON API for managing therapists, clients, appointments, and availability. Authentication is handled via Replit Auth (OpenID Connect) with Passport.js, implementing session-based and role-based access control (admin vs. client). Middleware includes JSON parsing, session management, request logging, and error handling.

### Database Architecture

The system uses a PostgreSQL database, accessed via Drizzle ORM with Neon's serverless driver. The schema includes tables for sessions, users (with roles), therapists, therapist working hours, client availability, and appointments. Key architectural decisions include using UUID primary keys, timestamp tracking, enum-based status fields, and a normalized design. Zod is used for schema validation. The database connection uses pooling and is configured via environment variables.

## External Dependencies

**Authentication Service**:
- **Replit Auth (OpenID Connect)**: Used for user authentication, identity, and session management.

**Database**:
- **Neon PostgreSQL**: Serverless PostgreSQL database for data storage.

**UI Component Library**:
- **Radix UI Primitives**: Accessible, unstyled component primitives.
- **Shadcn UI**: Pre-styled component system built on Radix.
- **Lucide React**: Icon library.

**Build & Development Tools**:
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema management and migrations.
- **ESBuild**: Backend bundling.
- **TypeScript**: For type safety across the stack.

**Additional Libraries**:
- **date-fns**: Date manipulation.
- **nanoid**: Unique ID generation.
- **memoizee**: Function memoization.
- **zod**: Runtime type validation.

**Font Resources**:
- **Google Fonts**: Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono.