import type { Express } from "express";

export const TEST_DATABASE_SUFFIX = "_test";

export function assertTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for security tests");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Security tests require a database ending in ${TEST_DATABASE_SUFFIX}`,
    );
  }
  return databaseUrl;
}

export async function createTestApp(): Promise<Express> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);
  const { default: app } = await import("../app");
  return app;
}
