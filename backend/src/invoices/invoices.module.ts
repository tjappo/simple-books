import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RepositoriesModule, UsersModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
