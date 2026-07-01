-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "currentLeadershipRank" INTEGER DEFAULT 0,
ADD COLUMN     "currentLeadershipSalary" DECIMAL(15,2) NOT NULL DEFAULT 0;
