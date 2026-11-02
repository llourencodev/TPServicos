-- Marketplace engagement, trust and professional-profile capabilities.
CREATE TYPE "ProposalStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "User"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);

ALTER TABLE "ProviderProfile"
  ADD COLUMN "availability" TEXT NOT NULL DEFAULT 'Disponível para novos serviços',
  ADD COLUMN "priceFromCents" INTEGER,
  ADD COLUMN "serviceRadiusKm" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "portfolioUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verificationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewerId" TEXT;

CREATE TABLE "Proposal" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "priceCents" INTEGER,
  "scheduledFor" TIMESTAMP(3),
  "status" "ProposalStatus" NOT NULL DEFAULT 'SENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessage" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformReport" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewerId" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Proposal_requestId_providerId_key" ON "Proposal"("requestId", "providerId");
CREATE INDEX "Proposal_requestId_status_createdAt_idx" ON "Proposal"("requestId", "status", "createdAt");
CREATE INDEX "Proposal_providerId_status_createdAt_idx" ON "Proposal"("providerId", "status", "createdAt");
CREATE INDEX "DirectMessage_requestId_createdAt_idx" ON "DirectMessage"("requestId", "createdAt");
CREATE INDEX "DirectMessage_recipientId_readAt_createdAt_idx" ON "DirectMessage"("recipientId", "readAt", "createdAt");
CREATE INDEX "DirectMessage_senderId_createdAt_idx" ON "DirectMessage"("senderId", "createdAt");
CREATE INDEX "AppNotification_userId_readAt_createdAt_idx" ON "AppNotification"("userId", "readAt", "createdAt");
CREATE INDEX "PlatformReport_status_createdAt_idx" ON "PlatformReport"("status", "createdAt");
CREATE INDEX "PlatformReport_targetType_targetId_idx" ON "PlatformReport"("targetType", "targetId");
CREATE INDEX "PlatformReport_authorId_createdAt_idx" ON "PlatformReport"("authorId", "createdAt");

ALTER TABLE "ProviderProfile"
  ADD CONSTRAINT "ProviderProfile_verificationReviewerId_fkey"
  FOREIGN KEY ("verificationReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Proposal_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectMessage"
  ADD CONSTRAINT "DirectMessage_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DirectMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DirectMessage_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppNotification"
  ADD CONSTRAINT "AppNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformReport"
  ADD CONSTRAINT "PlatformReport_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlatformReport_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
