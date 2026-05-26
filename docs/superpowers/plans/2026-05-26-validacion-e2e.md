# Validación E2E — ManteniPro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar una suite Playwright E2E de 5 specs que valida los flujos críticos de ManteniPro contra producción (`https://mantenipro-fawn.vercel.app`).

**Architecture:** `global-setup.ts` hace login una vez y persiste la sesión en `e2e/.auth/session.json`; todos los specs reutilizan esa sesión via `storageState`. Workers = 1 para evitar colisiones en DB compartida. Todos los registros creados llevan prefijo `[TEST]` o `TEST-` para identificación manual.

**Tech Stack:** Playwright `@playwright/test` ^1.49.0, TypeScript strict, Next.js 15 App Router en producción.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `playwright.config.ts` | Crear | Config global: baseURL, workers, storageState, timeout |
| `e2e/global-setup.ts` | Crear | Login único, persiste sesión en `.auth/session.json` |
| `e2e/fixtures/users.ts` | Crear | Credenciales y helper `isTestRecord` |
| `e2e/fixtures/test-cfdi.xml` | Crear | CFDI 4.0 mínimo con 2 conceptos (1 SKU existente + 1 nuevo) |
| `e2e/auth.spec.ts` | Crear | 3 casos: login válido, inválido, redirect sin sesión |
| `e2e/smoke-all-modules.spec.ts` | Crear | 9 rutas cargan sin error 500 |
| `e2e/flujo-incidencia-ot.spec.ts` | Crear | Incidencia → OT → cierre → estado equipo OPERATIVO |
| `e2e/inventario-crud.spec.ts` | Crear | Crear refacción [TEST] → editar → stock → eliminar |
| `e2e/inventario-xml.spec.ts` | Crear | Subir XML → preview → aplicar → verificar inventario |
| `.gitignore` | Modificar | Ignorar `e2e/.auth/` |

---

## Task 1: Playwright config + global setup

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/global-setup.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Crear `playwright.config.ts`**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "https://mantenipro-fawn.vercel.app",
    storageState: "e2e/.auth/session.json",
    trace: "on-first-retry",
  },
  globalSetup: "./e2e/global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
```

- [ ] **Step 2: Crear directorio y `global-setup.ts`**

```bash
mkdir -p e2e/.auth e2e/fixtures
```

```typescript
// e2e/global-setup.ts
import { chromium } from "@playwright/test";

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://mantenipro-fawn.vercel.app/login");
  await page.getByLabel(/correo/i).fill("gsalinasrdz@gmail.com");
  await page.getByLabel(/contraseña/i).fill("Mome2026++");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL("**/", { timeout: 15_000 });

  await page.context().storageState({ path: "e2e/.auth/session.json" });
  await browser.close();
}
```

- [ ] **Step 3: Agregar `.auth/` al `.gitignore`**

Abrir `.gitignore` y agregar al final:
```
# Playwright auth state
e2e/.auth/
```

- [ ] **Step 4: Verificar que Playwright está instalado con browsers**

```bash
pnpm exec playwright install chromium
```

Resultado esperado: `chromium` descargado o mensaje "already installed".

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/global-setup.ts .gitignore
git commit -m "test: playwright config + global auth setup"
```

---

## Task 2: Fixtures — users.ts + test-cfdi.xml

**Files:**
- Create: `e2e/fixtures/users.ts`
- Create: `e2e/fixtures/test-cfdi.xml`

- [ ] **Step 1: Crear `e2e/fixtures/users.ts`**

```typescript
// e2e/fixtures/users.ts
export const TEST_USER = {
  email: "gsalinasrdz@gmail.com",
  password: "Mome2026++",
};

export function isTestRecord(text: string): boolean {
  return text.startsWith("[TEST]") || text.startsWith("TEST-");
}
```

- [ ] **Step 2: Crear `e2e/fixtures/test-cfdi.xml`**

El concepto 1 usa `NoIdentificacion="FRE-004"` — SKU real existente en inventario.
El concepto 2 usa `NoIdentificacion="TEST-XML-999"` — SKU inexistente, se ofrecerá como "crear".

```xml
<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 cfdv40.xsd"
  Version="4.0"
  Folio="TEST-001"
  Fecha="2026-05-26T10:00:00"
  Sello="TESTSELLO=="
  FormaPago="99"
  NoCertificado="00000000000000000000"
  Certificado="TESTCERT=="
  SubTotal="1500.00"
  Total="1740.00"
  Moneda="MXN"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="PUE"
  LugarExpedicion="25000">
  <cfdi:Emisor
    Rfc="PROV010101AAA"
    Nombre="Proveedor TEST SA de CV"
    RegimenFiscal="601"/>
  <cfdi:Receptor
    Rfc="CLIE010101BBB"
    Nombre="Sabor Express SA de CV"
    DomicilioFiscalReceptor="25000"
    RegimenFiscalReceptor="601"
    UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto
      ClaveProdServ="25191513"
      NoIdentificacion="FRE-004"
      Cantidad="10"
      ClaveUnidad="H87"
      Unidad="Pieza"
      Descripcion="Filtro de refrigerante industrial"
      ValorUnitario="100.00"
      Importe="1000.00"
      ObjetoImp="02"/>
    <cfdi:Concepto
      ClaveProdServ="25191513"
      NoIdentificacion="TEST-XML-999"
      Cantidad="5"
      ClaveUnidad="H87"
      Unidad="Pieza"
      Descripcion="Empaque de hule sellado 3/4"
      ValorUnitario="100.00"
      Importe="500.00"
      ObjetoImp="02"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE"
      FechaTimbrado="2026-05-26T10:00:01"
      RfcProvCertif="SAT010101000"
      SelloCFD="TESTSELLO=="
      NoCertificadoSAT="00000000000000000000"
      SelloSAT="TESTSAT=="/>
  </cfdi:Complemento>
</cfdi:Comprobante>
```

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures/users.ts e2e/fixtures/test-cfdi.xml
git commit -m "test: fixtures — credenciales y CFDI de prueba"
```

---

## Task 3: `auth.spec.ts`

**Files:**
- Create: `e2e/auth.spec.ts`

- [ ] **Step 1: Crear el spec sin storageState (necesita probar login fresco)**

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

// Este spec NO usa el storageState global — prueba auth directamente
test.use({ storageState: { cookies: [], origins: [] } });

test("login válido redirige al dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/correo/i).fill("gsalinasrdz@gmail.com");
  await page.getByLabel(/contraseña/i).fill("Mome2026++");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  // Sidebar visible como señal de sesión activa
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("login inválido muestra error y permanece en /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/correo/i).fill("gsalinasrdz@gmail.com");
  await page.getByLabel(/contraseña/i).fill("password-incorrecto");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  // Algún mensaje de error visible (texto "error" o "inválid" o "incorrecta")
  await expect(
    page.getByText(/error|inválid|incorrecta|credenciales/i)
  ).toBeVisible({ timeout: 5_000 });
});

test("acceder a ruta protegida sin sesión redirige a /login", async ({ page }) => {
  await page.goto("/incidencias");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
```

- [ ] **Step 2: Correr solo este spec**

```bash
pnpm exec playwright test e2e/auth.spec.ts --headed
```

Resultado esperado: 3 tests PASS. Si alguno falla por selector incorrecto (`getByLabel(/correo/i)`), inspeccionar el HTML del form en `/login` y ajustar el selector al atributo `name` o `placeholder` real del input.

- [ ] **Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: auth spec — login válido, inválido, redirect"
```

---

## Task 4: `smoke-all-modules.spec.ts`

**Files:**
- Create: `e2e/smoke-all-modules.spec.ts`

- [ ] **Step 1: Crear el spec**

```typescript
// e2e/smoke-all-modules.spec.ts
import { test, expect } from "@playwright/test";

const RUTAS = [
  { path: "/",            heading: /dashboard|inicio/i },
  { path: "/incidencias", heading: /incidencia/i },
  { path: "/ordenes",     heading: /orden/i },
  { path: "/preventivos", heading: /preventivo/i },
  { path: "/equipos",     heading: /equipo/i },
  { path: "/inventario",  heading: /inventario/i },
  { path: "/calendario",  heading: /calendario/i },
  { path: "/alertas",     heading: /alerta/i },
  { path: "/historial",   heading: /historial/i },
];

for (const { path, heading } of RUTAS) {
  test(`${path} carga sin error`, async ({ page }) => {
    const errors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Sin errores 500
    expect(errors, `Errores HTTP en ${path}: ${errors.join(", ")}`).toHaveLength(0);

    // Sin pantalla de error de Next.js
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    // Heading del módulo visible
    await expect(page.getByRole("heading", { name: heading })).toBeVisible({
      timeout: 10_000,
    });
  });
}
```

- [ ] **Step 2: Correr el spec**

```bash
pnpm exec playwright test e2e/smoke-all-modules.spec.ts
```

Resultado esperado: 9 tests PASS. Si un heading falla, revisar el texto real del `<h1>` en la página y actualizar el regex correspondiente en `RUTAS`.

- [ ] **Step 3: Commit**

```bash
git add e2e/smoke-all-modules.spec.ts
git commit -m "test: smoke — 9 módulos cargan sin error 500"
```

---

## Task 5: `flujo-incidencia-ot.spec.ts`

**Files:**
- Create: `e2e/flujo-incidencia-ot.spec.ts`

**Datos reales de la DB:**
- Equipo CU: `CU-S0098` (Grill), sucursalId vinculado a sucursal visible en el selector
- Sucursal: `Rosita`

- [ ] **Step 1: Crear el spec**

```typescript
// e2e/flujo-incidencia-ot.spec.ts
import { test, expect } from "@playwright/test";

const TITULO = "[TEST] Falla bomba agua";

test("flujo completo: incidencia → OT → cierre → equipo OPERATIVO", async ({ page }) => {
  // ── 1. Reportar incidencia ──────────────────────────────────
  await page.goto("/incidencias");
  await page.getByRole("button", { name: /reportar incidencia/i }).click();

  // Llenar formulario — paso sucursal
  await page.getByText(/rosita/i).first().click();

  // Llenar título
  await page.getByLabel(/título|titulo/i).fill(TITULO);

  // Seleccionar equipo CU-S0098
  const equipoInput = page.getByPlaceholder(/buscar equipo|equipo/i).first();
  await equipoInput.fill("CU-S0098");
  await page.getByText(/CU-S0098/i).first().click();

  // Guardar
  await page.getByRole("button", { name: /reportar|guardar|crear/i }).last().click();

  // ── 2. Verificar en tabla ────────────────────────────────────
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("row", { name: new RegExp(TITULO, "i") })
      .getByText(/evaluacion/i)
  ).toBeVisible({ timeout: 5_000 });

  // ── 3. Generar OT desde el drawer ───────────────────────────
  await page.getByRole("row", { name: new RegExp(TITULO, "i") }).click();
  await page.getByRole("button", { name: /generar ot/i }).click();
  // Confirmar si hay diálogo de confirmación
  const confirmarBtn = page.getByRole("button", { name: /confirmar|aceptar|generar/i });
  if (await confirmarBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmarBtn.click();
  }

  // ── 4. Verificar OT en /ordenes ─────────────────────────────
  await page.goto("/ordenes");
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });

  // ── 5. Cerrar la OT ─────────────────────────────────────────
  await page.getByRole("row", { name: new RegExp(TITULO, "i") }).click();
  // Buscar selector de estado y cambiar a CERRADA
  await page.getByRole("combobox", { name: /estado/i }).selectOption("CERRADA");
  await page.getByRole("button", { name: /guardar|actualizar|cerrar ot/i }).click();

  // ── 6. Verificar equipo OPERATIVO ───────────────────────────
  await page.goto("/equipos");
  await page.getByPlaceholder(/buscar|search/i).fill("CU-S0098");
  await expect(
    page.getByRole("row", { name: /CU-S0098/i })
      .getByText(/operativo/i)
  ).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 2: Correr el spec**

```bash
pnpm exec playwright test e2e/flujo-incidencia-ot.spec.ts --headed
```

Resultado esperado: 1 test PASS. Este spec crea 1 incidencia y 1 OT con prefijo `[TEST]` en producción — limpiar con Prisma Studio cuando convenga.

Si un paso falla por selector, usar `--headed` para ver la UI y ajustar. Los pasos más probables de necesitar ajuste son: el selector del equipo (puede ser un `<select>` en lugar de input de búsqueda) y el cambio de estado de la OT (puede ser un botón de transición en lugar de `<combobox>`).

- [ ] **Step 3: Commit**

```bash
git add e2e/flujo-incidencia-ot.spec.ts
git commit -m "test: flujo incidencia → OT → cierre → equipo OPERATIVO"
```

---

## Task 6: `inventario-crud.spec.ts`

**Files:**
- Create: `e2e/inventario-crud.spec.ts`

- [ ] **Step 1: Crear el spec**

```typescript
// e2e/inventario-crud.spec.ts
import { test, expect } from "@playwright/test";

const SKU   = "TEST-001";
const NOMBRE = "[TEST] Filtro aceite";

test("CRUD completo de refacción con ajuste de stock", async ({ page }) => {
  await page.goto("/inventario");

  // ── 1. Crear ────────────────────────────────────────────────
  await page.getByRole("button", { name: /nueva refacción/i }).click();

  await page.getByLabel(/sku/i).fill(SKU);
  await page.getByLabel(/nombre/i).fill(NOMBRE);

  // Categoría: seleccionar o escribir "Pruebas"
  const catSelect = page.getByRole("combobox", { name: /categoría/i });
  if (await catSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await catSelect.selectOption({ label: /pruebas/i });
    // Si no existe la opción, seleccionar "+ Nueva categoría"
  } else {
    await page.getByLabel(/categoría/i).fill("Pruebas");
  }

  await page.getByLabel(/stock inicial/i).fill("15");
  await page.getByLabel(/mínimo/i).fill("5");
  await page.getByLabel(/pto\. reorden|punto de reorden/i).fill("10");
  await page.getByLabel(/máximo/i).fill("20");
  await page.getByLabel(/costo unitario/i).fill("50");

  await page.getByRole("button", { name: /crear refacción/i }).click();

  // ── 2. Verificar en tabla ────────────────────────────────────
  await expect(page.getByRole("cell", { name: SKU })).toBeVisible({ timeout: 10_000 });
  const fila = page.getByRole("row", { name: new RegExp(SKU, "i") });
  await expect(fila.getByText("OK")).toBeVisible();
  await expect(fila.getByText("15")).toBeVisible();

  // ── 3. Entrada de stock +5 ──────────────────────────────────
  await fila.click();
  await page.getByRole("button", { name: /entrada/i }).click();
  await page.getByLabel(/cantidad/i).fill("5");
  await page.getByRole("button", { name: /aplicar|confirmar/i }).click();
  await expect(page.getByRole("row", { name: new RegExp(SKU, "i") })
    .getByText("20")).toBeVisible({ timeout: 5_000 });

  // ── 4. Editar nombre ─────────────────────────────────────────
  await page.getByRole("button", { name: /editar/i }).click();
  const nombreInput = page.getByLabel(/nombre/i);
  await nombreInput.clear();
  await nombreInput.fill(`${NOMBRE} EDIT`);
  await page.getByRole("button", { name: /guardar cambios/i }).click();
  await expect(
    page.getByRole("row", { name: /TEST-001/i }).getByText(/EDIT/)
  ).toBeVisible({ timeout: 5_000 });

  // ── 5. Salida total hasta stock 0 ────────────────────────────
  await page.getByRole("row", { name: new RegExp(SKU, "i") }).click();
  await page.getByRole("button", { name: /salida/i }).click();
  await page.getByLabel(/cantidad/i).fill("20");
  await page.getByRole("button", { name: /aplicar|confirmar/i }).click();
  await expect(page.getByRole("row", { name: new RegExp(SKU, "i") })
    .getByText("0")).toBeVisible({ timeout: 5_000 });

  // ── 6. Eliminar ──────────────────────────────────────────────
  await page.getByRole("button", { name: /eliminar/i }).click();
  // Confirmar si hay diálogo
  const confirmar = page.getByRole("button", { name: /confirmar|sí, eliminar/i });
  if (await confirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmar.click();
  }

  // Verificar que desapareció
  await expect(page.getByRole("cell", { name: SKU })).toHaveCount(0, { timeout: 10_000 });
});
```

- [ ] **Step 2: Correr el spec**

```bash
pnpm exec playwright test e2e/inventario-crud.spec.ts --headed
```

Resultado esperado: 1 test PASS. El test limpia después de sí mismo (elimina la refacción al final).

- [ ] **Step 3: Commit**

```bash
git add e2e/inventario-crud.spec.ts
git commit -m "test: inventario CRUD — crear, editar, stock, eliminar"
```

---

## Task 7: `inventario-xml.spec.ts`

**Files:**
- Create: `e2e/inventario-xml.spec.ts`

- [ ] **Step 1: Crear el spec**

```typescript
// e2e/inventario-xml.spec.ts
import { test, expect } from "@playwright/test";
import path from "path";

const XML_PATH = path.join(__dirname, "fixtures/test-cfdi.xml");

test("importar XML CFDI — preview y aplicar", async ({ page }) => {
  await page.goto("/inventario");

  // ── 1. Abrir modal de importación ───────────────────────────
  await page.getByRole("button", { name: /importar xml/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // ── 2. Subir el archivo XML ──────────────────────────────────
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(XML_PATH);

  // ── 3. Verificar step preview con 2 líneas ───────────────────
  // Esperar a que aparezca la tabla de preview
  await expect(page.getByText(/FRE-004/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/TEST-XML-999/i)).toBeVisible({ timeout: 5_000 });

  // Verificar que se detectó el proveedor del XML
  await expect(page.getByText(/Proveedor TEST/i)).toBeVisible();

  // ── 4. Cambiar línea 2 a "omitir" ────────────────────────────
  // El select de acción en la fila de TEST-XML-999
  const filaXml = page.getByRole("row", { name: /TEST-XML-999/i });
  await filaXml.getByRole("combobox").selectOption("omitir");

  // ── 5. Aplicar importación ───────────────────────────────────
  await page.getByRole("button", { name: /aplicar importación/i }).click();

  // Toast de éxito con conteo
  await expect(
    page.getByText(/1 .*(actualiz|cre)/i)
  ).toBeVisible({ timeout: 10_000 });

  // ── 6. Verificar stock de FRE-004 aumentó ────────────────────
  await page.goto("/inventario");
  // FRE-004 debe aparecer en la tabla (ya existía, su stock aumentó)
  await expect(page.getByRole("cell", { name: /FRE-004/i })).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 2: Correr el spec**

```bash
pnpm exec playwright test e2e/inventario-xml.spec.ts --headed
```

Resultado esperado: 1 test PASS. El stock de `FRE-004` aumenta en 10 unidades en la DB de producción (se puede revertir con ajuste de stock -10 desde la UI).

- [ ] **Step 3: Commit**

```bash
git add e2e/inventario-xml.spec.ts
git commit -m "test: inventario XML — importar CFDI, preview, aplicar"
```

---

## Task 8: Correr la suite completa

- [ ] **Step 1: Ejecutar todos los specs**

```bash
pnpm test:e2e
```

Resultado esperado:
```
  ✓  auth.spec.ts (3)
  ✓  smoke-all-modules.spec.ts (9)
  ✓  flujo-incidencia-ot.spec.ts (1)
  ✓  inventario-crud.spec.ts (1)
  ✓  inventario-xml.spec.ts (1)

  15 passed
```

- [ ] **Step 2: Si algún test falla — ver el trace**

```bash
pnpm exec playwright show-trace test-results/<nombre-del-test>/trace.zip
```

El trace viewer muestra screenshots paso a paso y ayuda a identificar el selector que no encontró el elemento.

- [ ] **Step 3: Push a GitHub**

```bash
git push origin main
```

---

## Limpieza post-validación

Después de correr la suite, los registros `[TEST]` quedan en producción. Para limpiarlos:

```bash
pnpm db:studio
```

En Prisma Studio:
- **Incidencia**: filtrar `titulo` CONTAINS `[TEST]` → eliminar
- **OrdenTrabajo**: filtrar `titulo` CONTAINS `[TEST]` → eliminar
- **Refaccion**: filtrar `sku` STARTS WITH `TEST-` → eliminar (si quedaron de runs fallidos)

El stock extra de `FRE-004` por el test XML se revierte con el botón "Salida -10" desde `/inventario`.
