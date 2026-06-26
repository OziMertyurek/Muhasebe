"use client";

import type { Company, InvoiceStatus, InvoiceType } from "@prisma/client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import type { InvoiceFormState } from "@/app/(dashboard)/invoices/actions";
import { invoiceStatusOptions, invoiceTypeOptions } from "@/lib/invoice-utils";

type InvoiceCompanyOption = Pick<Company, "id" | "name">;

type InvoiceFormValues = {
  companyId?: string;
  type?: InvoiceType;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  currency?: string;
  subtotal?: string;
  vatAmount?: string;
  discountAmount?: string;
  totalAmount?: string;
  status?: InvoiceStatus;
  notes?: string | null;
};

type InvoiceFormProps = {
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  companies: InvoiceCompanyOption[];
  submitLabel: string;
  initialValues?: InvoiceFormValues;
};

const initialState: InvoiceFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function InvoiceForm({
  action,
  companies,
  submitLabel,
  initialValues,
}: InvoiceFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6">
        <h2 className="text-base font-semibold text-[#16201b]">Fatura bilgileri</h2>
        <p className="mt-2 text-sm leading-5 text-[#647067]">
          Vade tarihi girerseniz sistem otomatik hatırlatma oluşturur.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Cari firma
            <select
              name="companyId"
              defaultValue={initialValues?.companyId ?? ""}
              className={fieldClass(Boolean(state.errors?.companyId))}
              required
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

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura tipi
            <select
              name="type"
              defaultValue={initialValues?.type ?? ""}
              className={fieldClass(Boolean(state.errors?.type))}
              required
            >
              <option value="">Seçin</option>
              {invoiceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.type} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura no
            <input
              name="invoiceNumber"
              defaultValue={initialValues?.invoiceNumber ?? ""}
              className={fieldClass(Boolean(state.errors?.invoiceNumber))}
              required
            />
            <FieldError message={state.errors?.invoiceNumber} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura tarihi
            <input
              name="invoiceDate"
              type="date"
              defaultValue={initialValues?.invoiceDate ?? ""}
              className={fieldClass(Boolean(state.errors?.invoiceDate))}
              required
            />
            <FieldError message={state.errors?.invoiceDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Vade tarihi
            <input
              name="dueDate"
              type="date"
              defaultValue={initialValues?.dueDate ?? ""}
              className={fieldClass(Boolean(state.errors?.dueDate))}
            />
            <FieldError message={state.errors?.dueDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Para birimi
            <input
              name="currency"
              defaultValue={initialValues?.currency ?? "TRY"}
              className={fieldClass(Boolean(state.errors?.currency))}
              maxLength={3}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Ara toplam
            <input
              name="subtotal"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.subtotal ?? ""}
              className={fieldClass(Boolean(state.errors?.subtotal))}
            />
            <FieldError message={state.errors?.subtotal} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            KDV tutarı
            <input
              name="vatAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.vatAmount ?? "0"}
              className={fieldClass(Boolean(state.errors?.vatAmount))}
            />
            <FieldError message={state.errors?.vatAmount} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            İskonto tutarı
            <input
              name="discountAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.discountAmount ?? "0"}
              className={fieldClass(Boolean(state.errors?.discountAmount))}
            />
            <FieldError message={state.errors?.discountAmount} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Genel toplam
            <input
              name="totalAmount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={initialValues?.totalAmount ?? ""}
              className={fieldClass(Boolean(state.errors?.totalAmount))}
            />
            <FieldError message={state.errors?.totalAmount} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Durum
            <select
              name="status"
              defaultValue={initialValues?.status ?? "UNPAID"}
              className={fieldClass(Boolean(state.errors?.status))}
            >
              {invoiceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.status} />
          </label>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Notlar
          <textarea
            name="notes"
            defaultValue={initialValues?.notes ?? ""}
            className={textareaClass(Boolean(state.errors?.notes))}
          />
        </label>
      </div>

      <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#223028]">Fatura kalemleri ve dosyalar</h2>
        <p className="mt-2 text-sm text-[#647067]">Bu alan sonraki aşamada bağlanacak.</p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1f6f54] px-5 text-sm font-semibold text-white transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#8ea99b]  disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
