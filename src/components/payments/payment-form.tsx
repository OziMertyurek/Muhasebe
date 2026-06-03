"use client";

import type { InvoiceType, PaymentMethod, PaymentType } from "@prisma/client";
import { useActionState, useMemo, useState } from "react";
import { Save } from "lucide-react";
import type { PaymentFormState } from "@/app/(dashboard)/payments/actions";
import { invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentMethodOptions, paymentTypeOptions } from "@/lib/payment-utils";

type CompanyOption = {
  id: string;
  name: string;
};

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string;
  type: InvoiceType;
};

type FinancialAccountOption = {
  id: string;
  name: string;
};

type PaymentFormValues = {
  type?: PaymentType;
  companyId?: string | null;
  invoiceId?: string | null;
  financialAccountId?: string | null;
  amount?: string;
  currency?: string;
  paymentDate?: string;
  method?: PaymentMethod;
  description?: string | null;
};

type PaymentFormProps = {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  companies: CompanyOption[];
  invoices: InvoiceOption[];
  financialAccounts: FinancialAccountOption[];
  submitLabel: string;
  initialValues?: PaymentFormValues;
};

const initialState: PaymentFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function PaymentForm({
  action,
  companies,
  invoices,
  financialAccounts,
  submitLabel,
  initialValues,
}: PaymentFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialValues?.companyId ?? "");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialValues?.invoiceId ?? "");
  const [selectedPaymentType, setSelectedPaymentType] = useState(initialValues?.type ?? "");

  const filteredInvoices = useMemo(() => {
    if (!selectedCompanyId) {
      return invoices;
    }

    return invoices.filter((invoice) => invoice.companyId === selectedCompanyId);
  }, [invoices, selectedCompanyId]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId);
  const hasDirectionWarning =
    selectedInvoice &&
    ((selectedInvoice.type === "SALES" && selectedPaymentType === "PAYMENT") ||
      (selectedInvoice.type === "PURCHASE" && selectedPaymentType === "COLLECTION"));

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">Para hareketi bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[#46534b]">
            İşlem tipi
            <select
              name="type"
              value={selectedPaymentType}
              onChange={(event) => setSelectedPaymentType(event.target.value as PaymentType)}
              className={fieldClass(Boolean(state.errors?.type))}
              required
            >
              <option value="">Seçin</option>
              {paymentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.type} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Cari firma
            <select
              name="companyId"
              value={selectedCompanyId}
              onChange={(event) => {
                setSelectedCompanyId(event.target.value);
                if (
                  selectedInvoiceId &&
                  invoices.find((invoice) => invoice.id === selectedInvoiceId)?.companyId !==
                    event.target.value
                ) {
                  setSelectedInvoiceId("");
                }
              }}
              className={fieldClass(Boolean(state.errors?.companyId))}
            >
              <option value="">Seçin</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.companyId} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            İlgili fatura
            <select
              name="invoiceId"
              value={selectedInvoiceId}
              onChange={(event) => {
                const invoiceId = event.target.value;
                const invoice = invoices.find((item) => item.id === invoiceId);
                setSelectedInvoiceId(invoiceId);
                if (invoice && !selectedCompanyId) {
                  setSelectedCompanyId(invoice.companyId);
                }
              }}
              className={fieldClass(Boolean(state.errors?.invoiceId))}
            >
              <option value="">Fatura seçilmedi</option>
              {filteredInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.companyName}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.invoiceId} />
            {selectedInvoice ? (
              <p className="mt-1 text-xs text-[#647067]">
                Fatura tipi: {invoiceTypeLabels[selectedInvoice.type]}
              </p>
            ) : null}
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Finansal hesap
            <select
              name="financialAccountId"
              defaultValue={initialValues?.financialAccountId ?? ""}
              className={fieldClass(Boolean(state.errors?.financialAccountId))}
            >
              <option value="">Hesap seçilmedi</option>
              {financialAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.financialAccountId} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Tutar
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={initialValues?.amount ?? ""}
              className={fieldClass(Boolean(state.errors?.amount))}
              required
            />
            <FieldError message={state.errors?.amount} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Para birimi
            <input
              name="currency"
              defaultValue={initialValues?.currency ?? "TRY"}
              className={fieldClass(Boolean(state.errors?.currency))}
              maxLength={3}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Tarih
            <input
              name="paymentDate"
              type="date"
              defaultValue={initialValues?.paymentDate ?? ""}
              className={fieldClass(Boolean(state.errors?.paymentDate))}
              required
            />
            <FieldError message={state.errors?.paymentDate} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Ödeme yöntemi
            <select
              name="method"
              defaultValue={initialValues?.method ?? ""}
              className={fieldClass(Boolean(state.errors?.method))}
              required
            >
              <option value="">Seçin</option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.method} />
          </label>
        </div>

        {hasDirectionWarning ? (
          <div className="mt-4 rounded-md border border-[#ead7a8] bg-[#fff9e8] px-4 py-3 text-sm text-[#765116]">
            Satış faturası için genelde “Para aldım”, alış faturası için genelde “Para ödedim”
            seçilir.
          </div>
        ) : null}

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
          Açıklama
          <textarea
            name="description"
            defaultValue={initialValues?.description ?? ""}
            className={textareaClass(Boolean(state.errors?.description))}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
