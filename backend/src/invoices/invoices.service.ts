import { Injectable, BadRequestException } from '@nestjs/common';
import { InvoiceRepository } from '../repositories';
import { InvoiceType, PaymentStatus, InvoiceStatus, VatCategory, ReverseChargeLocation } from '@prisma/client';
import Decimal from 'decimal.js';

export interface CreateInvoiceDto {
  type: InvoiceType;
  counterparty: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency?: string;
  paymentStatus?: PaymentStatus;
  status?: InvoiceStatus;
  attachmentPath?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    reverseCharge?: boolean;
    reverseChargeLocation?: 'EU' | 'NON_EU';
  }[];
}

export interface UpdateInvoiceDto {
  type?: InvoiceType;
  counterparty?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  paymentStatus?: PaymentStatus;
  status?: InvoiceStatus;
  attachmentPath?: string;
  lineItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    reverseCharge?: boolean;
    reverseChargeLocation?: 'EU' | 'NON_EU';
  }[];
}

@Injectable()
export class InvoicesService {
  constructor(private invoiceRepository: InvoiceRepository) {}

  private deriveVatCategory(
    vatRate: number,
    reverseCharge: boolean,
    reverseChargeLocation: 'EU' | 'NON_EU' | undefined,
    invoiceType: InvoiceType,
  ): VatCategory {
    // If reverse charge is enabled
    if (reverseCharge) {
      if (invoiceType === 'PURCHASE') {
        // Purchase with reverse charge
        return reverseChargeLocation === 'EU' ? VatCategory.REVERSE_CHARGE_EU : VatCategory.IMPORT_NON_EU;
      } else {
        // Sales with reverse charge
        return reverseChargeLocation === 'EU' ? VatCategory.IC_SUPPLY : VatCategory.EXPORT_NON_EU;
      }
    }

    // No reverse charge - determine by VAT rate
    if (vatRate === 0.21) {
      return VatCategory.DOMESTIC_HIGH;
    } else if (vatRate === 0.09) {
      return VatCategory.DOMESTIC_LOW;
    } else if (vatRate === 0) {
      return VatCategory.ZERO;
    } else {
      return VatCategory.DOMESTIC_OTHER;
    }
  }

  async create(userId: string, data: CreateInvoiceDto) {
    const { lineItems, ...invoiceData } = data;

    // Calculate line item totals using Decimal for precision
    const lineItemsWithTotals = lineItems.map((item) => {
      const subtotal = new Decimal(item.quantity).times(item.unitPrice);

      // For reverse charge, calculate VAT for declaration purposes
      // but don't add it to the invoice total
      const vatAmount = subtotal.times(item.vatRate);

      const total = item.reverseCharge
        ? subtotal  // No VAT added to total for reverse charge
        : subtotal.plus(vatAmount);

      // Derive VAT category based on rate and reverse charge
      const vatCategory = this.deriveVatCategory(
        item.vatRate,
        item.reverseCharge || false,
        item.reverseChargeLocation,
        data.type,
      );

      return {
        ...item,
        subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        vatAmount: vatAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        total: total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        vatCategory,
        reverseCharge: item.reverseCharge || false,
        reverseChargeLocation: item.reverseChargeLocation || null,
      };
    });

    return this.invoiceRepository.create({
      user: { connect: { id: userId } },
      ...invoiceData,
      issueDate: new Date(invoiceData.issueDate),
      dueDate: new Date(invoiceData.dueDate),
      lineItems: {
        create: lineItemsWithTotals,
      },
    });
  }

  async findAll(userId: string) {
    return this.invoiceRepository.findMany(
      { userId },
      { lineItems: true },
      { issueDate: 'desc' },
    );
  }

  async findOne(userId: string, id: string) {
    return this.invoiceRepository.findFirst({
      id,
      userId,
    });
  }

  async update(userId: string, id: string, data: UpdateInvoiceDto) {
    const { lineItems, ...invoiceData } = data;

    // If line items are provided, delete old ones and create new ones
    if (lineItems) {
      const lineItemsWithTotals = lineItems.map((item) => {
        const subtotal = new Decimal(item.quantity).times(item.unitPrice);

        // For reverse charge, calculate VAT for declaration purposes
        // but don't add it to the invoice total
        const vatAmount = subtotal.times(item.vatRate);

        const total = item.reverseCharge
          ? subtotal  // No VAT added to total for reverse charge
          : subtotal.plus(vatAmount);

        // Derive VAT category based on rate and reverse charge
        const vatCategory = this.deriveVatCategory(
          item.vatRate,
          item.reverseCharge || false,
          item.reverseChargeLocation,
          data.type || 'PURCHASE',  // Default to PURCHASE if not provided
        );

        return {
          ...item,
          subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
          vatAmount: vatAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
          total: total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
          vatCategory,
          reverseCharge: item.reverseCharge || false,
          reverseChargeLocation: item.reverseChargeLocation || null,
        };
      });

      // Use a transaction to ensure atomicity of delete and update operations
      return this.invoiceRepository.updateWithTransaction(
        id,
        userId,
        {
          ...invoiceData,
          ...(invoiceData.issueDate && { issueDate: new Date(invoiceData.issueDate) }),
          ...(invoiceData.dueDate && { dueDate: new Date(invoiceData.dueDate) }),
        },
        lineItemsWithTotals,
      );
    }

    return this.invoiceRepository.update(
      { id, userId },
      {
        ...invoiceData,
        ...(invoiceData.issueDate && { issueDate: new Date(invoiceData.issueDate) }),
        ...(invoiceData.dueDate && { dueDate: new Date(invoiceData.dueDate) }),
      },
    );
  }

  async updateStatus(userId: string, id: string, status: InvoiceStatus) {
    return this.invoiceRepository.update(
      { id, userId },
      { status },
    );
  }

  async remove(userId: string, id: string) {
    return this.invoiceRepository.delete({
      id,
      userId,
    });
  }
}
