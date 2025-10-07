# Psychology Center Scheduling Management System

## Overview

This project is a comprehensive scheduling management system designed for a psychology center. Its primary purpose is to streamline appointment scheduling and calendar management by coordinating therapist availability with client preferences. The system enables administrators to manage therapists, clients, appointments, and availability schedules, offering intelligent appointment assignment and automatic rescheduling suggestions. The goal is to enhance efficiency in psychology practices by providing robust tools for managing therapist and client interactions, with a focus on ease of use for administrators and staff.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 3, 2025 (Session 3)** - Therapist Calendar Wall-Style View & Availability Summary

**New Feature: Calendario Estilo Pared para Terapeutas**
- Implementado nuevo componente `TherapistMonthView` que replica el calendario físico tradicional de pared
- **Layout de 5 columnas**: Solo días laborables (Lunes-Viernes), sin fines de semana
- **Celdas grandes**: 180px mínimo de altura para mostrar múltiples citas sin overflow
- **Formato simplificado**: Solo hora de inicio + nombre del paciente (texto pequeño para máxima claridad)
- **Encabezado destacado**: Mes/año y nombre del terapeuta en mayúsculas, estilo profesional
- **Números de día grandes**: Posicionados en esquina superior derecha de cada celda
- **Scroll interno**: Cada celda permite scroll independiente si hay muchas citas (max 140px visible)
- **Colores diferenciados**: Citas con notas conteniendo "viaje"/"importante" se muestran en color rojo
- **Integración completa**: Se usa automáticamente en Vista Individual → Vista Mensual del calendario

**New Feature: Resumen de Huecos Disponibles**
- Nuevo componente `AvailabilitySummary` que calcula y muestra slots libres automáticamente
- **Cálculo inteligente**: Compara horario de trabajo del terapeuta con citas agendadas
- **Frecuencias codificadas por color**:
  - Verde: Semanal (4+ huecos disponibles en el mes)
  - Azul: Quincenal (2-3 huecos)
  - Gris: Puntual (1 hueco)
- **Vista Individual**: Muestra resumen debajo del calendario sin nombre del terapeuta
- **Vista General**: Grid de cards con resumen por terapeuta incluyendo su nombre
- **Agrupación inteligente**: Agrupa horas del mismo día y frecuencia (ej: "Martes 16:00, 17:00, 18:00 Semanal")

**Technical Details**:
- Filtrado inteligente de días: Solo muestra días laborables (L-V) del mes
- Días fuera del mes actual: Renderizados con opacidad reducida para contexto visual
- Interactividad: Hover elevation en citas, click para abrir diálogo de edición
- Responsive: Mantiene estructura de 5 columnas en diferentes tamaños de pantalla
- Navegación: Botones para mes anterior/siguiente + botón "Hoy" para regresar a mes actual
- Availability calculation: Procesa horarios de trabajo por día de semana y compara con citas del mes actual
- Performance: Cálculos optimizados que solo se ejecutan cuando cambian los datos de entrada

**Previous Sessions**:
- Session 2: 8 major UX enhancements including day-of-month in suggestions, duration constraints (60/90/120min), session period selector, monthly/weekly calendar toggle, therapist-specific hour ranges, weekly availability calculation, role-based dashboard visibility, traditional wall calendar redesign
- Session 1: PDF logo fix, TherapistDetail editing, settings page with configurable permissions, OccupancyGrid improvements, user-first-name-visible system, enhanced appointments page with filters

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It utilizes Shadcn UI (New York style) built on Radix UI primitives, styled with Tailwind CSS, supporting dark/light mode. Wouter handles client-side routing. State management is primarily done with TanStack Query for server state and React hooks for local component state. A key design decision is a "dark mode first" approach, emphasizing a responsive, component-driven, and data-oriented design.

### Backend Architecture

The backend was originally an Express.js application with TypeScript, but authentication is now managed exclusively through Supabase Auth with stateless JWTs. Legacy middleware such as session handling has been removed in favor of verifying Supabase access tokens on each request.

### Database Architecture

The system uses a PostgreSQL database, accessed via Drizzle ORM with Neon's serverless driver. The schema includes tables for sessions, users (with roles), therapists, therapist working hours, client availability, and appointments. Key architectural decisions include using UUID primary keys, timestamp tracking, enum-based status fields, and a normalized design. Zod is used for schema validation. The database connection uses pooling and is configured via environment variables.

## External Dependencies

**Authentication Service**:
- **Supabase Auth**: Provides user authentication, identity, and role-based access control using JWTs.

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