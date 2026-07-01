/*
  Warnings:

  - You are about to drop the column `kycVerified` on the `Distributor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Distributor" DROP COLUMN "kycVerified",
ADD COLUMN     "bankOtp" TEXT,
ADD COLUMN     "bankOtpExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "sizes" TEXT;

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_distributorId_idx" ON "CartItem"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_distributorId_productId_key" ON "CartItem"("distributorId", "productId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
