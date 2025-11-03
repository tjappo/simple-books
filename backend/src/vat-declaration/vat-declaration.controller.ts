import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VatDeclarationService } from './vat-declaration.service';
import { CalculateDeclarationDto } from './dto/calculate-declaration.dto';
import { UpdateDeclarationDto } from './dto/update-declaration.dto';
import { UsersService } from '../users/users.service';

@Controller('vat-declaration')
@UseGuards(OidcAuthGuard)
export class VatDeclarationController {
  constructor(
    private readonly vatDeclarationService: VatDeclarationService,
    private readonly usersService: UsersService,
  ) {}

  @Post('calculate')
  async calculateDeclaration(
    @CurrentUser() user: any,
    @Body() dto: CalculateDeclarationDto,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.calculateDeclaration(dbUser.id, dto);
  }

  @Get('period/:period')
  async getDeclaration(@CurrentUser() user: any, @Param('period') period: string) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.getDeclaration(dbUser.id, period);
  }

  @Get('list')
  async listDeclarations(@CurrentUser() user: any) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.listDeclarations(dbUser.id);
  }

  @Get('periods')
  async getAvailablePeriods(@CurrentUser() user: any) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.getAvailablePeriods(dbUser.id);
  }

  @Post('finalize')
  async finalizeDeclaration(
    @CurrentUser() user: any,
    @Body() declarationData: any,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.finalizeDeclaration(dbUser.id, declarationData);
  }

  @Get(':id/pdf')
  async exportPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    const pdfBuffer = await this.vatDeclarationService.generatePdf(dbUser.id, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="BTW-Aangifte.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Post('invoices/:box')
  async getBoxInvoicesByPeriod(
    @CurrentUser() user: any,
    @Param('box') box: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.getInvoicesForBoxByPeriod(
      dbUser.id,
      new Date(body.startDate),
      new Date(body.endDate),
      box,
    );
  }

  @Get(':id/invoices/:box')
  async getBoxInvoices(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('box') box: string,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.getInvoicesForBox(dbUser.id, id, box);
  }

  @Put(':id')
  async updateDeclaration(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateDeclarationDto,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }
    return this.vatDeclarationService.updateDeclaration(dbUser.id, id, dto);
  }
}
