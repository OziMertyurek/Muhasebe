"use server";

import { PaymentMethod, PaymentType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateInvoicePaymentStatus } from "@/lib/payment-status";
import { prisma } from "@/lib/prisma";

export type PaymentFormState = {
  message?: string;
  errors?: Partial<Record<PaymentFormField, string>>;
};

type PaymentFormField =
  | "type"
  | "companyId"
  | "invoiceId"
  | "financialAccountId"
  | "amount"
  | "currency"
  | "paymentDate"
  | "method"
  | "description";

type PaymentFormErrors = NonNullable<PaymentFormState["errors"]>;

type PaymentPayload = {
  type: PaymentType;
  companyId: string | null;
  invoiceId: string | null;
  financialAccountId: string | null;
  amount: Prisma.Decimal;
  currency: string;
  paymentDate: Date;
  method: PaymentMethod;
  description: string | null;
};

function readText(formData: FormData, key: PaymentFormField) {
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

async function parsePaymentForm(formData: FormData): Promise<{
  data?: PaymentPayload;
  errors: PaymentFormErrors;
}> {
  const errors: PaymentFormErrors = {};
  const typeValue = readText(formData, "type");
  const companyIdValue = readText(formData, "companyId");
  const invoiceIdValue = readText(formData, "invoiceId");
  const financialAccountIdValue = readText(formData, "financialAccountId");
  const amountValue = readText(formData, "amount").replace(",", ".");
  const currency = readText(formData, "currency").toUpperCase() || "TRY";
  const paymentDateValue = readText(formData, "paymentDate");
  const methodValue = readText(formData, "method");

  if (!typeValue || !Object.values(PaymentType).includes(typeValue as PaymentType)) {
    errors.type = "İşlem tipi seçilmeli.";
  }

  if (!methodValue || !Object.values(PaymentMethod).includes(methodValue as PaymentMethod)) {
    errors.method = "Ödeme yöntemi seçilmeli.";
  }

  let amount: Prisma.Decimal | null = null;

  if (!amountValue) {
    errors.amount = "Tutar girilmeli.";
  } else {
    const numericAmount = Number(amountValue);

    if (Number.isNaN(numericAmount)) {
      errors.amount = "Tutar sayı olmalı.";
    } else if (numericAmount <= 0) {
      errors.amount = "Tutar 0'dan büyük olmalı.";
    } else {
      amount = new Prisma.Decimal(amountValue);
    }
  }

  const paymentDate = parseDate(paymentDateValue);

  if (!paymentDate) {
    errors.paymentDate = "Tarih boş olamaz.";
  }

  let companyId = optionalText(companyIdValue);

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      errors.companyId = "Silinmiş veya geçersiz cari seçilemez.";
    }
  }

  const invoiceId = optionalText(invoiceIdValue);

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null, company: { deletedAt: null } },
      select: { id: true, companyId: true },
    });

    if (!invoice) {
      errors.invoiceId = "Silinmiş veya geçersiz fatura seçilemez.";
    } else if (companyId && companyId !== invoice.companyId) {
      errors.invoiceId = "Seçilen fatura ile cari firma uyumlu olmalı.";
    } else if (!companyId) {
      companyId = invoice.companyId;
    }
  }

  const financialAccountId = optionalText(financialAccountIdValue);

  if (financialAccountId) {
    const financialAccount = await prisma.financialAccount.findFirst({
      where: { id: financialAccountId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!financialAccount) {
      errors.financialAccountId = "Geçerli bir finansal hesap seçin.";
    }
  }

  if (Object.keys(errors).length > 0 || !amount || !paymentDate) {
    return { errors };
  }

  return {
    data: {
      type: typeValue as PaymentType,
      companyId,
      invoiceId,
      financialAccountId,
      amount,
      currency,
      paymentDate,
      method: methodValue as PaymentMethod,
      description: optionalText(readText(formData, "description")),
    },
    errors,
  };
}

export async function createPaymentAction(
  _previousState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = await parsePaymentForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let paymentId: string;

  try {
    const payment = await prisma.payment.create({
      data: parsed.data,
      select: { id: true },
    });
    paymentId = payment.id;
    await updateInvoicePaymentStatus(parsed.data.invoiceId);
  } catch {
    return { message: "Para hareketi kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  if (parsed.data.invoiceId) {
    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  }
  redirect(`/payments/${paymentId}`);
}

export async function updatePaymentAction(
  paymentId: string,
  _previousState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = await parsePaymentForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let previousInvoiceId: string | null = null;

  try {
    const existingPayment = await prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      select: { invoiceId: true },
    });

    if (!existingPayment) {
      return { message: "Düzenlenecek para hareketi bulunamadı." };
    }

    previousInvoiceId = existingPayment.invoiceId;

    await prisma.payment.update({
      where: { id: paymentId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });

    await updateInvoicePaymentStatus(previousInvoiceId);
    if (previousInvoiceId !== parsed.data.invoiceId) {
      await updateInvoicePaymentStatus(parsed.data.invoiceId);
    }
  } catch {
    return { message: "Para hareketi güncellenirken bir hata oluştu." };
  }

  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}`);
  revalidatePath("/invoices");
  if (previousInvoiceId) {
    revalidatePath(`/invoices/${previousInvoiceId}`);
  }
  if (parsed.data.invoiceId) {
    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  }
  redirect(`/payments/${paymentId}`);
}

export async function deletePaymentAction(paymentId: string) {
  let invoiceId: string | null = null;

  try {
    const payment = await prisma.payment.update({
      where: { id: paymentId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { invoiceId: true },
    });
    invoiceId = payment.invoiceId;
    await updateInvoicePaymentStatus(invoiceId);
  } catch {
    redirect(`/payments/${paymentId}?error=delete`);
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  if (invoiceId) {
    revalidatePath(`/invoices/${invoiceId}`);
  }
  redirect("/payments");
}
