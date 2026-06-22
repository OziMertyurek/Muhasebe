"use client";

import type {
  ImportantDateCategory,
  Priority,
  ReminderStatus,
  RepeatType,
} from "@prisma/client";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import type { ImportantDateFormState } from "@/app/(dashboard)/important-dates/actions";
import {
  importantDateCategoryOptions,
  priorityOptions,
  reminderStatusOptions,
  repeatTypeOptions,
} from "@/lib/important-date-utils";

type Option = {
  id: string;
  label: string;
};

type ImportantDateFormValues = {
  title?: string;
  description?: string | null;
  category?: ImportantDateCategory;
  date?: string;
  time?: string | null;
  repeatType?: RepeatType;
  reminderDaysBefore?: number | null;
  priority?: Priority;
  status?: ReminderStatus;
  companyId?: string | null;
  invoiceId?: string | null;
  expenseId?: string | null;
  financialAccountId?: string | null;
};

type ImportantDateFormProps = {
  action: (state: ImportantDateFormState, formData: FormData) => Promise<ImportantDateFormState>;
  companies: Option[];
  invoices: Option[];
  expenses: Option[];
  financialAccounts: Option[];
  submitLabel: string;
  initialValues?: ImportantDateFormValues;
};

const initialState: ImportantDateFormState = {};

const categoryNotes: Partial<Record<ImportantDateCategory, string>> = {
  CREDIT_CARD: "Kredi kartı hatırlatmaları için finansal hesap seçmeniz önerilir.",
  INVOICE: "Fatura hatırlatmaları için ilgili faturayı seçmeniz önerilir.",
  EXPENSE: "Gider hatırlatmaları için ilgili gideri seçmeniz önerilir.",
  COMPANY: "Firma ödeme sözü gibi hatırlatmalarda cari seçmeniz önerilir.",
};

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

export function ImportantDateForm({
  action,
  companies,
  invoices,
  expenses,
  financialAccounts,
  submitLabel,
  initialValues,
}: ImportantDateFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedCategory, setSelectedCategory] = useState<ImportantDateCategory>(
    initialValues?.category ?? "GENERAL",
  );
  const categoryNote = categoryNotes[selectedCategory];

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
        <h2 className="text-base font-semibold text-[#16201b]">Hatırlatma bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Başlık
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
              name="category"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as ImportantDateCategory)
              }
              className={fieldClass(Boolean(state.errors?.category))}
              required
            >
              {importantDateCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.category} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Tarih
            <input
              name="date"
              type="date"
              defaultValue={initialValues?.date ?? ""}
              className={fieldClass(Boolean(state.errors?.date))}
              required
            />
            <FieldError message={state.errors?.date} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Saat
            <input
              name="time"
              type="time"
              defaultValue={initialValues?.time ?? ""}
              className={fieldClass(Boolean(state.errors?.time))}
            />
            <FieldError message={state.errors?.time} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Tekrar tipi
            <select
              name="repeatType"
              defaultValue={initialValues?.repeatType ?? "NONE"}
              className={fieldClass(Boolean(state.errors?.repeatType))}
            >
              {repeatTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Kaç gün önce hatırlatılsın
            <input
              name="reminderDaysBefore"
              type="number"
              min="0"
              step="1"
              defaultValue={initialValues?.reminderDaysBefore ?? ""}
              className={fieldClass(Boolean(state.errors?.reminderDaysBefore))}
            />
            <FieldError message={state.errors?.reminderDaysBefore} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Öncelik
            <select
              name="priority"
              defaultValue={initialValues?.priority ?? "NORMAL"}
              className={fieldClass(Boolean(state.errors?.priority))}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Durum
            <select
              name="status"
              defaultValue={initialValues?.status ?? "PENDING"}
              className={fieldClass(Boolean(state.errors?.status))}
            >
              {reminderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {categoryNote ? (
          <div className="mt-4 rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-4 py-3 text-sm text-[#46534b]">
            {categoryNote}
          </div>
        ) : null}

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Açıklama
          <textarea
            name="description"
            defaultValue={initialValues?.description ?? ""}
            className={textareaClass(Boolean(state.errors?.description))}
          />
        </label>
      </div>

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
        <h2 className="text-base font-semibold text-[#16201b]">İlişkili kayıtlar</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                  {company.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.companyId} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura
            <select
              name="invoiceId"
              defaultValue={initialValues?.invoiceId ?? ""}
              className={fieldClass(Boolean(state.errors?.invoiceId))}
            >
              <option value="">Fatura seçilmedi</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.invoiceId} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Gider
            <select
              name="expenseId"
              defaultValue={initialValues?.expenseId ?? ""}
              className={fieldClass(Boolean(state.errors?.expenseId))}
            >
              <option value="">Gider seçilmedi</option>
              {expenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.expenseId} />
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
                  {account.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.financialAccountId} />
          </label>
        </div>
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
