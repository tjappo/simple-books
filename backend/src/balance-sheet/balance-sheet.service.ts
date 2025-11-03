import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../repositories';
import { InvoiceRepository } from '../repositories';
import { AssetStatus, InvoiceType, PaymentStatus } from '@prisma/client';
import Decimal from 'decimal.js';

export interface BalanceSheetData {
    asOfDate: Date;
    assets: {
        fixedAssets: {
            items: Array<{
                id: string;
                name: string;
                purchasePrice: number;
                accumulatedDepreciation: number;
                bookValue: number;
            }>;
            totalBookValue: number;
            totalAccumulatedDepreciation: number;
        };
        totalAssets: number;
    };
    liabilities: {
        accountsPayable: {
            items: Array<{
                id: string;
                invoiceNumber: string;
                supplierName: string;
                totalAmount: number;
                dueDate: Date;
            }>;
            total: number;
        };
        totalLiabilities: number;
    };
    equity: {
        retainedEarnings: number;
        totalEquity: number;
    };
    totalLiabilitiesAndEquity: number;
}

@Injectable()
export class BalanceSheetService {
    constructor(
        private assetRepository: AssetRepository,
        private invoiceRepository: InvoiceRepository,
    ) {}

    async calculate(userId: string, asOfDate?: Date): Promise<BalanceSheetData> {
        const calculationDate = asOfDate || new Date();

        // Calculate Assets
        const assets = await this.calculateAssets(userId, calculationDate);

        // Calculate Liabilities
        const liabilities = await this.calculateLiabilities(userId, calculationDate);

        // Calculate Equity (Assets - Liabilities)
        const retainedEarnings = new Decimal(assets.totalAssets)
            .minus(liabilities.totalLiabilities)
            .toDecimalPlaces(2)
            .toNumber();

        const equity = {
            retainedEarnings,
            totalEquity: retainedEarnings,
        };

        const totalLiabilitiesAndEquity = new Decimal(liabilities.totalLiabilities)
            .plus(equity.totalEquity)
            .toDecimalPlaces(2)
            .toNumber();

        return {
            asOfDate: calculationDate,
            assets,
            liabilities,
            equity,
            totalLiabilitiesAndEquity,
        };
    }

    private async calculateAssets(userId: string, asOfDate: Date) {
        // Get all assets purchased on or before the asOfDate
        const allAssets = await this.assetRepository.findMany({
            userId,
            purchaseDate: {
                lte: asOfDate,
            },
        });

        // Filter active and fully depreciated assets
        const activeAssets = allAssets.filter(
            (asset) =>
                asset.status === AssetStatus.ACTIVE ||
                asset.status === AssetStatus.FULLY_DEPRECIATED,
        );

        // Calculate depreciation for each asset as of the asOfDate
        const fixedAssetItems = activeAssets.map((asset) => {
            const depreciationData = this.calculateAssetDepreciation(
                asset.purchasePrice,
                asset.residualValue,
                asset.depreciationMethod,
                asset.depreciationRate,
                asset.usefulLife,
                asset.purchaseDate,
                asOfDate,
            );

            const bookValue = Math.max(
                new Decimal(asset.purchasePrice)
                    .minus(depreciationData.accumulated)
                    .toNumber(),
                asset.residualValue,
            );

            return {
                id: asset.id,
                name: asset.name,
                purchasePrice: asset.purchasePrice,
                accumulatedDepreciation: depreciationData.accumulated,
                bookValue: new Decimal(bookValue).toDecimalPlaces(2).toNumber(),
            };
        });

        const totalBookValue = fixedAssetItems
            .reduce((sum, item) => sum.plus(item.bookValue), new Decimal(0))
            .toDecimalPlaces(2)
            .toNumber();

        const totalAccumulatedDepreciation = fixedAssetItems
            .reduce((sum, item) => sum.plus(item.accumulatedDepreciation), new Decimal(0))
            .toDecimalPlaces(2)
            .toNumber();

        return {
            fixedAssets: {
                items: fixedAssetItems,
                totalBookValue,
                totalAccumulatedDepreciation,
            },
            totalAssets: totalBookValue,
        };
    }

    private async calculateLiabilities(userId: string, asOfDate: Date) {
        // Get all unpaid purchase invoices on or before the asOfDate
        const unpaidInvoices = await this.invoiceRepository.findMany(
            {
                userId,
                type: InvoiceType.PURCHASE,
                paymentStatus: PaymentStatus.UNPAID,
                issueDate: {
                    lte: asOfDate,
                },
            },
            { lineItems: true },
        );

        const accountsPayableItems = unpaidInvoices.map((invoice) => {
            // Calculate total amount from line items
            const totalAmount = invoice.lineItems
                .reduce((sum, item) => sum.plus(item.total), new Decimal(0))
                .toDecimalPlaces(2)
                .toNumber();

            return {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                supplierName: invoice.counterparty,
                totalAmount,
                dueDate: invoice.dueDate,
            };
        });

        const accountsPayableTotal = accountsPayableItems
            .reduce((sum, item) => sum.plus(item.totalAmount), new Decimal(0))
            .toDecimalPlaces(2)
            .toNumber();

        return {
            accountsPayable: {
                items: accountsPayableItems,
                total: accountsPayableTotal,
            },
            totalLiabilities: accountsPayableTotal,
        };
    }

    private calculateAssetDepreciation(
        purchasePrice: number,
        residualValue: number,
        method: string,
        rate: number,
        usefulLife: number,
        purchaseDate: Date,
        asOfDate: Date,
    ): { accumulated: number } {
        const yearsSincePurchase = this.calculateYearsSincePurchase(purchaseDate, asOfDate);
        const depreciableBase = new Decimal(purchasePrice).minus(residualValue);

        let accumulated = 0;

        if (method === 'STRAIGHT_LINE') {
            const annual = depreciableBase.dividedBy(usefulLife).toNumber();
            accumulated = new Decimal(annual).times(yearsSincePurchase).toNumber();
        } else if (method === 'DECLINING_BALANCE') {
            let bookValue = new Decimal(purchasePrice);
            for (let i = 0; i < Math.floor(yearsSincePurchase); i++) {
                const yearDepreciation = bookValue.times(rate / 100);
                accumulated += yearDepreciation.toNumber();
                bookValue = bookValue.minus(yearDepreciation);
                if (bookValue.lessThanOrEqualTo(residualValue)) {
                    break;
                }
            }
        }

        // Cap accumulated depreciation at depreciable base
        accumulated = Math.min(accumulated, depreciableBase.toNumber());

        return {
            accumulated: new Decimal(accumulated).toDecimalPlaces(2).toNumber(),
        };
    }

    private calculateYearsSincePurchase(purchaseDate: Date, asOfDate: Date): number {
        const purchaseYear = purchaseDate.getFullYear();
        const purchaseMonth = purchaseDate.getMonth();
        const asOfYear = asOfDate.getFullYear();
        const asOfMonth = asOfDate.getMonth();

        // Calculate total months difference
        const monthsDiff = (asOfYear - purchaseYear) * 12 + (asOfMonth - purchaseMonth);

        // Convert months to years (fractional)
        return Math.max(0, monthsDiff / 12);
    }
}
