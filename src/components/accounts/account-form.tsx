"use client";

import type { FinancialAccountType } from "#prisma/client";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import type { AccountFormState } from "@/app/(dashboard)/accounts/actions";
import { accountTypeOptions } from "@/lib/account-utils";

type AccountFormValues = {
  name?: string;
  type?: FinancialAccountType;
  bankName?: string | null;
  iban?: string | null;
  currency?: string;
  openingBalance?: string;
  currentBalance?: string;
  creditLimit?: string | null;
  statementDay?: number | null;
  dueDay?: number | null;
  isActive?: boolean;
  notes?: string | null;
};

type AccountFormProps = {
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  submitLabel: string;
  initialValues?: AccountFormValues;
};

const initialState: AccountFormState = {};

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

export function AccountForm({ action, submitLabel, initialValues }: AccountFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedType, setSelectedType] = useState<FinancialAccountType | "">(
    initialValues?.type ?? "",
  );
  const isCreditCard = selectedType === "CREDIT_CARD";

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">Hesap bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[#46534b]">
            Hesap adÄ±
            <input
              name="name"
              defaultValue={initialValues?.name ?? ""}
              className={fieldClass(Boolean(state.errors?.name))}
              required
            />
            <FieldError message={state.errors?.name} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Hesap tipi
            <select
              name="type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as FinancialAccountType)}
              className={fieldClass(Boolean(state.errors?.type))}
              required
            >
              <option value="">SeÃ§in</option>
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.type} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Banka adÄ±
            <input
              name="bankName"
              defaultValue={initialValues?.bankName ?? ""}
              className={fieldClass(Boolean(state.errors?.bankName))}
            />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            IBAN
            <input
              name="iban"
              defaultValue={initialValues?.iban ?? ""}
              className={fieldClass(Boolean(state.errors?.iban))}
            />
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
            AÃ§Ä±lÄ±ÅŸ bakiyesi
            <input
              name="openingBalance"
              type="number"
              step="0.01"
              defaultValue={initialValues?.openingBalance ?? "0"}
              className={fieldClass(Boolean(state.errors?.openingBalance))}
            />
            <FieldError message={state.errors?.openingBalance} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Mevcut bakiye
            <input
              name="currentBalance"
              type="number"
              step="0.01"
              defaultValue={initialValues?.currentBalance ?? initialValues?.openingBalance ?? "0"}
              className={fieldClass(Boolean(state.errors?.currentBalance))}
            />
            <FieldError message={state.errors?.currentBalance} />
          </label>

          <label className="flex items-center gap-3 pt-8 text-sm font-medium text-[#46534b]">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={initialValues?.isActive ?? true}
              className="h-4 w-4 accent-[#1f6f54]"
            />
            Aktif hesap
          </label>
        </div>

        {isCreditCard ? (
          <div className="mt-5 rounded-lg border border-[#dce2dc] bg-[#fbfcfa] p-4">
            <h3 className="text-sm font-semibold text-[#223028]">Kredi kartÄ± bilgileri</h3>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              Hesap kesim gÃ¼nÃ¼ ve son Ã¶deme gÃ¼nÃ¼ girerseniz sistem otomatik aylÄ±k
              hatÄ±rlatma oluÅŸturur.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-medium text-[#46534b]">
                Kredi limiti
                <input
                  name="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.creditLimit ?? ""}
                  className={fieldClass(Boolean(state.errors?.creditLimit))}
                />
                <FieldError message={state.errors?.creditLimit} />
              </label>

              <label className="block text-sm font-medium text-[#46534b]">
                Hesap kesim gÃ¼nÃ¼
                <input
                  name="statementDay"
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  defaultValue={initialValues?.statementDay ?? ""}
                  className={fieldClass(Boolean(state.errors?.statementDay))}
                />
                <FieldError message={state.errors?.statementDay} />
              </label>

              <label className="block text-sm font-medium text-[#46534b]">
                Son Ã¶deme gÃ¼nÃ¼
                <input
                  name="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  defaultValue={initialValues?.dueDay ?? ""}
                  className={fieldClass(Boolean(state.errors?.dueDay))}
                />
                <FieldError message={state.errors?.dueDay} />
              </label>
            </div>
          </div>
        ) : null}

        {!isCreditCard ? (
          <>
            <input type="hidden" name="creditLimit" value="" />
            <input type="hidden" name="statementDay" value="" />
            <input type="hidden" name="dueDay" value="" />
          </>
        ) : null}

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
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
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
