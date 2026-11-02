ALTER TABLE "ServiceCategory"
  ADD CONSTRAINT "ServiceCategory_leadCost_positive" CHECK ("leadCost" > 0);

ALTER TABLE "ServiceRequest"
  ADD CONSTRAINT "ServiceRequest_creditCost_positive" CHECK ("leadCreditCost" > 0),
  ADD CONSTRAINT "ServiceRequest_unlockLimits_valid" CHECK (
    "maxUnlocks" > 0 AND "unlockedCount" >= 0 AND "unlockedCount" <= "maxUnlocks"
  );

ALTER TABLE "CreditAccount"
  ADD CONSTRAINT "CreditAccount_balance_nonnegative" CHECK ("balance" >= 0);

ALTER TABLE "CreditLedgerEntry"
  ADD CONSTRAINT "CreditLedgerEntry_amount_nonzero" CHECK ("amount" <> 0),
  ADD CONSTRAINT "CreditLedgerEntry_balance_nonnegative" CHECK ("balanceAfter" >= 0);

ALTER TABLE "CreditPackage"
  ADD CONSTRAINT "CreditPackage_values_positive" CHECK ("credits" > 0 AND "amountInCents" > 0);

ALTER TABLE "CreditPurchase"
  ADD CONSTRAINT "CreditPurchase_values_positive" CHECK ("credits" > 0 AND "amountInCents" > 0);

ALTER TABLE "LeadUnlock"
  ADD CONSTRAINT "LeadUnlock_credits_positive" CHECK ("creditsCharged" > 0);

ALTER TABLE "Rating"
  ADD CONSTRAINT "Rating_score_range" CHECK ("score" BETWEEN 1 AND 5);
