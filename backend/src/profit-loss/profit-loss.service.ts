import { Injectable } from '@nestjs/common';
import { InvoiceRepository } from '../repositories';
import { CalculateProfitLossDto, ProfitLossPeriodType } from './dto/calculate-profit-loss.dto';
import { InvoiceStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { PDFDocument, rgb, StandardFonts } from '@cantoo/pdf-lib';

export interface ProfitLossStatement {
    period: string;
    periodType: ProfitLossPeriodType;
    startDate: Date;
    endDate: Date;
    revenue: number;
    expenses: number;
    profit: number;
}

@Injectable()
export class ProfitLossService {
    constructor(private invoiceRepository: InvoiceRepository) {}

    async calculateProfitLoss(
        userId: string,
        dto: CalculateProfitLossDto,
    ): Promise<ProfitLossStatement> {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);

        // Generate period string if not provided
        const period = dto.period || this.generatePeriodString(startDate, dto.periodType || ProfitLossPeriodType.YEARLY);

        // Fetch all POSTED invoices in the period
        const invoices = await this.invoiceRepository.findMany(
            {
                userId,
                status: InvoiceStatus.POSTED,
                issueDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            { lineItems: true },
            { issueDate: 'asc' },
        );

        const salesInvoices = invoices.filter((inv) => inv.type === 'SALES');
        const purchaseInvoices = invoices.filter((inv) => inv.type === 'PURCHASE');

        // Calculate total revenue (from sales invoices)
        let revenue = new Decimal(0);
        for (const invoice of salesInvoices) {
            for (const line of invoice.lineItems) {
                // Revenue is based on subtotal (excluding VAT)
                revenue = revenue.plus(line.subtotal);
            }
        }

        // Calculate total expenses (from purchase invoices)
        let expenses = new Decimal(0);
        for (const invoice of purchaseInvoices) {
            for (const line of invoice.lineItems) {
                // Apply deductibility percentage to expenses
                const deductibilityMultiplier = new Decimal(line.deductibilityPercentage || 100).dividedBy(100);
                const deductibleAmount = new Decimal(line.subtotal).times(deductibilityMultiplier);
                expenses = expenses.plus(deductibleAmount);
            }
        }

        // Calculate profit (revenue - expenses)
        const profit = revenue.minus(expenses);

        return {
            period,
            periodType: dto.periodType || ProfitLossPeriodType.YEARLY,
            startDate,
            endDate,
            revenue: revenue.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
            expenses: expenses.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
            profit: profit.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        };
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

        // Generate yearly periods (default)
        let currentYear = start.getFullYear();
        const endYear = end.getFullYear();
        while (currentYear <= endYear) {
            periods.push({
                period: `${currentYear}`,
                periodType: ProfitLossPeriodType.YEARLY,
                startDate: new Date(currentYear, 0, 1),
                endDate: new Date(currentYear, 11, 31),
            });
            currentYear++;
        }

        return periods;
    }

    async generatePdf(userId: string, statement: ProfitLossStatement): Promise<Buffer> {
        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { width, height } = page.getSize();
        let yPosition = height - 50;

        const formatCurrency = (amount: number): string => {
            return new Intl.NumberFormat('nl-NL', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount);
        };

        // Title
        page.drawText('Winst- en Verliesrekening', {
            x: 50,
            y: yPosition,
            size: 24,
            font: boldFont,
            color: rgb(0, 0, 0),
        });
        yPosition -= 30;

        // Period
        page.drawText(`Periode: ${statement.period}`, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
        });
        yPosition -= 10;

        const startDateStr = statement.startDate.toLocaleDateString('nl-NL');
        const endDateStr = statement.endDate.toLocaleDateString('nl-NL');
        page.drawText(`${startDateStr} - ${endDateStr}`, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
        });
        yPosition -= 40;

        // Revenue
        page.drawText('Omzet', {
            x: 50,
            y: yPosition,
            size: 14,
            font: boldFont,
        });
        page.drawText(formatCurrency(statement.revenue), {
            x: 400,
            y: yPosition,
            size: 14,
            font: font,
        });
        yPosition -= 30;

        // Expenses
        page.drawText('Kosten', {
            x: 50,
            y: yPosition,
            size: 14,
            font: boldFont,
        });
        page.drawText(formatCurrency(statement.expenses), {
            x: 400,
            y: yPosition,
            size: 14,
            font: font,
        });
        yPosition -= 40;

        // Draw line
        page.drawLine({
            start: { x: 50, y: yPosition },
            end: { x: width - 50, y: yPosition },
            thickness: 2,
            color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        // Profit/Loss
        const profitLabel = statement.profit >= 0 ? 'Winst' : 'Verlies';
        page.drawText(profitLabel, {
            x: 50,
            y: yPosition,
            size: 16,
            font: boldFont,
        });
        page.drawText(formatCurrency(Math.abs(statement.profit)), {
            x: 400,
            y: yPosition,
            size: 16,
            font: boldFont,
            color: statement.profit >= 0 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0),
        });

        // Generate PDF as buffer
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }

    private generatePeriodString(date: Date, periodType: ProfitLossPeriodType): string {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        if (periodType === ProfitLossPeriodType.YEARLY) {
            return `${year}`;
        } else if (periodType === ProfitLossPeriodType.MONTHLY) {
            return `${year}-${month.toString().padStart(2, '0')}`;
        } else {
            // QUARTERLY
            const quarter = Math.ceil(month / 3);
            return `${year}-Q${quarter}`;
        }
    }
}
