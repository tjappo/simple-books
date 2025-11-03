-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "processedInVatDeclarationId" TEXT;

-- CreateIndex
CREATE INDEX "invoices_processedInVatDeclarationId_idx" ON "invoices"("processedInVatDeclarationId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_processedInVatDeclarationId_fkey" FOREIGN KEY ("processedInVatDeclarationId") REFERENCES "vat_declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
