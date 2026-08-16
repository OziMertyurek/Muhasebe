import type { ProductUnit } from "@prisma/client";
import { calculateCurrentStock } from "@/lib/inventory-core";
import { prisma } from "@/lib/prisma";

export type InvoiceProductOption = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: ProductUnit;
  currency: string;
  defaultVatRate: string;
  defaultPurchasePrice: string;
  defaultSalesPrice: string;
  availableStock: string;
};

export async function getInvoiceProductOptions(): Promise<InvoiceProductOption[]> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ name: "asc" }, { sku: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      unit: true,
      currency: true,
      defaultVatRate: true,
      defaultPurchasePrice: true,
      defaultSalesPrice: true,
      stockMovements: {
        select: {
          type: true,
          quantity: true,
        },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    currency: product.currency,
    defaultVatRate: product.defaultVatRate.toString(),
    defaultPurchasePrice: product.defaultPurchasePrice.toString(),
    defaultSalesPrice: product.defaultSalesPrice.toString(),
    availableStock: calculateCurrentStock(product.stockMovements).toString(),
  }));
}
