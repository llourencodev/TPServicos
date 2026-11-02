CREATE TABLE "ServiceRequestStatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "previousStatus" "RequestStatus",
    "status" "RequestStatus" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceRequestStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceRequestStatusHistory_requestId_createdAt_idx"
  ON "ServiceRequestStatusHistory"("requestId", "createdAt");

CREATE INDEX "ServiceRequestStatusHistory_actorId_createdAt_idx"
  ON "ServiceRequestStatusHistory"("actorId", "createdAt");

ALTER TABLE "ServiceRequestStatusHistory"
  ADD CONSTRAINT "ServiceRequestStatusHistory_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceRequestStatusHistory"
  ADD CONSTRAINT "ServiceRequestStatusHistory_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
