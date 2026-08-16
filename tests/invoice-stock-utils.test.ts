import assert from "node:assert/strict";
import test from "node:test";
import { InvoiceType, Prisma, ProductUnit, StockMovementType } from "@prisma/client";
import {
  InvoiceStockValidationError,
  reconcileInvoiceStockMovements,
  type InvoiceStockLineInput,
} from "../src/lib/invoice-stock-utils.ts";
import { deriveInvoiceStatus } from "../src/lib/accounting-core.ts";
import { calculateCurrentStock } from "../src/lib/inventory-core.ts";

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

type FakeProduct = {
  id: string;
  name: string;
  sku: string;
  unit: ProductUnit;
  deletedAt: Date | null;
  isActive: boolean;
};

type FakeMovement = {
  id: string;
  productId: string;
  invoiceItemId: string | null;
  type: StockMovementType;
  quantity: Prisma.Decimal;
};

function line(input: {
  id: string;
  productId?: string | null;
  quantity: string | number;
  unit?: ProductUnit;
}): InvoiceStockLineInput {
  return {
    invoiceItemId: input.id,
    productId: input.productId ?? null,
    quantity: decimal(input.quantity),
    unit: input.unit ?? "ADET",
    description: input.id,
  };
}

function createFakeTx(input?: { products?: FakeProduct[]; movements?: FakeMovement[] }) {
  const products = input?.products ?? [
    {
      id: "product-a",
      name: "Product A",
      sku: "A-001",
      unit: "ADET" as ProductUnit,
      deletedAt: null,
      isActive: true,
    },
    {
      id: "product-b",
      name: "Product B",
      sku: "B-001",
      unit: "ADET" as ProductUnit,
      deletedAt: null,
      isActive: true,
    },
  ];
  const movements = input?.movements ? [...input.movements] : [];

  return {
    movements,
    product: {
      async findMany({ where }: { where: { id: { in: string[] } } }) {
        return products.filter((product) =>
          where.id.in.includes(product.id) && !product.deletedAt && product.isActive,
        );
      },
    },
    stockMovement: {
      async findMany({ where }: { where: Record<string, unknown> }) {
        if ("invoiceItemId" in where) {
          const ids = (where.invoiceItemId as { in: string[] }).in;
          return movements.filter((movement) => movement.invoiceItemId && ids.includes(movement.invoiceItemId));
        }

        const ids = (where.productId as { in: string[] }).in;
        return movements.filter((movement) => ids.includes(movement.productId));
      },
      async deleteMany({ where }: { where: { invoiceItemId: { in: string[] } } }) {
        const ids = where.invoiceItemId.in;
        let deleted = 0;

        for (let index = movements.length - 1; index >= 0; index -= 1) {
          const movement = movements[index];

          if (movement.invoiceItemId && ids.includes(movement.invoiceItemId)) {
            movements.splice(index, 1);
            deleted += 1;
          }
        }

        return { count: deleted };
      },
      async create({ data }: { data: Omit<FakeMovement, "id"> }) {
        if (
          data.invoiceItemId &&
          movements.some((movement) => movement.invoiceItemId === data.invoiceItemId)
        ) {
          throw new Error("Unique invoiceItemId constraint failed.");
        }

        const created = {
          id: `movement-${movements.length + 1}`,
          productId: data.productId,
          invoiceItemId: data.invoiceItemId,
          type: data.type,
          quantity: data.quantity,
        };
        movements.push(created);

        return { id: created.id };
      },
    },
  };
}

function stockFor(tx: ReturnType<typeof createFakeTx>, productId: string) {
  return calculateCurrentStock(
    tx.movements.filter((movement) => movement.productId === productId),
  ).toString();
}

async function reconcile(
  tx: ReturnType<typeof createFakeTx>,
  invoiceType: InvoiceType,
  lines: InvoiceStockLineInput[],
  oldInvoiceItemIds?: string[],
) {
  return reconcileInvoiceStockMovements(tx as never, {
    invoiceId: "invoice-1",
    invoiceNumber: "INV-1",
    invoiceType,
    invoiceDate: new Date("2026-08-16T00:00:00Z"),
    lines,
    oldInvoiceItemIds,
  });
}

test("purchase invoice product lines increase stock", async () => {
  const tx = createFakeTx();

  await reconcile(tx, "PURCHASE", [line({ id: "item-1", productId: "product-a", quantity: "20" })]);

  assert.equal(stockFor(tx, "product-a"), "20");
  assert.equal(tx.movements[0]?.type, "PURCHASE_IN");
});

test("sales invoice product lines decrease stock", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "opening", productId: "product-a", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("20") },
    ],
  });

  await reconcile(tx, "SALES", [line({ id: "item-1", productId: "product-a", quantity: "7" })]);

  assert.equal(stockFor(tx, "product-a"), "13");
  assert.equal(tx.movements.at(-1)?.type, "SALE_OUT");
});

test("free-text invoice lines do not create stock movements", async () => {
  const tx = createFakeTx();

  const result = await reconcile(tx, "PURCHASE", [line({ id: "item-1", quantity: "3" })]);

  assert.equal(result.postedCount, 0);
  assert.equal(tx.movements.length, 0);
});

test("sales invoice cannot reduce stock below zero", async () => {
  const tx = createFakeTx();

  await assert.rejects(
    () => reconcile(tx, "SALES", [line({ id: "item-1", productId: "product-a", quantity: "1" })]),
    InvoiceStockValidationError,
  );
  assert.equal(tx.movements.length, 0);
});

test("multiple sales lines for the same product are validated in aggregate", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "opening", productId: "product-a", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("5") },
    ],
  });

  await assert.rejects(
    () =>
      reconcile(tx, "SALES", [
        line({ id: "item-1", productId: "product-a", quantity: "3" }),
        line({ id: "item-2", productId: "product-a", quantity: "3" }),
      ]),
    InvoiceStockValidationError,
  );
});

test("invoice item movement uniqueness prevents duplicate posting", async () => {
  const tx = createFakeTx();
  const lines = [line({ id: "item-1", productId: "product-a", quantity: "2" })];

  await reconcile(tx, "PURCHASE", lines);
  await assert.rejects(() => reconcile(tx, "PURCHASE", lines), /Unique invoiceItemId/);
  assert.equal(stockFor(tx, "product-a"), "2");
});

test("editing a sale quantity reconciles stock from the old item", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "opening", productId: "product-a", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("20") },
      { id: "old-sale", productId: "product-a", invoiceItemId: "old-1", type: "SALE_OUT", quantity: decimal("7") },
    ],
  });

  await reconcile(tx, "SALES", [line({ id: "new-1", productId: "product-a", quantity: "9" })], ["old-1"]);

  assert.equal(stockFor(tx, "product-a"), "11");
});

test("editing a product reference restores old product and applies new product", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "a-open", productId: "product-a", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("10") },
      { id: "b-open", productId: "product-b", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("10") },
      { id: "old-sale", productId: "product-a", invoiceItemId: "old-1", type: "SALE_OUT", quantity: decimal("4") },
    ],
  });

  await reconcile(tx, "SALES", [line({ id: "new-1", productId: "product-b", quantity: "4" })], ["old-1"]);

  assert.equal(stockFor(tx, "product-a"), "10");
  assert.equal(stockFor(tx, "product-b"), "6");
});

test("removing a product-linked line restores stock", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "opening", productId: "product-a", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("10") },
      { id: "old-sale", productId: "product-a", invoiceItemId: "old-1", type: "SALE_OUT", quantity: decimal("4") },
    ],
  });

  await reconcile(tx, "SALES", [], ["old-1"]);

  assert.equal(stockFor(tx, "product-a"), "10");
  assert.equal(tx.movements.some((movement) => movement.invoiceItemId === "old-1"), false);
});

test("editing purchase quantity reconciles stock", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "old-purchase", productId: "product-a", invoiceItemId: "old-1", type: "PURCHASE_IN", quantity: decimal("20") },
    ],
  });

  await reconcile(tx, "PURCHASE", [line({ id: "new-1", productId: "product-a", quantity: "12" })], ["old-1"]);

  assert.equal(stockFor(tx, "product-a"), "12");
});

test("archive reconciliation removes linked movements exactly once", async () => {
  const tx = createFakeTx({
    movements: [
      { id: "opening", productId: "product-a", invoiceItemId: null, type: "OPENING_BALANCE", quantity: decimal("10") },
      { id: "old-sale", productId: "product-a", invoiceItemId: "old-1", type: "SALE_OUT", quantity: decimal("4") },
    ],
  });

  await reconcile(tx, "SALES", [], ["old-1"]);
  await reconcile(tx, "SALES", [], ["old-1"]);

  assert.equal(stockFor(tx, "product-a"), "10");
});

test("inactive or archived product references are rejected", async () => {
  const tx = createFakeTx({
    products: [
      {
        id: "product-a",
        name: "Archived",
        sku: "ARCH",
        unit: "ADET",
        deletedAt: new Date("2026-08-16T00:00:00Z"),
        isActive: true,
      },
    ],
  });

  await assert.rejects(
    () => reconcile(tx, "PURCHASE", [line({ id: "item-1", productId: "product-a", quantity: "1" })]),
    InvoiceStockValidationError,
  );
});

test("product unit mismatch is rejected before posting", async () => {
  const tx = createFakeTx();

  await assert.rejects(
    () =>
      reconcile(tx, "PURCHASE", [
        line({ id: "item-1", productId: "product-a", quantity: "1", unit: "KG" }),
      ]),
    InvoiceStockValidationError,
  );
  assert.equal(tx.movements.length, 0);
});

test("accounting status derivation remains independent from stock posting", () => {
  assert.equal(
    deriveInvoiceStatus(
      { type: "SALES", currency: "TRY", totalAmount: decimal("100") },
      [{ type: "COLLECTION", amount: decimal("40"), currency: "TRY" }],
    ),
    "PARTIAL",
  );
});
