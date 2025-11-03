import { IsString, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CreateCustomerDto {
    @IsEnum(CustomerType)
    type: CustomerType;

    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    address: string;

    // Business customer fields
    @ValidateIf(o => o.type === CustomerType.BUSINESS)
    @IsString()
    kvk?: string;

    @IsString()
    @IsOptional()
    btw?: string;
}
