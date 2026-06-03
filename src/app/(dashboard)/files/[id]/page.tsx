import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import {
  fileRelatedTypeLabels,
  formatFileSize,
  getFileKind,
  getRelatedRecordHref,
  getRelatedRecordLabel,
} from "@/lib/file-utils";
import { prisma } from "@/lib/prisma";

type FileDetailPageProps = {
  params: Promise<{ id: string }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

export default async function FileDetailPage({ params }: FileDetailPageProps) {
  const { id } = await params;
  const file = await prisma.fileAttachment.findUnique({
    where: { id },
    include: {
      invoice: { select: { id: true, invoiceNumber: true } },
      expense: { select: { id: true, title: true } },
      company: { select: { id: true, name: true } },
      payment: { select: { id: true, description: true, paymentDate: true } },
      aiExtractionJobs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  if (!file) {
    notFound();
  }

  const relatedHref = getRelatedRecordHref(file);
  const isPreviewable =
    file.mimeType === "application/pdf" || Boolean(file.mimeType?.startsWith("image/"));

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
          <p className="text-sm font-medium text-[#607167]">Dosya detay</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-[#16201b]">
            {file.originalFileName}
          </h1>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Dosya bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Orijinal dosya adı" value={file.originalFileName} />
            <InfoItem label="Saklanan dosya adı" value={file.storedFileName} />
            <InfoItem label="Dosya yolu" value={file.filePath} />
            <InfoItem label="Mime type" value={formatPlainValue(file.mimeType)} />
            <InfoItem label="Dosya türü" value={getFileKind(file.mimeType)} />
            <InfoItem label="Dosya boyutu" value={formatFileSize(file.fileSize)} />
            <InfoItem label="Yüklenme tarihi" value={formatDate(file.uploadedAt)} />
            <InfoItem label="İlişki tipi" value={fileRelatedTypeLabels[file.relatedType]} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">İlişkili kayıt</h2>
          {relatedHref ? (
            <Link
              href={relatedHref}
              className="mt-5 flex items-center justify-between gap-4 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
            >
              <span>
                <span className="block text-sm font-semibold text-[#223028]">
                  {getRelatedRecordLabel(file)}
                </span>
                <span className="mt-1 block text-sm text-[#647067]">Detaya git</span>
              </span>
              <ExternalLink className="h-4 w-4 text-[#647067]" />
            </Link>
          ) : (
            <p className="mt-5 text-sm text-[#647067]">İlişkili kayıt seçilmedi.</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#16201b]">Önizleme</h2>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            {isPreviewable
              ? "PDF ve görsel önizleme alanı sonraki aşamada bağlanacak."
              : "Bu dosya türü için önizleme alanı sonraki aşamada değerlendirilecek."}
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#16201b]">AI Analizi</h2>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            Bu alan ileride AI/OCR fatura okuma sistemi için kullanılacak.
          </p>
          <p className="mt-4 text-sm text-[#647067]">
            Mevcut AI iş sayısı: {file.aiExtractionJobs.length}
          </p>
        </div>
      </section>
    </div>
  );
}
