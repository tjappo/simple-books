import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VatConfiguration, Prisma } from '@prisma/client';

@Injectable()
export class VatConfigurationRepository {
  constructor(private prisma: PrismaService) {}

  async findUnique(where: Prisma.VatConfigurationWhereUniqueInput): Promise<VatConfiguration | null> {
    return this.prisma.vatConfiguration.findUnique({ where });
  }

  async findByUserId(userId: string): Promise<VatConfiguration | null> {
    return this.prisma.vatConfiguration.findUnique({
      where: { userId },
    });
  }

  async create(data: Prisma.VatConfigurationCreateInput): Promise<VatConfiguration> {
    return this.prisma.vatConfiguration.create({ data });
  }

  async update(
    where: Prisma.VatConfigurationWhereUniqueInput,
    data: Prisma.VatConfigurationUpdateInput,
  ): Promise<VatConfiguration> {
    return this.prisma.vatConfiguration.update({
      where,
      data,
    });
  }

  async upsert(
    where: Prisma.VatConfigurationWhereUniqueInput,
    create: Prisma.VatConfigurationCreateInput,
    update: Prisma.VatConfigurationUpdateInput,
  ): Promise<VatConfiguration> {
    return this.prisma.vatConfiguration.upsert({
      where,
      create,
      update,
    });
  }

  async delete(where: Prisma.VatConfigurationWhereUniqueInput): Promise<VatConfiguration> {
    return this.prisma.vatConfiguration.delete({ where });
  }
}
