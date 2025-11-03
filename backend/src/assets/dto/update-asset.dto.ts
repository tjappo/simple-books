import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { DepreciationMethod, AssetStatus } from '@prisma/client';

export class UpdateAssetDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsDateString()
    @IsOptional()
    purchaseDate?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    purchasePrice?: number;

    @IsString()
    @IsOptional()
    invoiceId?: string;

    @IsEnum(DepreciationMethod)
    @IsOptional()
    depreciationMethod?: DepreciationMethod;

    @IsNumber()
    @Min(0)
    @IsOptional()
    depreciationRate?: number;

    @IsNumber()
    @Min(1)
    @IsOptional()
    usefulLife?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    residualValue?: number;

    @IsEnum(AssetStatus)
    @IsOptional()
    status?: AssetStatus;

    @IsDateString()
    @IsOptional()
    disposalDate?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    disposalPrice?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
