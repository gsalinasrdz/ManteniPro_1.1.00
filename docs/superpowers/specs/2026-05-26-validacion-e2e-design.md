# Diseño: Suite de Validación E2E — ManteniPro

**Fecha:** 2026-05-26  
**Autor:** Jesus Guillermo Salinas Rodriguez  
**Estado:** Aprobado

---

## Contexto

ManteniPro es un sistema de gestión de mantenimiento industrial multi-sucursal (cliente piloto: Sabor Express). Tiene 9 módulos activos con DB real en producción. No existe cobertura de pruebas automatizadas. Este spec define la primera suite E2E con Playwright.

---

## Decisiones de diseño

| Dimensión | Decisión | Razón |
|---|---|---|
| Framework | Playwright | Ya en las dependencias del proyecto (`pnpm test:e2e`) |
| Organización | Por flujo de negocio | Los flujos cruzados (incidencia→OT) quedan en un solo archivo legible |
| Entorno | Producción (`mantenipro-fawn.vercel.app`) | Validación real contra DB activa |
| Datos de prueba | Prefijo `[TEST]` en nombres/SKUs | Identificación y limpieza manual posterior |
| Paralelismo | Deshabilitado | Evita colisiones en DB compartida |
| Browser | Chromium únicamente | Suficiente para validación funcional |
| Usuario de prueba | `gsalinasrdz@gmail.com` (GERENTE_OPERACIONES) | Ve todos los módulos y sucursales |

---

## Estructura de archivos

```
e2e/
├── auth.spec.ts                  # Autenticación
├── smoke-all-modules.spec.ts     # Carga sin errores de los 9 módulos
├── flujo-incidencia-ot.spec.ts   # Flujo completo: incidencia → OT → cierre → equipo
├── inventario-crud.spec.ts       # CRUD completo de refacciones con ajuste de stock
├── inventario-xml.spec.ts        # Importación XML CFDI
└── fixtures/
    ├── test-cfdi.xml             # CFDI 4.0 mínimo válido para pruebas
    └── users.ts                  # Credenciales exportadas por constante
```

**Playwright config** (`playwright.config.ts`):
- `baseURL`: `https://mantenipro-fawn.vercel.app`
- `workers: 1` — sin paralelismo
- `storageState`: sesión persistida en `e2e/.auth/session.json` (generada en `global-setup.ts`)
- Timeout por test: 30 s

---

## Specs

### `auth.spec.ts`

| # | Caso | Acción | Resultado esperado |
|---|---|---|---|
| 1 | Login válido | Credenciales correctas en `/login` | Redirige a `/`, sidebar visible |
| 2 | Login inválido | Password incorrecto | Mensaje de error en pantalla, permanece en `/login` |
| 3 | Acceso sin sesión | Navegar a `/incidencias` sin cookie | Redirige a `/login` |

---

### `smoke-all-modules.spec.ts`

`beforeAll` hace login y guarda sesión. Por cada ruta, verifica:
- HTTP status no es 500
- No hay texto "Something went wrong" ni "Error" en pantalla
- Al menos un elemento visible del módulo (heading o tabla)

Rutas: `/ /incidencias /ordenes /preventivos /equipos /inventario /calendario /alertas /historial`

---

### `flujo-incidencia-ot.spec.ts`

Flujo completo que valida la sincronización de estado entre módulos:

1. `/incidencias` → modal "Reportar incidencia"
2. Llenar: título `[TEST] Falla bomba agua`, equipo existente, sucursal → guardar
3. Verificar fila con estado badge `EVALUACION` en tabla
4. Abrir drawer → botón "Generar OT" → confirmar
5. Navegar a `/ordenes` → verificar OT con título `[TEST] Falla bomba agua` existe
6. Abrir drawer OT → cambiar estado a `CERRADA` → confirmar
7. Navegar a `/equipos` → buscar el equipo usado → verificar estado `OPERATIVO`

**Limpieza:** Los registros `[TEST]` creados quedan en DB; eliminar manualmente desde la UI o Prisma Studio.

---

### `inventario-crud.spec.ts`

Flujo completo de vida de una refacción:

1. `/inventario` → "Nueva refacción"
2. SKU: `TEST-001`, Nombre: `[TEST] Filtro aceite`, Categoría: `Pruebas`, Costo: `50`, Mín: `5`, Reorden: `10`, Máx: `20`, Stock inicial: `15` → Crear
3. Verificar fila en tabla con badge `OK` y stock `15`
4. Click fila → drawer → "Entrada" `+5` → verificar stock `20`
5. Click editar → nombre `[TEST] Filtro aceite EDIT` → guardar → verificar nombre actualizado en tabla
6. Drawer → "Salida" `20` → stock llega a `0`
7. Botón "Eliminar" aparece activo → confirmar → verificar que `TEST-001` desaparece de tabla

---

### `inventario-xml.spec.ts`

1. `/inventario` → "Importar XML"
2. Subir `fixtures/test-cfdi.xml` (CFDI 4.0 con 2 conceptos)
3. Verificar que step preview muestra 2 líneas parseadas con UUID y proveedor
4. Cambiar acción de línea 2 a `omitir`
5. Click "Aplicar importación" → toast con "1 actualizada / creada, 1 omitida"
6. Verificar que el inventario refleja el cambio de la línea 1

---

## Fixture: `test-cfdi.xml`

CFDI 4.0 mínimo con:
- 2 `Concepto` con `NoIdentificacion`, `Descripcion`, `Cantidad`, `ValorUnitario`
- `NoIdentificacion` de concepto 1 coincide con un SKU existente en inventario (a definir en implementación)
- Concepto 2 con SKU inexistente → se ofrece como "crear"

---

## Convención `[TEST]`

```typescript
// e2e/fixtures/users.ts
export const TEST_USER = {
  email: 'gsalinasrdz@gmail.com',
  password: 'Mome2026++',
};

export function isTestRecord(text: string) {
  return text.startsWith('[TEST]') || text.startsWith('TEST-');
}
```

Los tests NO limpian automáticamente. Al terminar una sesión de validación, limpiar con:
```
npx prisma studio  # filtrar por nombre LIKE '[TEST]%'
```

---

## Criterios de éxito

- Todos los specs pasan en una sola ejecución contra producción
- Ningún test deja el sistema en estado inconsistente (equipo en FALLA sin incidencia activa, stock negativo, etc.)
- Tiempo total de suite < 3 minutos

---

## Fuera de alcance (v1)

- Pruebas de permisos por rol (GERENTE_SUCURSAL, TECNICO, TRABAJADOR)
- Pruebas de carga / rendimiento
- Módulos placeholder (Plan, Extras, Configuración)
- CI/CD trigger automático en cada push
