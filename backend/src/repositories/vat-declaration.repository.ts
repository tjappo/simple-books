import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VatDeclaration, Prisma } from '@prisma/client';

@Injectable()
export class VatDeclarationRepository {
  constructor(private prisma: PrismaService) {}

  async findUnique(where: Prisma.VatDeclarationWhereUniqueInput): Promise<VatDeclaration | null> {
    return this.prisma.vatDeclaration.findUnique({ where });
  }

  async findFirst(where: Prisma.VatDeclarationWhereInput): Promise<VatDeclaration | null> {
    return this.prisma.vatDeclaration.findFirst({ where });
  }

  async findMany(where: Prisma.VatDeclarationWhereInput, orderBy?: Prisma.VatDeclarationOrderByWithRelationInput): Promise<VatDeclaration[]> {
    return this.prisma.vatDeclaration.findMany({
      where,
      orderBy,
    });
  }

  async create(data: Prisma.VatDeclarationCreateInput): Promise<VatDeclaration> {
    return this.prisma.vatDeclaration.create({ data });
  }

  async update(
    where: Prisma.VatDeclarationWhereUniqueInput,
    data: Prisma.VatDeclarationUpdateInput,
  ): Promise<VatDeclaration> {
    return this.prisma.vatDeclaration.update({
      where,
      data,
    });
  }

  async delete(where: Prisma.VatDeclarationWhereUniqueInput): Promise<VatDeclaration> {
    return this.prisma.vatDeclaration.delete({ where });
  }

  async createOrUpdateWithInvoices(
    existingDeclaration: VatDeclaration | null,
    declarationData: Prisma.VatDeclarationCreateInput,
    invoiceIds: string[],
  ): Promise<VatDeclaration> {
    return this.prisma.$transaction(async (tx) => {
      let declaration;

      if (existingDeclaration) {
        // If recalculating (updating existing DRAFT), first unmark the old invoices
        await tx.invoice.updateMany({
          where: {
            processedInVatDeclarationId: existingDeclaration.id,
          },
          data: {
            processedInVatDeclarationId: null,
          },
        });

        declaration = await tx.vatDeclaration.update({
          where: { id: existingDeclaration.id },
          data: declarationData,
        });
      } else {
        declaration = await tx.vatDeclaration.create({
          data: declarationData,
        });
      }

      // Mark all included invoices as processed in this declaration
      await tx.invoice.updateMany({
        where: {
          id: {
            in: invoiceIds,
          },
        },
        data: {
          processedInVatDeclarationId: declaration.id,
        },
      });

      return declaration;
    });
  }
}
