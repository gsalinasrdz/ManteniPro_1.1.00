// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { TEST_USER } from "./fixtures/users";

// This spec tests auth directly — no pre-existing session
test.use({ storageState: { cookies: [], origins: [] } });

test("login válido redirige al dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/correo electrónico/i).fill(TEST_USER.email);
  await page.getByLabel(/contraseña/i).fill(TEST_USER.password);
  await page.getByRole("button", { name: /ingresar/i }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("login inválido muestra error y permanece en /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/correo electrónico/i).fill(TEST_USER.email);
  await page.getByLabel(/contraseña/i).fill("password-incorrecto");
  await page.getByRole("button", { name: /ingresar/i }).click();

  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(
    page.getByText(/incorrecta|inválid|credenciales/i)
  ).toBeVisible({ timeout: 5_000 });
});

test("acceder a ruta protegida sin sesión redirige a /login", async ({ page }) => {
  await page.goto("/incidencias");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
