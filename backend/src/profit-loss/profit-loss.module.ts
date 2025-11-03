import { Module } from '@nestjs/common';
import { ProfitLossController } from './profit-loss.controller';
import { ProfitLossService } from './profit-loss.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [RepositoriesModule, UsersModule],
    controllers: [ProfitLossController],
    providers: [ProfitLossService],
    exports: [ProfitLossService],
})
export class ProfitLossModule {}
