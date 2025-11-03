import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { BalanceSheetService } from './balance-sheet.service';
import { CalculateBalanceSheetDto } from './dto/calculate-balance-sheet.dto';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('balance-sheet')
@UseGuards(OidcAuthGuard)
export class BalanceSheetController {
    constructor(
        private balanceSheetService: BalanceSheetService,
        private usersService: UsersService,
    ) {}

    @Post('calculate')
    async calculate(
        @CurrentUser() user: any,
        @Body() dto: CalculateBalanceSheetDto,
    ) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : undefined;
        return this.balanceSheetService.calculate(dbUser.id, asOfDate);
    }
}
