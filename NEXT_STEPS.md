# 🎉 Migración Completa - Próximos Pasos

## ✅ Lo Que Ya Está Hecho

La estructura base de Next.js + Supabase está completamente configurada:

### Configuración
- ✅ Next.js 15 con App Router
- ✅ Supabase Auth configurado
- ✅ Variables de entorno (`.env.local`)
- ✅ Middleware de autenticación
- ✅ TypeScript configurado
- ✅ Tailwind CSS actualizado

### Páginas
- ✅ Landing page (`/`)
- ✅ Login (`/login`)
- ✅ Signup (`/signup`)
- ✅ Dashboard (`/dashboard`)
- ✅ Terapeutas (`/therapists`) - placeholder
- ✅ Clientes (`/clients`) - placeholder
- ✅ Calendario (`/calendar`) - placeholder
- ✅ Citas (`/appointments`) - placeholder
- ✅ Disponibilidad (`/availability`) - placeholder
- ✅ Configuración (`/settings`) - placeholder

### Componentes
- ✅ AppSidebar con navegación
- ✅ Layout principal con sidebar
- ✅ Theme Toggle (claro/oscuro)
- ✅ Todos los componentes UI de shadcn/ui copiados

### API Routes
- ✅ `/api/therapists` - GET, POST
- ✅ `/api/clients` - GET, POST
- ✅ `/api/appointments` - GET, POST
- ✅ `/auth/callback` - Callback de Supabase Auth

## 🚀 Pasos Inmediatos

### 1. Aplicar el Schema a Supabase (CRÍTICO)

Antes de hacer nada, necesitas ejecutar las migraciones:

1. Ve al SQL Editor de Supabase:
   https://supabase.com/dashboard/project/rsfqdvshhgrjujgpcktf/sql/new

2. Copia y ejecuta el contenido de:
   ```
   supabase/migrations/20250106000001_initial_schema.sql
   ```

3. Luego ejecuta:
   ```
   supabase/seed.sql
   ```

### 2. Probar Localmente

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

Abre http://localhost:3000

**Deberías ver:**
- Landing page funcional
- Puedes ir a `/login` y `/signup`
- Después de registrarte, te redirige a `/dashboard`
- El sidebar funciona y puedes navegar entre páginas

### 3. Hacer tu Primer Commit

```bash
git add .
git commit -m "Complete Next.js + Supabase migration"
git push origin main
```

### 4. Desplegar a Vercel

Sigue las instrucciones en `DEPLOY.md`

## 📝 Tareas Pendientes (En Orden de Prioridad)

### Alta Prioridad

1. **Completar las Páginas Principales**
   - Migrar la lógica de `client/src/pages/Therapists.tsx` → `app/(dashboard)/therapists/page.tsx`
   - Migrar `Clients.tsx` → `app/(dashboard)/clients/page.tsx`
   - Migrar `Appointments.tsx` → `app/(dashboard)/appointments/page.tsx`
   - Migrar `Calendar.tsx` → `app/(dashboard)/calendar/page.tsx`

2. **Migrar Componentes Específicos**
   Los componentes en `client/src/components/` que NO son UI genéricos necesitan ser migrados:
   - `AppointmentCard.tsx`
   - `AppointmentDialog.tsx`
   - `ClientCard.tsx`
   - `TherapistCard.tsx`
   - `WeekCalendar.tsx`
   - `MonthCalendar.tsx`
   - etc.

   Cópialos a `components/` y actualiza los imports:
   - Cambia `import { useQuery } from "@tanstack/react-query"` (mantener)
   - Cambia `import { Link } from "wouter"` → `import Link from "next/link"`
   - Cambia `import { useLocation } from "wouter"` → `import { usePathname } from "next/navigation"`

3. **Completar los API Routes**

   Los routes actuales son muy básicos. Necesitas agregar:

   **Therapists:**
   - `app/api/therapists/[id]/route.ts` - GET, PATCH, DELETE individual
   - `app/api/therapists/[id]/schedule/route.ts` - Horarios de trabajo

   **Clients:**
   - `app/api/clients/[id]/route.ts` - GET, PATCH, DELETE individual
   - `app/api/clients/[id]/appointments/route.ts` - Citas del cliente

   **Appointments:**
   - `app/api/appointments/[id]/route.ts` - GET, PATCH, DELETE individual
   - `app/api/appointments/[id]/series/route.ts` - Operaciones de series
   - `app/api/appointments/suggest/route.ts` - Sugerencias inteligentes

   **PDF Generation:**
   - `app/api/reports/monthly/route.ts`
   - `app/api/reports/daily/route.ts`
   - `app/api/therapists/[id]/report/route.ts`

### Media Prioridad

4. **Migrar la Lógica de Availability**
   - Componente `AvailabilityForm.tsx`
   - API routes para disponibilidad de clientes

5. **Implementar el PDF Generation**
   - Usar jsPDF como en el código original
   - Convertir logo SVG a PNG usando Sharp

6. **Agregar Validación**
   - Usar Zod para validar datos en API routes
   - Crear schemas compartidos (similar a `shared/schema.ts`)

### Baja Prioridad

7. **Optimizaciones**
   - Server Components vs Client Components
   - Loading states con `loading.tsx`
   - Error handling con `error.tsx`
   - Suspense boundaries

8. **Mejoras de UX**
   - Skeleton loaders
   - Toast notifications
   - Confirmaciones de acciones

## 🔧 Cómo Migrar una Página (Ejemplo)

Ejemplo: Migrar `client/src/pages/Therapists.tsx` → `app/(dashboard)/therapists/page.tsx`

### Paso 1: Leer el archivo original
```bash
# Ver el contenido
cat client/src/pages/Therapists.tsx
```

### Paso 2: Adaptar imports
```typescript
// ANTES (Wouter + Vite)
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";

// DESPUÉS (Next.js)
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
```

### Paso 3: Cambiar fetching de datos
```typescript
// ANTES
const { data: therapists } = useQuery({
  queryKey: ['/api/therapists'],
});

// DESPUÉS (mismo, pero asegúrate que el endpoint existe)
const { data: therapists } = useQuery({
  queryKey: ['therapists'],
  queryFn: async () => {
    const res = await fetch('/api/therapists');
    return res.json();
  },
});
```

### Paso 4: Actualizar navegación
```typescript
// ANTES
<Link href="/therapists">Ver</Link>

// DESPUÉS
<Link href="/therapists">Ver</Link>  // Igual!
```

### Paso 5: Marcar como Client Component si usa hooks
```typescript
// Si usa useState, useQuery, etc., agregar al inicio:
'use client';

export default function TherapistsPage() {
  // ... resto del código
}
```

## 📚 Recursos de Ayuda

### Documentación
- **Next.js App Router**: https://nextjs.org/docs/app
- **Supabase JS Client**: https://supabase.com/docs/reference/javascript/introduction
- **TanStack Query**: https://tanstack.com/query/latest/docs/framework/react/overview

### Archivos de Referencia
- `CLAUDE.md` - Guía actualizada del proyecto
- `MIGRATION_GUIDE.md` - Detalles de la migración
- `DEPLOY.md` - Guía de despliegue
- `design_guidelines.md` - Especificaciones de diseño

### Comandos Útiles
```bash
npm run dev          # Desarrollo
npm run build        # Build (detecta errores de TypeScript)
npm run type-check   # Solo verificar tipos
npm run lint         # ESLint
```

## ⚠️ Problemas Comunes

### Error: "Module not found"
- Asegúrate que los imports usen los alias correctos:
  - `@/` para todo (app, components, lib)
  - NO uses `@shared/` (ya no existe)

### Error: "Hydration failed"
- Probablemente estás usando un Server Component con hooks
- Agrega `'use client';` al inicio del archivo

### Error: "Cannot read properties of undefined"
- El sidebar intenta leer `user` antes de que cargue
- Agrega checks: `{user?.first_name}`

### Error: "Unauthorized" en API
- Verifica que las Row Level Security policies estén creadas
- Revisa que el usuario esté autenticado

## 🎯 Meta Final

Cuando hayas completado todo:

1. ✅ Todas las páginas funcionan como en la versión original
2. ✅ Los API routes replican la funcionalidad de `server/routes.ts`
3. ✅ La autenticación funciona correctamente
4. ✅ Los PDFs se generan
5. ✅ Las citas recurrentes funcionan
6. ✅ Las sugerencias inteligentes funcionan
7. ✅ Está desplegado en Vercel

## 💡 Tips

- **Trabaja incrementalmente**: Migra una página a la vez
- **Prueba constantemente**: `npm run dev` y verifica en el navegador
- **Usa TypeScript**: Te ayudará a detectar errores temprano
- **Revisa los logs**: Console del navegador y terminal
- **No borres `client/` y `server/`**: Hasta que todo esté migrado

---

**¿Tienes dudas?** Revisa `CLAUDE.md` o contacta con el equipo de desarrollo.

**¡Éxito con la migración! 🚀**
