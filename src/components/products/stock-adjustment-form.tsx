"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { StockAdjustmentFormState } from "@/app/(dashboard)/products/actions";

type StockAdjustmentFormProps = {
  action: (state: StockAdjustmentFormState, formData: FormData) => Promise<StockAdjustmentFormState>;
  products?: Array<{ id: string; name: string; sku: string }>;
};

const initialState: StockAdjustmentFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function StockAdjustmentForm({ action, products }: StockAdjustmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const today = new Date().toISOString().slice(0, 10);
  const showProductSelect = Boolean(products);

  return (
    <form action={formAction} className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#16201b]">Manuel stok duzeltmesi</h2>
      {state.message ? (
        <div className="mt-4 rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {showProductSelect ? (
          <label className="block text-sm font-semibold text-[#46534b]">
            Urun
            <select
              name="productId"
              defaultValue=""
              className={fieldClass(Boolean(state.errors?.productId))}
              required
            >
              <option value="">Secin</option>
              {products?.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.productId} />
          </label>
        ) : null}

        <label className="block text-sm font-semibold text-[#46534b]">
          Islem
          <select
            name="direction"
            defaultValue="in"
            className={fieldClass(Boolean(state.errors?.direction))}
            required
          >
            <option value="in">Stok artir</option>
            <option value="out">Stok azalt</option>
          </select>
          <FieldError message={state.errors?.direction} />
        </label>

        <label className="block text-sm font-semibold text-[#46534b]">
          Miktar
          <input
            name="quantity"
            type="number"
            min="0.0001"
            step="0.0001"
            className={fieldClass(Boolean(state.errors?.quantity))}
            required
          />
          <FieldError message={state.errors?.quantity} />
        </label>

        <label className="block text-sm font-semibold text-[#46534b]">
          Tarih
          <input
            name="movementDate"
            type="date"
            defaultValue={today}
            className={fieldClass(Boolean(state.errors?.movementDate))}
            required
          />
          <FieldError message={state.errors?.movementDate} />
        </label>
      </div>

      <label className="mt-4 block text-sm font-semibold text-[#46534b]">
        Aciklama / gerekce
        <textarea
          name="note"
          className={textareaClass(Boolean(state.errors?.note))}
          required
        />
        <FieldError message={state.errors?.note} />
      </label>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : "Stok hareketini kaydet"}
        </button>
      </div>
    </form>
  );
}
