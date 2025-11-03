import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InvoicesModule } from './invoices/invoices.module';
import { VatDeclarationModule } from './vat-declaration/vat-declaration.module';
import { ProfitLossModule } from './profit-loss/profit-loss.module';
import { AssetsModule } from './assets/assets.module';
import { BalanceSheetModule } from './balance-sheet/balance-sheet.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', '..', '..', 'frontend', 'dist'),
        serveRoot: '/',
        exclude: ['/api/*path', '/auth/*path', '/uploads/*path'],
      },
      {
        rootPath: join(__dirname, '..', '..', 'uploads'),
        serveRoot: '/uploads',
        serveStaticOptions: {
          index: false,
        },
      },
    ),
    PrismaModule,
    AuthModule,
    UsersModule,
    InvoicesModule,
    VatDeclarationModule,
    ProfitLossModule,
    AssetsModule,
    BalanceSheetModule,
    CustomersModule,
  ],
})
export class AppModule {}
