-- CreateEnum
CREATE TYPE "ReverseChargeLocation" AS ENUM ('EU', 'NON_EU');

-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reverseChargeLocation" "ReverseChargeLocation";
