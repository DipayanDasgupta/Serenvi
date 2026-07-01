/*
  Warnings:

  - A unique constraint covering the columns `[distributorId,productId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CartItem_distributorId_productId_selectedSize_key";

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_distributorId_productId_key" ON "CartItem"("distributorId", "productId");
