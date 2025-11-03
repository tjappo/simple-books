import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Company, Prisma } from '@prisma/client';

@Injectable()
export class CompanyRepository {
  constructor(private prisma: PrismaService) {}

  async findUnique(where: Prisma.CompanyWhereUniqueInput): Promise<Company | null> {
    return this.prisma.company.findUnique({ where });
  }

  async findByUserId(userId: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { userId },
    });
  }

  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  async update(userId: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({
      where: { userId },
      data,
    });
  }

  async upsert(
    where: Prisma.CompanyWhereUniqueInput,
    create: Prisma.CompanyCreateInput,
    update: Prisma.CompanyUpdateInput,
  ): Promise<Company> {
    return this.prisma.company.upsert({
      where,
      create,
      update,
    });
  }

  async delete(userId: string): Promise<Company> {
    return this.prisma.company.delete({
      where: { userId },
    });
  }
}
