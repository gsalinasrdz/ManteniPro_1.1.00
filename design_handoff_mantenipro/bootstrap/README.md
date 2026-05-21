# ManteniPro App

Implementación de producción del prototipo ManteniPro.

## Setup

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar Postgres local (Docker)
docker run -d --name mantenipro-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mantenipro \
  -p 5432:5432 \
  postgres:16

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus valores

# 4. Migrar schema y cargar seed
pnpm db:push
pnpm db:seed

# 5. Dev server
pnpm dev
# → http://localhost:3000
```

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto
- Tailwind + shadcn/ui
- Prisma + PostgreSQL
- Auth.js v5
- TanStack Table + TanStack Query
- React Hook Form + Zod

## Estructura

Ver `CLAUDE.md` para detalles arquitectónicos y convenciones.

## Referencia de diseño

El prototipo HTML está en `../design_handoff_mantenipro/`. Léelo antes de implementar cualquier vista.
