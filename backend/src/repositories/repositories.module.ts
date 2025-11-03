import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRepository } from './user.repository';
import { CompanyRepository } from './company.repository';
import { InvoiceRepository } from './invoice.repository';
import { VatDeclarationRepository } from './vat-declaration.repository';
import { VatConfigurationRepository } from './vat-configuration.repository';

const repositories = [
  UserRepository,
  CompanyRepository,
  InvoiceRepository,
  VatDeclarationRepository,
  VatConfigurationRepository,
];

@Module({
  imports: [PrismaModule],
  providers: repositories,
  exports: repositories,
})
export class RepositoriesModule {}
