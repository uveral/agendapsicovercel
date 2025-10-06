# AgendaPsico - Sistema de Gestión de Citas

Sistema de gestión de horarios y citas para Centro Orienta.

## 🚀 Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Deployment**: Vercel
- **Type Safety**: TypeScript

## 📁 Estructura del Proyecto

```
agendapsico/
├── app/                    # Next.js App Router (páginas y API)
├── components/             # Componentes React reutilizables
├── lib/                    # Utilidades y configuración
│   └── supabase/          # Clientes Supabase
├── types/                  # Definiciones TypeScript
├── supabase/              # Migraciones y seeds
├── scripts/               # Scripts de utilidad
├── public/                # Assets estáticos
└── middleware.ts          # Middleware de autenticación
```

## 🛠️ Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/uveral/agendapsicovercel.git
cd agendapsicovercel
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa con tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configurar base de datos

Ejecuta las migraciones en Supabase SQL Editor:
- `supabase/migrations/20250106000001_initial_schema.sql`
- `supabase/seed.sql`

### 5. Iniciar desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📦 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm start            # Servidor de producción
npm run lint         # Linter
npm run type-check   # Verificación de tipos
```

## 🌐 Despliegue

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones completas de despliegue.

### Despliegue Rápido a Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/uveral/agendapsicovercel)

## 🔐 Autenticación

El sistema utiliza Supabase Auth con 3 roles:

- **Admin**: Acceso completo, gestión de terapeutas y configuración
- **Therapist**: Gestión de sus propias citas y horarios
- **Client**: Visualización de citas y gestión de disponibilidad

## 📊 Funcionalidades

- ✅ Gestión de terapeutas
- ✅ Gestión de clientes
- ✅ Calendario de citas (individual y general)
- ✅ Disponibilidad de clientes
- ✅ Horarios de trabajo de terapeutas
- ✅ Citas recurrentes (semanal, quincenal)
- ✅ Sugerencias inteligentes de horarios
- ✅ Generación de reportes PDF
- ✅ Sistema de permisos por roles
- ✅ Tema claro/oscuro

## 🎨 Diseño

El diseño sigue las guías de Centro Orienta:
- Color principal: Verde Orienta (#B7CD95)
- Sistema de diseño basado en Material Design + Linear
- Ver [design_guidelines.md](./design_guidelines.md) para más detalles

## 📝 Migración desde Replit

Este proyecto fue migrado desde una arquitectura Express + Vite a Next.js + Supabase.

Ver [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) para detalles de la migración.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Añadir nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

## 📄 Licencia

MIT

## 🆘 Soporte

Para issues y preguntas, abre un issue en GitHub.
