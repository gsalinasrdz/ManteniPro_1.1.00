# Bootstrap del nuevo repo

Esta carpeta contiene los archivos listos para inicializar `mantenipro-app` con Next.js + TypeScript + Prisma + shadcn/ui.

## Cómo usar

```bash
# 1. Crear el repo nuevo desde GitHub o:
mkdir mantenipro-app && cd mantenipro-app
git init

# 2. Copiar todos estos archivos a la raíz
cp -r /ruta/a/design_handoff_mantenipro/bootstrap/* .
cp -r /ruta/a/design_handoff_mantenipro/bootstrap/.env.example .
# (también copia los archivos ocultos como .env.example)

# 3. Instalar dependencias
pnpm install   # o npm install / yarn

# 4. Inicializar shadcn/ui
npx shadcn@latest init
# Cuando pregunte por config, usa los defaults pero confirma:
#   - Style: New York
#   - Base color: Slate
#   - CSS variables: Yes

# 5. Agregar los componentes que vas a usar de shadcn
npx shadcn@latest add button badge card dialog \
  dropdown-menu input label select table tabs toast \
  tooltip form

# 6. Crear primera migración Prisma
pnpm db:push

# 7. Empezar a desarrollar
pnpm dev
```

## Archivos incluidos

| Archivo | Para qué |
|---|---|
| `package.json` | Dependencias y scripts |
| `tsconfig.json` | TypeScript estricto + paths |
| `tailwind.config.ts` | Tokens de diseño de ManteniPro |
| `prisma/schema.prisma` | Schema inicial de la BD |
| `.env.example` | Variables de entorno |
| `CLAUDE.md` | Instrucciones para Claude Code |
| `README.md` | Setup del repo |

## Siguiente paso

Después de bootstrap, abre Claude Code en la raíz del repo:

```bash
claude
```

Y pídele que empiece la **Fase 1** del plan (`HANDOFF_CLAUDE_CODE.md`).
