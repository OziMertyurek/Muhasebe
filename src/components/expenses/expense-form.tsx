"use client";

import type { ExpenseStatus } from "@prisma/client";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import type { ExpenseFormState } from "@/app/(dashboard)/expenses/actions";
import { expenseStatusOptions } from "@/lib/expense-utils";

type Option = {
  id: string;
  name: string;
};

type ExpenseFormValues = {
  title?: string;
  categoryId?: string | null;
  companyId?: string | null;
  financialAccountId?: string | null;
  amount?: string;
  currency?: string;
  expenseDate?: string;
  status?: ExpenseStatus;
  paymentDate?: string | null;
  description?: string | null;
};

type ExpenseFormProps = {
  action: (state: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  categories: Option[];
  companies: Option[];
  financialAccounts: Option[];
  submitLabel: string;
  initialValues?: ExpenseFormValues;
};

const initialState: ExpenseFormState = {};

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

export function ExpenseForm({
  action,
  categories,
  companies,
  financialAccounts,
  submitLabel,
  initialValues,
}: ExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus>(
    initialValues?.status ?? "UNPAID",
  );
  const isPaid = selectedStatus === "PAID";

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6">
        <h2 className="text-base font-semibold text-[#16201b]">Gider bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Gider başlığı
            <input
              name="title"
              defaultValue={initialValues?.title ?? ""}
              className={fieldClass(Boolean(state.errors?.title))}
              required
            />
            <FieldError message={state.errors?.title} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Kategori
            <select
              name="categoryId"
              defaultValue={initialValues?.categoryId ?? ""}
              className={fieldClass(Boolean(state.errors?.categoryId))}
            >
              <option value="">Kategori seçilmedi</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.categoryId} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Cari firma
            <select
              name="companyId"
              defaultValue={initialValues?.companyId ?? ""}
              className={fieldClass(Boolean(state.errors?.companyId))}
            >
              <option value="">Cari seçilmedi</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.companyId} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
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
            {isPaid ? (
              <p className="mt-1 text-xs text-[#647067]">
                Ödenmiş giderlerde hangi hesaptan ödendiğini seçmeniz önerilir.
              </p>
            ) : null}
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
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
            Gider tarihi
            <input
              name="expenseDate"
              type="date"
              defaultValue={initialValues?.expenseDate ?? ""}
              className={fieldClass(Boolean(state.errors?.expenseDate))}
              required
            />
            <FieldError message={state.errors?.expenseDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Durum
            <select
              name="status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as ExpenseStatus)}
              className={fieldClass(Boolean(state.errors?.status))}
            >
              {expenseStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.status} />
          </label>

          {isPaid ? (
            <label className="block text-sm font-semibold text-[#46534b]">
              Ödeme tarihi
              <input
                name="paymentDate"
                type="date"
                defaultValue={initialValues?.paymentDate ?? ""}
                className={fieldClass(Boolean(state.errors?.paymentDate))}
              />
              <FieldError message={state.errors?.paymentDate} />
            </label>
          ) : (
            <input type="hidden" name="paymentDate" value="" />
          )}
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
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
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1f6f54] px-5 text-sm font-semibold text-white transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#8ea99b]  disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
