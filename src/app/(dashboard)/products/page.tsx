import Link from "next/link";
import { Plus, Search, Eye, Pencil, Trash2, SlidersHorizontal } from "lucide-react";
import { deleteProductAction } from "@/app/(dashboard)/products/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { calculateCurrentStock, getMinimumStockState } from "@/lib/inventory-core";
import { formatMoney } from "@/lib/invoice-utils";
import { formatQuantity, productUnitLabels } from "@/lib/product-utils";
import { prisma } from "@/lib/prisma";

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    active?: string;
  }>;
};

function getActiveFilter(value?: string) {
  if (value === "active") return true;
  if (value === "passive") return false;
  return undefined;
}

function getStockTone(state: ReturnType<typeof getMinimumStockState>) {
  if (state === "OK") return "positive" as const;
  if (state === "LOW") return "warning" as const;
  return "danger" as const;
}

function getStockLabel(state: ReturnType<typeof getMinimumStockState>) {
  if (state === "OK") return "Yeterli";
  if (state === "LOW") return "Minimum";
  return "Yok";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const active = getActiveFilter(params?.active);
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(active !== undefined ? { isActive: active } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { sku: { contains: query.toUpperCase() } },
              { barcode: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      stockMovements: {
        select: { type: true, quantity: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Stok</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Urun kartlari
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Urunleri, fiyat varsayilanlarini ve stok miktarlarini hareket defteriyle takip edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products/adjustment"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Stok Duzelt
          </Link>
          <Link
            href="/products/new"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Urun
          </Link>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_170px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Urun adi, SKU veya barkoda gore ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="active"
            defaultValue={params?.active ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tum durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {products.length === 0 ? (
          <EmptyState
            title="Henuz urun eklenmedi"
            description="Ilk urun kartinizi Yeni Urun butonuyla olusturabilirsiniz."
            actionHref="/products/new"
            actionLabel="Yeni Urun"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Urun</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barkod</th>
                  <th className="px-4 py-3">Stok</th>
                  <th className="px-4 py-3">Minimum</th>
                  <th className="px-4 py-3">Satis fiyati</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">Islemler</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const currentStock = calculateCurrentStock(product.stockMovements);
                  const stockState = getMinimumStockState(currentStock, product.minimumStockLevel);

                  return (
                    <tr key={product.id} className="border-t border-[#e5e9e5] transition hover:bg-[#fbfcfa]">
                      <td className="px-4 py-3 font-semibold text-[#16201b]">{product.name}</td>
                      <td className="px-4 py-3 text-[#46534b]">{product.sku}</td>
                      <td className="px-4 py-3 text-[#46534b]">{product.barcode ?? "-"}</td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {formatQuantity(currentStock)} {productUnitLabels[product.unit]}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={getStockTone(stockState)}>
                          {getStockLabel(stockState)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {formatMoney(product.defaultSalesPrice, product.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={product.isActive ? "positive" : "neutral"}>
                          {product.isActive ? "Aktif" : "Pasif"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/${product.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                            title="Duzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <form action={deleteProductAction.bind(null, product.id)}>
                            <ConfirmSubmitButton
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] text-[#8b2f28] transition hover:border-[#c79a92]"
                              message="Bu urunu arsivlemek istedigine emin misin? Stok hareketleri korunacak."
                              title="Arsivle"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
