-- Contract lifecycle, secure account recovery and operational traceability.
CREATE TYPE "SecurityTokenKind" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

ALTER TABLE "ProviderProfile"
  ADD COLUMN "verificationDocumentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TABLE "ServiceRequest"
  ADD COLUMN "acceptedProviderId" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "DirectMessage"
  ADD COLUMN "attachmentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "SecurityToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "SecurityTokenKind" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceRequest_acceptedProviderId_status_updatedAt_idx"
  ON "ServiceRequest"("acceptedProviderId", "status", "updatedAt");
CREATE INDEX "SecurityToken_userId_kind_createdAt_idx"
  ON "SecurityToken"("userId", "kind", "createdAt");
CREATE INDEX "SecurityToken_kind_expiresAt_idx"
  ON "SecurityToken"("kind", "expiresAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx"
  ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx"
  ON "AuditLog"("actorId", "createdAt");

ALTER TABLE "ServiceRequest"
  ADD CONSTRAINT "ServiceRequest_acceptedProviderId_fkey"
  FOREIGN KEY ("acceptedProviderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityToken"
  ADD CONSTRAINT "SecurityToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
