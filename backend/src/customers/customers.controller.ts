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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UsersService } from '../users/users.service';

@Controller('customers')
@UseGuards(OidcAuthGuard)
export class CustomersController {
    constructor(
        private readonly customersService: CustomersService,
        private readonly usersService: UsersService,
    ) {}

    @Post()
    async create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.customersService.create(dbUser.id, dto);
    }

    @Get()
    async findAll(@CurrentUser() user: any) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.customersService.findAll(dbUser.id);
    }

    @Get(':id')
    async findOne(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.customersService.findOne(dbUser.id, id);
    }

    @Put(':id')
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateCustomerDto,
    ) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.customersService.update(dbUser.id, id, dto);
    }

    @Delete(':id')
    async remove(@CurrentUser() user: any, @Param('id') id: string) {
        const dbUser = await this.usersService.findByAuth0Id(user.userId);
        if (!dbUser) {
            throw new BadRequestException('User not found');
        }
        return this.customersService.remove(dbUser.id, id);
    }
}
