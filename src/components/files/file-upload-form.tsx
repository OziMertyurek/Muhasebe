"use client";

import type { FileRelatedType } from "@prisma/client";
import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import type { FileUploadFormState } from "@/app/(dashboard)/files/actions";
import { fileRelatedTypeOptions } from "@/lib/file-utils";

type Option = {
  id: string;
  label: string;
};

type FileUploadFormProps = {
  action: (state: FileUploadFormState, formData: FormData) => Promise<FileUploadFormState>;
  options: {
    invoices: Option[];
    expenses: Option[];
    companies: Option[];
    payments: Option[];
  };
  initialValues?: {
    relatedType?: FileRelatedType;
    invoiceId?: string;
    expenseId?: string;
    companyId?: string;
    paymentId?: string;
  };
};

const initialState: FileUploadFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function FileUploadForm({ action, options, initialValues }: FileUploadFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [relatedType, setRelatedType] = useState<FileRelatedType>(
    initialValues?.relatedType ?? "OTHER",
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">Dosya bilgileri</h2>
        <p className="mt-2 text-sm leading-6 text-[#647067]">
          Fatura ve AI analiz dosyaları için sadece PDF, PNG, JPG veya WebP desteklenir.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[#46534b]">
            Dosya
            <input
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/png,image/jpeg,image/webp"
              className="mt-2 block w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-[#e8f2ed] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#14543f] focus:border-[#1f6f54]"
              required
            />
            <FieldError message={state.errors?.file} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            İlişki tipi
            <select
              name="relatedType"
              value={relatedType}
              onChange={(event) => setRelatedType(event.target.value as FileRelatedType)}
              className={fieldClass(Boolean(state.errors?.relatedType))}
              required
            >
              {fileRelatedTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.relatedType} />
          </label>
        </div>

        <div className="mt-4">
          {relatedType === "INVOICE" ? (
            <RelationSelect
              name="invoiceId"
              label="İlgili fatura"
              options={options.invoices}
              defaultValue={initialValues?.invoiceId}
            />
          ) : null}
          {relatedType === "EXPENSE" ? (
            <RelationSelect
              name="expenseId"
              label="İlgili gider"
              options={options.expenses}
              defaultValue={initialValues?.expenseId}
            />
          ) : null}
          {relatedType === "COMPANY" ? (
            <RelationSelect
              name="companyId"
              label="İlgili cari"
              options={options.companies}
              defaultValue={initialValues?.companyId}
            />
          ) : null}
          {relatedType === "PAYMENT" ? (
            <RelationSelect
              name="paymentId"
              label="İlgili tahsilat / ödeme"
              options={options.payments}
              defaultValue={initialValues?.paymentId}
            />
          ) : null}
          {relatedType === "OTHER" ? (
            <div className="rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-4 py-3 text-sm text-[#647067]">
              Diğer dosyalar ilişki seçmeden arşivlenebilir.
            </div>
          ) : null}
          <FieldError message={state.errors?.relatedId} />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#223028]">AI Analizi</h2>
        <p className="mt-2 text-sm text-[#647067]">
          Bu alan ileride AI/OCR fatura okuma sistemi için kullanılacak.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Upload className="h-4 w-4" />
          {isPending ? "Yükleniyor" : "Dosyayı yükle"}
        </button>
      </div>
    </form>
  );
}

function RelationSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#46534b]">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className={fieldClass()}>
        <option value="">İlişkili kayıt seçilmedi</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
