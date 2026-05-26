// e2e/flujo-incidencia-ot.spec.ts
import { test, expect } from "@playwright/test";

const TITULO = "[TEST] Falla bomba agua";

test("flujo completo: incidencia → OT → cierre → equipo OPERATIVO", async ({ page }) => {
  // ── 1. Reportar incidencia ──────────────────────────────────
  await page.goto("/incidencias");
  await page.getByRole("button", { name: /^reportar$/i }).click();

  // Step 1: seleccionar sucursal Rosita
  await page.getByText(/rosita/i).first().click();

  // Step 2: llenar título y equipo
  await page.getByLabel(/título|titulo/i).fill(TITULO);

  // Equipo CU-S0098
  const equipoInput = page.getByPlaceholder(/buscar equipo|equipo/i).first();
  await equipoInput.fill("CU-S0098");
  await page.getByText(/CU-S0098/i).first().click();

  // Guardar incidencia
  await page.getByRole("button", { name: /reportar incidencia|guardar|crear/i }).last().click();

  // ── 2. Verificar en tabla ────────────────────────────────────
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });

  // ── 3. Generar OT desde el drawer ───────────────────────────
  await page.getByRole("row", { name: new RegExp(TITULO, "i") }).click();
  await page.getByRole("button", { name: /generar ot/i }).click();

  // ── 4. Verificar OT en /ordenes ─────────────────────────────
  await page.goto("/ordenes");
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });

  // ── 5. Cerrar la OT via transiciones de estado ───────────────
  await page.getByRole("row", { name: new RegExp(TITULO, "i") }).click();
  // PROGRAMADA → ASIGNADA
  await page.getByRole("button", { name: /marcar como asignada/i }).click();
  await expect(page.getByRole("button", { name: /iniciar trabajo/i })).toBeVisible({ timeout: 5_000 });
  // ASIGNADA → EN_PROCESO
  await page.getByRole("button", { name: /iniciar trabajo/i }).click();
  await expect(page.getByRole("button", { name: /cerrar ot/i })).toBeVisible({ timeout: 5_000 });
  // EN_PROCESO → CERRADA
  await page.getByRole("button", { name: /cerrar ot/i }).click();

  // ── 6. Verificar equipo OPERATIVO ───────────────────────────
  await page.goto("/equipos");
  await page.getByPlaceholder(/buscar|search/i).fill("CU-S0098");
  await expect(
    page.getByRole("row", { name: /CU-S0098/i }).getByText(/operativo/i)
  ).toBeVisible({ timeout: 10_000 });
});
