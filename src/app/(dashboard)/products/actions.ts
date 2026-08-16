"use server";

import { ProductUnit, StockMovementType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  InventoryValidationError,
  assertPositiveQuantity,
  assertStockMovementNote,
  assertStockReductionAllowed,
  calculateCurrentStock,
} from "@/lib/inventory-core";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";

export type ProductFormState = {
  message?: string;
  errors?: Partial<Record<ProductFormField, string>>;
};

type ProductFormField =
  | "name"
  | "sku"
  | "barcode"
  | "description"
  | "unit"
  | "defaultVatRate"
  | "defaultPurchasePrice"
  | "defaultSalesPrice"
  | "currency"
  | "minimumStockLevel"
  | "isActive";

type ProductPayload = {
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: ProductUnit;
  defaultVatRate: Prisma.Decimal;
  defaultPurchasePrice: Prisma.Decimal;
  defaultSalesPrice: Prisma.Decimal;
  currency: string;
  minimumStockLevel: Prisma.Decimal;
  isActive: boolean;
};

export type StockAdjustmentFormState = {
  message?: string;
  errors?: Partial<Record<StockAdjustmentField, string>>;
};

type StockAdjustmentField = "productId" | "direction" | "quantity" | "movementDate" | "note";

type StockAdjustmentPayload = {
  productId: string;
  type: StockMovementType;
  quantity: Prisma.Decimal;
  movementDate: Date;
  note: string;
};

type ProductFormErrors = NonNullable<ProductFormState["errors"]>;
type StockAdjustmentErrors = NonNullable<StockAdjustmentFormState["errors"]>;

function readText<T extends string>(formData: FormData, key: T) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function setFormError(
  errors: ProductFormErrors | StockAdjustmentErrors,
  field: ProductFormField | StockAdjustmentField,
  message: string,
) {
  (errors as Record<string, string>)[field] = message;
}

function parseDecimal(
  value: string,
  label: string,
  field: ProductFormField | StockAdjustmentField,
  errors: ProductFormErrors | StockAdjustmentErrors,
  options: { defaultValue?: string; positive?: boolean } = {},
) {
  const normalizedValue = value.replace(",", ".") || options.defaultValue;

  if (!normalizedValue) {
    setFormError(errors, field, `${label} girilmeli.`);
    return null;
  }

  let decimal: Prisma.Decimal;

  try {
    decimal = new Prisma.Decimal(normalizedValue);
  } catch {
    setFormError(errors, field, `${label} sayi olmali.`);
    return null;
  }

  if (options.positive ? decimal.lessThanOrEqualTo(0) : decimal.lessThan(0)) {
    setFormError(
      errors,
      field,
      options.positive ? `${label} 0'dan buyuk olmali.` : `${label} negatif olamaz.`,
    );
    return null;
  }

  return decimal;
}

async function parseProductForm(
  formData: FormData,
  currentProductId?: string,
): Promise<{ data?: ProductPayload; errors: ProductFormErrors }> {
  const errors: ProductFormErrors = {};
  const name = readText(formData, "name");
  const sku = readText(formData, "sku").toUpperCase();
  const unitValue = readText(formData, "unit");
  const currency = readText(formData, "currency").toUpperCase() || "TRY";
  const defaultVatRate = parseDecimal(
    readText(formData, "defaultVatRate"),
    "Varsayilan KDV",
    "defaultVatRate",
    errors,
    { defaultValue: "20" },
  );
  const defaultPurchasePrice = parseDecimal(
    readText(formData, "defaultPurchasePrice"),
    "Varsayilan alis fiyati",
    "defaultPurchasePrice",
    errors,
    { defaultValue: "0" },
  );
  const defaultSalesPrice = parseDecimal(
    readText(formData, "defaultSalesPrice"),
    "Varsayilan satis fiyati",
    "defaultSalesPrice",
    errors,
    { defaultValue: "0" },
  );
  const minimumStockLevel = parseDecimal(
    readText(formData, "minimumStockLevel"),
    "Minimum stok",
    "minimumStockLevel",
    errors,
    { defaultValue: "0" },
  );

  if (!name) {
    errors.name = "Urun adi bos olamaz.";
  }

  if (!sku) {
    errors.sku = "SKU / stok kodu bos olamaz.";
  }

  if (!unitValue || !Object.values(ProductUnit).includes(unitValue as ProductUnit)) {
    errors.unit = "Gecerli bir birim secin.";
  }

  if (sku) {
    const existingSku = await prisma.product.findFirst({
      where: {
        sku,
        deletedAt: null,
        isActive: true,
        ...(currentProductId ? { id: { not: currentProductId } } : {}),
      },
      select: { id: true },
    });

    if (existingSku) {
      errors.sku = "Aktif urunlerde bu SKU zaten kullaniliyor.";
    }
  }

  if (
    Object.keys(errors).length > 0 ||
    !defaultVatRate ||
    !defaultPurchasePrice ||
    !defaultSalesPrice ||
    !minimumStockLevel
  ) {
    return { errors };
  }

  return {
    data: {
      name,
      sku,
      barcode: optionalText(readText(formData, "barcode")),
      description: optionalText(readText(formData, "description")),
      unit: unitValue as ProductUnit,
      defaultVatRate,
      defaultPurchasePrice,
      defaultSalesPrice,
      currency,
      minimumStockLevel,
      isActive: formData.get("isActive") === "on",
    },
    errors,
  };
}

function revalidateProductPaths(productId?: string | null) {
  revalidatePath("/products");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = await parseProductForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lutfen formdaki hatalari duzeltin." };
  }

  let productId: string;

  try {
    const product = await prisma.product.create({
      data: parsed.data,
      select: { id: true },
    });
    productId = product.id;
    await createAuditLog({
      entityType: "PRODUCT",
      entityId: productId,
      action: "CREATE",
      title: `Urun olusturuldu: ${parsed.data.name}`,
      description: `${parsed.data.sku} stok kodlu urun olusturuldu.`,
      after: parsed.data,
    });
  } catch {
    return { message: "Urun kaydi olusturulurken bir hata olustu." };
  }

  revalidateProductPaths(productId);
  redirect(`/products/${productId}`);
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = await parseProductForm(formData, productId);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lutfen formdaki hatalari duzeltin." };
  }

  try {
    const before = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!before) {
      return { message: "Duzenlenecek urun bulunamadi." };
    }

    await prisma.product.update({
      where: { id: productId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
    await createAuditLog({
      entityType: "PRODUCT",
      entityId: productId,
      action: "UPDATE",
      title: `Urun guncellendi: ${parsed.data.name}`,
      description: "Urun karti bilgileri guncellendi.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Urun kaydi guncellenirken bir hata olustu." };
  }

  revalidateProductPaths(productId);
  redirect(`/products/${productId}`);
}

export async function deleteProductAction(productId: string) {
  try {
    const product = await prisma.product.update({
      where: { id: productId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, name: true, sku: true },
    });
    await createAuditLog({
      entityType: "PRODUCT",
      entityId: product.id,
      action: "SOFT_DELETE",
      title: `Urun arsivlendi: ${product.name}`,
      description: "Urun karti arsive tasindi; stok hareketleri korundu.",
      before: product,
    });
  } catch {
    redirect(`/products/${productId}?error=delete`);
  }

  revalidateProductPaths(productId);
  redirect("/products");
}

async function parseStockAdjustmentForm(
  formData: FormData,
  fixedProductId?: string,
): Promise<{ data?: StockAdjustmentPayload; errors: StockAdjustmentErrors }> {
  const errors: StockAdjustmentErrors = {};
  const productId = fixedProductId || readText(formData, "productId");
  const direction = readText(formData, "direction");
  const quantity = parseDecimal(readText(formData, "quantity"), "Miktar", "quantity", errors, {
    positive: true,
  });
  const movementDate = parseDate(readText(formData, "movementDate"));
  const note = readText(formData, "note");

  if (!productId) {
    errors.productId = "Urun secilmeli.";
  }

  if (direction !== "in" && direction !== "out") {
    errors.direction = "Stok artisi veya azalisi secilmeli.";
  }

  if (!movementDate) {
    errors.movementDate = "Hareket tarihi bos olamaz.";
  }

  if (!note) {
    errors.note = "Stok duzeltmesi icin aciklama zorunlu.";
  }

  if (Object.keys(errors).length > 0 || !quantity || !movementDate) {
    return { errors };
  }

  return {
    data: {
      productId,
      type: direction === "in" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      quantity,
      movementDate,
      note,
    },
    errors,
  };
}

export async function createStockAdjustmentAction(
  productId: string,
  _previousState: StockAdjustmentFormState,
  formData: FormData,
): Promise<StockAdjustmentFormState> {
  const parsed = await parseStockAdjustmentForm(formData, productId);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lutfen formdaki hatalari duzeltin." };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, deletedAt: null, isActive: true },
        select: { id: true, name: true, sku: true },
      });

      if (!product) {
        throw new InventoryValidationError("productId", "Aktif urun bulunamadi.");
      }

      assertPositiveQuantity(data.quantity);
      assertStockMovementNote(data.type, data.note);

      const existingMovements = await tx.stockMovement.findMany({
        where: { productId: data.productId },
        select: { type: true, quantity: true },
      });
      const currentStock = calculateCurrentStock(existingMovements);
      assertStockReductionAllowed({
        type: data.type,
        quantity: data.quantity,
        currentStock,
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          movementDate: data.movementDate,
          referenceType: "MANUAL",
          note: data.note,
        },
        select: { id: true },
      });

      await createAuditLog(
        {
          entityType: "STOCK_MOVEMENT",
          entityId: movement.id,
          action: "CREATE",
          title: `Stok hareketi eklendi: ${product.sku}`,
          description: data.note,
          after: data,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof InventoryValidationError) {
      return {
        errors: { [error.field]: error.message },
        message: "Lutfen formdaki hatalari duzeltin.",
      };
    }

    return { message: "Stok hareketi kaydedilirken bir hata olustu." };
  }

  revalidateProductPaths(productId);
  redirect(`/products/${productId}`);
}

export async function createGlobalStockAdjustmentAction(
  _previousState: StockAdjustmentFormState,
  formData: FormData,
): Promise<StockAdjustmentFormState> {
  const parsed = await parseStockAdjustmentForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lutfen formdaki hatalari duzeltin." };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, deletedAt: null, isActive: true },
        select: { id: true, name: true, sku: true },
      });

      if (!product) {
        throw new InventoryValidationError("productId", "Aktif urun bulunamadi.");
      }

      assertPositiveQuantity(data.quantity);
      assertStockMovementNote(data.type, data.note);

      const existingMovements = await tx.stockMovement.findMany({
        where: { productId: data.productId },
        select: { type: true, quantity: true },
      });
      const currentStock = calculateCurrentStock(existingMovements);
      assertStockReductionAllowed({
        type: data.type,
        quantity: data.quantity,
        currentStock,
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          movementDate: data.movementDate,
          referenceType: "MANUAL",
          note: data.note,
        },
        select: { id: true },
      });

      await createAuditLog(
        {
          entityType: "STOCK_MOVEMENT",
          entityId: movement.id,
          action: "CREATE",
          title: `Stok hareketi eklendi: ${product.sku}`,
          description: data.note,
          after: data,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof InventoryValidationError) {
      return {
        errors: { [error.field]: error.message },
        message: "Lutfen formdaki hatalari duzeltin.",
      };
    }

    return { message: "Stok hareketi kaydedilirken bir hata olustu." };
  }

  revalidateProductPaths(data.productId);
  redirect(`/products/${data.productId}`);
}
