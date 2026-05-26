// e2e/global-setup.ts
import { chromium } from "@playwright/test";

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://mantenipro-fawn.vercel.app/login");
  await page.getByLabel(/correo electrónico/i).fill("gsalinasrdz@gmail.com");
  await page.getByLabel(/contraseña/i).fill("Mome2026++");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await page.waitForURL("**/", { timeout: 15_000 });

  await page.context().storageState({ path: "e2e/.auth/session.json" });
  await browser.close();
}
