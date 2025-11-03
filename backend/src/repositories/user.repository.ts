import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findUnique(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findUnique({ where });
  }

  async findByAuth0Id(auth0Id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { auth0Id },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findOrCreate(
    auth0Id: string,
    email: string,
    name?: string,
    picture?: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { auth0Id },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            auth0Id,
            email,
            name,
            picture,
          },
        });
      }

      return user;
    });
  }
}
