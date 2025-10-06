# Guía de Migración: Replit → Vercel + Supabase

## Pasos para Setup

### 1. Crear Proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Click **"New Project"**
3. Configuración:
   - **Name**: `agendapsico`
   - **Database Password**: (Guárdala en tu gestor de contraseñas)
   - **Region**: Selecciona la más cercana a tus usuarios
4. Espera 2-3 minutos mientras se provisiona

### 2. Obtener Credenciales de Supabase

Una vez creado el proyecto:

1. Ve a **Project Settings** (ícono de engranaje)
2. Click en **API**
3. Copia estas credenciales:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Comienza con `eyJhbGc...` (primera key)
   - **service_role key**: Segunda key (mantener secreta)

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar Migraciones de Base de Datos

La migración creará automáticamente las tablas en Supabase:

```bash
npm install
npm run db:migrate
```

### 5. Configurar Supabase Auth

1. En Supabase Dashboard, ve a **Authentication** → **Providers**
2. Habilita **Email** (ya está habilitado por defecto)
3. Configuración de URL:
   - **Site URL**: `http://localhost:3000` (development) o tu dominio de Vercel
   - **Redirect URLs**: Agregar:
     - `http://localhost:3000/auth/callback`
     - `https://tu-dominio.vercel.app/auth/callback`

### 6. Deploy a Vercel

1. Ve a https://vercel.com
2. Click **"Add New Project"**
3. Importa desde GitHub: `https://github.com/uveral/agendapsicovercel.git`
4. Configura las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (será tu URL de Vercel)
5. Click **Deploy**

### 7. Actualizar URLs en Supabase

Después del primer deploy:

1. Copia tu URL de Vercel (ej: `https://agendapsico.vercel.app`)
2. En Supabase → Authentication → URL Configuration:
   - Actualiza **Site URL** a tu dominio de Vercel
   - Verifica que `https://tu-dominio.vercel.app/auth/callback` esté en Redirect URLs

## Cambios Principales

### Arquitectura

**Antes (Replit):**
- Express.js + Vite
- Replit Auth (Passport)
- Neon PostgreSQL
- Monorepo client/server

**Después (Vercel):**
- Next.js 15 App Router
- Supabase Auth
- Supabase PostgreSQL
- Estructura Next.js estándar

### Estructura de Archivos

```
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
  (dashboard)/
    layout.tsx          # Sidebar layout
    dashboard/page.tsx
    therapists/page.tsx
    clients/page.tsx
    calendar/page.tsx
    appointments/page.tsx
  api/
    auth/callback/route.ts
    therapists/route.ts
    clients/route.ts
    appointments/route.ts
  layout.tsx
  page.tsx             # Landing page
components/            # Componentes React (sin cambios)
lib/
  supabase/
    client.ts          # Cliente Supabase para cliente
    server.ts          # Cliente Supabase para servidor
  utils.ts
supabase/
  migrations/          # SQL migrations
  seed.sql            # Datos iniciales
```

### Autenticación

**Antes:**
```typescript
// Replit Auth
app.get('/api/auth/user', isAuthenticated, async (req, res) => {
  const user = await storage.getUser(req.user.claims.sub);
  res.json(user);
});
```

**Después:**
```typescript
// Supabase Auth
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Response.json(user);
}
```

### Database Queries

**Antes (Drizzle):**
```typescript
const therapists = await db.select().from(therapists);
```

**Después (Supabase Client):**
```typescript
const { data: therapists } = await supabase
  .from('therapists')
  .select('*');
```

## Scripts Disponibles

```bash
npm run dev          # Desarrollo local (puerto 3000)
npm run build        # Build para producción
npm start            # Servidor producción local
npm run db:migrate   # Ejecutar migraciones en Supabase
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Notas Importantes

- **No incluir** `.env.local` en git (ya está en .gitignore)
- Las variables `NEXT_PUBLIC_*` son accesibles en el cliente
- Las variables sin prefijo son solo servidor
- Supabase maneja automáticamente Row Level Security (RLS)
- Las políticas RLS se configuran en las migraciones
