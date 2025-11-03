import { Controller, Get, Post, Put, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OidcAuthGuard } from '../auth/oidc-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'fs/promises';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(OidcAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    // Find or create user in database
    const dbUser = await this.usersService.findOrCreate(
      user.userId,
      user.email,
      user.name,
      user.picture,
    );

    return dbUser;
  }

  @Get('me/company')
  @UseGuards(OidcAuthGuard)
  async getCompany(@CurrentUser() user: any) {
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    return this.usersService.getCompany(dbUser.id);
  }

  @Post('me/photo')
  @UseGuards(OidcAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/profile-photos',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `profile-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new BadRequestException('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadProfilePhoto(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Get current user from database
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    // Delete old uploaded photo if it exists and is a local upload
    if (dbUser.picture && dbUser.picture.startsWith('/uploads/')) {
      try {
        const oldFilePath = join(__dirname, '..', '..', dbUser.picture);
        await unlink(oldFilePath);
      } catch (error) {
        // Ignore errors if file doesn't exist or can't be deleted
        console.warn('Could not delete old profile photo:', error.message);
      }
    }

    // Update user's picture URL
    const photoUrl = `/uploads/profile-photos/${file.filename}`;
    const updatedUser = await this.usersService.updateUser(dbUser.id, {
      picture: photoUrl,
    });

    return updatedUser;
  }

  @Put('me/company')
  @UseGuards(OidcAuthGuard)
  async updateCompanyDetails(
    @CurrentUser() user: any,
    @Body() companyData: {
      name: string;
      kvk: string;
      btw: string;
      iban: string;
      address: string;
    },
  ) {
    // Get current user from database
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    // Create or update company details
    const company = await this.usersService.createOrUpdateCompany(dbUser.id, companyData);

    return company;
  }
}
