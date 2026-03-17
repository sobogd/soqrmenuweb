-- AlterTable
ALTER TABLE "categories" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "items" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
