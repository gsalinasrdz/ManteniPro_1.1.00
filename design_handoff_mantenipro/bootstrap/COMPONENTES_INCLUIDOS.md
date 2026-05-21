# Componentes y archivos TSX listos

Esta carpeta contiene el **bootstrap completo** del nuevo repo `mantenipro-app`. Solo copia el contenido a la raíz del repo y corre `pnpm install`.

## 📁 Estructura entregada

```
bootstrap/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── middleware.ts                       # Auth.js middleware
├── README.md
├── INSTRUCCIONES.md
├── CLAUDE.md                           # Instrucciones para Claude Code
│
├── app/
│   ├── layout.tsx                      # Root layout
│   ├── globals.css                     # Estilos base + .mp-table
│   └── (dashboard)/
│       └── layout.tsx                  # Layout con sidebar + topbar (auth gate)
│
├── components/
│   ├── atoms/
│   │   ├── badge.tsx                   # <Badge> con 6 tonos
│   │   ├── kpi.tsx                     # <KPI> con accent bar
│   │   ├── location-badge.tsx          # <LocationBadge> azul para sucursal
│   │   └── suc-chip.tsx                # <SucChip> con dot de salud
│   └── layout/
│       ├── sidebar.tsx                 # Sidebar completo con NAV
│       └── topbar.tsx                  # Topbar con search/bell/nueva OT
│
├── lib/
│   ├── db.ts                           # Prisma client singleton
│   ├── auth.ts                         # Auth.js config con JWT + roles
│   ├── utils.ts                        # cn(), fmtMoney, fmtDate, daysUntil
│   └── stores/
│       └── filters.ts                  # Zustand con sucursalId persistido
│
├── prisma/
│   ├── schema.prisma                   # Schema completo con enums
│   └── seed.ts                         # Seed con datos de Sabor Express
│
└── types/
    └── next-auth.d.ts                  # Tipos extendidos de Session
```

## ✅ Lo que ya está listo para usar

- **Sidebar** con las 5 secciones y orden correcto (Operación = Incidencias → Órdenes → Preventivos)
- **Topbar** con título dinámico y botón "Nueva OT"
- **Auth gate** en `(dashboard)/layout.tsx` con redirección a `/login`
- **Middleware** de protección de rutas
- **Schema Prisma** con todas las entidades + relaciones + enums
- **Store de filtros globales** con persistencia en localStorage
- **Átomos UI** (Badge, KPI, LocationBadge, SucChip) con clases Tailwind reales
- **Helpers** (`cn`, `fmtMoney`, `fmtDate`, `daysUntil`, `shortenSucursal`)
- **Seed** con estructura completa (extender con todos los datos de `mp-data.jsx`)

## 🚧 Lo que falta implementar (con Claude Code)

Ver `HANDOFF_CLAUDE_CODE.md` para el plan completo. Resumen:

1. Páginas de cada vista (Dashboard, Equipos, OTs, Incidencias, etc.)
2. Componente `<SucursalBreakdown>` reutilizable (card de desglose)
3. Modales (`NewOrderModal`, `ReportIncidentModal`) con flujo 2 pasos
4. Server actions de mutación (create/update/close)
5. Auth real con bcrypt + login page
6. Página de login

## 🚀 Para empezar

```bash
# 1. Crear repo nuevo
mkdir mantenipro-app && cd mantenipro-app
git init

# 2. Copiar bootstrap a la raíz
cp -r /ruta/design_handoff_mantenipro/bootstrap/. .

# 3. Instalar
pnpm install

# 4. shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog input label select \
  table tabs form badge dropdown-menu toast tooltip

# 5. Postgres + Prisma
docker run -d --name mantenipro-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mantenipro \
  -p 5432:5432 postgres:16

cp .env.example .env.local
# Edita DATABASE_URL si es necesario

pnpm db:push
pnpm db:seed

# 6. Dev
pnpm dev

# 7. Claude Code
claude
# → "Lee CLAUDE.md y empieza la Fase 3 implementando la vista de Equipos
#    basándote en design_handoff_mantenipro/source/mp-views-1.jsx"
```
