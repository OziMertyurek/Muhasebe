import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateProductAction } from "@/app/(dashboard)/products/actions";
import { ProductForm } from "@/components/products/product-form";
import { prisma } from "@/lib/prisma";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/products/${product.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya don
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Urun duzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {product.name}
          </h1>
        </div>
      </section>

      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        submitLabel="Degisiklikleri kaydet"
        initialValues={{
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          description: product.description,
          unit: product.unit,
          defaultVatRate: product.defaultVatRate.toString(),
          defaultPurchasePrice: product.defaultPurchasePrice.toString(),
          defaultSalesPrice: product.defaultSalesPrice.toString(),
          currency: product.currency,
          minimumStockLevel: product.minimumStockLevel.toString(),
          isActive: product.isActive,
        }}
      />
    </div>
  );
}
