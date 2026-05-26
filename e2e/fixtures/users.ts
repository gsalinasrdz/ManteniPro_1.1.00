// e2e/fixtures/users.ts
export const TEST_USER = {
  email: "gsalinasrdz@gmail.com",
  password: "Mome2026++",
};

export function isTestRecord(text: string): boolean {
  return text.startsWith("[TEST]") || text.startsWith("TEST-");
}
