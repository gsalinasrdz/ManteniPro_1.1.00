// e2e/flujo-incidencia-ot.spec.ts
import { test, expect } from "@playwright/test";

const TITULO = "[TEST] Falla bomba agua";

test("flujo completo: incidencia → OT → cierre → equipo OPERATIVO", async ({ page }) => {
  test.setTimeout(90_000);

  // ── 0. Cleanup: close active [TEST] incidencias left from previous runs ──
  // Active leftovers (EVALUACION / EN_ATENCION) would make incActivas > 0 when
  // we close the new OT, preventing the equipo from returning to OPERATIVO.
  await page.goto("/incidencias");
  for (let i = 0; i < 5; i++) {
    // Only rows that have TITULO AND an active estado label ("Evaluación" / "En atención")
    const activeRow = page
      .getByRole("row")
      .filter({ hasText: TITULO })
      .filter({ hasText: /Evaluación|En atención/ })
      .first();

    if (!(await activeRow.isVisible({ timeout: 2_000 }).catch(() => false))) break;

    await activeRow.click();

    // Advance EVALUACION → EN_ATENCION if needed (Generar OT only shows in EN_ATENCION)
    const tomarBtn = page.getByRole("button", { name: /tomar en atención/i });
    if (await tomarBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await tomarBtn.click();
      await expect(
        page.getByRole("button", { name: /cerrar incidencia/i })
      ).toBeVisible({ timeout: 3_000 });
    }

    // Close the incidencia — optimistic update changes row text to "Cerrada" immediately
    await page.getByRole("button", { name: /cerrar incidencia/i }).click();
    await page.waitForTimeout(700); // wait for drawer to auto-close (400 ms setTimeout)
  }

  // ── 1. Reportar incidencia ──────────────────────────────────
  await page.getByRole("button", { name: /^reportar$/i }).click();

  // Step 1: CU-S0301 belongs to Sabinas (no existing active incidencias)
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
  // .first() — previous runs may have left CERRADA rows with the same title
  await expect(page.getByText(TITULO).first()).toBeVisible({ timeout: 10_000 });

  // ── 3. Generar OT desde el drawer ───────────────────────────
  // filter({ hasText }) uses literal substring match — safe with "[TEST]" prefix
  // .first() + active-estado filter ensures we pick the newly created EVALUACION row
  await page
    .getByRole("row")
    .filter({ hasText: TITULO })
    .filter({ hasText: /Evaluación/ })
    .first()
    .click();

  // New incidencia starts in EVALUACION — must advance to EN_ATENCION before "Generar OT" appears
  await page.getByRole("button", { name: /tomar en atención/i }).click();
  // Client applies optimistic update immediately; Generar OT renders for EN_ATENCION + no OT
  await expect(page.getByRole("button", { name: /generar ot/i })).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /generar ot/i }).click();
  // Wait for the success toast — proves the server action finished and OT is in DB
  await expect(page.getByText(/OT generada/i)).toBeVisible({ timeout: 10_000 });

  // ── 4. Verificar OT en /ordenes ─────────────────────────────
  await page.goto("/ordenes");
  await expect(page.getByText(TITULO).first()).toBeVisible({ timeout: 10_000 });

  // ── 5. Cerrar la OT via transiciones de estado ───────────────
  await page.getByRole("row").filter({ hasText: TITULO }).first().click();
  // PROGRAMADA → ASIGNADA
  await page.getByRole("button", { name: /marcar como asignada/i }).click();
  await expect(page.getByRole("button", { name: /iniciar trabajo/i })).toBeVisible({ timeout: 5_000 });
  // ASIGNADA → EN_PROCESO
  await page.getByRole("button", { name: /iniciar trabajo/i }).click();
  await expect(page.getByRole("button", { name: /cerrar ot/i })).toBeVisible({ timeout: 5_000 });
  // EN_PROCESO → CERRADA (transitionOT auto-closes linked incidencia via ordenId)
  await page.getByRole("button", { name: /cerrar ot/i }).click();
  // Wait for server action to complete — button disappears on success
  await expect(page.getByRole("button", { name: /cerrar ot/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 6. Verificar equipo OPERATIVO ───────────────────────────
  await page.goto("/equipos");
  await page.getByPlaceholder(/buscar|search/i).fill("CU-S0301");
  await expect(
    page.getByRole("row", { name: /CU-S0301/i }).getByText(/operativo/i)
  ).toBeVisible({ timeout: 10_000 });
});
