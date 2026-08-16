"use server";

import { PaymentMethod, PaymentType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AccountingValidationError,
  assertPaymentMatchesInvoice,
} from "@/lib/accounting-core";
import { createAuditLog } from "@/lib/audit-log-utils";
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
    errors.type = "Islem tipi secilmeli.";
  }

  if (!methodValue || !Object.values(PaymentMethod).includes(methodValue as PaymentMethod)) {
    errors.method = "Odeme yontemi secilmeli.";
  }

  let amount: Prisma.Decimal | null = null;

  if (!amountValue) {
    errors.amount = "Tutar girilmeli.";
  } else {
    const numericAmount = Number(amountValue);

    if (Number.isNaN(numericAmount)) {
      errors.amount = "Tutar sayi olmali.";
    } else if (numericAmount <= 0) {
      errors.amount = "Tutar 0'dan buyuk olmali.";
    } else {
      amount = new Prisma.Decimal(amountValue);
    }
  }

  const paymentDate = parseDate(paymentDateValue);

  if (!paymentDate) {
    errors.paymentDate = "Tarih bos olamaz.";
  }

  let companyId = optionalText(companyIdValue);

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      errors.companyId = "Silinmis veya gecersiz cari secilemez.";
    }
  }

  const invoiceId = optionalText(invoiceIdValue);

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null, company: { deletedAt: null } },
      select: { id: true, companyId: true },
    });

    if (!invoice) {
      errors.invoiceId = "Silinmis veya gecersiz fatura secilemez.";
    } else if (companyId && companyId !== invoice.companyId) {
      errors.invoiceId = "Secilen fatura ile cari firma uyumlu olmali.";
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
      errors.financialAccountId = "Gecerli bir finansal hesap secin.";
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

async function assertPaymentIsSafeForInvoice(
  tx: Prisma.TransactionClient,
  data: PaymentPayload,
  ignoredPaymentId?: string,
) {
  if (!data.invoiceId) {
    return;
  }

  const invoice = await tx.invoice.findFirst({
    where: { id: data.invoiceId, deletedAt: null, company: { deletedAt: null } },
    select: {
      id: true,
      companyId: true,
      type: true,
      currency: true,
      totalAmount: true,
    },
  });

  if (!invoice) {
    throw new AccountingValidationError("invoiceId", "Silinmis veya gecersiz fatura secilemez.");
  }

  const existingPayments = await tx.payment.findMany({
    where: {
      invoiceId: invoice.id,
      deletedAt: null,
      ...(ignoredPaymentId ? { id: { not: ignoredPaymentId } } : {}),
    },
    select: {
      type: true,
      amount: true,
      currency: true,
    },
  });

  assertPaymentMatchesInvoice(data, invoice, existingPayments);
}

function validationFailure(error: AccountingValidationError): PaymentFormState {
  return {
    errors: { [error.field]: error.message },
    message: "Lutfen formdaki hatalari duzeltin.",
  };
}

export async function createPaymentAction(
  _previousState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = await parsePaymentForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lutfen formdaki hatalari duzeltin." };
  }

  const data = parsed.data;
  let paymentId: string;

  try {
    const payment = await prisma.$transaction(async (tx) => {
      await assertPaymentIsSafeForInvoice(tx, data);
      const createdPayment = await tx.payment.create({
        data,
        select: { id: true },
      });
      await updateInvoicePaymentStatus(data.invoiceId, tx);
      return createdPayment;
    });
    paymentId = payment.id;
    await createAuditLog({
      entityType: "PAYMENT",
      entityId: paymentId,
      action: "CREATE",
      title: `Para hareketi eklendi: ${data.amount.toString()} ${data.currency}`,
      description: data.description ?? "Tahsilat / odeme hareketi olusturuldu.",
      after: data,
    });
  } catch (error) {
    if (error instanceof AccountingValidationError) {
      return validationFailure(error);
    }

    return { message: "Para hareketi kaydedilirken bir hata olustu." };
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  if (data.invoiceId) {
    revalidatePath(`/invoices/${data.invoiceId}`);
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
    return { errors: parsed.errors, message: "Lutfen formdaki hatalari duzeltin." };
  }

  const data = parsed.data;
  let previousInvoiceId: string | null = null;

  try {
    const existingPayment = await prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findFirst({
        where: { id: paymentId, deletedAt: null },
      });

      if (!currentPayment) {
        throw new AccountingValidationError(
          "invoiceId",
          "Duzenlenecek para hareketi bulunamadi.",
        );
      }

      previousInvoiceId = currentPayment.invoiceId;
      await assertPaymentIsSafeForInvoice(tx, data, paymentId);
      await tx.payment.update({
        where: { id: paymentId, deletedAt: null },
        data,
        select: { id: true },
      });
      await updateInvoicePaymentStatus(previousInvoiceId, tx);
      if (previousInvoiceId !== data.invoiceId) {
        await updateInvoicePaymentStatus(data.invoiceId, tx);
      }

      return currentPayment;
    });
    await createAuditLog({
      entityType: "PAYMENT",
      entityId: paymentId,
      action: "UPDATE",
      title: `Para hareketi guncellendi: ${data.amount.toString()} ${data.currency}`,
      description: data.description ?? "Tahsilat / odeme hareketi guncellendi.",
      before: existingPayment,
      after: data,
    });
  } catch (error) {
    if (error instanceof AccountingValidationError) {
      return validationFailure(error);
    }

    return { message: "Para hareketi guncellenirken bir hata olustu." };
  }

  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}`);
  revalidatePath("/invoices");
  if (previousInvoiceId) {
    revalidatePath(`/invoices/${previousInvoiceId}`);
  }
  if (data.invoiceId) {
    revalidatePath(`/invoices/${data.invoiceId}`);
  }
  redirect(`/payments/${paymentId}`);
}

export async function deletePaymentAction(paymentId: string) {
  let invoiceId: string | null = null;

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const deletedPayment = await tx.payment.update({
        where: { id: paymentId, deletedAt: null },
        data: { deletedAt: new Date() },
        select: {
          id: true,
          invoiceId: true,
          type: true,
          amount: true,
          currency: true,
          description: true,
        },
      });
      await updateInvoicePaymentStatus(deletedPayment.invoiceId, tx);
      return deletedPayment;
    });
    invoiceId = payment.invoiceId;
    await createAuditLog({
      entityType: "PAYMENT",
      entityId: payment.id,
      action: "SOFT_DELETE",
      title: `Para hareketi silindi: ${payment.amount.toString()} ${payment.currency}`,
      description: "Kayit cop kutusuna tasindi.",
      before: payment,
    });
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
