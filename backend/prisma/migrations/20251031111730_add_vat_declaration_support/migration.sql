-- CreateEnum
CREATE TYPE "VatCategory" AS ENUM ('DOMESTIC_HIGH', 'DOMESTIC_LOW', 'DOMESTIC_OTHER', 'ZERO', 'EXPORT_NON_EU', 'IC_SUPPLY', 'IC_DISTANCE_SALES', 'REVERSE_CHARGE_NL', 'REVERSE_CHARGE_EU', 'IMPORT_NON_EU', 'OTHER_FOREIGN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "DeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'FINAL');

-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "isDeductible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reverseChargeNote" TEXT,
ADD COLUMN     "vatCategory" "VatCategory" NOT NULL DEFAULT 'DOMESTIC_HIGH';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "vat_declarations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "box1a_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box1a_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box1b_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box1b_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box1c_base" DOUBLE PRECISION,
    "box1c_vat" DOUBLE PRECISION,
    "box1d_vat" DOUBLE PRECISION,
    "box1e_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box2a_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box2a_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box2b_base" DOUBLE PRECISION,
    "box3a_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box3b_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box3c_base" DOUBLE PRECISION,
    "box4a_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box4a_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box4b_base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box4b_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box4c_base" DOUBLE PRECISION,
    "box4c_vat" DOUBLE PRECISION,
    "box5a" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box5b" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box5d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_configurations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hasFullDeductionRight" BOOLEAN NOT NULL DEFAULT true,
    "horecaRule" BOOLEAN NOT NULL DEFAULT false,
    "privateUseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customRates" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_declarations_userId_idx" ON "vat_declarations"("userId");

-- CreateIndex
CREATE INDEX "vat_declarations_startDate_endDate_idx" ON "vat_declarations"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "vat_declarations_userId_period_key" ON "vat_declarations"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "vat_configurations_userId_key" ON "vat_configurations"("userId");

-- CreateIndex
CREATE INDEX "invoice_line_items_vatCategory_idx" ON "invoice_line_items"("vatCategory");

-- CreateIndex
CREATE INDEX "invoices_userId_status_idx" ON "invoices"("userId", "status");

-- CreateIndex
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");

-- AddForeignKey
ALTER TABLE "vat_declarations" ADD CONSTRAINT "vat_declarations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_configurations" ADD CONSTRAINT "vat_configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
