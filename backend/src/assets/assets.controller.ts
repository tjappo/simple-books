import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UsersService } from '../users/users.service';

@Controller('assets')
@UseGuards(OidcAuthGuard)
export class AssetsController {
    constructor(
        private readonly assetsService: AssetsService,
        private readonly usersService: UsersService,
    ) {}

    @Post()
    async create(@CurrentUser() user: any, @Body() dto: CreateAssetDto) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.create(dbUser.id, dto);
    }

    @Get()
    async findAll(@CurrentUser() user: any) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.findAll(dbUser.id);
    }

    @Get(':id')
    async findOne(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.findOne(dbUser.id, id);
    }

    @Put(':id')
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateAssetDto,
    ) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.update(dbUser.id, id, dto);
    }

    @Delete(':id')
    async remove(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.remove(dbUser.id, id);
    }

    @Get(':id/depreciation')
    async getDepreciation(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.calculateDepreciation(dbUser.id, id);
    }

    @Get(':id/schedule')
    async getDepreciationSchedule(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.getDepreciationSchedule(dbUser.id, id);
    }

    @Post(':id/update-depreciation')
    async updateDepreciation(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.updateDepreciation(dbUser.id, id);
    }

    @Post('update-all-depreciation')
    async updateAllDepreciation(@CurrentUser() user: any) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.assetsService.updateAllDepreciation(dbUser.id);
    }
}
