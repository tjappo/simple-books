-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "assets_invoiceId_idx" ON "assets"("invoiceId");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
