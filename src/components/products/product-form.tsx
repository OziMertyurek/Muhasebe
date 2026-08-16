"use client";

import type { ProductUnit } from "@prisma/client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import type { ProductFormState } from "@/app/(dashboard)/products/actions";
import { productUnitOptions } from "@/lib/product-utils";

type ProductFormValues = {
  name?: string;
  sku?: string;
  barcode?: string | null;
  description?: string | null;
  unit?: ProductUnit;
  defaultVatRate?: string;
  defaultPurchasePrice?: string;
  defaultSalesPrice?: string;
  currency?: string;
  minimumStockLevel?: string;
  isActive?: boolean;
};

type ProductFormProps = {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  submitLabel: string;
  initialValues?: ProductFormValues;
};

const initialState: ProductFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] shadow-sm outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#16201b] shadow-sm outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function ProductForm({ action, submitLabel, initialValues }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
        <h2 className="text-base font-semibold text-[#16201b]">Urun bilgileri</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Urun adi
            <input
              name="name"
              defaultValue={initialValues?.name ?? ""}
              className={fieldClass(Boolean(state.errors?.name))}
              required
            />
            <FieldError message={state.errors?.name} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            SKU / stok kodu
            <input
              name="sku"
              defaultValue={initialValues?.sku ?? ""}
              className={fieldClass(Boolean(state.errors?.sku))}
              required
            />
            <FieldError message={state.errors?.sku} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Barkod
            <input
              name="barcode"
              defaultValue={initialValues?.barcode ?? ""}
              className={fieldClass(Boolean(state.errors?.barcode))}
            />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Birim
            <select
              name="unit"
              defaultValue={initialValues?.unit ?? "ADET"}
              className={fieldClass(Boolean(state.errors?.unit))}
              required
            >
              {productUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.unit} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Varsayilan KDV %
            <input
              name="defaultVatRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.defaultVatRate ?? "20"}
              className={fieldClass(Boolean(state.errors?.defaultVatRate))}
            />
            <FieldError message={state.errors?.defaultVatRate} />
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
            Varsayilan alis fiyati
            <input
              name="defaultPurchasePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.defaultPurchasePrice ?? "0"}
              className={fieldClass(Boolean(state.errors?.defaultPurchasePrice))}
            />
            <FieldError message={state.errors?.defaultPurchasePrice} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Varsayilan satis fiyati
            <input
              name="defaultSalesPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.defaultSalesPrice ?? "0"}
              className={fieldClass(Boolean(state.errors?.defaultSalesPrice))}
            />
            <FieldError message={state.errors?.defaultSalesPrice} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Minimum stok
            <input
              name="minimumStockLevel"
              type="number"
              min="0"
              step="0.0001"
              defaultValue={initialValues?.minimumStockLevel ?? "0"}
              className={fieldClass(Boolean(state.errors?.minimumStockLevel))}
            />
            <FieldError message={state.errors?.minimumStockLevel} />
          </label>

          <label className="flex items-center gap-3 pt-8 text-sm font-semibold text-[#46534b]">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={initialValues?.isActive ?? true}
              className="h-4 w-4 accent-[#1f6f54]"
            />
            Aktif urun
          </label>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Aciklama / notlar
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
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1f6f54] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
