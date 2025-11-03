import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetRepository } from '../repositories';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { DepreciationMethod, AssetStatus } from '@prisma/client';
import Decimal from 'decimal.js';

export interface DepreciationScheduleEntry {
    year: number;
    startingBookValue: number;
    depreciationExpense: number;
    accumulatedDepreciation: number;
    endingBookValue: number;
}

export interface DepreciationSchedule {
    assetId: string;
    assetName: string;
    purchasePrice: number;
    residualValue: number;
    usefulLife: number;
    depreciationMethod: DepreciationMethod;
    schedule: DepreciationScheduleEntry[];
    totalDepreciation: number;
}

@Injectable()
export class AssetsService {
    constructor(private assetRepository: AssetRepository) {}

    async create(userId: string, dto: CreateAssetDto) {
        const purchaseDate = new Date(dto.purchaseDate);
        const purchasePrice = new Decimal(dto.purchasePrice);
        const residualValue = new Decimal(dto.residualValue || 0);

        // Calculate initial book value (same as purchase price)
        const currentBookValue = purchasePrice.toNumber();

        const data: any = {
            user: { connect: { id: userId } },
            name: dto.name,
            description: dto.description,
            category: dto.category,
            purchaseDate,
            purchasePrice: purchasePrice.toNumber(),
            depreciationMethod: dto.depreciationMethod,
            depreciationRate: dto.depreciationRate,
            usefulLife: dto.usefulLife,
            residualValue: residualValue.toNumber(),
            currentBookValue,
            accumulatedDepreciation: 0,
            status: AssetStatus.ACTIVE,
            notes: dto.notes,
        };

        // Link to invoice if provided
        if (dto.invoiceId) {
            data.invoice = { connect: { id: dto.invoiceId } };
        }

        return this.assetRepository.create(data);
    }

    async findAll(userId: string) {
        const assets = await this.assetRepository.findMany(
            { userId },
            { purchaseDate: 'desc' },
            { invoice: { include: { lineItems: true } } },
        );

        // Calculate current depreciation for each asset
        const now = new Date();
        return assets.map((asset) => {
            if (asset.status !== AssetStatus.ACTIVE && asset.status !== AssetStatus.FULLY_DEPRECIATED) {
                return asset;
            }

            const yearsSincePurchase = this.calculateYearsSincePurchase(
                asset.purchaseDate,
                now,
            );

            const depreciation = this.calculateDepreciationAmount(
                asset.purchasePrice,
                asset.residualValue,
                asset.depreciationMethod,
                asset.depreciationRate,
                asset.usefulLife,
                yearsSincePurchase,
            );

            const currentBookValue = Math.max(
                new Decimal(asset.purchasePrice)
                    .minus(depreciation.accumulated)
                    .toDecimalPlaces(2)
                    .toNumber(),
                asset.residualValue,
            );

            return {
                ...asset,
                currentBookValue,
                accumulatedDepreciation: depreciation.accumulated,
            };
        });
    }

    async findOne(userId: string, id: string) {
        const asset = await this.assetRepository.findFirst(
            {
                id,
                userId,
            },
            { invoice: { include: { lineItems: true } } },
        );

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        // Calculate current depreciation
        if (asset.status === AssetStatus.ACTIVE || asset.status === AssetStatus.FULLY_DEPRECIATED) {
            const now = new Date();
            const yearsSincePurchase = this.calculateYearsSincePurchase(
                asset.purchaseDate,
                now,
            );

            const depreciation = this.calculateDepreciationAmount(
                asset.purchasePrice,
                asset.residualValue,
                asset.depreciationMethod,
                asset.depreciationRate,
                asset.usefulLife,
                yearsSincePurchase,
            );

            const currentBookValue = Math.max(
                new Decimal(asset.purchasePrice)
                    .minus(depreciation.accumulated)
                    .toDecimalPlaces(2)
                    .toNumber(),
                asset.residualValue,
            );

            return {
                ...asset,
                currentBookValue,
                accumulatedDepreciation: depreciation.accumulated,
            };
        }

        return asset;
    }

    async update(userId: string, id: string, dto: UpdateAssetDto) {
        const asset = await this.findOne(userId, id);

        const updateData: any = { ...dto };

        if (dto.purchaseDate) {
            updateData.purchaseDate = new Date(dto.purchaseDate);
        }

        if (dto.disposalDate) {
            updateData.disposalDate = new Date(dto.disposalDate);
        }

        // Handle invoice linking/unlinking
        if (dto.invoiceId !== undefined) {
            if (dto.invoiceId) {
                updateData.invoice = { connect: { id: dto.invoiceId } };
            } else {
                updateData.invoice = { disconnect: true };
            }
            delete updateData.invoiceId;
        }

        return this.assetRepository.update(
            { id },
            updateData,
        );
    }

    async remove(userId: string, id: string) {
        await this.findOne(userId, id);
        return this.assetRepository.delete({ id });
    }

    /**
     * Calculate depreciation for a given asset as of a specific date
     */
    async calculateDepreciation(userId: string, assetId: string, asOfDate?: Date) {
        const asset = await this.findOne(userId, assetId);
        const calculationDate = asOfDate || new Date();

        if (asset.status !== AssetStatus.ACTIVE) {
            return {
                ...asset,
                message: 'Asset is not active',
            };
        }

        const yearsSincePurchase = this.calculateYearsSincePurchase(
            asset.purchaseDate,
            calculationDate,
        );

        const depreciation = this.calculateDepreciationAmount(
            asset.purchasePrice,
            asset.residualValue,
            asset.depreciationMethod,
            asset.depreciationRate,
            asset.usefulLife,
            yearsSincePurchase,
        );

        const newBookValue = Math.max(
            new Decimal(asset.purchasePrice)
                .minus(depreciation.accumulated)
                .toNumber(),
            asset.residualValue,
        );

        return {
            assetId: asset.id,
            assetName: asset.name,
            purchasePrice: asset.purchasePrice,
            currentBookValue: asset.currentBookValue,
            calculatedBookValue: newBookValue,
            accumulatedDepreciation: depreciation.accumulated,
            annualDepreciation: depreciation.annual,
            yearsSincePurchase,
            fullyDepreciated: newBookValue <= asset.residualValue,
        };
    }

    /**
     * Update the book value and accumulated depreciation for an asset
     */
    async updateDepreciation(userId: string, assetId: string, asOfDate?: Date) {
        const asset = await this.findOne(userId, assetId);
        const calculationDate = asOfDate || new Date();

        if (asset.status !== AssetStatus.ACTIVE) {
            return asset;
        }

        const depreciation = await this.calculateDepreciation(userId, assetId, calculationDate);

        const updates: any = {
            currentBookValue: depreciation.calculatedBookValue,
            accumulatedDepreciation: depreciation.accumulatedDepreciation,
        };

        // Check if fully depreciated
        if (depreciation.fullyDepreciated) {
            updates.status = AssetStatus.FULLY_DEPRECIATED;
        }

        return this.assetRepository.update(
            { id: assetId },
            updates,
        );
    }

    /**
     * Update depreciation for all active assets
     */
    async updateAllDepreciation(userId: string) {
        const assets = await this.assetRepository.findMany({
            userId,
            status: AssetStatus.ACTIVE,
        });

        const results = [];
        for (const asset of assets) {
            const updated = await this.updateDepreciation(userId, asset.id);
            results.push(updated);
        }

        return results;
    }

    /**
     * Generate a complete depreciation schedule for an asset
     */
    async getDepreciationSchedule(userId: string, assetId: string): Promise<DepreciationSchedule> {
        const asset = await this.findOne(userId, assetId);

        const schedule: DepreciationScheduleEntry[] = [];
        let bookValue = new Decimal(asset.purchasePrice);
        let accumulated = new Decimal(0);

        for (let year = 1; year <= asset.usefulLife; year++) {
            const startingBookValue = bookValue.toNumber();

            const depreciation = this.calculateAnnualDepreciation(
                asset.purchasePrice,
                asset.residualValue,
                asset.depreciationMethod,
                asset.depreciationRate,
                asset.usefulLife,
                year,
                bookValue.toNumber(),
            );

            accumulated = accumulated.plus(depreciation);
            bookValue = bookValue.minus(depreciation);

            // Ensure book value doesn't go below residual value
            if (bookValue.lessThan(asset.residualValue)) {
                const adjustment = new Decimal(asset.residualValue).minus(bookValue);
                accumulated = accumulated.minus(adjustment);
                bookValue = new Decimal(asset.residualValue);
            }

            schedule.push({
                year,
                startingBookValue,
                depreciationExpense: depreciation.toDecimalPlaces(2).toNumber(),
                accumulatedDepreciation: accumulated.toDecimalPlaces(2).toNumber(),
                endingBookValue: bookValue.toDecimalPlaces(2).toNumber(),
            });

            // Stop if we've reached residual value
            if (bookValue.equals(asset.residualValue)) {
                break;
            }
        }

        return {
            assetId: asset.id,
            assetName: asset.name,
            purchasePrice: asset.purchasePrice,
            residualValue: asset.residualValue,
            usefulLife: asset.usefulLife,
            depreciationMethod: asset.depreciationMethod,
            schedule,
            totalDepreciation: accumulated.toDecimalPlaces(2).toNumber(),
        };
    }

    /**
     * Calculate years since purchase based on complete months
     */
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

    /**
     * Calculate depreciation based on method
     */
    private calculateDepreciationAmount(
        purchasePrice: number,
        residualValue: number,
        method: DepreciationMethod,
        rate: number,
        usefulLife: number,
        yearsSincePurchase: number,
    ): { annual: number; accumulated: number } {
        const depreciableBase = new Decimal(purchasePrice).minus(residualValue);

        let annual = 0;
        let accumulated = 0;

        if (method === DepreciationMethod.STRAIGHT_LINE) {
            annual = depreciableBase.dividedBy(usefulLife).toNumber();
            accumulated = new Decimal(annual).times(yearsSincePurchase).toNumber();
        } else if (method === DepreciationMethod.DECLINING_BALANCE) {
            // Declining balance uses the rate directly
            let bookValue = new Decimal(purchasePrice);
            for (let i = 0; i < Math.floor(yearsSincePurchase); i++) {
                const yearDepreciation = bookValue.times(rate / 100);
                accumulated += yearDepreciation.toNumber();
                bookValue = bookValue.minus(yearDepreciation);
                if (bookValue.lessThanOrEqualTo(residualValue)) {
                    break;
                }
            }
            annual = bookValue.times(rate / 100).toNumber();
        }

        // Cap accumulated depreciation at depreciable base
        accumulated = Math.min(accumulated, depreciableBase.toNumber());

        return {
            annual: new Decimal(annual).toDecimalPlaces(2).toNumber(),
            accumulated: new Decimal(accumulated).toDecimalPlaces(2).toNumber(),
        };
    }

    /**
     * Calculate annual depreciation for a specific year
     */
    private calculateAnnualDepreciation(
        purchasePrice: number,
        residualValue: number,
        method: DepreciationMethod,
        rate: number,
        usefulLife: number,
        year: number,
        currentBookValue: number,
    ): Decimal {
        const depreciableBase = new Decimal(purchasePrice).minus(residualValue);

        if (method === DepreciationMethod.STRAIGHT_LINE) {
            return depreciableBase.dividedBy(usefulLife);
        } else if (method === DepreciationMethod.DECLINING_BALANCE) {
            const depreciation = new Decimal(currentBookValue).times(rate / 100);
            // Make sure we don't depreciate below residual value
            const maxDepreciation = new Decimal(currentBookValue).minus(residualValue);
            return Decimal.min(depreciation, maxDepreciation);
        }

        return new Decimal(0);
    }
}
