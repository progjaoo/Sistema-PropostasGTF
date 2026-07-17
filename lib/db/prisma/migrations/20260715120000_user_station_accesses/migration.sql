CREATE TABLE "user_station_accesses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "can_create_proposals" BOOLEAN NOT NULL DEFAULT true,
    "can_view_catalog" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_station_accesses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_station_accesses_user_id_station_id_key"
    ON "user_station_accesses"("user_id", "station_id");

CREATE INDEX "user_station_accesses_station_id_active_idx"
    ON "user_station_accesses"("station_id", "active");

ALTER TABLE "user_station_accesses"
    ADD CONSTRAINT "user_station_accesses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_station_accesses"
    ADD CONSTRAINT "user_station_accesses_station_id_fkey"
    FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_station_accesses" (
    "id",
    "user_id",
    "station_id",
    "can_create_proposals",
    "can_view_catalog",
    "active"
)
SELECT
    'usa_' || md5(random()::text || clock_timestamp()::text || users."id" || stations."id"),
    users."id",
    stations."id",
    true,
    true,
    true
FROM "users"
CROSS JOIN "stations"
WHERE users."role" = 'COMERCIAL'
  AND users."active" = true
  AND stations."active" = true
ON CONFLICT ("user_id", "station_id") DO NOTHING;
