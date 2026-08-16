"use server";

import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AccountingValidationError,
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
  const validationErrors = validateInvoiceLines(lines);

  if (validationErrors.length > 0) {
    errors.lineItems = validationErrors
      .map((error) => error.message)
      .filter((message, index, messages) => messages.indexOf(message) === index)
      .join(" ");
    return { lines, errors };
  }

  const calculatedLines = lines.map(calculateInvoiceLine);

  return { lines, calculatedLines, errors };
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

      return tx.invoice.create({
        data: {
          ...header,
          status: "UNPAID",
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: calculatedLines.map((line, index) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              vatRate: line.vatRate,
              discountAmount: line.discountAmount,
              lineTotal: line.lineTotal,
              sortOrder: index,
            })),
          },
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

      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId, deletedAt: null },
        data: {
          ...header,
          status: nextStatus,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: calculatedLines.map((line, index) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              vatRate: line.vatRate,
              discountAmount: line.discountAmount,
              lineTotal: line.lineTotal,
              sortOrder: index,
            })),
          },
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

    return { message: "Fatura kaydi guncellenirken bir hata olustu." };
  }

  revalidateInvoicePaths(invoiceId);
  redirect(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.update({
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
    await syncInvoiceDueReminder(invoice);
    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoice.id,
      action: "SOFT_DELETE",
      title: `Fatura silindi: ${invoice.invoiceNumber}`,
      description: "Kayit cop kutusuna tasindi.",
      before: invoice,
    });
  } catch {
    redirect(`/invoices/${invoiceId}?error=delete`);
  }

  revalidateInvoicePaths(invoiceId);
  redirect("/invoices");
}
