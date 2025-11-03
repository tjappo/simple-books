-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "deductibilityPercentage" DOUBLE PRECISION NOT NULL DEFAULT 100;
