import {
  InvoiceType,
  Prisma,
  ProductUnit,
  StockMovementType,
  type PrismaClient,
} from "@prisma/client";
import { calculateCurrentStock } from "./inventory-core.ts";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export type InvoiceStockLineInput = {
  invoiceItemId: string;
  productId: string | null;
  quantity: Prisma.Decimal;
  unit: ProductUnit;
  description: string;
};

export class InvoiceStockValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "InvoiceStockValidationError";
    this.field = field;
  }
}

function getInvoiceStockMovementType(invoiceType: InvoiceType): StockMovementType {
  return invoiceType === "PURCHASE" ? "PURCHASE_IN" : "SALE_OUT";
}

function getSignedQuantity(invoiceType: InvoiceType, quantity: Prisma.Decimal) {
  return invoiceType === "PURCHASE" ? quantity : quantity.negated();
}

export async function reconcileInvoiceStockMovements(
  tx: PrismaClientLike,
  input: {
    invoiceId: string;
    invoiceNumber: string;
    invoiceType: InvoiceType;
    invoiceDate: Date;
    lines: InvoiceStockLineInput[];
    oldInvoiceItemIds?: string[];
  },
) {
  const productLines = input.lines.filter((line) => line.productId);
  const oldInvoiceItemIds = input.oldInvoiceItemIds ?? [];
  const oldMovements = oldInvoiceItemIds.length > 0
    ? await tx.stockMovement.findMany({
        where: { invoiceItemId: { in: oldInvoiceItemIds } },
        select: { productId: true },
      })
    : [];

  const productIds = Array.from(
    new Set([
      ...productLines.map((line) => line.productId).filter((id): id is string => Boolean(id)),
      ...oldMovements.map((movement) => movement.productId),
    ]),
  );

  if (oldInvoiceItemIds.length > 0) {
    await tx.stockMovement.deleteMany({
      where: { invoiceItemId: { in: oldInvoiceItemIds } },
    });
  }

  if (productIds.length === 0) {
    return { postedCount: 0 };
  }
  const products = await tx.product.findMany({
    where: { id: { in: productIds }, deletedAt: null, isActive: true },
    select: { id: true, name: true, sku: true, unit: true },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const line of productLines) {
    const product = line.productId ? productsById.get(line.productId) : null;

    if (!product) {
      throw new InvoiceStockValidationError(
        "lineItems",
        "Fatura kaleminde secilen urun aktif degil veya bulunamadi.",
      );
    }

    if (product.unit !== line.unit) {
      throw new InvoiceStockValidationError(
        "lineItems",
        `${product.sku} urunu icin birim ${product.unit} olmali.`,
      );
    }
  }

  const effects = new Map<string, Prisma.Decimal>();

  for (const line of productLines) {
    if (!line.productId) continue;
    const current = effects.get(line.productId) ?? new Prisma.Decimal(0);
    effects.set(line.productId, current.plus(getSignedQuantity(input.invoiceType, line.quantity)));
  }

  const currentMovements = await tx.stockMovement.findMany({
    where: {
      productId: { in: productIds },
    },
    select: {
      productId: true,
      type: true,
      quantity: true,
    },
  });

  for (const productId of productIds) {
    const baseStock = calculateCurrentStock(
      currentMovements.filter((movement) => movement.productId === productId),
    );
    const finalStock = baseStock.plus(effects.get(productId) ?? new Prisma.Decimal(0));

    if (finalStock.lessThan(0)) {
      const product = productsById.get(productId);
      throw new InvoiceStockValidationError(
        "lineItems",
        `${product?.sku ?? "Urun"} icin yeterli stok yok. Stok eksiye dusurulemez.`,
      );
    }
  }

  const movementType = getInvoiceStockMovementType(input.invoiceType);

  for (const line of productLines) {
    if (!line.productId) continue;

    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        invoiceItemId: line.invoiceItemId,
        type: movementType,
        quantity: line.quantity,
        movementDate: input.invoiceDate,
        referenceType: "INVOICE",
        referenceId: input.invoiceId,
        note: `${input.invoiceNumber} - ${line.description}`,
      },
      select: { id: true },
    });
  }

  return { postedCount: productLines.length };
}
