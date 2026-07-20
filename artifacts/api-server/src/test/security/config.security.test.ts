import { describe, expect, it } from "vitest";
import { loadSecurityConfig } from "../../config/security";

const strongAccessSecret = "a".repeat(64);
const strongRefreshSecret = "b".repeat(64);
const strongRateLimitSecret = "c".repeat(64);

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@database.example:5432/propostas",
    JWT_SECRET: strongAccessSecret,
    JWT_REFRESH_SECRET: strongRefreshSecret,
    RATE_LIMIT_HMAC_SECRET: strongRateLimitSecret,
    CORS_ALLOWED_ORIGINS: "https://propostas.example.com",
    APP_PUBLIC_URL: "https://propostas.example.com",
    ...overrides,
  };
}

describe("security configuration", () => {
  it("rejects production without a database URL", () => {
    expect(() =>
      loadSecurityConfig(productionEnv({ DATABASE_URL: undefined })),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects short or known default secrets in production", () => {
    expect(() =>
      loadSecurityConfig(productionEnv({ JWT_SECRET: "dev_jwt_secret_change_me" })),
    ).toThrow(/JWT_SECRET/);
    expect(() =>
      loadSecurityConfig(productionEnv({ JWT_REFRESH_SECRET: "short" })),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it("parses explicit origins and proxy settings", () => {
    const config = loadSecurityConfig(
      productionEnv({
        CORS_ALLOWED_ORIGINS:
          "https://propostas.example.com, https://admin.example.com",
        TRUST_PROXY: "2",
      }),
    );

    expect(config.allowedOrigins).toEqual([
      "https://propostas.example.com",
      "https://admin.example.com",
    ]);
    expect(config.trustProxy).toBe(2);
  });
});
