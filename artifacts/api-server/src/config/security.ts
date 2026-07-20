import { z } from "zod/v4";

const KNOWN_DEFAULT_SECRETS = new Set([
  "dev_jwt_secret_change_me",
  "dev_refresh_secret_change_me",
  "dev-access-secret",
  "dev-refresh-secret",
]);

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:21709"),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:21709"),
  RATE_LIMIT_HMAC_SECRET: z.string().optional(),
  PUBLIC_COMMERCIAL_REGISTRATION_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  TRUST_PROXY: z.string().default("1"),
}).passthrough();

export interface SecurityConfig {
  isProduction: boolean;
  databaseUrl?: string;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  allowedOrigins: string[];
  appPublicUrl: string;
  rateLimitHmacSecret: string;
  publicCommercialRegistrationEnabled: boolean;
  trustProxy: number | boolean;
}

function parseTrustProxy(value: string): number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  throw new Error("TRUST_PROXY must be true, false, or a non-negative integer");
}

function requireProductionSecret(
  name: string,
  value: string | undefined,
): string {
  if (!value || value.length < 64 || KNOWN_DEFAULT_SECRETS.has(value)) {
    throw new Error(
      `${name} must contain at least 64 characters and cannot use a known default in production`,
    );
  }
  return value;
}

export function loadSecurityConfig(
  environment: Record<string, string | undefined>,
): SecurityConfig {
  const parsed = environmentSchema.parse(environment);
  const isProduction = parsed.NODE_ENV === "production";

  if (isProduction && !parsed.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production");
  }

  const accessTokenSecret = isProduction
    ? requireProductionSecret("JWT_SECRET", parsed.JWT_SECRET)
    : parsed.JWT_SECRET ?? "local-development-access-secret";
  const refreshTokenSecret = isProduction
    ? requireProductionSecret("JWT_REFRESH_SECRET", parsed.JWT_REFRESH_SECRET)
    : parsed.JWT_REFRESH_SECRET ?? "local-development-refresh-secret";
  const rateLimitHmacSecret = isProduction
    ? requireProductionSecret(
        "RATE_LIMIT_HMAC_SECRET",
        parsed.RATE_LIMIT_HMAC_SECRET,
      )
    : parsed.RATE_LIMIT_HMAC_SECRET ?? "local-development-rate-limit-secret";

  const allowedOrigins = Array.from(
    new Set(
      parsed.CORS_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  );
  if (isProduction && allowedOrigins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS must define at least one origin");
  }

  return {
    isProduction,
    databaseUrl: parsed.DATABASE_URL,
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenTtl: parsed.JWT_EXPIRES_IN,
    refreshTokenTtl: parsed.JWT_REFRESH_EXPIRES_IN,
    allowedOrigins,
    appPublicUrl: parsed.APP_PUBLIC_URL,
    rateLimitHmacSecret,
    publicCommercialRegistrationEnabled:
      parsed.PUBLIC_COMMERCIAL_REGISTRATION_ENABLED === "true",
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
  };
}

export const securityConfig = loadSecurityConfig(process.env);
