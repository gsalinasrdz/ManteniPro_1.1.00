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
