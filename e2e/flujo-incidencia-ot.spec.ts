// e2e/flujo-incidencia-ot.spec.ts
import { test, expect } from "@playwright/test";

const TITULO = "[TEST] Falla bomba agua";

test("flujo completo: incidencia → OT → cierre → equipo OPERATIVO", async ({ page }) => {
  // ── 1. Reportar incidencia ──────────────────────────────────
  await page.goto("/incidencias");
  await page.getByRole("button", { name: /^reportar$/i }).click();

  // Step 1: CU-S0301 belongs to Sabinas (0 existing active incidencias)
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /sabinas/i })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole("dialog").getByRole("button", { name: /sabinas/i }).click();
  await page.getByRole("button", { name: /continuar/i }).click();

  // Step 2: equipo via select — selectOption requires a string value, use evaluate to find it
  const equipoSelect = page.getByRole("dialog").locator("select");
  const equipoValue = await equipoSelect.evaluate((el: HTMLSelectElement) =>
    Array.from(el.options).find((o) => o.text.includes("CU-S0301"))?.value ?? ""
  );
  if (!equipoValue) throw new Error("Equipo CU-S0301 no encontrado en el selector de Sabinas");
  await equipoSelect.selectOption(equipoValue);
  await page.getByPlaceholder(/freidora|temperatura/i).fill(TITULO);

  // Submit
  await page.getByRole("button", { name: /reportar incidencia/i }).click();

  // ── 2. Verificar en tabla ────────────────────────────────────
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });

  // ── 3. Generar OT desde el drawer ───────────────────────────
  // filter({ hasText }) uses literal substring match — safe with "[TEST]" prefix
  await page.getByRole("row").filter({ hasText: TITULO }).click();
  await page.getByRole("button", { name: /generar ot/i }).click();

  // ── 4. Verificar OT en /ordenes ─────────────────────────────
  await page.goto("/ordenes");
  await expect(page.getByText(TITULO)).toBeVisible({ timeout: 10_000 });

  // ── 5. Cerrar la OT via transiciones de estado ───────────────
  await page.getByRole("row").filter({ hasText: TITULO }).click();
  // PROGRAMADA → ASIGNADA
  await page.getByRole("button", { name: /marcar como asignada/i }).click();
  await expect(page.getByRole("button", { name: /iniciar trabajo/i })).toBeVisible({ timeout: 5_000 });
  // ASIGNADA → EN_PROCESO
  await page.getByRole("button", { name: /iniciar trabajo/i }).click();
  await expect(page.getByRole("button", { name: /cerrar ot/i })).toBeVisible({ timeout: 5_000 });
  // EN_PROCESO → CERRADA (also auto-closes linked incidencia via transitionOT)
  await page.getByRole("button", { name: /cerrar ot/i }).click();
  // Wait for the button to disappear confirming the server action completed
  await expect(page.getByRole("button", { name: /cerrar ot/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 6. Verificar equipo OPERATIVO ───────────────────────────
  await page.goto("/equipos");
  await page.getByPlaceholder(/buscar|search/i).fill("CU-S0301");
  await expect(
    page.getByRole("row", { name: /CU-S0301/i }).getByText(/operativo/i)
  ).toBeVisible({ timeout: 10_000 });
});
