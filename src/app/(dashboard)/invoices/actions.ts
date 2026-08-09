"use server";

import { InvoiceStatus, InvoiceType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
import { syncInvoiceDueReminder } from "@/lib/auto-reminder-utils";
import { prisma } from "@/lib/prisma";
import { getManualInvoiceStatus } from "@/lib/invoice-utils";
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  validateInvoiceLines,
  type InvoiceLineCalculationInput,
  type InvoiceLineCalculationResult,
} from "@/lib/invoice-line-item-utils";

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

type InvoicePayload = InvoiceHeaderPayload & {
  subtotal: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
};

type InvoiceFormErrors = NonNullable<InvoiceFormState["errors"]>;

class InvoiceCreateValidationError extends Error {
  constructor(public readonly state: InvoiceFormState) {
    super("Fatura doğrulama hatası.");
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

function parseAmount(
  formData: FormData,
  field: InvoiceFormField,
  label: string,
  errors: InvoiceFormErrors,
  options: { emptyAsZero?: boolean; mustBePositive?: boolean } = {},
) {
  const rawValue = readText(formData, field).replace(",", ".");
  const normalizedValue = rawValue || (options.emptyAsZero ? "0" : "");

  if (!normalizedValue) {
    errors[field] = `${label} girilmeli.`;
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isNaN(numericValue)) {
    errors[field] = `${label} sayı olmalı.`;
    return null;
  }

  if (numericValue < 0) {
    errors[field] = `${label} negatif olamaz.`;
    return null;
  }

  if (options.mustBePositive && numericValue <= 0) {
    errors[field] = `${label} 0'dan büyük olmalı.`;
    return null;
  }

  return new Prisma.Decimal(normalizedValue);
}

async function parseInvoiceForm(formData: FormData): Promise<{
  data?: InvoicePayload;
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
    errors.companyId = "Cari firma seçilmeden fatura kaydedilemez.";
  } else {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      errors.companyId = "Geçerli bir cari firma seçin.";
    }
  }

  if (!type || !Object.values(InvoiceType).includes(type as InvoiceType)) {
    errors.type = "Fatura tipi seçilmeli.";
  }

  if (!invoiceNumber) {
    errors.invoiceNumber = "Fatura no boş olamaz.";
  }

  const invoiceDate = parseDate(invoiceDateValue);

  if (!invoiceDate) {
    errors.invoiceDate = "Fatura tarihi boş olamaz.";
  }

  const dueDate = parseDate(dueDateValue);

  if (dueDateValue && !dueDate) {
    errors.dueDate = "Geçerli bir vade tarihi girin.";
  }

  if (!Object.values(InvoiceStatus).includes(statusValue as InvoiceStatus)) {
    errors.status = "Geçerli bir fatura durumu seçin.";
  }

  const subtotal = parseAmount(formData, "subtotal", "Ara toplam", errors);
  const vatAmount = parseAmount(formData, "vatAmount", "KDV tutarı", errors, {
    emptyAsZero: true,
  });
  const discountAmount = parseAmount(formData, "discountAmount", "İskonto tutarı", errors, {
    emptyAsZero: true,
  });
  const totalAmount = parseAmount(formData, "totalAmount", "Genel toplam", errors, {
    mustBePositive: true,
  });

  if (
    Object.keys(errors).length > 0 ||
    !invoiceDate ||
    !subtotal ||
    !vatAmount ||
    !discountAmount ||
    !totalAmount
  ) {
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
      subtotal,
      vatAmount,
      discountAmount,
      totalAmount,
      status: getManualInvoiceStatus(statusValue as InvoiceStatus),
      notes: optionalText(readText(formData, "notes")),
    },
    errors,
  };
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
    errors.companyId = "Cari firma seçilmeden fatura kaydedilemez.";
  }

  if (!type || !Object.values(InvoiceType).includes(type as InvoiceType)) {
    errors.type = "Fatura tipi seçilmeli.";
  }

  if (!invoiceNumber) {
    errors.invoiceNumber = "Fatura no boş olamaz.";
  }

  const invoiceDate = parseDate(invoiceDateValue);

  if (!invoiceDate) {
    errors.invoiceDate = "Fatura tarihi boş olamaz.";
  }

  const dueDate = parseDate(dueDateValue);

  if (dueDateValue && !dueDate) {
    errors.dueDate = "Geçerli bir vade tarihi girin.";
  }

  if (!Object.values(InvoiceStatus).includes(statusValue as InvoiceStatus)) {
    errors.status = "Geçerli bir fatura durumu seçin.";
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
      status: getManualInvoiceStatus(statusValue as InvoiceStatus),
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
    errors.lineItems = "Fatura kalemleri okunamadı. Lütfen satırları kontrol edin.";
    return { errors };
  }

  if (!Array.isArray(parsed)) {
    errors.lineItems = "Fatura kalemleri beklenen liste formatında değil.";
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
      .map((error) => `${error.message}`)
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
      message: "Lütfen formdaki hataları düzeltin.",
    };
  }

  const header = parsedHeader.data;
  const calculatedLines = parsedLineItems.calculatedLines;
  let invoiceId: string;
  let createdInvoice: {
    id: string;
    invoiceNumber: string;
    type: InvoiceType;
    dueDate: Date | null;
    status: InvoiceStatus;
    companyId: string;
    deletedAt: Date | null;
  };
  const totals = calculateInvoiceTotals(calculatedLines);

  try {
    createdInvoice = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: { id: header.companyId, deletedAt: null },
        select: { id: true },
      });

      if (!company) {
        throw new InvoiceCreateValidationError({
          errors: { companyId: "Geçerli bir cari firma seçin." },
          message: "Lütfen formdaki hataları düzeltin.",
        });
      }

      return tx.invoice.create({
        data: {
          ...header,
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
      title: `Fatura oluşturuldu: ${header.invoiceNumber}`,
      description: `${header.currency} ${totals.totalAmount.toString()} tutarlı fatura oluşturuldu.`,
      after: {
        ...header,
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

    return { message: "Fatura kaydı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/invoices");
  revalidatePath("/important-dates");
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  _previousState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const parsed = await parseInvoiceForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  try {
    const before = await prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId, deletedAt: null },
      data: parsed.data,
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
    await syncInvoiceDueReminder(invoice);
    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoiceId,
      action: "UPDATE",
      title: `Fatura güncellendi: ${parsed.data.invoiceNumber}`,
      description: "Fatura bilgilerinde değişiklik yapıldı.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Fatura kaydı güncellenirken bir hata oluştu." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/important-dates");
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
      description: "Kayıt çöp kutusuna taşındı.",
      before: invoice,
    });
  } catch {
    redirect(`/invoices/${invoiceId}?error=delete`);
  }

  revalidatePath("/invoices");
  revalidatePath("/important-dates");
  redirect("/invoices");
}
