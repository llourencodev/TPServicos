CREATE TYPE "AdvertisementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "AdvertisingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvertisingPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SponsoredAdvertisement" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactConsentAt" TIMESTAMP(3) NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "status" "AdvertisementStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SponsoredAdvertisement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvertisingPackage_active_amountInCents_idx" ON "AdvertisingPackage"("active", "amountInCents");
CREATE INDEX "SponsoredAdvertisement_status_createdAt_idx" ON "SponsoredAdvertisement"("status", "createdAt");
CREATE INDEX "SponsoredAdvertisement_status_endsAt_idx" ON "SponsoredAdvertisement"("status", "endsAt");
CREATE INDEX "SponsoredAdvertisement_packageId_createdAt_idx" ON "SponsoredAdvertisement"("packageId", "createdAt");

ALTER TABLE "SponsoredAdvertisement" ADD CONSTRAINT "SponsoredAdvertisement_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AdvertisingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredAdvertisement" ADD CONSTRAINT "SponsoredAdvertisement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
