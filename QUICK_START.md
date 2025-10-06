# 🚀 Inicio Rápido - AgendaPsico

## ✅ Estado Actual

La configuración base de Next.js + Supabase está completa:

- ✅ Configuración de Next.js 15
- ✅ Variables de entorno configuradas
- ✅ Schema SQL creado en `supabase/migrations/`
- ✅ Clientes Supabase (client/server) configurados
- ✅ Middleware de autenticación creado
- ✅ TypeScript types generados
- ✅ Configuración de Vercel lista

## 🎯 Próximos Pasos

### 1. Aplicar el Schema a Supabase (5 minutos)

Ve al SQL Editor de Supabase:
👉 https://supabase.com/dashboard/project/rsfqdvshhgrjujgpcktf/sql/new

Copia y pega el contenido de este archivo:
```
supabase/migrations/20250106000001_initial_schema.sql
```

Click **"RUN"** para crear todas las tablas.

Luego ejecuta también:
```
supabase/seed.sql
```

### 2. Configurar Redirect URLs en Supabase (2 minutos)

Ve a: https://supabase.com/dashboard/project/rsfqdvshhgrjujgpcktf/auth/url-configuration

Agrega estos Redirect URLs:
```
http://localhost:3000/auth/callback
https://*.vercel.app/auth/callback
```

### 3. Preparar el Repositorio Git (5 minutos)

```bash
# En tu terminal (Windows)
cd C:\Users\Admin\Orienta\AgendaPsico

# Inicializar git si no está iniciado
git init

# Agregar el remote (tu repo de GitHub)
git remote add origin https://github.com/uveral/agendapsicovercel.git

# Hacer commit de la configuración base
git add .
git commit -m "Initial Next.js + Supabase setup"

# Push al repo
git push -u origin main
```

⚠️ **NOTA**: Si el repo ya tiene contenido, puede que necesites:
```bash
git pull origin main --allow-unrelated-histories
```

### 4. Desplegar en Vercel (5 minutos)

Ve a: https://vercel.com/new

1. Click **"Import Git Repository"**
2. Selecciona: `uveral/agendapsicovercel`
3. En "Environment Variables", agrega:

```
NEXT_PUBLIC_SUPABASE_URL=https://rsfqdvshhgrjujgpcktf.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnFkdnNoaGdyanVqZ3Bja3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjc3MzgsImV4cCI6MjA3NDgwMzczOH0.k4BUCOi2bx2vE-wwRoIf_lV6ygej8i2-3gFiWOPacPc

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnFkdnNoaGdyanVqZ3Bja3RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIyNzczOCwiZXhwIjoyMDc0ODAzNzM4fQ.ib5NQQgi_RYIgnjK8GijQ6B6CAvNiueWrZxPkMiLqjU

NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
```

4. Click **"Deploy"**

⚠️ **El primer deploy fallará** porque aún no tenemos la estructura `app/`. Esto es normal.

### 5. Siguiente Fase: Migrar el Código (pendiente)

Ahora necesitas decidir cómo quieres proceder:

**Opción A: Migración Completa Automática (Recomendada)**
- Creo toda la estructura `app/` con tus páginas y componentes
- Migro todos los API routes
- Adapto los componentes a Next.js

**Opción B: Migración Manual Guiada**
- Te guío paso a paso para migrar cada parte
- Tú decides qué migrar primero

**Opción C: Híbrida**
- Creo la estructura base de páginas
- Tú migras los componentes específicos

## 📋 Checklist de Verificación

Antes de continuar, asegúrate:

- [ ] El schema SQL se ejecutó correctamente en Supabase
- [ ] Las redirect URLs están configuradas en Supabase Auth
- [ ] El código está pusheado a GitHub
- [ ] Vercel está conectado al repositorio (aunque falle el build)

## 🤔 ¿Qué Opción Eliges?

Dime cuál opción prefieres (A, B, o C) y empiezo la siguiente fase.

Si eliges **Opción A**, tardará ~10-15 minutos en crear toda la estructura.

## 📚 Documentación Disponible

- **DEPLOY.md**: Guía completa de despliegue
- **MIGRATION_GUIDE.md**: Detalles técnicos de la migración
- **CLAUDE.md**: Guía para futuros desarrollos
- **design_guidelines.md**: Especificaciones de diseño

## ⚡ Prueba Rápida Local

Si quieres probar localmente antes de desplegar:

```bash
npm install
npm run dev
```

Verás una pantalla vacía en http://localhost:3000 (normal, aún no hay páginas).

---

**¿Listo para continuar?** Dime qué opción eliges y continúo con la migración del código.
