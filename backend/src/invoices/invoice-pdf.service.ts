import {Injectable} from '@nestjs/common';
import {PDFDocument, rgb, StandardFonts} from '@cantoo/pdf-lib';
import Decimal from 'decimal.js';

export interface InvoiceData {
    // Company info
    companyName: string;
    companyKvk: string;
    companyBtw: string;
    companyIban: string;
    companyAddress: string;

    // Invoice info
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;

    // Customer info
    customerName: string;
    customerAddress?: string;
    customerKvk?: string;
    customerBtw?: string;

    // Line items
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        vatRate: number;
        subtotal: number;
        vatAmount: number;
        total: number;
    }>;
}

@Injectable()
export class InvoicePdfService {
    async generateSalesInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4 size
        const {width, height} = page.getSize();

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Color scheme - minimal black and gray
        const textColor = rgb(0, 0, 0);
        const grayColor = rgb(0.6, 0.6, 0.6);
        const lightGrayColor = rgb(0.85, 0.85, 0.85);

        let yPosition = height - 50;

        // Top horizontal line
        page.drawLine({
            start: {x: 40, y: yPosition},
            end: {x: width - 40, y: yPosition},
            thickness: 2,
            color: textColor,
        });

        yPosition -= 30;

        // Company info (right side, no box)
        let companyY = yPosition;

        page.drawText(data.companyName.toUpperCase(), {
            x: width - 250,
            y: companyY,
            size: 11,
            font: boldFont,
            color: textColor,
        });
        companyY -= 14;

        const companyAddressLines = data.companyAddress.split('\n');
        for (const line of companyAddressLines) {
            page.drawText(line, {
                x: width - 250,
                y: companyY,
                size: 9,
                font,
                color: textColor,
            });
            companyY -= 12;
        }

        companyY -= 8;

        // KVK and BTW numbers for company
        page.drawText(`KvK: ${data.companyKvk}`, {
            x: width - 250,
            y: companyY,
            size: 8,
            font,
            color: textColor,
        });
        companyY -= 11;

        if (data.companyBtw) {
            page.drawText(`BTW: ${data.companyBtw}`, {
                x: width - 250,
                y: companyY,
                size: 8,
                font,
                color: textColor,
            });
        }

        // Title "Factuur" on left
        yPosition -= 50;
        page.drawText('Factuur', {
            x: 50,
            y: yPosition,
            size: 20,
            font,
            color: textColor,
        });

        yPosition -= 40;

        // Customer info (left side, no box)
        page.drawText(data.customerName, {
            x: 50,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: textColor,
        });
        yPosition -= 13;

        if (data.customerAddress) {
            const customerAddressLines = data.customerAddress.split('\n');
            for (const line of customerAddressLines) {
                page.drawText(line, {
                    x: 50,
                    y: yPosition,
                    size: 9,
                    font,
                    color: textColor,
                });
                yPosition -= 12;
            }
        }

        // Customer KVK and BTW numbers (for business customers)
        if (data.customerKvk || data.customerBtw) {
            yPosition -= 5;

            if (data.customerKvk) {
                page.drawText(`KvK: ${data.customerKvk}`, {
                    x: 50,
                    y: yPosition,
                    size: 9,
                    font,
                    color: textColor,
                });
                yPosition -= 13;
            }

            if (data.customerBtw) {
                page.drawText(`BTW: ${data.customerBtw}`, {
                    x: 50,
                    y: yPosition,
                    size: 9,
                    font,
                    color: textColor,
                });
                yPosition -= 13;
            }
        }

        yPosition -= 30;

        // Date and location
        page.drawText(`Rotterdam, ${this.formatDate(data.issueDate)}`, {
            x: 50,
            y: yPosition,
            size: 9,
            font,
            color: textColor,
        });

        yPosition -= 25;

        // Invoice details
        page.drawText('Factuurnummer', {
            x: 50,
            y: yPosition,
            size: 9,
            font,
            color: textColor,
        });
        page.drawText(`: ${data.invoiceNumber}`, {
            x: 130,
            y: yPosition,
            size: 9,
            font,
            color: textColor,
        });

        yPosition -= 25;

        page.drawText('Factuur omschrijving:', {
            x: 50,
            y: yPosition,
            size: 9,
            font,
            color: textColor,
        });

        // Line items table
        yPosition -= 30;

        // Table header background (gray)
        const tableTop = yPosition;
        page.drawRectangle({
            x: 50,
            y: tableTop - 2,
            width: width - 100,
            height: 18,
            color: lightGrayColor,
        });

        // Table headers (Dutch)
        page.drawText('Werzkaamheden', {
            x: 60,
            y: tableTop + 4,
            size: 9,
            font: boldFont,
            color: rgb(1, 1, 1),
        });
        page.drawText('Aantal', {
            x: 350,
            y: tableTop + 4,
            size: 9,
            font: boldFont,
            color: rgb(1, 1, 1),
        });
        page.drawText('Prijs', {
            x: 410,
            y: tableTop + 4,
            size: 9,
            font: boldFont,
            color: rgb(1, 1, 1),
        });
        page.drawText('Totaal', {
            x: 480,
            y: tableTop + 4,
            size: 9,
            font: boldFont,
            color: rgb(1, 1, 1),
        });

        yPosition -= 18;

        // Line items
        let subtotalAmount = new Decimal(0);
        let totalVatAmount = new Decimal(0);
        const vatByRate = new Map<number, Decimal>(); // Group VAT by rate

        for (const item of data.lineItems) {
            // Check if we need a new page
            if (yPosition < 150) {
                const newPage = pdfDoc.addPage([595, 842]);
                yPosition = height - 50;
            }

            page.drawText(item.description, {
                x: 60,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
                maxWidth: 280,
            });

            const qtyText = item.quantity.toString();
            page.drawText(qtyText, {
                x: 365,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
            });

            const priceText = this.formatCurrency(item.unitPrice);
            page.drawText(priceText, {
                x: 420,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
            });

            const totalText = this.formatCurrency(item.total);
            const totalWidth = font.widthOfTextAtSize(totalText, 9);
            page.drawText(totalText, {
                x: width - 60 - totalWidth,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
            });

            subtotalAmount = subtotalAmount.plus(item.subtotal);
            totalVatAmount = totalVatAmount.plus(item.vatAmount);

            // Group VAT by rate
            const rate = item.vatRate;
            const currentVatForRate = vatByRate.get(rate) || new Decimal(0);
            vatByRate.set(rate, currentVatForRate.plus(item.vatAmount));

            yPosition -= 20;
        }

        yPosition -= 10;

        // Top border line for totals
        page.drawLine({
            start: {x: 350, y: yPosition},
            end: {x: width - 50, y: yPosition},
            thickness: 1,
            color: textColor,
        });

        yPosition -= 18;

        // Subtotal (inside table)
        page.drawText('Subtotaal', {
            x: 420,
            y: yPosition,
            size: 9,
            font,
            color: textColor,
        });
        const subtotalText = this.formatCurrency(subtotalAmount.toNumber());
        const subtotalWidth = font.widthOfTextAtSize(subtotalText, 9);
        page.drawText(subtotalText, {
            x: width - 60 - subtotalWidth,
            y: yPosition,
            size: 9,
            font,
            color: textColor,
        });

        yPosition -= 15;

        // VAT breakdown by rate (sorted by rate, inside table)
        const sortedVatRates = Array.from(vatByRate.entries()).sort((a, b) => b[0] - a[0]);
        for (const [rate, amount] of sortedVatRates) {
            const ratePercent = (rate * 100).toFixed(2).replace('.00', ',00');
            page.drawText('BTW', {
                x: 350,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
            });
            page.drawText(`${ratePercent}%`, {
                x: 420,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
            });
            const vatAmountText = this.formatCurrency(amount.toNumber());
            const vatAmountWidth = font.widthOfTextAtSize(vatAmountText, 9);
            page.drawText(vatAmountText, {
                x: width - 60 - vatAmountWidth,
                y: yPosition,
                size: 9,
                font,
                color: textColor,
            });
            yPosition -= 15;
        }

        yPosition -= 5;

        // Bottom border line before total
        page.drawLine({
            start: {x: 350, y: yPosition},
            end: {x: width - 50, y: yPosition},
            thickness: 2,
            color: textColor,
        });

        yPosition -= 18;

        // Total (inside table)
        const totalAmount = subtotalAmount.plus(totalVatAmount);
        page.drawText('Totaal', {
            x: 420,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: textColor,
        });
        const totalText = this.formatCurrency(totalAmount.toNumber());
        const totalWidth = font.widthOfTextAtSize(totalText, 10);
        page.drawText(totalText, {
            x: width - 60 - totalWidth,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: textColor,
        });

        // Footer section
        yPosition = 120;

        // Payment instructions
        const daysUntilDue = Math.ceil((data.dueDate.getTime() - data.issueDate.getTime()) / (1000 * 60 * 60 * 24));
        page.drawText(`Betaling binnen ${daysUntilDue} dagen na factuurdatum o.v.v. `, {
            x: 50,
            y: yPosition,
            size: 8,
            font,
            color: textColor,
        });
        page.drawText(data.invoiceNumber, {
            x: 50 + font.widthOfTextAtSize(`Betaling binnen ${daysUntilDue} dagen na factuurdatum o.v.v. `, 8),
            y: yPosition,
            size: 8,
            font: boldFont,
            color: textColor,
        });

        yPosition -= 12;

        page.drawText('op bankrekening ', {
            x: 50,
            y: yPosition,
            size: 8,
            font,
            color: textColor,
        });
        page.drawText(data.companyIban, {
            x: 50 + font.widthOfTextAtSize('op bankrekening ', 8),
            y: yPosition,
            size: 8,
            font: boldFont,
            color: textColor,
        });
        page.drawText(` t.n.v. ${data.companyName}`, {
            x: 50 + font.widthOfTextAtSize(`op bankrekening ${data.companyIban}`, 8),
            y: yPosition,
            size: 8,
            font,
            color: textColor,
        });

        yPosition -= 20;

        // Company registration info
        page.drawText(`${data.companyName} is gevestigd te Rotterdam onder KvK nummer ${data.companyKvk}`, {
            x: 50,
            y: yPosition,
            size: 8,
            font,
            color: textColor,
        });

        // Bottom horizontal line
        page.drawLine({
            start: {x: 40, y: yPosition - 15},
            end: {x: width - 40, y: yPosition - 15},
            thickness: 2,
            color: textColor,
        });

        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
    }

    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    }
}
