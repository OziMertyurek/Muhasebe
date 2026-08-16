import type { ProductUnit, StockMovementType } from "@prisma/client";

export const productUnitLabels: Record<ProductUnit, string> = {
  ADET: "Adet",
  KUTU: "Kutu",
  PAKET: "Paket",
  KOLI: "Koli",
  KG: "Kg",
  GR: "Gr",
  LT: "Lt",
  ML: "Ml",
  METRE: "Metre",
  M2: "m2",
};

export const productUnitOptions: Array<{ value: ProductUnit; label: string }> = [
  { value: "ADET", label: productUnitLabels.ADET },
  { value: "KUTU", label: productUnitLabels.KUTU },
  { value: "PAKET", label: productUnitLabels.PAKET },
  { value: "KOLI", label: productUnitLabels.KOLI },
  { value: "KG", label: productUnitLabels.KG },
  { value: "GR", label: productUnitLabels.GR },
  { value: "LT", label: productUnitLabels.LT },
  { value: "ML", label: productUnitLabels.ML },
  { value: "METRE", label: productUnitLabels.METRE },
  { value: "M2", label: productUnitLabels.M2 },
];

export const stockMovementTypeLabels: Record<StockMovementType, string> = {
  PURCHASE_IN: "Alis girisi",
  SALE_OUT: "Satis cikisi",
  RETURN_IN: "Iade girisi",
  RETURN_OUT: "Iade cikisi",
  ADJUSTMENT_IN: "Stok artirimi",
  ADJUSTMENT_OUT: "Stok azaltimi",
  OPENING_BALANCE: "Acilis stogu",
};

export function formatQuantity(value: { toNumber: () => number }) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 4,
  }).format(value.toNumber());
}

export function formatProductDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
