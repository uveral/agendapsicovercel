# Guía de Despliegue - AgendaPsico

## ✅ Pre-requisitos Completados

- [x] Proyecto Supabase creado: `Orienta`
- [x] URL: `https://rsfqdvshhgrjujgpcktf.supabase.co`
- [x] Credenciales configuradas en `.env.local`

## 📋 Pasos para Desplegar

### 1. Aplicar Schema a Supabase

Ve al SQL Editor de Supabase:
https://supabase.com/dashboard/project/rsfqdvshhgrjujgpcktf/sql/new

Copia y pega el contenido de:
```
supabase/migrations/20250106000001_initial_schema.sql
```

Click **"Run"** para ejecutar la migración.

Luego, ejecuta también:
```
supabase/seed.sql
```

Esto creará las tablas y configuraciones iniciales.

### 2. Configurar Supabase Auth

1. Ve a **Authentication** → **Providers** en Supabase Dashboard
2. Asegúrate que **Email** esté habilitado
3. En **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (cambiar después del deploy)
   - **Redirect URLs**: Agregar:
     - `http://localhost:3000/auth/callback`
     - `https://*.vercel.app/auth/callback`

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Probar Localmente

```bash
npm run dev
```

Abre http://localhost:3000

⚠️ **NOTA**: La app Next.js aún no tiene las páginas creadas. Solo tiene la configuración base.
La siguiente fase será migrar los componentes de `client/src` a la estructura de Next.js `app/`.

### 5. Deploy a Vercel

#### Conectar el Repositorio

1. Ve a https://vercel.com/new
2. Click **"Import Git Repository"**
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Busca: `uveral/agendapsicovercel`
5. Click **"Import"**

#### Configurar Variables de Entorno en Vercel

En la pantalla de configuración del proyecto, agrega estas variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rsfqdvshhgrjujgpcktf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnFkdnNoaGdyanVqZ3Bja3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjc3MzgsImV4cCI6MjA3NDgwMzczOH0.k4BUCOi2bx2vE-wwRoIf_lV6ygej8i2-3gFiWOPacPc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnFkdnNoaGdyanVqZ3Bja3RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIyNzczOCwiZXhwIjoyMDc0ODAzNzM4fQ.ib5NQQgi_RYIgnjK8GijQ6B6CAvNiueWrZxPkMiLqjU
NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
```

⚠️ **IMPORTANTE**: Reemplaza `tu-proyecto.vercel.app` con tu URL real de Vercel después del primer deploy.

#### Deploy

Click **"Deploy"**

Vercel automáticamente:
- Instalará las dependencias
- Ejecutará `npm run build`
- Desplegará la aplicación

### 6. Actualizar URL en Supabase

Una vez desplegado, obtendrás una URL como: `https://agendapsico-xyz.vercel.app`

1. Copia tu URL de Vercel
2. Ve a Supabase → **Authentication** → **URL Configuration**
3. Actualiza:
   - **Site URL**: Tu URL de Vercel
   - Verifica que `https://tu-url.vercel.app/auth/callback` esté en Redirect URLs
4. En Vercel, actualiza la variable:
   - `NEXT_PUBLIC_APP_URL=https://tu-url.vercel.app`

### 7. Crear Usuario Admin Inicial

Conéctate a tu base de datos y ejecuta en SQL Editor:

```sql
-- Primero, regístrate en la app con tu email
-- Luego, ejecuta esto para hacerte admin (reemplaza con tu user ID):

UPDATE users
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

O puedes insertar directamente:

```sql
-- Opción 2: Crear usuario admin directamente
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@orienta.com',
  crypt('TuPasswordSeguro123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  ''
);

-- Luego actualiza el role a admin
UPDATE users SET role = 'admin' WHERE email = 'admin@orienta.com';
```

## 🔄 Flujo de Trabajo de Desarrollo

### Desarrollo Local

```bash
git pull origin main
npm install
npm run dev
```

### Desplegar Cambios

```bash
git add .
git commit -m "Descripción de cambios"
git push origin main
```

Vercel automáticamente desplegará los cambios.

### Ver Logs

https://vercel.com/dashboard → Tu proyecto → "Deployments" → Click en el deployment → "Logs"

## 🎯 Próximos Pasos

La migración base está completa. Ahora necesitas:

1. **Migrar componentes**: Mover componentes de `client/src/components` a `components/`
2. **Crear páginas Next.js**: Migrar páginas de `client/src/pages` a `app/`
3. **Crear API Routes**: Migrar endpoints de `server/routes.ts` a `app/api/`
4. **Actualizar imports**: Cambiar de Wouter a Next.js routing
5. **Adaptar TanStack Query**: Usar con Next.js App Router

## 🐛 Troubleshooting

### Error: "Database connection failed"
- Verifica que las variables de entorno estén correctas en Vercel
- Confirma que las migraciones se ejecutaron en Supabase

### Error: "Unauthorized"
- Verifica que las políticas RLS estén creadas
- Confirma que el usuario tenga el rol correcto

### Error de Build en Vercel
- Revisa los logs en Vercel Dashboard
- Asegúrate que `package.json` tenga todas las dependencias

## 📚 Recursos

- **Supabase Dashboard**: https://supabase.com/dashboard/project/rsfqdvshhgrjujgpcktf
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
