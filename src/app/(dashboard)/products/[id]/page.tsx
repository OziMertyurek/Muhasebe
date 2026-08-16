import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  createStockAdjustmentAction,
  deleteProductAction,
} from "@/app/(dashboard)/products/actions";
import { StockAdjustmentForm } from "@/components/products/stock-adjustment-form";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { calculateCurrentStock, getMinimumStockState } from "@/lib/inventory-core";
import { formatPlainValue } from "@/lib/company-utils";
import { formatMoney } from "@/lib/invoice-utils";
import {
  formatProductDate,
  formatQuantity,
  productUnitLabels,
  stockMovementTypeLabels,
} from "@/lib/product-utils";
import { prisma } from "@/lib/prisma";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

function getStockTone(state: ReturnType<typeof getMinimumStockState>) {
  if (state === "OK") return "positive" as const;
  if (state === "LOW") return "warning" as const;
  return "danger" as const;
}

function getStockLabel(state: ReturnType<typeof getMinimumStockState>) {
  if (state === "OK") return "Yeterli stok";
  if (state === "LOW") return "Minimum seviyede";
  return "Stok yok";
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      stockMovements: {
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
      },
      invoiceItems: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { invoice: { select: { id: true, invoiceNumber: true, invoiceDate: true } } },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const invoiceReferenceIds = Array.from(
    new Set(
      product.stockMovements
        .filter((movement) => movement.referenceType === "INVOICE" && movement.referenceId)
        .map((movement) => movement.referenceId as string),
    ),
  );
  const invoiceReferences = invoiceReferenceIds.length > 0
    ? await prisma.invoice.findMany({
        where: { id: { in: invoiceReferenceIds } },
        select: { id: true, invoiceNumber: true },
      })
    : [];
  const invoiceReferencesById = new Map(
    invoiceReferences.map((invoice) => [invoice.id, invoice.invoiceNumber]),
  );

  const currentStock = calculateCurrentStock(product.stockMovements);
  const stockState = getMinimumStockState(currentStock, product.minimumStockLevel);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/products"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Urunlere don
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Urun detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {product.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Duzenle
          </Link>
          <form action={deleteProductAction.bind(null, product.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]"
              message="Bu urunu arsivlemek istedigine emin misin? Stok hareketleri korunacak."
            >
              <Trash2 className="h-4 w-4" />
              Arsivle
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Urun arsivlenirken bir hata olustu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#16201b]">Urun kimligi</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Urun adi" value={product.name} />
            <InfoItem label="SKU" value={product.sku} />
            <InfoItem label="Barkod" value={formatPlainValue(product.barcode)} />
            <InfoItem label="Birim" value={productUnitLabels[product.unit]} />
            <InfoItem label="Durum" value={product.isActive ? "Aktif" : "Pasif"} />
            <InfoItem label="Para birimi" value={product.currency} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#16201b]">Stok durumu</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="Mevcut stok"
              value={`${formatQuantity(currentStock)} ${productUnitLabels[product.unit]}`}
            />
            <InfoItem
              label="Minimum stok"
              value={`${formatQuantity(product.minimumStockLevel)} ${productUnitLabels[product.unit]}`}
            />
            <div>
              <p className="text-xs font-semibold uppercase text-[#607167]">Stok uyarisi</p>
              <p className="mt-2">
                <StatusBadge tone={getStockTone(stockState)}>
                  {getStockLabel(stockState)}
                </StatusBadge>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#16201b]">Fiyatlar</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="Alis fiyati"
              value={formatMoney(product.defaultPurchasePrice, product.currency)}
            />
            <InfoItem
              label="Satis fiyati"
              value={formatMoney(product.defaultSalesPrice, product.currency)}
            />
            <InfoItem label="Varsayilan KDV" value={`%${product.defaultVatRate.toString()}`} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#16201b]">Aciklama</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(product.description)}
          </p>
        </div>
      </section>

      <StockAdjustmentForm action={createStockAdjustmentAction.bind(null, product.id)} />

      <section className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#16201b]">Stok hareketleri</h2>
        {product.stockMovements.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-[#cfd8cf] p-4 text-sm text-[#647067]">
            Bu urun icin stok hareketi yok.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Hareket</th>
                  <th className="px-4 py-3">Miktar</th>
                  <th className="px-4 py-3">Referans</th>
                  <th className="px-4 py-3">Aciklama</th>
                </tr>
              </thead>
              <tbody>
                {product.stockMovements.map((movement) => {
                  const invoiceNumber = movement.referenceId
                    ? invoiceReferencesById.get(movement.referenceId)
                    : null;

                  return (
                  <tr key={movement.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatProductDate(movement.movementDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {stockMovementTypeLabels[movement.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatQuantity(movement.quantity)} {productUnitLabels[product.unit]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {invoiceNumber && movement.referenceId ? (
                        <Link
                          href={`/invoices/${movement.referenceId}`}
                          className="font-semibold text-[#1f6f54] hover:text-[#195d47]"
                        >
                          {invoiceNumber}
                        </Link>
                      ) : (
                        movement.referenceId ?? movement.referenceType
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatPlainValue(movement.note)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#16201b]">Fatura kalemi baglantilari</h2>
        {product.invoiceItems.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-[#cfd8cf] p-4 text-sm text-[#647067]">
            Bu urune bagli fatura kalemi yok.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {product.invoiceItems.map((item) => (
              <Link
                key={item.id}
                href={`/invoices/${item.invoice.id}`}
                className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
              >
                <span className="text-sm font-semibold text-[#223028]">
                  {item.invoice.invoiceNumber}
                </span>
                <span className="ml-2 text-sm text-[#647067]">
                  {formatProductDate(item.invoice.invoiceDate)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
