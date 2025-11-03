import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    BadRequestException,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProfitLossService } from './profit-loss.service';
import { CalculateProfitLossDto } from './dto/calculate-profit-loss.dto';
import { UsersService } from '../users/users.service';

@Controller('profit-loss')
@UseGuards(OidcAuthGuard)
export class ProfitLossController {
    constructor(
        private readonly profitLossService: ProfitLossService,
        private readonly usersService: UsersService,
    ) {}

    @Post('calculate')
    async calculateProfitLoss(
        @CurrentUser() user: any,
        @Body() dto: CalculateProfitLossDto,
    ) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.profitLossService.calculateProfitLoss(dbUser.id, dto);
    }

    @Get('periods')
    async getAvailablePeriods(@CurrentUser() user: any) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.profitLossService.getAvailablePeriods(dbUser.id);
    }

    @Post('pdf')
    async exportPdf(
        @CurrentUser() user: any,
        @Body() statement: any,
        @Res() res: Response,
    ) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }

        // Convert date strings back to Date objects
        statement.startDate = new Date(statement.startDate);
        statement.endDate = new Date(statement.endDate);

        const pdfBuffer = await this.profitLossService.generatePdf(dbUser.id, statement);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Winst-en-Verliesrekening-${statement.period}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });

        res.end(pdfBuffer);
    }
}
