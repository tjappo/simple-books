import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvoicesService, CreateInvoiceDto, UpdateInvoiceDto } from './invoices.service';
import { UsersService } from '../users/users.service';
import { InvoiceStatus } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('invoices')
@UseGuards(OidcAuthGuard)
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private usersService: UsersService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/invoices',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `invoice-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async create(
    @CurrentUser() user: any,
    @Body() createInvoiceDto: CreateInvoiceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    const data = {
      ...createInvoiceDto,
      lineItems: JSON.parse(createInvoiceDto.lineItems as any),
      attachmentPath: file ? `/uploads/invoices/${file.filename}` : undefined,
    };

    return this.invoicesService.create(dbUser.id, data);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    return this.invoicesService.findAll(dbUser.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    const invoice = await this.invoicesService.findOne(dbUser.id, id);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }
    return invoice;
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/invoices',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `invoice-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    const data = {
      ...updateInvoiceDto,
      ...(updateInvoiceDto.lineItems && {
        lineItems: JSON.parse(updateInvoiceDto.lineItems as any),
      }),
      ...(file && { attachmentPath: `/uploads/invoices/${file.filename}` }),
    };

    return this.invoicesService.update(dbUser.id, id, data);
  }

  @Post(':id/status')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
  ) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    if (!status || !Object.values(InvoiceStatus).includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const invoice = await this.invoicesService.findOne(dbUser.id, id);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return this.invoicesService.updateStatus(dbUser.id, id, status);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    return this.invoicesService.remove(dbUser.id, id);
  }
}
