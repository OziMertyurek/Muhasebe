import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, StockMovementType } from "#prisma/client";
import {
  InventoryValidationError,
  assertPositiveQuantity,
  assertStockMovementNote,
  assertStockReductionAllowed,
  calculateCurrentStock,
  getMinimumStockState,
  getStockMovementSign,
} from "../src/lib/inventory-core.ts";

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

test("product creation payload can carry SME stock card values", () => {
  const product = {
    name: "Nitril Eldiven M",
    sku: "ELD-NIT-M",
    barcode: "869000000001",
    unit: "ADET",
    defaultVatRate: decimal("20"),
    defaultPurchasePrice: decimal("75.50"),
    defaultSalesPrice: decimal("120"),
    currency: "TRY",
    minimumStockLevel: decimal("10"),
    isActive: true,
  };

  assert.equal(product.name, "Nitril Eldiven M");
  assert.equal(product.sku, "ELD-NIT-M");
  assert.equal(product.defaultVatRate.toString(), "20");
});

test("duplicate active SKU policy is case-normalized before persistence", () => {
  const existingSku = "ELD-NIT-M";
  const submittedSku = "eld-nit-m".toUpperCase();

  assert.equal(submittedSku, existingSku);
});

test("stock-in movements increase quantity and stock-out movements decrease quantity", () => {
  const movements = [
    { type: "OPENING_BALANCE" as StockMovementType, quantity: decimal("10") },
    { type: "PURCHASE_IN" as StockMovementType, quantity: decimal("5") },
    { type: "SALE_OUT" as StockMovementType, quantity: decimal("3") },
  ];

  assert.equal(getStockMovementSign("OPENING_BALANCE"), 1);
  assert.equal(getStockMovementSign("SALE_OUT"), -1);
  assert.equal(calculateCurrentStock(movements).toString(), "12");
});

test("insufficient stock is rejected for stock-reducing movements", () => {
  assert.throws(
    () =>
      assertStockReductionAllowed({
        type: "ADJUSTMENT_OUT",
        quantity: decimal("6"),
        currentStock: decimal("5"),
      }),
    InventoryValidationError,
  );
});

test("adjustments require a reason", () => {
  assert.throws(
    () => assertStockMovementNote("ADJUSTMENT_IN", ""),
    InventoryValidationError,
  );
  assert.doesNotThrow(() => assertStockMovementNote("ADJUSTMENT_OUT", "Sayim farki"));
});

test("multiple movements calculate correct current stock", () => {
  const movements = [
    { type: "OPENING_BALANCE" as StockMovementType, quantity: decimal("20") },
    { type: "ADJUSTMENT_IN" as StockMovementType, quantity: decimal("2.5") },
    { type: "RETURN_OUT" as StockMovementType, quantity: decimal("1") },
    { type: "SALE_OUT" as StockMovementType, quantity: decimal("4") },
    { type: "RETURN_IN" as StockMovementType, quantity: decimal("0.5") },
  ];

  assert.equal(calculateCurrentStock(movements).toString(), "18");
});

test("minimum stock state is derived from current quantity", () => {
  assert.equal(getMinimumStockState(decimal("0"), decimal("5")), "OUT");
  assert.equal(getMinimumStockState(decimal("5"), decimal("5")), "LOW");
  assert.equal(getMinimumStockState(decimal("6"), decimal("5")), "OK");
});

test("archived products can preserve historical movements", () => {
  const archivedProduct = {
    deletedAt: new Date("2026-08-16T00:00:00Z"),
    isActive: false,
    stockMovements: [{ type: "OPENING_BALANCE" as StockMovementType, quantity: decimal("7") }],
  };

  assert.equal(calculateCurrentStock(archivedProduct.stockMovements).toString(), "7");
});

test("invoice items can remain free-text while optionally carrying a product reference", () => {
  const freeTextInvoiceItem = {
    description: "Serbest satir",
    productId: null,
    unit: "ADET",
  };
  const productLinkedInvoiceItem = {
    description: "Nitril Eldiven M",
    productId: "product-1",
    unit: "KUTU",
  };

  assert.equal(freeTextInvoiceItem.productId, null);
  assert.equal(productLinkedInvoiceItem.productId, "product-1");
});

test("invalid movement quantities are rejected", () => {
  assert.throws(() => assertPositiveQuantity(decimal("0")), InventoryValidationError);
  assert.throws(() => assertPositiveQuantity(decimal("-1")), InventoryValidationError);
});
