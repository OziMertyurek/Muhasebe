"use server";

import { InvoiceStatus, InvoiceType, ProductUnit } from "#prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AccountingValidationError,
  assertInvoiceCanBeDeleted,
  assertInvoiceIdentityEditableWithPayments,
  deriveInvoiceStatus,
  getInvoicePaidTotal,
} from "@/lib/accounting-core";
import { createAuditLog } from "@/lib/audit-log-utils";
import { syncInvoiceDueReminder } from "@/lib/auto-reminder-utils";
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  validateInvoiceLines,
  type InvoiceLineCalculationInput,
  type InvoiceLineCalculationResult,
} from "@/lib/invoice-line-item-utils";
import {
  InvoiceStockValidationError,
  reconcileInvoiceStockMovements,
  type InvoiceStockLineInput,
} from "@/lib/invoice-stock-utils";
import { prisma } from "@/lib/prisma";

export type InvoiceFormState = {
  message?: string;
  errors?: Partial<Record<InvoiceFormField, string>>;
};

type InvoiceFormField =
  | "companyId"
  | "type"
  | "invoiceNumber"
  | "invoiceDate"
  | "dueDate"
  | "currency"
  | "subtotal"
  | "vatAmount"
  | "discountAmount"
  | "totalAmount"
  | "status"
  | "notes"
  | "lineItems";

type InvoiceHeaderPayload = {
  companyId: string;
  type: InvoiceType;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
};

type InvoiceFormErrors = NonNullable<InvoiceFormState["errors"]>;

class InvoiceCreateValidationError extends Error {
  constructor(public readonly state: InvoiceFormState) {
    super("Fatura dogrulama hatasi.");
    this.name = "InvoiceCreateValidationError";
  }
}

function readText(formData: FormData, key: InvoiceFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function parseInvoiceHeaderForm(formData: FormData): Promise<{
  data?: InvoiceHeaderPayload;
  errors: InvoiceFormErrors;
}> {
  const errors: InvoiceFormErrors = {};
  const companyId = readText(formData, "companyId");
  const type = readText(formData, "type");
  const invoiceNumber = readText(formData, "invoiceNumber");
  const invoiceDateValue = readText(formData, "invoiceDate");
  const dueDateValue = readText(formData, "dueDate");
  const currency = readText(formData, "currency").toUpperCase() || "TRY";
  const statusValue = readText(formData, "status") || "UNPAID";

  if (!companyId) {
    errors.companyId = "Cari firma secilmeden fatura kaydedilemez.";
  }

  if (!type || !Object.values(InvoiceType).includes(type as InvoiceType)) {
    errors.type = "Fatura tipi secilmeli.";
  }

  if (!invoiceNumber) {
    errors.invoiceNumber = "Fatura no bos olamaz.";
  }

  const invoiceDate = parseDate(invoiceDateValue);

  if (!invoiceDate) {
    errors.invoiceDate = "Fatura tarihi bos olamaz.";
  }

  const dueDate = parseDate(dueDateValue);

  if (dueDateValue && !dueDate) {
    errors.dueDate = "Gecerli bir vade tarihi girin.";
  }

  if (!Object.values(InvoiceStatus).includes(statusValue as InvoiceStatus)) {
    errors.status = "Gecerli bir fatura durumu secin.";
  }

  if (Object.keys(errors).length > 0 || !invoiceDate) {
    return { errors };
  }

  return {
    data: {
      companyId,
      type: type as InvoiceType,
      invoiceNumber,
      invoiceDate,
      dueDate,
      currency,
      status: statusValue as InvoiceStatus,
      notes: optionalText(readText(formData, "notes")),
    },
    errors,
  };
}

function parseInvoiceLineItems(formData: FormData): {
  lines?: InvoiceLineCalculationInput[];
  calculatedLines?: InvoiceLineCalculationResult[];
  units?: ProductUnit[];
  productIds?: Array<string | null>;
  errors: InvoiceFormErrors;
} {
  const errors: InvoiceFormErrors = {};
  const rawValue = formData.get("lineItems");

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    errors.lineItems = "En az bir fatura kalemi girilmeli.";
    return { errors };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    errors.lineItems = "Fatura kalemleri okunamadi. Lutfen satirlari kontrol edin.";
    return { errors };
  }

  if (!Array.isArray(parsed)) {
    errors.lineItems = "Fatura kalemleri beklenen liste formatinda degil.";
    return { errors };
  }

  const lines = parsed.map((item): InvoiceLineCalculationInput => {
    const record = item && typeof item === "object" && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};

    return {
      description: typeof record.description === "string" ? record.description : "",
      quantity: toDecimalInput(record.quantity),
      unitPrice: toDecimalInput(record.unitPrice),
      vatRate: toDecimalInput(record.vatRate),
      discountAmount: toDecimalInput(record.discountAmount || "0"),
    };
  });
  const units = parsed.map((item): ProductUnit => {
    const record = item && typeof item === "object" && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};
    const unit = typeof record.unit === "string" ? record.unit : "ADET";

    return Object.values(ProductUnit).includes(unit as ProductUnit) ? unit as ProductUnit : "ADET";
  });
  const productIds = parsed.map((item): string | null => {
    const record = item && typeof item === "object" && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};
    const productId = typeof record.productId === "string" ? record.productId.trim() : "";

    return productId || null;
  });
  const validationErrors = validateInvoiceLines(lines);

  if (validationErrors.length > 0) {
    errors.lineItems = validationErrors
      .map((error) => error.message)
      .filter((message, index, messages) => messages.indexOf(message) === index)
      .join(" ");
    return { lines, units, productIds, errors };
  }

  const calculatedLines = lines.map(calculateInvoiceLine);

  return { lines, calculatedLines, units, productIds, errors };
}

function toDecimalInput(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : "";
}

function validationFailure(error: AccountingValidationError): InvoiceFormState {
  return {
    errors: { [error.field]: error.message },
    message: "Lutfen formdaki hatalari duzeltin.",
  };
}

function stockValidationFailure(error: InvoiceStockValidationError): InvoiceFormState {
  return {
    errors: { [error.field]: error.message },
    message: "Lutfen formdaki hatalari duzeltin.",
  };
}

function revalidateInvoicePaths(invoiceId?: string | null) {
  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath("/reports/due-invoices");
  revalidatePath("/reports/receivables-payables");
  revalidatePath("/important-dates");
  if (invoiceId) {
    revalidatePath(`/invoices/${invoiceId}`);
  }
}

export async function createInvoiceAction(
  _previousState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const [parsedHeader, parsedLineItems] = await Promise.all([
    parseInvoiceHeaderForm(formData),
    Promise.resolve(parseInvoiceLineItems(formData)),
  ]);

  if (!parsedHeader.data || !parsedLineItems.calculatedLines) {
    return {
      errors: {
        ...parsedHeader.errors,
        ...parsedLineItems.errors,
      },
      message: "Lutfen formdaki hatalari duzeltin.",
    };
  }

  const header = parsedHeader.data;
  const calculatedLines = parsedLineItems.calculatedLines;
  const totals = calculateInvoiceTotals(calculatedLines);
  let invoiceId: string;

  try {
    const createdInvoice = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: { id: header.companyId, deletedAt: null },
        select: { id: true },
      });

      if (!company) {
        throw new InvoiceCreateValidationError({
          errors: { companyId: "Gecerli bir cari firma secin." },
          message: "Lutfen formdaki hatalari duzeltin.",
        });
      }

      const duplicate = await tx.invoice.findFirst({
        where: {
          companyId: header.companyId,
          type: header.type,
          invoiceNumber: header.invoiceNumber,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new InvoiceCreateValidationError({
          errors: { invoiceNumber: "Ayni cari, fatura no ve tipte aktif fatura var." },
          message: "Lutfen formdaki hatalari duzeltin.",
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          ...header,
          status: "UNPAID",
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
        },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          dueDate: true,
          status: true,
          companyId: true,
          deletedAt: true,
        },
      });

      const stockLines: InvoiceStockLineInput[] = [];

      for (const [index, line] of calculatedLines.entries()) {
        const item = await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: parsedLineItems.productIds?.[index] ?? null,
            description: line.description,
            quantity: line.quantity,
            unit: parsedLineItems.units?.[index] ?? "ADET",
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            discountAmount: line.discountAmount,
            lineTotal: line.lineTotal,
            sortOrder: index,
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            unit: true,
            description: true,
          },
        });

        stockLines.push({
          invoiceItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
        });
      }

      await reconcileInvoiceStockMovements(tx, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.type,
        invoiceDate: header.invoiceDate,
        lines: stockLines,
      });

      return invoice;
    });
    invoiceId = createdInvoice.id;
    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoiceId,
      action: "CREATE",
      title: `Fatura olusturuldu: ${header.invoiceNumber}`,
      description: `${header.currency} ${totals.totalAmount.toString()} tutarli fatura olusturuldu.`,
      after: {
        ...header,
        status: "UNPAID",
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        itemCount: calculatedLines.length,
      },
    });
    await syncInvoiceDueReminder(createdInvoice);
  } catch (error) {
    if (error instanceof InvoiceCreateValidationError) {
      return error.state;
    }
    if (error instanceof InvoiceStockValidationError) {
      return stockValidationFailure(error);
    }

    return { message: "Fatura kaydi olusturulurken bir hata olustu." };
  }

  revalidateInvoicePaths(invoiceId);
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  _previousState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const [parsedHeader, parsedLineItems] = await Promise.all([
    parseInvoiceHeaderForm(formData),
    Promise.resolve(parseInvoiceLineItems(formData)),
  ]);

  if (!parsedHeader.data || !parsedLineItems.calculatedLines) {
    return {
      errors: {
        ...parsedHeader.errors,
        ...parsedLineItems.errors,
      },
      message: "Lutfen formdaki hatalari duzeltin.",
    };
  }

  const header = parsedHeader.data;
  const calculatedLines = parsedLineItems.calculatedLines;
  const totals = calculateInvoiceTotals(calculatedLines);

  try {
    const { before, invoice, after } = await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: {
            where: { deletedAt: null },
            select: { type: true, amount: true, currency: true },
          },
        },
      });

      if (!existingInvoice) {
        throw new AccountingValidationError("invoiceNumber", "Duzenlenecek fatura bulunamadi.");
      }

      const duplicate = await tx.invoice.findFirst({
        where: {
          id: { not: invoiceId },
          companyId: header.companyId,
          type: header.type,
          invoiceNumber: header.invoiceNumber,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new AccountingValidationError(
          "invoiceNumber",
          "Ayni cari, fatura no ve tipte aktif fatura var.",
        );
      }

      assertInvoiceIdentityEditableWithPayments(
        existingInvoice,
        header,
        existingInvoice.payments.length,
      );

      const paidTotal = getInvoicePaidTotal(
        { type: header.type, currency: header.currency },
        existingInvoice.payments,
      );

      if (paidTotal.greaterThan(totals.totalAmount)) {
        throw new AccountingValidationError(
          "lineItems",
          "Fatura toplami bagli tahsilat / odeme tutarinin altina dusemez.",
        );
      }

      const nextStatus = deriveInvoiceStatus(
        {
          type: header.type,
          currency: header.currency,
          totalAmount: totals.totalAmount,
          status: header.status === "CANCELLED" ? "CANCELLED" : undefined,
        },
        existingInvoice.payments,
      );

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId, deletedAt: null },
        data: {
          ...header,
          status: nextStatus,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
        },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          dueDate: true,
          status: true,
          companyId: true,
          deletedAt: true,
        },
      });

      const oldInvoiceItemIds = existingInvoice.items.map((item) => item.id);
      const stockLines: InvoiceStockLineInput[] = [];

      for (const [index, line] of calculatedLines.entries()) {
        const item = await tx.invoiceItem.create({
          data: {
            invoiceId,
            productId: parsedLineItems.productIds?.[index] ?? null,
            description: line.description,
            quantity: line.quantity,
            unit: parsedLineItems.units?.[index] ?? "ADET",
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            discountAmount: line.discountAmount,
            lineTotal: line.lineTotal,
            sortOrder: index,
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            unit: true,
            description: true,
          },
        });

        stockLines.push({
          invoiceItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
        });
      }

      await reconcileInvoiceStockMovements(tx, {
        invoiceId: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        invoiceType: updatedInvoice.type,
        invoiceDate: header.invoiceDate,
        lines: nextStatus === "CANCELLED" ? [] : stockLines,
        oldInvoiceItemIds,
      });

      if (oldInvoiceItemIds.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: { id: { in: oldInvoiceItemIds } },
        });
      }

      return {
        before: existingInvoice,
        invoice: updatedInvoice,
        after: {
          ...header,
          status: nextStatus,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          itemCount: calculatedLines.length,
        },
      };
    });
    await syncInvoiceDueReminder(invoice);
    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoiceId,
      action: "UPDATE",
      title: `Fatura guncellendi: ${header.invoiceNumber}`,
      description: "Fatura bilgileri ve kalemleri guncellendi.",
      before,
      after,
    });
  } catch (error) {
    if (error instanceof AccountingValidationError) {
      return validationFailure(error);
    }
    if (error instanceof InvoiceStockValidationError) {
      return stockValidationFailure(error);
    }

    return { message: "Fatura kaydi guncellenirken bir hata olustu." };
  }

  revalidateInvoicePaths(invoiceId);
  redirect(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        include: {
          items: { select: { id: true } },
          payments: { where: { deletedAt: null }, select: { id: true } },
        },
      });

      if (!existingInvoice) {
        throw new Error("Invoice not found.");
      }

      assertInvoiceCanBeDeleted(existingInvoice.payments.length);

      const itemIds = existingInvoice.items.map((item) => item.id);

      await reconcileInvoiceStockMovements(tx, {
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoiceNumber,
        invoiceType: existingInvoice.type,
        invoiceDate: existingInvoice.invoiceDate,
        lines: [],
        oldInvoiceItemIds: itemIds,
      });

      return tx.invoice.update({
        where: { id: invoiceId, deletedAt: null },
        data: { deletedAt: new Date() },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          dueDate: true,
          status: true,
          companyId: true,
          deletedAt: true,
          totalAmount: true,
          currency: true,
        },
      });
    });

    await syncInvoiceDueReminder(invoice);
    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoice.id,
      action: "SOFT_DELETE",
      title: `Fatura silindi: ${invoice.invoiceNumber}`,
      description: "Kayit cop kutusuna tasindi.",
      before: invoice,
    });
  } catch (error) {
    if (error instanceof AccountingValidationError) {
      redirect(`/invoices/${invoiceId}?error=delete-linked`);
    }

    redirect(`/invoices/${invoiceId}?error=delete`);
  }

  revalidateInvoicePaths(invoiceId);
  redirect("/invoices");
}
