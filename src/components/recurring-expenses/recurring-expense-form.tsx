"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { RecurringExpenseFormState } from "@/app/(dashboard)/recurring-expenses/actions";

type Option = {
  id: string;
  name: string;
};

type RecurringExpenseFormValues = {
  title?: string;
  categoryId?: string | null;
  amount?: string;
  currency?: string;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
  description?: string | null;
};

type RecurringExpenseFormProps = {
  action: (
    state: RecurringExpenseFormState,
    formData: FormData,
  ) => Promise<RecurringExpenseFormState>;
  categories: Option[];
  submitLabel: string;
  initialValues?: RecurringExpenseFormValues;
};

const initialState: RecurringExpenseFormState = {};

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

export function RecurringExpenseForm({
  action,
  categories,
  submitLabel,
  initialValues,
}: RecurringExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6">
        <h2 className="text-base font-semibold text-[#16201b]">Sabit gider bilgileri</h2>
        <p className="mt-2 text-sm leading-5 text-[#647067]">
          Aktif sabit giderler için aylık hatırlatma oluşturulur.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Gider adı
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
            Ayın günü
            <input
              name="dayOfMonth"
              type="number"
              min="1"
              max="31"
              step="1"
              defaultValue={initialValues?.dayOfMonth ?? ""}
              className={fieldClass(Boolean(state.errors?.dayOfMonth))}
              required
            />
            <FieldError message={state.errors?.dayOfMonth} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Başlangıç tarihi
            <input
              name="startDate"
              type="date"
              defaultValue={initialValues?.startDate ?? ""}
              className={fieldClass(Boolean(state.errors?.startDate))}
              required
            />
            <FieldError message={state.errors?.startDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Bitiş tarihi
            <input
              name="endDate"
              type="date"
              defaultValue={initialValues?.endDate ?? ""}
              className={fieldClass(Boolean(state.errors?.endDate))}
            />
            <FieldError message={state.errors?.endDate} />
          </label>

          <label className="flex items-center gap-3 pt-8 text-sm font-medium text-[#46534b]">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={initialValues?.isActive ?? true}
              className="h-4 w-4 accent-[#1f6f54]"
            />
            Aktif sabit gider
          </label>
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

      <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#223028]">Aylık gider üretimi</h2>
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
