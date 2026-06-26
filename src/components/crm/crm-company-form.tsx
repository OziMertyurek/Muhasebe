"use client";

import type { CrmCompanyStatus, CrmReplyStatus } from "@prisma/client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import type { CrmCompanyFormState } from "@/app/(dashboard)/crm/actions";
import {
  crmCompanyStatusOptions,
  crmReplyStatusOptions,
} from "@/lib/crm-company-utils";

type CrmCompanyFormValues = {
  companyName?: string;
  country?: string | null;
  email?: string | null;
  website?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  sector?: string | null;
  source?: string | null;
  status?: CrmCompanyStatus;
  replyStatus?: CrmReplyStatus;
  lastContactDate?: string | null;
  followUpDate?: string | null;
  tags?: string | null;
  notes?: string | null;
};

type CrmCompanyFormProps = {
  action: (state: CrmCompanyFormState, formData: FormData) => Promise<CrmCompanyFormState>;
  submitLabel: string;
  initialValues?: CrmCompanyFormValues;
};

const initialState: CrmCompanyFormState = {};

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

export function CrmCompanyForm({
  action,
  submitLabel,
  initialValues,
}: CrmCompanyFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dce2dc] bg-white p-6">
        <h2 className="text-base font-semibold text-[#16201b]">Firma bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Firma adı
            <input
              name="companyName"
              defaultValue={initialValues?.companyName ?? ""}
              className={fieldClass(Boolean(state.errors?.companyName))}
              required
            />
            <FieldError message={state.errors?.companyName} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Ülke
            <input
              name="country"
              defaultValue={initialValues?.country ?? ""}
              className={fieldClass(Boolean(state.errors?.country))}
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
            Web sitesi
            <input
              name="website"
              defaultValue={initialValues?.website ?? ""}
              placeholder="example.com"
              className={fieldClass(Boolean(state.errors?.website))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Yetkili kişi
            <input
              name="contactPerson"
              defaultValue={initialValues?.contactPerson ?? ""}
              className={fieldClass(Boolean(state.errors?.contactPerson))}
            />
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
            Sektör
            <input
              name="sector"
              defaultValue={initialValues?.sector ?? ""}
              className={fieldClass(Boolean(state.errors?.sector))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Kaynak
            <input
              name="source"
              defaultValue={initialValues?.source ?? ""}
              placeholder="Fuar, web, referans..."
              className={fieldClass(Boolean(state.errors?.source))}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-6">
        <h2 className="text-base font-semibold text-[#16201b]">Takip bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Durum
            <select
              name="status"
              defaultValue={initialValues?.status ?? "NEW"}
              className={fieldClass(Boolean(state.errors?.status))}
              required
            >
              {crmCompanyStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.status} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Cevap durumu
            <select
              name="replyStatus"
              defaultValue={initialValues?.replyStatus ?? "NO_CONTACT"}
              className={fieldClass(Boolean(state.errors?.replyStatus))}
              required
            >
              {crmReplyStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.replyStatus} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Son iletişim tarihi
            <input
              name="lastContactDate"
              type="date"
              defaultValue={initialValues?.lastContactDate ?? ""}
              className={fieldClass(Boolean(state.errors?.lastContactDate))}
            />
            <FieldError message={state.errors?.lastContactDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Takip tarihi
            <input
              name="followUpDate"
              type="date"
              defaultValue={initialValues?.followUpDate ?? ""}
              className={fieldClass(Boolean(state.errors?.followUpDate))}
            />
            <FieldError message={state.errors?.followUpDate} />
          </label>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Etiketler
          <input
            name="tags"
            defaultValue={initialValues?.tags ?? ""}
            placeholder="distributor, avrupa, numune"
            className={fieldClass(Boolean(state.errors?.tags))}
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
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1f6f54] px-5 text-sm font-semibold text-white transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#8ea99b] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
