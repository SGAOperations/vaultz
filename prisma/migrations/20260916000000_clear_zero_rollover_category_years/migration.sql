-- Rollover balances are derived from the previous year whenever a year has no
-- stored CategoryYear row. A stored $0 suppresses that derivation and pins the
-- year to zero, which is how rollover designations ended up reporting a $0
-- balance for a year they should have opened with the previous year's leftover.
--
-- The create-year dialog used to write these zeros whenever it could not find a
-- previous year, so they carry no intent. Soft-delete them for ROLLOVER
-- designations only; every non-zero amount is left alone, and deletedAt makes
-- this reversible.
UPDATE "CategoryYear" AS cy
SET "deletedAt" = NOW(), "updatedAt" = NOW()
FROM "Category" AS c, "Designation" AS d
WHERE cy."categoryId" = c."id"
  AND c."designationId" = d."id"
  AND d."budgetResetBehavior" = 'ROLLOVER'
  AND cy."deletedAt" IS NULL
  AND cy."amount" = 0;
