-- PRD 020: editor period visibility, company presentation defaults and password reset tokens.

ALTER TABLE "proposals"
  ADD COLUMN IF NOT EXISTS "show_period" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "station_presentation_items" (
  "id" TEXT NOT NULL,
  "station_id" TEXT NOT NULL,
  "highlight" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "station_presentation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "station_presentation_items_station_id_fkey"
    FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "station_presentation_items_station_id_order_key"
  ON "station_presentation_items"("station_id", "order");

CREATE INDEX IF NOT EXISTS "station_presentation_items_station_id_active_idx"
  ON "station_presentation_items"("station_id", "active");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_expires_at_idx"
  ON "password_reset_tokens"("user_id", "expires_at");
