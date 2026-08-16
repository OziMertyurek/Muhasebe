import { Prisma, StockMovementType } from "@prisma/client";

export type MinimumStockState = "OK" | "LOW" | "OUT";

type StockMovementRecord = {
  type: StockMovementType;
  quantity: Prisma.Decimal;
};

const zero = new Prisma.Decimal(0);

const stockInTypes: StockMovementType[] = [
  "PURCHASE_IN",
  "RETURN_IN",
  "ADJUSTMENT_IN",
  "OPENING_BALANCE",
];

const stockOutTypes: StockMovementType[] = ["SALE_OUT", "RETURN_OUT", "ADJUSTMENT_OUT"];

export class InventoryValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "InventoryValidationError";
    this.field = field;
  }
}

export function isStockInMovement(type: StockMovementType) {
  return stockInTypes.includes(type);
}

export function isStockOutMovement(type: StockMovementType) {
  return stockOutTypes.includes(type);
}

export function getStockMovementSign(type: StockMovementType) {
  if (isStockInMovement(type)) {
    return 1;
  }

  if (isStockOutMovement(type)) {
    return -1;
  }

  throw new InventoryValidationError("type", "Gecersiz stok hareket tipi.");
}

export function assertPositiveQuantity(quantity: Prisma.Decimal) {
  if (quantity.lessThanOrEqualTo(0)) {
    throw new InventoryValidationError("quantity", "Stok hareket miktari 0'dan buyuk olmali.");
  }
}

export function requiresStockMovementNote(type: StockMovementType) {
  return type === "ADJUSTMENT_IN" || type === "ADJUSTMENT_OUT";
}

export function assertStockMovementNote(type: StockMovementType, note: string | null | undefined) {
  if (requiresStockMovementNote(type) && !note?.trim()) {
    throw new InventoryValidationError("note", "Manuel stok duzeltmesi icin aciklama zorunlu.");
  }
}

export function calculateCurrentStock(movements: StockMovementRecord[]) {
  return movements.reduce((total, movement) => {
    assertPositiveQuantity(movement.quantity);
    const signedQuantity = getStockMovementSign(movement.type) === 1
      ? movement.quantity
      : movement.quantity.negated();

    return total.plus(signedQuantity);
  }, zero);
}

export function assertStockReductionAllowed(options: {
  type: StockMovementType;
  quantity: Prisma.Decimal;
  currentStock: Prisma.Decimal;
  allowNegativeStock?: boolean;
}) {
  assertPositiveQuantity(options.quantity);

  if (
    isStockOutMovement(options.type) &&
    !options.allowNegativeStock &&
    options.currentStock.minus(options.quantity).lessThan(0)
  ) {
    throw new InventoryValidationError("quantity", "Yetersiz stok. Stok eksiye dusurulemez.");
  }
}

export function getMinimumStockState(
  currentStock: Prisma.Decimal,
  minimumStockLevel: Prisma.Decimal,
): MinimumStockState {
  if (currentStock.lessThanOrEqualTo(0)) {
    return "OUT";
  }

  if (minimumStockLevel.greaterThan(0) && currentStock.lessThanOrEqualTo(minimumStockLevel)) {
    return "LOW";
  }

  return "OK";
}
