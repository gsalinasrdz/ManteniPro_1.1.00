// e2e/flujo-incidencia-ot.spec.ts
import { test, expect } from "@playwright/test";

const TITULO = "[TEST] Falla bomba agua";

test("flujo completo: incidencia → OT → cierre → equipo OPERATIVO", async ({ page }) => {
  // ── 1. Reportar incidencia ──────────────────────────────────
  await page.goto("/incidencias");
  await page.getByRole("button", { name: /reportar incidencia/i }).click();

  // Step 1: seleccionar sucursal Rosita
  await page.getByText(/rosita/i).first().click();

  // Step 2: llenar título y equipo
  await page.getByLabel(/título|titulo/i).fill(TITULO);

  // Equipo CU-S0098
  const equipoInput = page.getByPlaceholder(/buscar equipo|equipo/i).first();
  await equipoInput.fill("CU-S0098");
  await page.getByText(/CU-S0098/i).first().click();

  // Guardar incidencia
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
  const confirmarBtn = page.getByRole("button", { name: /confirmar|aceptar|generar/i });
  if (await confirmarBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmarBtn.click();
  }

  // ── 4. Verificar OT en /ordenes ─────────────────────────────
  await page.goto("/ordenes");
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });

  // ── 5. Cerrar la OT ─────────────────────────────────────────
  await page.getByRole("row", { name: new RegExp(TITULO, "i") }).click();
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
