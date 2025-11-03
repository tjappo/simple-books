import { IsDateString, IsOptional } from 'class-validator';

export class CalculateBalanceSheetDto {
    @IsDateString()
    @IsOptional()
    asOfDate?: string; // Balance sheet as of this date (defaults to today)
}
