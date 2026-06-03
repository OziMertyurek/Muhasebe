import type { FileRelatedType } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { uploadFileAction } from "@/app/(dashboard)/files/actions";
import { FileUploadForm } from "@/components/files/file-upload-form";
import { getFileFormOptions } from "@/lib/file-options";

type NewFilePageProps = {
  searchParams?: Promise<{
    relatedType?: string;
    invoiceId?: string;
    expenseId?: string;
    companyId?: string;
    paymentId?: string;
  }>;
};

function getInitialRelatedType(value?: string) {
  if (
    value === "INVOICE" ||
    value === "EXPENSE" ||
    value === "COMPANY" ||
    value === "PAYMENT" ||
    value === "OTHER"
  ) {
    return value as FileRelatedType;
  }

  return "OTHER";
}

export default async function NewFilePage({ searchParams }: NewFilePageProps) {
  const [params, options] = await Promise.all([searchParams, getFileFormOptions()]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/files"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Dosya arşivine dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni dosya</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Dosya yükle
          </h1>
        </div>
      </section>

      <FileUploadForm
        action={uploadFileAction}
        options={options}
        initialValues={{
          relatedType: getInitialRelatedType(params?.relatedType),
          invoiceId: params?.invoiceId,
          expenseId: params?.expenseId,
          companyId: params?.companyId,
          paymentId: params?.paymentId,
        }}
      />
    </div>
  );
}
