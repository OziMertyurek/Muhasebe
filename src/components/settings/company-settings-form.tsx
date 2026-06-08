"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type {
  CompanySettingsFormField,
  CompanySettingsFormState,
} from "@/app/(dashboard)/settings/company/actions";
import type { CompanySettings } from "@/lib/settings-utils";

type CompanySettingsFormProps = {
  action: (
    state: CompanySettingsFormState,
    formData: FormData,
  ) => Promise<CompanySettingsFormState>;
  initialValues: CompanySettings;
};

const initialState: CompanySettingsFormState = {};

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

function getValue(settings: CompanySettings, key: CompanySettingsFormField) {
  return settings[key] ?? "";
}

export function CompanySettingsForm({
  action,
  initialValues,
}: CompanySettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">Şirket bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[#46534b]">
            Şirket adı
            <input
              name="company.name"
              defaultValue={getValue(initialValues, "company.name")}
              className={fieldClass(Boolean(state.errors?.["company.name"]))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Vergi no
            <input
              name="company.taxNumber"
              defaultValue={getValue(initialValues, "company.taxNumber")}
              className={fieldClass(Boolean(state.errors?.["company.taxNumber"]))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Vergi dairesi
            <input
              name="company.taxOffice"
              defaultValue={getValue(initialValues, "company.taxOffice")}
              className={fieldClass(Boolean(state.errors?.["company.taxOffice"]))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            E-posta
            <input
              name="company.email"
              type="email"
              defaultValue={getValue(initialValues, "company.email")}
              className={fieldClass(Boolean(state.errors?.["company.email"]))}
            />
            <FieldError message={state.errors?.["company.email"]} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Telefon
            <input
              name="company.phone"
              defaultValue={getValue(initialValues, "company.phone")}
              className={fieldClass(Boolean(state.errors?.["company.phone"]))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Ülke
            <input
              name="company.country"
              defaultValue={getValue(initialValues, "company.country")}
              className={fieldClass(Boolean(state.errors?.["company.country"]))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Şehir
            <input
              name="company.city"
              defaultValue={getValue(initialValues, "company.city")}
              className={fieldClass(Boolean(state.errors?.["company.city"]))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Varsayılan para birimi
            <input
              name="app.defaultCurrency"
              defaultValue={getValue(initialValues, "app.defaultCurrency") || "TRY"}
              className={fieldClass(Boolean(state.errors?.["app.defaultCurrency"]))}
              maxLength={3}
            />
            <FieldError message={state.errors?.["app.defaultCurrency"]} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Varsayılan KDV oranı
            <input
              name="app.defaultVatRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={getValue(initialValues, "app.defaultVatRate") || "20"}
              className={fieldClass(Boolean(state.errors?.["app.defaultVatRate"]))}
            />
            <FieldError message={state.errors?.["app.defaultVatRate"]} />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
          Adres
          <textarea
            name="company.address"
            defaultValue={getValue(initialValues, "company.address")}
            className={textareaClass(Boolean(state.errors?.["company.address"]))}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
          Notlar
          <textarea
            name="company.notes"
            defaultValue={getValue(initialValues, "company.notes")}
            className={textareaClass(Boolean(state.errors?.["company.notes"]))}
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
          {isPending ? "Kaydediliyor" : "Ayarları Kaydet"}
        </button>
      </div>
    </form>
  );
}
