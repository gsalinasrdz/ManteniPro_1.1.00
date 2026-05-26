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
  await expect(page.getByText(/FRE-004/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/TEST-XML-999/i).first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Proveedor TEST/i).first()).toBeVisible();

  // ── 4. Cambiar línea 2 a "omitir" ────────────────────────────
  // XML preview renders 2 cards, each with a checkbox (incluir).
  // TEST-XML-999 is line index 1 → nth(1). Uncheck sets accion="omitir".
  await page
    .getByRole("dialog")
    .locator('input[type="checkbox"]')
    .nth(1)
    .uncheck();

  // ── 5. Aplicar importación ───────────────────────────────────
  await page.getByRole("button", { name: /aplicar importación/i }).click();

  // Toast de éxito — al menos 1 actualizada o creada
  await expect(
    page.getByText(/1 .*(actualiz|cre)/i).first()
  ).toBeVisible({ timeout: 10_000 });

  // ── 6. Verificar FRE-004 sigue en inventario ─────────────────
  await page.goto("/inventario");
  await expect(page.getByRole("cell", { name: /FRE-004/i })).toBeVisible({ timeout: 10_000 });
});
