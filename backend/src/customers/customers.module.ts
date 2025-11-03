import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [RepositoriesModule, UsersModule],
    controllers: [CustomersController],
    providers: [CustomersService],
    exports: [CustomersService],
})
export class CustomersModule {}
