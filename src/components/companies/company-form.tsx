"use client";

import type { CompanyType } from "#prisma/client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import type { CompanyFormState } from "@/app/(dashboard)/companies/actions";
import { companyTypeOptions } from "@/lib/company-utils";

type CompanyFormValues = {
  name?: string;
  type?: CompanyType;
  taxNumber?: string | null;
  taxOffice?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  defaultCurrency?: string;
  riskLimit?: string | null;
  paymentTermDays?: number | null;
  notes?: string | null;
};

type CompanyFormProps = {
  action: (state: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  submitLabel: string;
  initialValues?: CompanyFormValues;
};

const initialState: CompanyFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] shadow-sm outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#16201b] shadow-sm outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function CompanyForm({ action, submitLabel, initialValues }: CompanyFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
        <h2 className="text-base font-semibold text-[#16201b]">Cari bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Firma adÄ±
            <input
              name="name"
              defaultValue={initialValues?.name ?? ""}
              className={fieldClass(Boolean(state.errors?.name))}
              required
            />
            <FieldError message={state.errors?.name} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Cari tipi
            <select
              name="type"
              defaultValue={initialValues?.type ?? ""}
              className={fieldClass(Boolean(state.errors?.type))}
              required
            >
              <option value="">SeÃ§in</option>
              {companyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.type} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Vergi no
            <input
              name="taxNumber"
              defaultValue={initialValues?.taxNumber ?? ""}
              className={fieldClass(Boolean(state.errors?.taxNumber))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Vergi dairesi
            <input
              name="taxOffice"
              defaultValue={initialValues?.taxOffice ?? ""}
              className={fieldClass(Boolean(state.errors?.taxOffice))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            E-posta
            <input
              name="email"
              type="email"
              defaultValue={initialValues?.email ?? ""}
              className={fieldClass(Boolean(state.errors?.email))}
            />
            <FieldError message={state.errors?.email} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Telefon
            <input
              name="phone"
              defaultValue={initialValues?.phone ?? ""}
              className={fieldClass(Boolean(state.errors?.phone))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Ãœlke
            <input
              name="country"
              defaultValue={initialValues?.country ?? ""}
              className={fieldClass(Boolean(state.errors?.country))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Åehir
            <input
              name="city"
              defaultValue={initialValues?.city ?? ""}
              className={fieldClass(Boolean(state.errors?.city))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            VarsayÄ±lan para birimi
            <input
              name="defaultCurrency"
              defaultValue={initialValues?.defaultCurrency ?? "TRY"}
              className={fieldClass(Boolean(state.errors?.defaultCurrency))}
              maxLength={3}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Risk limiti
            <input
              name="riskLimit"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.riskLimit ?? ""}
              className={fieldClass(Boolean(state.errors?.riskLimit))}
            />
            <FieldError message={state.errors?.riskLimit} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Vade gÃ¼nÃ¼
            <input
              name="paymentTermDays"
              type="number"
              min="0"
              step="1"
              defaultValue={initialValues?.paymentTermDays ?? ""}
              className={fieldClass(Boolean(state.errors?.paymentTermDays))}
            />
            <FieldError message={state.errors?.paymentTermDays} />
          </label>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Adres
          <textarea
            name="address"
            defaultValue={initialValues?.address ?? ""}
            className={textareaClass(Boolean(state.errors?.address))}
          />
        </label>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Notlar
          <textarea
            name="notes"
            defaultValue={initialValues?.notes ?? ""}
            className={textareaClass(Boolean(state.errors?.notes))}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1f6f54] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#8ea99b] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
