// e2e/inventario-crud.spec.ts
import { test, expect } from "@playwright/test";

const SKU    = "TEST-001";
const NOMBRE = "[TEST] Filtro aceite";

test("CRUD completo de refacción con ajuste de stock", async ({ page }) => {
  await page.goto("/inventario");

  // ── 0. Cleanup: eliminar TEST-001 si quedó de una corrida anterior ──
  // "Eliminar refacción" solo aparece cuando stock===0 y el drawer usa selectedRef que es stale
  // tras router.refresh(). Fix: leer stock del row, drenarlo con Salida, recargar página, eliminar.
  const cleanupRow = page.getByRole("row", { name: /TEST-001/i });
  if (await cleanupRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const stockText = await cleanupRow.locator("span.tabular-nums").first().innerText();
    const currentStock = parseInt(stockText, 10) || 0;

    if (currentStock > 0) {
      await cleanupRow.click();
      await page.getByPlaceholder("Cantidad").fill(String(currentStock));
      await page.getByRole("button", { name: /^salida$/i }).click();
      // Wait for the table row to reflect stock=0 before reloading
      await expect(
        page.getByRole("row", { name: /TEST-001/i }).locator("span.tabular-nums").first()
      ).toHaveText("0", { timeout: 8_000 });
      // Reload to get fresh selectedRef with stock=0
      await page.goto("/inventario");
    }

    await page.getByRole("row", { name: /TEST-001/i }).click();
    await page.getByRole("button", { name: /eliminar refacción/i }).click();
    await page.getByRole("button", { name: /confirmar eliminación/i }).click();
    await expect(page.getByRole("row", { name: /TEST-001/i })).toHaveCount(0, { timeout: 8_000 });
  }

  // ── 1. Crear ────────────────────────────────────────────────
  await page.getByRole("button", { name: /nueva refacción/i }).click();

  await page.locator('input[placeholder="EJ-1234"]').fill(SKU);
  await page.locator('input[placeholder="Filtro de aceite…"]').fill(NOMBRE);

  // Categoría: seleccionar "+ Nueva categoría" y escribir "Pruebas"
  const catSelect = page.locator("select").first();
  await catSelect.selectOption({ value: "__nueva__" });
  await page.locator('input[placeholder="Nueva categoría…"]').fill("Pruebas");

  // Stock inicial — input type=number sin placeholder, ubicado bajo "Stock inicial"
  await page.getByText("Stock inicial").locator("..").locator("input").fill("15");

  // Umbrales — spans que contienen el texto del campo
  await page.getByText("Mínimo", { exact: true }).locator("..").locator("input").fill("5");
  await page.getByText("Pto. reorden", { exact: true }).locator("..").locator("input").fill("10");
  await page.getByText("Máximo", { exact: true }).locator("..").locator("input").fill("20");

  // Costo unitario
  await page.getByText("Costo unitario ($)").locator("..").locator("input").fill("50");

  await page.getByRole("button", { name: /crear refacción/i }).click();

  // ── 2. Verificar en tabla ────────────────────────────────────
  await expect(page.getByRole("cell", { name: SKU })).toBeVisible({ timeout: 10_000 });
  const fila = page.getByRole("row", { name: new RegExp(SKU, "i") });
  await expect(fila.getByText("OK")).toBeVisible();
  await expect(fila.getByText("15")).toBeVisible();

  // ── 3. Entrada de stock +5 ──────────────────────────────────
  // Click row to open drawer
  await page.getByRole("row", { name: new RegExp(SKU, "i") }).click();
  // Fill cantidad and click Entrada — applies immediately, no confirm button
  await page.getByPlaceholder("Cantidad").fill("5");
  await page.getByRole("button", { name: /^entrada$/i }).click();
  // Wait for stock to update to 20
  await expect(
    page.getByRole("row", { name: new RegExp(SKU, "i") }).getByText("20")
  ).toBeVisible({ timeout: 8_000 });

  // ── 4. Editar nombre ─────────────────────────────────────────
  await page.getByRole("button", { name: /editar refacción/i }).click();
  const nombreInput = page.locator('input[placeholder="Filtro de aceite…"]');
  await nombreInput.clear();
  await nombreInput.fill(`${NOMBRE} EDIT`);
  await page.getByRole("button", { name: /guardar cambios/i }).click();
  await expect(
    page.getByRole("row", { name: /TEST-001/i }).getByText(/EDIT/)
  ).toBeVisible({ timeout: 5_000 });

  // ── 5. Salida total hasta stock 0 ────────────────────────────
  // Drawer is already open after the edit step — no row click needed
  await page.getByPlaceholder("Cantidad").fill("20");
  await page.getByRole("button", { name: /^salida$/i }).click();
  // Wait for table to reflect stock=0 (span.tabular-nums inside the row)
  await expect(
    page.getByRole("row", { name: new RegExp(SKU, "i") }).locator("span.tabular-nums").first()
  ).toHaveText("0", { timeout: 8_000 });

  // ── 6. Eliminar ──────────────────────────────────────────────
  // selectedRef is stale after router.refresh() — reload to get fresh data with stock=0
  await page.goto("/inventario");
  await page.getByRole("row", { name: new RegExp(SKU, "i") }).click();
  await page.getByRole("button", { name: /eliminar refacción/i }).click();
  await page.getByRole("button", { name: /confirmar eliminación/i }).click();
  await expect(page.getByRole("cell", { name: SKU })).toHaveCount(0, { timeout: 10_000 });
});
