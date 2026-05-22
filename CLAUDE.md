# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto del proyecto

ManteniPro es un sistema de gestión de mantenimiento industrial para cadenas multi-sucursal (cliente piloto: **Sabor Express**, cadena de pizzas y hamburguesas con 7+ sucursales en México).

Este repo es la **migración a producción** del prototipo. Los archivos de referencia de diseño están en `design_handoff_mantenipro/bootstrap/` — contienen los componentes base (atoms, layout, sidebar) ya copiados al repo. No hay archivos `.jsx` de fuente; el diseño objetivo se deriva de esos componentes ya integrados.

---

## Stack

- **Framework:** Next.js 15 (App Router, React 19, Turbopack en dev)
- **Lenguaje:** TypeScript estricto (`"strict": true`)
- **UI:** shadcn/ui + Tailwind CSS (sin dark mode; tokens semánticos propios)
- **Iconos:** lucide-react
- **Tablas:** TanStack Table v8 (disponible, aún no usado)
- **Forms:** React Hook Form + Zod
- **Server state:** TanStack Query v5 (disponible, aún no usado)
- **UI state global:** Zustand v5
- **DB:** PostgreSQL + Prisma 6 (con `DATABASE_URL` + `DIRECT_URL` para pooler)
- **Auth:** Auth.js v5 / next-auth beta — JWT strategy, Credentials provider
- **Deploy:** Vercel
- **Storage:** UploadThing (fotos de OTs — aún no implementado)

---

## Comandos

```bash
pnpm dev          # Dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm format       # Prettier (con prettier-plugin-tailwindcss)

pnpm db:push      # Sync schema sin migración (dev rápido)
pnpm db:migrate   # Crear migración formal
pnpm db:seed      # Cargar datos demo (tsx prisma/seed.ts)
pnpm db:studio    # Prisma Studio GUI

pnpm test         # Unit tests (Vitest)
pnpm test:e2e     # E2E (Playwright)
```

Para correr un solo test de Vitest: `pnpm test -- path/to/test.ts`

---

## Arquitectura

### Flujo de datos por página

Cada ruta operativa sigue el mismo patrón Server → Client:

```
app/(dashboard)/[ruta]/page.tsx   ← Server Component
  auth() → obtiene session.user.{rol, empresaId, sucursalId}
  db.* → queries Prisma escopadas a empresaId
  → pasa datos como props a <VistaClient />

components/views/[ruta]/[ruta]-client.tsx   ← Client Component ("use client")
  useGlobalFilters() → lee/escribe sucursalId en Zustand (persiste en localStorage)
  useMemo → filtra datos en cliente según sucursal, búsqueda, toggles
  → renderiza tabla + selector de sucursales
```

El **Dashboard** (`app/(dashboard)/page.tsx`) usa queries DB reales. Las demás vistas operativas usan **datos mock** mientras se resuelve la conectividad DB (ver nota abajo).

### Nota sobre datos mock

`incidencias/page.tsx` (y las siguientes vistas que se construyan) inyectan arrays `MOCK_*` en lugar de queries a DB. Cuando la DB esté disponible, reemplazar por queries Prisma siguiendo el patrón del Dashboard.

### Auth y sesión

- `lib/auth.ts`: NextAuth config. El JWT callback enriquece el token con `rol`, `sucursalId`, `empresaId`, `iniciales`.
- `types/next-auth.d.ts`: Augmenta `Session` y `JWT` con esos campos — **siempre leer este archivo antes de acceder a `session.user.*`**.
- `middleware.ts`: Redirige a `/login` si no autenticado. Rutas públicas: `/login`, `/api/auth`.
- El layout `(dashboard)/layout.tsx` hace `auth()` server-side y redirige si no hay sesión.

### Password en dev

`lib/auth.ts` tiene un TODO: la validación de password con bcrypt **no está implementada** — cualquier usuario existente en DB puede autenticarse sin contraseña.

---

## Convenciones

### Componentes
- **Server Components por defecto.** `"use client"` solo para estado/efectos/eventos.
- **Server Actions para mutaciones** — no API routes salvo webhooks externos.
- Archivos: kebab-case. Componentes: PascalCase. Hooks: `use`-prefix. Actions: verbo (`createWorkOrder`).
- Imports absolutos con `@/`.

### Tokens de diseño (Tailwind)

Definidos en `tailwind.config.ts`. Usar siempre estos nombres, nunca hex literales:

| Token | Valor |
|---|---|
| `brand-blue` | `#185FA5` |
| `brand-blue-light` | fondo hover azul pálido |
| `status-ok` / `status-ok-bg` | texto verde / fondo verde |
| `status-warn` / `status-warn-bg` | texto ámbar / fondo ámbar |
| `status-danger` / `status-danger-bg` | texto rojo / fondo rojo |
| `bg-primary/secondary/tertiary` | jerarquía de fondos |
| `text-primary/secondary/tertiary` | jerarquía de texto |
| `border-border` | borde estándar |

### Átomos disponibles

- `<Badge tone="ok|warn|danger|info|gray" dot?>` — etiqueta de estado con punto opcional
- `<KpiCard label value icon variant>` — tarjeta de métrica para dashboard
- `<LocationBadge sucursal>` — pin azul + nombre corto de sucursal
- `<SucChip active salud onClick>` — chip de selección de sucursal con color de salud

`shortenSucursal(nombre)` en `lib/utils.ts` extrae el nombre corto (ej: "Sabor Express Tlalpan" → "Tlalpan").

---

## Patrón multi-sucursal (CRÍTICO)

**Toda vista operativa** (Incidencias, Órdenes, Preventivos, Equipos) debe seguir este patrón:

1. **Store global** `useGlobalFilters` en `lib/stores/filters.ts` — `{ sucursalId, setSucursalId, reset }` — persiste en `localStorage`.
2. **Chips de sucursal** arriba de la vista con dot de salud (verde/ámbar/rojo).
3. **Grid de desglose** clickeable (visible solo cuando `sucursalId === null`).
4. **`<LocationBadge>`** en cada fila.
5. **Contador "X de Y"** en la toolbar.
6. **Modales de creación**: paso 1 seleccionar sucursal → paso 2 detalle con equipo filtrado.
7. **Permisos**: `GERENTE_OPERACIONES` ve todo; `GERENTE_SUCURSAL` forzado a su sucursal (`puedeFiltraSucursal: false`); `TECNICO` ve OTs asignadas; `COCINERO` solo reporta.

---

## Schema Prisma (resumen)

Entidades principales: `Empresa → Sucursal → Equipo → OrdenTrabajo / Incidencia / Preventivo`

Roles: `GERENTE_OPERACIONES | GERENTE_SUCURSAL | TECNICO | COCINERO`

Estados OT: `PROGRAMADA | ASIGNADA | EN_PROCESO | CERRADA | CANCELADA`  
Estados Incidencia: `EVALUACION | EN_ATENCION | CERRADA | DESCARTADA`  
Estados PM: `PROGRAMADO | PROXIMO | VENCIDO | COMPLETADO`

Toda query Prisma a datos operativos debe escoparse por `empresaId` (disponible en `session.user.empresaId`).

No agregar campos al schema sin pedirlo primero.

---

## Estado actual de las vistas

| Vista | Estado |
|---|---|
| Dashboard (`/`) | ✅ DB real — KPIs + cards por sucursal |
| Incidencias (`/incidencias`) | ✅ DB real — tabla + filtros + drawer + modal Reportar + Server Actions |
| Órdenes (`/ordenes`) | ✅ DB real — tabla + filtros + OtDrawer + NuevaOTModal + Server Actions |
| Preventivos (`/preventivos`) | ✅ DB real — tabla + filtros + chips |
| Equipos (`/equipos`) | ✅ DB real — catálogo + filtros + chips |
| Inventario (`/inventario`) | ✅ DB real — KPIs + chips + barra de stock |
| Calendario (`/calendario`) | ✅ DB real — ordenes.programada + preventivos.prox |
| Alertas (`/alertas`) | ✅ DB real — derivadas en tiempo real (5 fuentes) |
| Historial (`/historial`) | ✅ DB real — derivado de OTs + incidencias + PMs (90 días) |
| Plan / Extras / Configuración | 🚧 Placeholder intencional |
