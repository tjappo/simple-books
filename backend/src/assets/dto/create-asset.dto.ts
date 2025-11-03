import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { DepreciationMethod } from '@prisma/client';

export class CreateAssetDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    category: string;

    @IsDateString()
    purchaseDate: string;

    @IsNumber()
    @Min(0)
    purchasePrice: number;

    @IsString()
    @IsOptional()
    invoiceId?: string;

    @IsEnum(DepreciationMethod)
    depreciationMethod: DepreciationMethod;

    @IsNumber()
    @Min(0)
    depreciationRate: number;

    @IsNumber()
    @Min(1)
    usefulLife: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    residualValue?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
