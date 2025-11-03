import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class CalculateDeclarationDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(['MONTHLY', 'QUARTERLY'])
  periodType: 'MONTHLY' | 'QUARTERLY';

  @IsOptional()
  period?: string; // "2025-Q1" or "2025-01"
}
