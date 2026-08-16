import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createGlobalStockAdjustmentAction } from "@/app/(dashboard)/products/actions";
import { StockAdjustmentForm } from "@/components/products/stock-adjustment-form";
import { prisma } from "@/lib/prisma";

export default async function NewStockAdjustmentPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/products"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Urunlere don
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Stok duzeltmesi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Manuel stok hareketi
          </h1>
        </div>
      </section>

      <StockAdjustmentForm action={createGlobalStockAdjustmentAction} products={products} />
    </div>
  );
}
