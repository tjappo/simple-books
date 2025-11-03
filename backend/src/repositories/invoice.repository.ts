import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Invoice, Prisma, InvoiceStatus } from '@prisma/client';

type InvoiceWithLineItems = Prisma.InvoiceGetPayload<{
  include: { lineItems: true };
}>;

@Injectable()
export class InvoiceRepository {
  constructor(private prisma: PrismaService) {}

  async findMany(where: Prisma.InvoiceWhereInput, include?: Prisma.InvoiceInclude, orderBy?: Prisma.InvoiceOrderByWithRelationInput): Promise<InvoiceWithLineItems[]> {
    return this.prisma.invoice.findMany({
      where,
      include: include || { lineItems: true },
      orderBy,
    }) as Promise<InvoiceWithLineItems[]>;
  }

  async findFirst(where: Prisma.InvoiceWhereInput, include?: Prisma.InvoiceInclude, orderBy?: Prisma.InvoiceOrderByWithRelationInput): Promise<InvoiceWithLineItems | null> {
    return this.prisma.invoice.findFirst({
      where,
      include: include || { lineItems: true },
      orderBy,
    }) as Promise<InvoiceWithLineItems | null>;
  }

  async create(data: Prisma.InvoiceCreateInput, include?: Prisma.InvoiceInclude): Promise<InvoiceWithLineItems> {
    return this.prisma.invoice.create({
      data,
      include: include || { lineItems: true },
    }) as Promise<InvoiceWithLineItems>;
  }

  async update(
    where: Prisma.InvoiceWhereUniqueInput,
    data: Prisma.InvoiceUpdateInput,
    include?: Prisma.InvoiceInclude,
  ): Promise<InvoiceWithLineItems> {
    return this.prisma.invoice.update({
      where,
      data,
      include: include || { lineItems: true },
    }) as Promise<InvoiceWithLineItems>;
  }

  async updateWithTransaction(
    invoiceId: string,
    userId: string,
    invoiceData: Prisma.InvoiceUpdateInput,
    lineItemsData: Prisma.InvoiceLineItemCreateManyInvoiceInput[],
  ): Promise<InvoiceWithLineItems> {
    return this.prisma.$transaction(async (tx) => {
      // Delete existing line items
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId },
      });

      // Update invoice and create new line items
      return tx.invoice.update({
        where: { id: invoiceId, userId },
        data: {
          ...invoiceData,
          lineItems: {
            create: lineItemsData,
          },
        },
        include: {
          lineItems: true,
        },
      }) as Promise<InvoiceWithLineItems>;
    });
  }

  async updateMany(where: Prisma.InvoiceWhereInput, data: Prisma.InvoiceUpdateManyMutationInput): Promise<Prisma.BatchPayload> {
    return this.prisma.invoice.updateMany({
      where,
      data,
    });
  }

  async delete(where: Prisma.InvoiceWhereUniqueInput): Promise<Invoice> {
    return this.prisma.invoice.delete({ where });
  }

  async findUnprocessedInvoices(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<InvoiceWithLineItems[]> {
    return this.prisma.invoice.findMany({
      where: {
        userId,
        status: InvoiceStatus.POSTED,
        processedInVatDeclarationId: null,
        OR: [
          {
            issueDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            issueDate: {
              lt: startDate,
            },
          },
        ],
      },
      include: {
        lineItems: true,
      },
    }) as Promise<InvoiceWithLineItems[]>;
  }

  async findInvoicesByCategory(
    userId: string,
    type: 'SALES' | 'PURCHASE',
    startDate: Date,
    endDate: Date,
    categories: string[],
  ): Promise<InvoiceWithLineItems[]> {
    return this.prisma.invoice.findMany({
      where: {
        userId,
        status: InvoiceStatus.POSTED,
        type,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        lineItems: {
          some: {
            vatCategory: {
              in: categories as any,
            },
          },
        },
      },
      include: {
        lineItems: {
          where: {
            vatCategory: {
              in: categories as any,
            },
          },
        },
      },
      orderBy: {
        issueDate: 'asc',
      },
    }) as Promise<InvoiceWithLineItems[]>;
  }
}
