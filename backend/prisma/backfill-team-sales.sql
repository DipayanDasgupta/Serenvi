-- Backfill the lifetime/current-month team sales columns from the actual
-- completed-sale ledger, for distributors created before those columns existed.
--
-- Idempotent: it recomputes from source of truth (Sale) every run, so running
-- it twice cannot double-count. Safe to run on a live database.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backfill-team-sales.sql

BEGIN;

-- 1. Own / lifetime sales: every COMPLETED sale the distributor made.
UPDATE "Distributor" d
SET "totalSales" = agg.total
FROM (
  SELECT s."sellerId" AS id, COALESCE(SUM(s."saleAmount"), 0) AS total
  FROM "Sale" s
  WHERE s."orderStatus" = 'COMPLETED'
  GROUP BY s."sellerId"
) agg
WHERE d.id = agg.id
  AND d."totalSales" <> agg.total;

-- 2. Personal sales (level1Sales): sales made by direct recruits (Level 1).
UPDATE "Distributor" d
SET "level1Sales" = agg.total
FROM (
  SELECT child."sponsorId" AS id, COALESCE(SUM(s."saleAmount"), 0) AS total
  FROM "Sale" s
  JOIN "Distributor" child ON child.id = s."sellerId"
  WHERE s."orderStatus" = 'COMPLETED'
    AND child."sponsorId" IS NOT NULL
  GROUP BY child."sponsorId"
) agg
WHERE d.id = agg.id
  AND d."level1Sales" <> agg.total;

-- 3. Monthly team sales: sponsor's monthly personal sales for the current month.
UPDATE "Distributor" d
SET "monthlySales" = agg.total
FROM (
  SELECT child."sponsorId" AS id, COALESCE(SUM(s."saleAmount"), 0) AS total
  FROM "Sale" s
  JOIN "Distributor" child ON child.id = s."sellerId"
  WHERE s."orderStatus" = 'COMPLETED'
    AND child."sponsorId" IS NOT NULL
    AND s."createdAt" >= date_trunc('month', now())
  GROUP BY child."sponsorId"
) agg
WHERE d.id = agg.id
  AND d."monthlySales" <> agg.total;

-- 4. Lifetime team sales: every sale made by ANY descendant at depth 1-15.
UPDATE "Distributor" d
SET "teamSales" = agg.total
FROM (
  SELECT n."ancestorId" AS id, COALESCE(SUM(s."saleAmount"), 0) AS total
  FROM "MLMTreeNode" n
  JOIN "Sale" s ON s."sellerId" = n."descendantId"
  WHERE n.depth BETWEEN 1 AND 15
    AND s."orderStatus" = 'COMPLETED'
  GROUP BY n."ancestorId"
) agg
WHERE d.id = agg.id
  AND d."teamSales" <> agg.total;

-- 5. Current-month team sales: same, restricted to this calendar month.
UPDATE "Distributor" d
SET "teamMonthlySales" = agg.total
FROM (
  SELECT n."ancestorId" AS id, COALESCE(SUM(s."saleAmount"), 0) AS total
  FROM "MLMTreeNode" n
  JOIN "Sale" s ON s."sellerId" = n."descendantId"
  WHERE n.depth BETWEEN 1 AND 15
    AND s."orderStatus" = 'COMPLETED'
    AND s."createdAt" >= date_trunc('month', now())
  GROUP BY n."ancestorId"
) agg
WHERE d.id = agg.id
  AND d."teamMonthlySales" <> agg.total;

COMMIT;
