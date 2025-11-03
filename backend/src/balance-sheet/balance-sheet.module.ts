import { Module } from '@nestjs/common';
import { BalanceSheetController } from './balance-sheet.controller';
import { BalanceSheetService } from './balance-sheet.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [PrismaModule, RepositoriesModule, UsersModule],
    controllers: [BalanceSheetController],
    providers: [BalanceSheetService],
    exports: [BalanceSheetService],
})
export class BalanceSheetModule {}
