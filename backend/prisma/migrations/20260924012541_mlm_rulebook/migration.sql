-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "teamMonthlySales" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "teamSales" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "reversedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_idempotencyKey_key" ON "Sale"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_saleId_level_key" ON "Commission"("saleId", "level");

