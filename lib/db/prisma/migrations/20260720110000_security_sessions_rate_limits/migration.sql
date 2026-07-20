-- Expansive migration for secure sessions and durable rate limits.
-- The legacy token column remains temporarily so old Vercel functions do not
-- fail during rollout. New code writes only token_hash.

ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "family_id" TEXT,
  ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMPTZ(6);

ALTER TABLE "refresh_tokens"
  ALTER COLUMN "token" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key"
  ON "refresh_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_revoked_at_idx"
  ON "refresh_tokens"("user_id", "revoked_at");

CREATE INDEX IF NOT EXISTS "refresh_tokens_family_id_idx"
  ON "refresh_tokens"("family_id");

CREATE TABLE IF NOT EXISTS "security_rate_limits" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "security_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "security_rate_limits_scope_key_hash_window_start_key"
  ON "security_rate_limits"("scope", "key_hash", "window_start");

CREATE INDEX IF NOT EXISTS "security_rate_limits_expires_at_idx"
  ON "security_rate_limits"("expires_at");
