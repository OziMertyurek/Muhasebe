"use client";

import type { Company, InvoiceStatus, InvoiceType, ProductUnit } from "@prisma/client";
import { useActionState, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { InvoiceFormState } from "@/app/(dashboard)/invoices/actions";
import { invoiceStatusOptions, invoiceTypeOptions } from "@/lib/invoice-utils";
import { productUnitOptions } from "@/lib/product-utils";

type InvoiceCompanyOption = Pick<Company, "id" | "name">;

type InvoiceFormValues = {
  companyId?: string;
  type?: InvoiceType;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  currency?: string;
  subtotal?: string;
  vatAmount?: string;
  discountAmount?: string;
  totalAmount?: string;
  status?: InvoiceStatus;
  notes?: string | null;
};

type InvoiceLineFormValue = {
  id: string;
  description: string;
  quantity: string;
  unit: ProductUnit;
  unitPrice: string;
  vatRate: string;
  discountAmount: string;
};

type InvoiceFormProps = {
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  companies: InvoiceCompanyOption[];
  submitLabel: string;
  initialValues?: InvoiceFormValues;
  initialLineItems?: InvoiceLineFormValue[];
  lineItemsEnabled?: boolean;
};

const initialState: InvoiceFormState = {};

function createEmptyLine(id = "line-1"): InvoiceLineFormValue {
  return {
    id,
    description: "",
    quantity: "",
    unit: "ADET",
    unitPrice: "",
    vatRate: "20",
    discountAmount: "0",
  };
}

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

function parsePreviewNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatPreviewMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(value);
  }
}

function calculatePreviewLine(line: InvoiceLineFormValue) {
  const quantity = parsePreviewNumber(line.quantity);
  const unitPrice = parsePreviewNumber(line.unitPrice);
  const vatRate = parsePreviewNumber(line.vatRate);
  const discountAmount = roundMoney(Math.max(0, parsePreviewNumber(line.discountAmount)));
  const grossBeforeDiscount = roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
  const taxableBase = roundMoney(Math.max(0, grossBeforeDiscount - discountAmount));
  const vatAmount = roundMoney(taxableBase * Math.max(0, vatRate) / 100);
  const lineTotal = roundMoney(taxableBase + vatAmount);

  return {
    grossBeforeDiscount,
    discountAmount,
    vatAmount,
    lineTotal,
  };
}

export function InvoiceForm({
  action,
  companies,
  submitLabel,
  initialValues,
  initialLineItems,
  lineItemsEnabled = false,
}: InvoiceFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [lines, setLines] = useState<InvoiceLineFormValue[]>(
    initialLineItems && initialLineItems.length > 0 ? initialLineItems : [createEmptyLine()],
  );
  const [currency, setCurrency] = useState(initialValues?.currency ?? "TRY");
  const lineItemsPayload = useMemo(
    () =>
      JSON.stringify(
        lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          discountAmount: line.discountAmount,
          sortOrder: index,
        })),
      ),
    [lines],
  );
  const previewTotals = useMemo(
    () =>
      lines.map(calculatePreviewLine).reduce(
        (totals, line) => ({
          subtotal: roundMoney(totals.subtotal + line.grossBeforeDiscount),
          discountAmount: roundMoney(totals.discountAmount + line.discountAmount),
          vatAmount: roundMoney(totals.vatAmount + line.vatAmount),
          totalAmount: roundMoney(totals.totalAmount + line.lineTotal),
        }),
        {
          subtotal: 0,
          discountAmount: 0,
          vatAmount: 0,
          totalAmount: 0,
        },
      ),
    [lines],
  );

  function updateLine(id: string, field: keyof Omit<InvoiceLineFormValue, "id">, value: string) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function addLine() {
    setLines((currentLines) => [
      ...currentLines,
      createEmptyLine(`line-${Date.now()}-${currentLines.length}`),
    ]);
  }

  function removeLine(id: string) {
    setLines((currentLines) =>
      currentLines.length === 1 ? currentLines : currentLines.filter((line) => line.id !== id),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
        <h2 className="text-base font-semibold text-[#16201b]">Fatura bilgileri</h2>
        <p className="mt-2 text-sm leading-6 text-[#647067]">
          Vade tarihi girerseniz sistem otomatik hatırlatma oluşturur.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46534b]">
            Cari firma
            <select
              name="companyId"
              defaultValue={initialValues?.companyId ?? ""}
              className={fieldClass(Boolean(state.errors?.companyId))}
              required
            >
              <option value="">Seçin</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.companyId} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura tipi
            <select
              name="type"
              defaultValue={initialValues?.type ?? ""}
              className={fieldClass(Boolean(state.errors?.type))}
              required
            >
              <option value="">Seçin</option>
              {invoiceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.type} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura no
            <input
              name="invoiceNumber"
              defaultValue={initialValues?.invoiceNumber ?? ""}
              className={fieldClass(Boolean(state.errors?.invoiceNumber))}
              required
            />
            <FieldError message={state.errors?.invoiceNumber} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Fatura tarihi
            <input
              name="invoiceDate"
              type="date"
              defaultValue={initialValues?.invoiceDate ?? ""}
              className={fieldClass(Boolean(state.errors?.invoiceDate))}
              required
            />
            <FieldError message={state.errors?.invoiceDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Vade tarihi
            <input
              name="dueDate"
              type="date"
              defaultValue={initialValues?.dueDate ?? ""}
              className={fieldClass(Boolean(state.errors?.dueDate))}
            />
            <FieldError message={state.errors?.dueDate} />
          </label>

          <label className="block text-sm font-semibold text-[#46534b]">
            Para birimi
            <input
              name="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              className={fieldClass(Boolean(state.errors?.currency))}
              maxLength={3}
            />
          </label>

          {lineItemsEnabled ? null : (
            <>
              <label className="block text-sm font-semibold text-[#46534b]">
                Ara toplam
                <input
                  name="subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.subtotal ?? ""}
                  className={fieldClass(Boolean(state.errors?.subtotal))}
                />
                <FieldError message={state.errors?.subtotal} />
              </label>

              <label className="block text-sm font-semibold text-[#46534b]">
                KDV tutarı
                <input
                  name="vatAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.vatAmount ?? "0"}
                  className={fieldClass(Boolean(state.errors?.vatAmount))}
                />
                <FieldError message={state.errors?.vatAmount} />
              </label>

              <label className="block text-sm font-semibold text-[#46534b]">
                İskonto tutarı
                <input
                  name="discountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.discountAmount ?? "0"}
                  className={fieldClass(Boolean(state.errors?.discountAmount))}
                />
                <FieldError message={state.errors?.discountAmount} />
              </label>

              <label className="block text-sm font-semibold text-[#46534b]">
                Genel toplam
                <input
                  name="totalAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={initialValues?.totalAmount ?? ""}
                  className={fieldClass(Boolean(state.errors?.totalAmount))}
                />
                <FieldError message={state.errors?.totalAmount} />
              </label>
            </>
          )}

          <label className="block text-sm font-semibold text-[#46534b]">
            Durum
            <select
              name="status"
              defaultValue={initialValues?.status ?? "UNPAID"}
              className={fieldClass(Boolean(state.errors?.status))}
            >
              {invoiceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.status} />
          </label>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#46534b]">
          Notlar
          <textarea
            name="notes"
            defaultValue={initialValues?.notes ?? ""}
            className={textareaClass(Boolean(state.errors?.notes))}
          />
        </label>
      </div>

      {lineItemsEnabled ? (
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm ring-1 ring-black/0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#16201b]">Fatura kalemleri</h2>
              <FieldError message={state.errors?.lineItems} />
            </div>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
            >
              <Plus className="h-4 w-4" />
              Satır ekle
            </button>
          </div>

          <input type="hidden" name="lineItems" value={lineItemsPayload} />

          <div className="mt-5 space-y-3">
            {lines.map((line, index) => {
              const previewLine = calculatePreviewLine(line);

              return (
                <div
                  key={line.id}
                  className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-3"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_96px_104px_120px_96px_120px_104px_auto]">
                    <label className="block min-w-0 text-sm font-semibold text-[#46534b]">
                      Açıklama
                      <input
                        value={line.description}
                        onChange={(event) => updateLine(line.id, "description", event.target.value)}
                        className={fieldClass()}
                        required
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[#46534b]">
                      Miktar
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, "quantity", event.target.value)}
                        className={fieldClass()}
                        required
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[#46534b]">
                      Birim
                      <select
                        value={line.unit}
                        onChange={(event) =>
                          updateLine(line.id, "unit", event.target.value as ProductUnit)
                        }
                        className={fieldClass()}
                        required
                      >
                        {productUnitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-[#46534b]">
                      Birim fiyat
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.id, "unitPrice", event.target.value)}
                        className={fieldClass()}
                        required
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[#46534b]">
                      KDV %
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.vatRate}
                        onChange={(event) => updateLine(line.id, "vatRate", event.target.value)}
                        className={fieldClass()}
                        required
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[#46534b]">
                      İndirim
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.discountAmount}
                        onChange={(event) =>
                          updateLine(line.id, "discountAmount", event.target.value)
                        }
                        className={fieldClass()}
                      />
                    </label>

                    <div className="flex flex-col justify-end text-sm">
                      <p className="text-xs font-semibold uppercase text-[#607167]">Satır toplamı</p>
                      <p className="mt-2 min-h-11 rounded-md border border-[#dce2dc] bg-white px-3 py-3 font-semibold text-[#16201b]">
                        {formatPreviewMoney(previewLine.lineTotal, currency)}
                      </p>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#e0c4bf] bg-white text-[#8b2f28] shadow-sm transition hover:border-[#c79a92] disabled:cursor-not-allowed disabled:opacity-45"
                        title={`${index + 1}. satırı kaldır`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryItem
              label="Ara Toplam"
              value={formatPreviewMoney(previewTotals.subtotal, currency)}
            />
            <SummaryItem
              label="İndirim"
              value={formatPreviewMoney(previewTotals.discountAmount, currency)}
            />
            <SummaryItem label="KDV" value={formatPreviewMoney(previewTotals.vatAmount, currency)} />
            <SummaryItem
              label="Genel Toplam"
              value={formatPreviewMoney(previewTotals.totalAmount, currency)}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#223028]">Fatura kalemleri ve dosyalar</h2>
          <p className="mt-2 text-sm text-[#647067]">Bu alan sonraki aşamada bağlanacak.</p>
        </div>
      )}

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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-4 py-3">
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#16201b]">{value}</p>
    </div>
  );
}
