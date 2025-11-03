import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateDeclarationDto {
  @IsOptional()
  @IsNumber()
  box1c_base?: number;

  @IsOptional()
  @IsNumber()
  box1c_vat?: number;

  @IsOptional()
  @IsNumber()
  box1d_vat?: number;

  @IsOptional()
  @IsNumber()
  box2b_base?: number;

  @IsOptional()
  @IsNumber()
  box3c_base?: number;

  @IsOptional()
  @IsNumber()
  box4c_base?: number;

  @IsOptional()
  @IsNumber()
  box4c_vat?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'SUBMITTED', 'FINAL'])
  status?: string;
}
