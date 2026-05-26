// e2e/global-setup.ts
import { chromium } from "@playwright/test";
import { TEST_USER } from "./fixtures/users";

export default async function globalSetup(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto("https://mantenipro-fawn.vercel.app/login");
    await page.getByLabel(/correo electrónico/i).fill(TEST_USER.email);
    await page.getByLabel(/contraseña/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /ingresar/i }).click();
    await page.waitForURL(/mantenipro-fawn\.vercel\.app\/$/, { timeout: 15_000 });
    await page.context().storageState({ path: "e2e/.auth/session.json" });
  } catch (error) {
    throw new Error(
      `Global setup failed: could not log in to ManteniPro.\n` +
      `Check credentials in e2e/fixtures/users.ts and that the app is reachable.\n` +
      `Original error: ${error}`
    );
  } finally {
    await browser.close();
  }
}
