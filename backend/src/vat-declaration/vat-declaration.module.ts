import { Module } from '@nestjs/common';
import { VatDeclarationController } from './vat-declaration.controller';
import { VatDeclarationService } from './vat-declaration.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RepositoriesModule, UsersModule],
  controllers: [VatDeclarationController],
  providers: [VatDeclarationService],
  exports: [VatDeclarationService],
})
export class VatDeclarationModule {}
