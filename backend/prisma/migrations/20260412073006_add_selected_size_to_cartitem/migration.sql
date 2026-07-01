/*
  Warnings:

  - A unique constraint covering the columns `[distributorId,productId,selectedSize]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CartItem_distributorId_productId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "selectedSize" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_distributorId_productId_selectedSize_key" ON "CartItem"("distributorId", "productId", "selectedSize");
