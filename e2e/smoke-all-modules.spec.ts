// e2e/smoke-all-modules.spec.ts
import { test, expect } from "@playwright/test";

const RUTAS = [
  "/",
  "/incidencias",
  "/ordenes",
  "/preventivos",
  "/equipos",
  "/inventario",
  "/calendario",
  "/alertas",
  "/historial",
];

for (const path of RUTAS) {
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

    // Layout cargó — topbar visible con su título fijo
    await expect(page.getByText("Resumen general")).toBeVisible({ timeout: 10_000 });

    // URL no redirigió a error page
    await expect(page).toHaveURL(new RegExp(path === "/" ? "/$" : path));
  });
}
