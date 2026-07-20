import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://propostas_test:propostas_test@localhost:5435/propostas_test?schema=public",
      JWT_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
      RATE_LIMIT_HMAC_SECRET: "test-rate-limit-secret",
      CORS_ALLOWED_ORIGINS: "http://localhost:21709",
      APP_PUBLIC_URL: "http://localhost:21709",
      EMAIL_PROVIDER: "mock",
    },
  },
});
