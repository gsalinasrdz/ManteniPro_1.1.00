# ManteniPro · Instrucciones para Claude Code

> Este archivo es leído automáticamente por Claude Code al iniciar.
> Mantiene contexto persistente a través de todas las sesiones.

---

## 🎯 Contexto del proyecto

ManteniPro es un sistema de gestión de mantenimiento industrial para cadenas multi-sucursal (cliente piloto: **Sabor Express**, cadena de pizzas y hamburguesas con 7+ sucursales en México).

Este repo es la **migración a producción** del prototipo HTML que está en `../design_handoff_mantenipro/`. Los archivos `.jsx` ahí son **referencias de diseño**, no código para copiar literalmente. El objetivo es **recrear esas vistas** en un stack moderno con datos reales.

---

## 🛠 Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Lenguaje:** TypeScript estricto (`"strict": true`)
- **UI:** shadcn/ui + Tailwind CSS
- **Componentes base:** Radix primitives (vía shadcn)
- **Iconos:** lucide-react
- **Tablas:** TanStack Table v8
- **Forms:** React Hook Form + Zod
- **Server state:** TanStack Query v5
- **UI state global:** Zustand
- **DB:** PostgreSQL + Prisma 6
- **Auth:** Auth.js v5 (NextAuth beta)
- **Deploy:** Vercel
- **Storage:** UploadThing (fotos de OTs)

---

## 📐 Convenciones

### Arquitectura
- **Server Components por defecto.** `"use client"` solo cuando se necesite estado, efectos o eventos del browser.
- **Server Actions para mutaciones** (no API routes, salvo webhooks externos).
- **Validación con Zod** en server actions; schemas en `lib/schemas/`.
- **Imports absolutos con `@/`** (configurado en `tsconfig.json`).

### Naming
- Archivos: kebab-case (`work-orders-table.tsx`, `new-order-modal.tsx`)
- Componentes: PascalCase (`WorkOrdersTable`)
- Hooks: camelCase con prefijo `use` (`useGlobalFilters`)
- Server actions: camelCase con verbo (`createWorkOrder`, `closeIncident`)

### Estructura de carpetas
```
app/
  (dashboard)/             # Rutas autenticadas
    layout.tsx             # Sidebar + topbar
    page.tsx               # Dashboard home
    incidencias/page.tsx
    ordenes/page.tsx
    preventivos/page.tsx
    equipos/page.tsx
    inventario/page.tsx
    calendario/page.tsx
    historial/page.tsx
    plan/page.tsx
    extras/page.tsx
    configuracion/page.tsx
  (auth)/
    login/page.tsx
  api/
    auth/[...nextauth]/route.ts
components/
  ui/                      # shadcn primitives
  atoms/                   # Badge, KPI, LocationBadge, etc.
  layout/                  # Sidebar, Topbar
  views/                   # Componentes específicos de cada vista
  modals/                  # Modales (NewOrder, ReportIncident, etc.)
lib/
  db.ts                    # Prisma client
  auth.ts                  # Auth.js config
  schemas/                 # Zod schemas
  actions/                 # Server actions
  stores/                  # Zustand stores
  utils/                   # Helpers
prisma/
  schema.prisma
  seed.ts
```

---

## 🎨 Tokens de diseño (Tailwind)

Definidos en `tailwind.config.ts` — usar siempre estos nombres, nunca hex literales:

```
bg-primary, bg-secondary, bg-tertiary
text-primary, text-secondary, text-tertiary
brand-blue, brand-blue-light, brand-blue-pale
status-ok, status-warn, status-danger, status-info
```

Equivalencias:
- `brand-blue` = `#185FA5` (color de marca)
- `status-ok` = `#3B6D11` / bg `#EAF3DE`
- `status-warn` = `#854F0B` / bg `#FAEEDA`
- `status-danger` = `#A32D2D` / bg `#FCEBEB`

Ver `design_handoff_mantenipro/DESIGN_TOKENS.md` para detalles completos.

---

## 🏢 Patrón multi-sucursal (CRÍTICO)

**Toda vista operativa** (Incidencias, Órdenes, Preventivos, Equipos, Dashboard) debe seguir este patrón:

1. **Store global de filtros** (`useGlobalFilters` en `lib/stores/filters.ts`):
   ```ts
   { sucursalId: string | null, setSucursalId, ... }
   ```

2. **Selector arriba** de cada vista:
   - Chips o dropdown con todas las sucursales del usuario actual
   - Estado de salud por sucursal: verde (sano), ámbar (atención), rojo (crítico)

3. **Card de desglose por sucursal** clickeable arriba de la lista principal.

4. **`<LocationBadge>`** en cada fila/tarjeta con icono de pin azul + nombre corto de sucursal.

5. **Contador "X de Y"** en la toolbar.

6. **Modales de creación** con flujo 2 pasos: paso 1 sucursal → paso 2 detalle (equipo filtrado por sucursal).

7. **Permisos por rol:**
   - `gerente_operaciones`: ve todas las sucursales
   - `gerente_sucursal`: forzado a su sucursal (filtro deshabilitado)
   - `tecnico`: ve OTs asignadas en cualquier sucursal
   - `cocinero`: solo puede reportar incidencias en su sucursal

---

## 🔐 Roles

```ts
enum Rol {
  GERENTE_OPERACIONES  // ve todo, todas las sucursales
  GERENTE_SUCURSAL     // ve solo su sucursal
  TECNICO              // ve OTs asignadas
  COCINERO             // reporta incidencias (futuro app móvil)
}
```

Middleware en `middleware.ts` redirige a `/login` si no autenticado.
Layout `(dashboard)/layout.tsx` valida sesión vía `auth()` de NextAuth.

---

## ✅ Antes de hacer cambios

1. **Lee el archivo `.jsx` correspondiente** en `design_handoff_mantenipro/source/` para entender el diseño objetivo.
2. **Respeta los tokens de diseño** — no inventes colores ni spacings.
3. **No agregues campos al schema** sin pedirlos primero (data drift).
4. **Tests:** acompaña features con tests E2E para flujos críticos (login, crear OT, reportar incidencia).

---

## 🧪 Comandos

```bash
pnpm dev                 # Dev server
pnpm build               # Production build
pnpm lint                # ESLint
pnpm typecheck           # tsc --noEmit
pnpm format              # Prettier

pnpm db:push             # Sync schema (dev rápido)
pnpm db:migrate          # Crear migración
pnpm db:seed             # Cargar datos demo
pnpm db:studio           # Prisma Studio (GUI)

pnpm test                # Unit tests (Vitest)
pnpm test:e2e            # E2E tests (Playwright)
```

---

## 🚧 Estado actual

Ver `design_handoff_mantenipro/HANDOFF_CLAUDE_CODE.md` para el plan de fases.

**Fase actual:** _llenar conforme avance_
