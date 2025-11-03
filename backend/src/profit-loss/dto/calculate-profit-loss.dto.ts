import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum ProfitLossPeriodType {
    YEARLY = 'YEARLY',
    QUARTERLY = 'QUARTERLY',
    MONTHLY = 'MONTHLY',
}

export class CalculateProfitLossDto {
    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsEnum(ProfitLossPeriodType)
    @IsOptional()
    periodType?: ProfitLossPeriodType;

    @IsOptional()
    period?: string; // e.g., "2025" for yearly, "2025-Q1" for quarterly, "2025-01" for monthly
}
