// e2e/inventario-crud.spec.ts
import { test, expect } from "@playwright/test";

const SKU    = "TEST-001";
const NOMBRE = "[TEST] Filtro aceite";

test("CRUD completo de refacción con ajuste de stock", async ({ page }) => {
  await page.goto("/inventario");

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
  await page.getByRole("row", { name: new RegExp(SKU, "i") }).click();
  await page.getByPlaceholder("Cantidad").fill("20");
  await page.getByRole("button", { name: /^salida$/i }).click();
  await expect(
    page.getByRole("row", { name: new RegExp(SKU, "i") }).getByText("0")
  ).toBeVisible({ timeout: 8_000 });

  // ── 6. Eliminar ──────────────────────────────────────────────
  // Drawer should still be open, click "Eliminar refacción"
  await page.getByRole("button", { name: /eliminar refacción/i }).click();
  // Confirmation appears — click "Confirmar eliminación"
  await page.getByRole("button", { name: /confirmar eliminación/i }).click();

  // Verify gone from table
  await expect(page.getByRole("cell", { name: SKU })).toHaveCount(0, { timeout: 10_000 });
});
