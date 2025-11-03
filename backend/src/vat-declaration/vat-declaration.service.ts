import {Injectable, NotFoundException} from '@nestjs/common';
import {InvoiceRepository, VatDeclarationRepository, VatConfigurationRepository} from '../repositories';
import {CalculateDeclarationDto} from './dto/calculate-declaration.dto';
import {UpdateDeclarationDto} from './dto/update-declaration.dto';
import {VatCategory, InvoiceStatus} from '@prisma/client';
import Decimal from 'decimal.js';
import {PDFDocument, rgb, StandardFonts} from '@cantoo/pdf-lib';

interface BoxAggregation {
    base: number;
    vat: number;
}

@Injectable()
export class VatDeclarationService {
    constructor(
        private invoiceRepository: InvoiceRepository,
        private vatDeclarationRepository: VatDeclarationRepository,
        private vatConfigurationRepository: VatConfigurationRepository,
    ) {
    }

    async calculateDeclaration(userId: string, dto: CalculateDeclarationDto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);

        // Generate period string if not provided
        const period = dto.period || this.generatePeriodString(startDate, dto.periodType);

        // Check if a FINAL declaration already exists for this period
        const existing = await this.vatDeclarationRepository.findUnique({
            userId_period: {
                userId,
                period,
            },
        });

        if (existing && existing.status === 'FINAL') {
            throw new NotFoundException('Cannot recalculate a finalized declaration. The declaration for this period is already final.');
        }

        // Fetch all POSTED invoices that haven't been processed yet
        const invoices = await this.invoiceRepository.findUnprocessedInvoices(
            userId,
            startDate,
            endDate,
        );

        const salesInvoices = invoices.filter((inv) => inv.type === 'SALES');
        const purchaseInvoices = invoices.filter((inv) => inv.type === 'PURCHASE');

        // Calculate Box 1a: Domestic high rate (21%)
        const box1a = this.aggregateLinesByCategory(
            salesInvoices,
            VatCategory.DOMESTIC_HIGH,
        );

        // Calculate Box 1b: Domestic low rate (9%)
        const box1b = this.aggregateLinesByCategory(
            salesInvoices,
            VatCategory.DOMESTIC_LOW,
        );

        // Calculate Box 1c: Other NL rates
        const box1c = this.aggregateLinesByCategory(
            salesInvoices,
            VatCategory.DOMESTIC_OTHER,
        );

        // Calculate Box 1e: Zero rate / exports
        const box1e_base = this.aggregateBaseByCategory(
            salesInvoices,
            VatCategory.ZERO,
        );

        // Calculate Box 2a: Reverse charge NL
        const box2a = this.aggregateLinesByCategory(
            purchaseInvoices,
            VatCategory.REVERSE_CHARGE_NL,
        );

        // Calculate Box 3a: Export non-EU
        const box3a_base = this.aggregateBaseByCategory(
            salesInvoices,
            VatCategory.EXPORT_NON_EU,
        );

        // Calculate Box 3b: Intra-community supply
        const box3b_base = this.aggregateBaseByCategory(
            salesInvoices,
            VatCategory.IC_SUPPLY,
        );

        // Calculate Box 3c: Distance sales
        const box3c_base = this.aggregateBaseByCategory(
            salesInvoices,
            VatCategory.IC_DISTANCE_SALES,
        );

        // Calculate Box 4a: Import/Article 23
        const box4a = this.aggregateLinesByCategory(
            purchaseInvoices,
            VatCategory.IMPORT_NON_EU,
        );

        // Calculate Box 4b: EU acquisitions
        const box4b = this.aggregateLinesByCategory(
            purchaseInvoices,
            VatCategory.REVERSE_CHARGE_EU,
        );

        // Calculate Box 4c: Other foreign
        const box4c = this.aggregateLinesByCategory(
            purchaseInvoices,
            VatCategory.OTHER_FOREIGN,
        );

        // Calculate Box 5a: Total VAT due (sum of already-rounded individual boxes)
        const box5a = new Decimal(box1a.vat)
            .plus(box1b.vat)
            .plus(box1c.vat || 0)
            .plus(box2a.vat)
            .plus(box4a.vat)
            .plus(box4b.vat)
            .plus(box4c.vat || 0)
            .toNumber();

        // Calculate Box 5b: Deductible VAT (sum of already-rounded amounts)
        const box5b = await this.calculateDeductibleVat(
            purchaseInvoices,
            box2a.vat,
            box4a.vat,
            box4b.vat,
            userId,
        );

        // Calculate Box 5d: Net amount to pay/refund
        const box5d = new Decimal(box5a).minus(box5b).toNumber();

        // Return calculated declaration data without saving to database
        // This allows users to recalculate as many times as they want without side effects
        return {
            userId,
            period,
            periodType: dto.periodType,
            startDate,
            endDate,
            box1a_base: box1a.base,
            box1a_vat: box1a.vat,
            box1b_base: box1b.base,
            box1b_vat: box1b.vat,
            box1c_base: box1c.base || null,
            box1c_vat: box1c.vat || null,
            box1d_vat: null, // Manual field, defaults to null
            box1e_base: box1e_base,
            box2a_base: box2a.base,
            box2a_vat: box2a.vat,
            box3a_base: box3a_base,
            box3b_base: box3b_base,
            box3c_base: box3c_base || null,
            box4a_base: box4a.base,
            box4a_vat: box4a.vat,
            box4b_base: box4b.base,
            box4b_vat: box4b.vat,
            box4c_base: box4c.base || null,
            box4c_vat: box4c.vat || null,
            box5a: box5a,
            box5b: box5b,
            box5d: box5d,
            status: 'DRAFT' as const,
        };
    }

    async getDeclaration(userId: string, period: string) {
        const declaration = await this.vatDeclarationRepository.findUnique({
            userId_period: {
                userId,
                period,
            },
        });

        if (!declaration) {
            throw new NotFoundException(`Declaration for period ${period} not found`);
        }

        return declaration;
    }

    async finalizeDeclaration(userId: string, declarationData: any) {
        const period = declarationData.period;

        // Check if a FINAL declaration already exists for this period
        const existing = await this.vatDeclarationRepository.findUnique({
            userId_period: {
                userId,
                period,
            },
        });

        if (existing && existing.status === 'FINAL') {
            throw new NotFoundException('A finalized declaration already exists for this period.');
        }

        // Fetch all unprocessed invoices for this period to mark them as processed
        const invoices = await this.invoiceRepository.findUnprocessedInvoices(
            userId,
            declarationData.startDate,
            declarationData.endDate,
        );

        const invoiceIds = invoices.map(inv => inv.id);

        // Save the declaration as FINAL and mark invoices
        return this.vatDeclarationRepository.createOrUpdateWithInvoices(
            existing,
            {
                user: { connect: { id: userId } },
                period: declarationData.period,
                periodType: declarationData.periodType,
                startDate: declarationData.startDate,
                endDate: declarationData.endDate,
                box1a_base: declarationData.box1a_base,
                box1a_vat: declarationData.box1a_vat,
                box1b_base: declarationData.box1b_base,
                box1b_vat: declarationData.box1b_vat,
                box1c_base: declarationData.box1c_base,
                box1c_vat: declarationData.box1c_vat,
                box1d_vat: declarationData.box1d_vat,
                box1e_base: declarationData.box1e_base,
                box2a_base: declarationData.box2a_base,
                box2a_vat: declarationData.box2a_vat,
                box3a_base: declarationData.box3a_base,
                box3b_base: declarationData.box3b_base,
                box3c_base: declarationData.box3c_base,
                box4a_base: declarationData.box4a_base,
                box4a_vat: declarationData.box4a_vat,
                box4b_base: declarationData.box4b_base,
                box4b_vat: declarationData.box4b_vat,
                box4c_base: declarationData.box4c_base,
                box4c_vat: declarationData.box4c_vat,
                box5a: declarationData.box5a,
                box5b: declarationData.box5b,
                box5d: declarationData.box5d,
                status: 'FINAL',
                notes: declarationData.notes,
            },
            invoiceIds,
        );
    }

    async updateDeclaration(
        userId: string,
        id: string,
        dto: UpdateDeclarationDto,
    ) {
        const declaration = await this.vatDeclarationRepository.findFirst({
            id,
            userId,
        });

        if (!declaration) {
            throw new NotFoundException('Declaration not found');
        }

        // Prevent modification of finalized declarations
        if (declaration.status === 'FINAL') {
            throw new NotFoundException('Cannot modify a finalized declaration');
        }

        // Recalculate box 5a and 5d if manual fields are updated
        let box5a = declaration.box5a;
        let box5d = declaration.box5d;

        if (dto.box1c_vat !== undefined || dto.box1d_vat !== undefined) {
            box5a = new Decimal(declaration.box1a_vat)
                .plus(declaration.box1b_vat)
                .plus(dto.box1c_vat ?? declaration.box1c_vat ?? 0)
                .plus(dto.box1d_vat ?? declaration.box1d_vat ?? 0)
                .plus(declaration.box2a_vat)
                .plus(declaration.box4a_vat)
                .plus(declaration.box4b_vat)
                .plus(declaration.box4c_vat ?? 0)
                .toNumber();

            box5d = new Decimal(box5a).minus(declaration.box5b).toNumber();
        }

        const updateData: any = {
            ...dto,
            box5a,
            box5d,
        };

        // Cast status to the correct enum type if provided
        if (dto.status) {
            updateData.status = dto.status as any;
        }

        return this.vatDeclarationRepository.update(
            { id },
            updateData,
        );
    }

    async listDeclarations(userId: string) {
        return this.vatDeclarationRepository.findMany(
            { userId },
            { startDate: 'desc' },
        );
    }

    async getAvailablePeriods(userId: string) {
        const firstInvoice = await this.invoiceRepository.findFirst(
            { userId, status: InvoiceStatus.POSTED },
            undefined,
            { issueDate: 'asc' },
        );

        const lastInvoice = await this.invoiceRepository.findFirst(
            { userId, status: InvoiceStatus.POSTED },
            undefined,
            { issueDate: 'desc' },
        );

        if (!firstInvoice || !lastInvoice) {
            return [];
        }

        const periods = [];
        const start = new Date(firstInvoice.issueDate);
        const end = new Date(lastInvoice.issueDate);

        // Generate monthly periods
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
            periods.push({
                period: this.generatePeriodString(current, 'MONTHLY'),
                periodType: 'MONTHLY',
                startDate: new Date(current.getFullYear(), current.getMonth(), 1),
                endDate: new Date(current.getFullYear(), current.getMonth() + 1, 0),
            });
            current.setMonth(current.getMonth() + 1);
        }

        return periods;
    }

    async generatePdf(userId: string, declarationId: string): Promise<Buffer> {
        const declaration = await this.vatDeclarationRepository.findFirst({
            id: declarationId,
            userId,
        });

        if (!declaration) {
            throw new NotFoundException('Declaration not found');
        }

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const {width, height} = page.getSize();
        let yPosition = height - 50;

        const formatCurrency = (amount: number | null): string => {
            if (amount === null || amount === undefined) return '€ 0';
            return new Intl.NumberFormat('nl-NL', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
        };

        // Title
        page.drawText('BTW-Aangifte', {
            x: 50,
            y: yPosition,
            size: 24,
            font: boldFont,
            color: rgb(0, 0, 0),
        });
        yPosition -= 30;

        // Period and status
        page.drawText(`Periode: ${declaration.period}`, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
        });
        page.drawText(`Status: ${declaration.status}`, {
            x: 400,
            y: yPosition,
            size: 12,
            font: font,
        });
        yPosition -= 40;

        // Helper function to draw a box
        const drawBox = (label: string, base?: number | null, vat?: number | null) => {
            if (yPosition < 100) {
                // Add new page if running out of space
                const newPage = pdfDoc.addPage([595.28, 841.89]);
                yPosition = height - 50;
                return;
            }

            page.drawText(label, {
                x: 50,
                y: yPosition,
                size: 10,
                font: font,
            });

            if (base !== undefined && base !== null) {
                page.drawText(`Grondslag: ${formatCurrency(base)}`, {
                    x: 350,
                    y: yPosition,
                    size: 10,
                    font: font,
                });
            }

            if (vat !== undefined && vat !== null) {
                page.drawText(`BTW: ${formatCurrency(vat)}`, {
                    x: 470,
                    y: yPosition,
                    size: 10,
                    font: boldFont,
                });
            }

            yPosition -= 20;
        };

        // Rubriek 1
        page.drawText('Rubriek 1: Prestaties binnenland', {
            x: 50,
            y: yPosition,
            size: 14,
            font: boldFont,
        });
        yPosition -= 25;

        drawBox('1a. Leveringen/diensten belast met hoog tarief (21%)', declaration.box1a_base, declaration.box1a_vat);
        drawBox('1b. Leveringen/diensten belast met laag tarief (9%)', declaration.box1b_base, declaration.box1b_vat);
        if (declaration.box1c_base || declaration.box1c_vat) {
            drawBox('1c. Prestaties overige tarieven', declaration.box1c_base, declaration.box1c_vat);
        }
        if (declaration.box1d_vat) {
            drawBox('1d. Privégebruik', undefined, declaration.box1d_vat);
        }
        drawBox('1e. Leveringen/diensten belast met 0% / verlegd', declaration.box1e_base, undefined);
        yPosition -= 10;

        // Rubriek 2
        if (declaration.box2a_vat > 0) {
            page.drawText('Rubriek 2: Verleggingsregelingen binnenland', {
                x: 50,
                y: yPosition,
                size: 14,
                font: boldFont,
            });
            yPosition -= 25;
            drawBox('2a. Leveringen/diensten waarbij de BTW naar u is verlegd', declaration.box2a_base, declaration.box2a_vat);
            yPosition -= 10;
        }

        // Rubriek 3
        if (declaration.box3a_base > 0 || declaration.box3b_base > 0 || declaration.box3c_base) {
            page.drawText('Rubriek 3: Prestaties naar of in het buitenland', {
                x: 50,
                y: yPosition,
                size: 14,
                font: boldFont,
            });
            yPosition -= 25;
            if (declaration.box3a_base > 0) {
                drawBox('3a. Leveringen buiten de EU (uitvoer)', declaration.box3a_base, undefined);
            }
            if (declaration.box3b_base > 0) {
                drawBox('3b. Leveringen/diensten naar of in EU-landen', declaration.box3b_base, undefined);
            }
            if (declaration.box3c_base) {
                drawBox('3c. Afstandsverkopen binnen de EU', declaration.box3c_base, undefined);
            }
            yPosition -= 10;
        }

        // Rubriek 4
        if (declaration.box4a_vat > 0 || declaration.box4b_vat > 0) {
            page.drawText('Rubriek 4: Prestaties vanuit het buitenland aan u verricht', {
                x: 50,
                y: yPosition,
                size: 14,
                font: boldFont,
            });
            yPosition -= 25;
            if (declaration.box4a_vat > 0) {
                drawBox('4a. Leveringen/diensten van buiten de EU', declaration.box4a_base, declaration.box4a_vat);
            }
            if (declaration.box4b_vat > 0) {
                drawBox('4b. Verwervingen uit EU-landen', declaration.box4b_base, declaration.box4b_vat);
            }
            yPosition -= 10;
        }

        // Rubriek 5
        page.drawText('Rubriek 5: Berekening totalen', {
            x: 50,
            y: yPosition,
            size: 14,
            font: boldFont,
        });
        yPosition -= 25;

        drawBox('5a. Verschuldigde omzetbelasting (BTW)', undefined, declaration.box5a);
        drawBox('5b. Voorbelasting', undefined, declaration.box5b);
        yPosition -= 10;

        // Draw the final total with a box
        page.drawRectangle({
            x: 45,
            y: yPosition - 5,
            width: 500,
            height: 25,
            borderColor: rgb(0, 0, 0),
            borderWidth: 2,
        });

        const finalLabel = declaration.box5d >= 0 ? '5d. Te betalen' : '5d. Terug te vragen';
        page.drawText(finalLabel, {
            x: 50,
            y: yPosition,
            size: 12,
            font: boldFont,
        });
        page.drawText(formatCurrency(Math.abs(declaration.box5d)), {
            x: 450,
            y: yPosition,
            size: 14,
            font: boldFont,
        });

        // Generate PDF as buffer
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }

    private aggregateLinesByCategory(
        invoices: any[],
        category: VatCategory,
        roundVatDown: boolean = true,
    ): BoxAggregation {
        let base = new Decimal(0);
        let vat = new Decimal(0);

        for (const invoice of invoices) {
            for (const line of invoice.lineItems) {
                if (line.vatCategory === category) {
                    base = base.plus(line.subtotal);
                    vat = vat.plus(line.vatAmount);
                }
            }
        }

        return {
            base: base.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
            vat: vat.toDP(0, roundVatDown ? Decimal.ROUND_DOWN : Decimal.ROUND_UP).toNumber(),
        };
    }

    private aggregateBaseByCategory(
        invoices: any[],
        category: VatCategory,
    ): number {
        let base = new Decimal(0);

        for (const invoice of invoices) {
            for (const line of invoice.lineItems) {
                if (line.vatCategory === category) {
                    base = base.plus(line.subtotal);
                }
            }
        }

        return base.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    private async calculateDeductibleVat(
        purchaseInvoices: any[],
        box2aVat: number,
        box4aVat: number,
        box4bVat: number,
        userId: string,
    ): Promise<number> {
        // Get user's VAT configuration
        const config = await this.vatConfigurationRepository.findByUserId(userId);

        // Default to full deduction right if no config exists
        const hasFullDeductionRight = config?.hasFullDeductionRight ?? true;

        let deductibleVat = new Decimal(0);

        // Add VAT from all purchase invoices
        // Sum all deductible VAT first, then round UP the total (favorable for deduction)
        for (const invoice of purchaseInvoices) {
            for (const line of invoice.lineItems) {
                if (line.isDeductible) {
                    // Check if this is a reverse charge category
                    const isReverseCharge =
                        line.vatCategory === VatCategory.REVERSE_CHARGE_NL ||
                        line.vatCategory === VatCategory.REVERSE_CHARGE_EU ||
                        line.vatCategory === VatCategory.IMPORT_NON_EU;

                    // Only include reverse charge if user has full deduction right
                    if (isReverseCharge && !hasFullDeductionRight) {
                        continue;
                    }

                    // Apply deductibility percentage to the VAT amount
                    const deductibilityMultiplier = new Decimal(line.deductibilityPercentage || 100).dividedBy(100);
                    const adjustedVatAmount = new Decimal(line.vatAmount).times(deductibilityMultiplier);

                    // Add the adjusted VAT amount to the total (will be rounded UP at the end)
                    deductibleVat = deductibleVat.plus(adjustedVatAmount);
                }
            }
        }

        // Round UP the total deductible VAT (favorable for taxpayer)
        return deductibleVat.toDP(0, Decimal.ROUND_UP).toNumber();
    }

    private generatePeriodString(date: Date, periodType: string): string {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        if (periodType === 'MONTHLY') {
            return `${year}-${month.toString().padStart(2, '0')}`;
        } else {
            // QUARTERLY
            const quarter = Math.ceil(month / 3);
            return `${year}-Q${quarter}`;
        }
    }

    async getInvoicesForBox(userId: string, declarationId: string, box: string) {
        // Get the declaration to find the period
        const declaration = await this.vatDeclarationRepository.findFirst({
            id: declarationId,
            userId,
        });

        if (!declaration) {
            throw new NotFoundException('Declaration not found');
        }

        // Map box identifiers to VAT categories
        const boxCategoryMap: { [key: string]: VatCategory[] } = {
            '1a': [VatCategory.DOMESTIC_HIGH],
            '1b': [VatCategory.DOMESTIC_LOW],
            '1c': [VatCategory.DOMESTIC_OTHER],
            '1e': [VatCategory.ZERO],
            '2a': [VatCategory.REVERSE_CHARGE_NL],
            '3a': [VatCategory.EXPORT_NON_EU],
            '3b': [VatCategory.IC_SUPPLY],
            '3c': [VatCategory.IC_DISTANCE_SALES],
            '4a': [VatCategory.IMPORT_NON_EU],
            '4b': [VatCategory.REVERSE_CHARGE_EU],
            '4c': [VatCategory.OTHER_FOREIGN],
        };

        const categories = boxCategoryMap[box];
        if (!categories) {
            throw new NotFoundException(`Invalid box: ${box}`);
        }

        // Determine invoice type based on box
        const invoiceType = ['3a', '3b', '3c', '1a', '1b', '1c', '1e'].includes(box) ? 'SALES' : 'PURCHASE';

        // For finalized declarations, only show invoices that were processed in this declaration
        return this.invoiceRepository.findMany({
            userId,
            type: invoiceType,
            processedInVatDeclarationId: declarationId,
            lineItems: {
                some: {
                    vatCategory: {
                        in: categories as any,
                    },
                },
            },
        }, {
            lineItems: {
                where: {
                    vatCategory: {
                        in: categories as any,
                    },
                },
            },
        }, {
            issueDate: 'asc',
        });
    }

    async getInvoicesForBoxByPeriod(
        userId: string,
        startDate: Date,
        endDate: Date,
        box: string,
    ) {
        // Map box identifiers to VAT categories
        const boxCategoryMap: { [key: string]: VatCategory[] } = {
            '1a': [VatCategory.DOMESTIC_HIGH],
            '1b': [VatCategory.DOMESTIC_LOW],
            '1c': [VatCategory.DOMESTIC_OTHER],
            '1e': [VatCategory.ZERO],
            '2a': [VatCategory.REVERSE_CHARGE_NL],
            '3a': [VatCategory.EXPORT_NON_EU],
            '3b': [VatCategory.IC_SUPPLY],
            '3c': [VatCategory.IC_DISTANCE_SALES],
            '4a': [VatCategory.IMPORT_NON_EU],
            '4b': [VatCategory.REVERSE_CHARGE_EU],
            '4c': [VatCategory.OTHER_FOREIGN],
        };

        const categories = boxCategoryMap[box];
        if (!categories) {
            throw new NotFoundException(`Invalid box: ${box}`);
        }

        // Determine invoice type based on box
        const invoiceType = ['3a', '3b', '3c', '1a', '1b', '1c', '1e'].includes(box) ? 'SALES' : 'PURCHASE';

        // Fetch invoices in the period with matching categories, including late invoices
        return this.invoiceRepository.findMany({
            userId,
            status: InvoiceStatus.POSTED,
            type: invoiceType,
            processedInVatDeclarationId: null,
            OR: [
                {
                    issueDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                {
                    issueDate: {
                        lt: startDate,
                    },
                },
            ],
            lineItems: {
                some: {
                    vatCategory: {
                        in: categories as any,
                    },
                },
            },
        }, {
            lineItems: {
                where: {
                    vatCategory: {
                        in: categories as any,
                    },
                },
            },
        }, {
            issueDate: 'asc',
        });
    }
}
