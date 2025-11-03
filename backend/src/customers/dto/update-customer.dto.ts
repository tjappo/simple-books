import { IsString, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class UpdateCustomerDto {
    @IsEnum(CustomerType)
    @IsOptional()
    type?: CustomerType;

    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    // Business customer fields
    @IsString()
    @IsOptional()
    kvk?: string;

    @IsString()
    @IsOptional()
    btw?: string;
}
