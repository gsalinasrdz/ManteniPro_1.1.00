// e2e/inventario-crud.spec.ts
import { test, expect } from "@playwright/test";

const SKU    = "TEST-001";
const NOMBRE = "[TEST] Filtro aceite";

test("CRUD completo de refacción con ajuste de stock", async ({ page }) => {
  await page.goto("/inventario");

  // ── 1. Crear ────────────────────────────────────────────────
  await page.getByRole("button", { name: /nueva refacción/i }).click();

  await page.getByLabel(/sku/i).fill(SKU);
  await page.getByLabel(/nombre/i).fill(NOMBRE);

  // Categoría: intentar select, si no existe "Pruebas" elegir nueva categoría
  const catSelect = page.getByRole("combobox", { name: /categoría/i });
  if (await catSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const options = await catSelect.locator("option").allTextContents();
    if (options.some((o) => /pruebas/i.test(o))) {
      await catSelect.selectOption({ label: /pruebas/i });
    } else {
      await catSelect.selectOption({ value: "__nueva__" });
      await page.getByLabel(/categoría/i).fill("Pruebas");
    }
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
  await expect(
    page.getByRole("row", { name: new RegExp(SKU, "i") }).getByText("20")
  ).toBeVisible({ timeout: 5_000 });

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
  await expect(
    page.getByRole("row", { name: new RegExp(SKU, "i") }).getByText("0")
  ).toBeVisible({ timeout: 5_000 });

  // ── 6. Eliminar ──────────────────────────────────────────────
  await page.getByRole("button", { name: /eliminar/i }).click();
  const confirmar = page.getByRole("button", { name: /confirmar|sí, eliminar/i });
  if (await confirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmar.click();
  }

  await expect(page.getByRole("cell", { name: SKU })).toHaveCount(0, { timeout: 10_000 });
});
