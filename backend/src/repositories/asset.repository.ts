import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Asset, Prisma } from '@prisma/client';

@Injectable()
export class AssetRepository {
  constructor(private prisma: PrismaService) {}

  async findMany(
    where: Prisma.AssetWhereInput,
    orderBy?: Prisma.AssetOrderByWithRelationInput,
    include?: Prisma.AssetInclude,
  ): Promise<any[]> {
    return this.prisma.asset.findMany({
      where,
      orderBy,
      include,
    });
  }

  async findFirst(where: Prisma.AssetWhereInput, include?: Prisma.AssetInclude): Promise<any | null> {
    return this.prisma.asset.findFirst({
      where,
      include,
    });
  }

  async findUnique(where: Prisma.AssetWhereUniqueInput): Promise<Asset | null> {
    return this.prisma.asset.findUnique({
      where,
    });
  }

  async create(data: Prisma.AssetCreateInput): Promise<Asset> {
    return this.prisma.asset.create({
      data,
    });
  }

  async update(
    where: Prisma.AssetWhereUniqueInput,
    data: Prisma.AssetUpdateInput,
  ): Promise<Asset> {
    return this.prisma.asset.update({
      where,
      data,
    });
  }

  async delete(where: Prisma.AssetWhereUniqueInput): Promise<Asset> {
    return this.prisma.asset.delete({
      where,
    });
  }

  async count(where: Prisma.AssetWhereInput): Promise<number> {
    return this.prisma.asset.count({
      where,
    });
  }
}
