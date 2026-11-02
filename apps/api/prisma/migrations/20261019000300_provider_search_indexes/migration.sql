DROP INDEX IF EXISTS "ProviderProfile_city_active_idx";

CREATE INDEX "ProviderProfile_active_createdAt_id_idx"
  ON "ProviderProfile" ("active", "createdAt", "id");

CREATE INDEX "ProviderProfile_active_city_createdAt_idx"
  ON "ProviderProfile" ("active", "city", "createdAt");

CREATE INDEX "ProviderProfile_serviceAreas_idx"
  ON "ProviderProfile" USING GIN ("serviceAreas");
