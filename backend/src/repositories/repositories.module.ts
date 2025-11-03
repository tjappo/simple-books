import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRepository } from './user.repository';
import { CompanyRepository } from './company.repository';
import { InvoiceRepository } from './invoice.repository';
import { VatDeclarationRepository } from './vat-declaration.repository';
import { VatConfigurationRepository } from './vat-configuration.repository';
import { AssetRepository } from './asset.repository';
import { CustomerRepository } from './customer.repository';

const repositories = [
  UserRepository,
  CompanyRepository,
  InvoiceRepository,
  VatDeclarationRepository,
  VatConfigurationRepository,
  AssetRepository,
  CustomerRepository,
];

@Module({
  imports: [PrismaModule],
  providers: repositories,
  exports: repositories,
})
export class RepositoriesModule {}
