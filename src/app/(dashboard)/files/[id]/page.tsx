import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { archiveFileAttachmentAction } from "@/app/(dashboard)/files/actions";
import {
  aiExtractionStatusLabels,
  formatConfidence,
  isAiExtractionSupportedFile,
} from "@/lib/ai-extraction-utils";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
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
  searchParams?: Promise<{ error?: string }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

function formatArchiveError(value?: string) {
  switch (value) {
    case "archive-active-ai":
      return "Bu dosya arşivlenemez. Dosyaya bağlı aktif AI analiz kaydı bulunuyor.";
    case "archive-linked-record":
      return "Bu dosya arşivlenemez. Dosya fatura, gider, cari veya tahsilat / ödeme kaydına bağlı.";
    case "archive-already":
      return "Bu dosya zaten arşivlenmiş.";
    case "archive":
      return "Dosya arşivlenirken bir hata oluştu.";
    default:
      return null;
  }
}

export default async function FileDetailPage({
  params,
  searchParams,
}: FileDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const file = await prisma.fileAttachment.findFirst({
    where: { id, deletedAt: null },
    include: {
      invoice: { select: { id: true, invoiceNumber: true } },
      expense: { select: { id: true, title: true } },
      company: { select: { id: true, name: true } },
      payment: { select: { id: true, description: true, paymentDate: true } },
      aiExtractionJobs: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, confidence: true, createdAt: true },
      },
    },
  });

  if (!file) {
    notFound();
  }

  const relatedHref = getRelatedRecordHref(file);
  const isPreviewable =
    file.mimeType === "application/pdf" || Boolean(file.mimeType?.startsWith("image/"));
  const supportsAiExtraction = isAiExtractionSupportedFile(file);
  const archiveError = formatArchiveError(query?.error);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
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
        <form action={archiveFileAttachmentAction.bind(null, file.id)}>
          <ConfirmSubmitButton
            message="Bu dosya arşivlenecek. Fiziksel dosya korunacaktır. Bu işlem yalnızca bağlantısız ve aktif AI analizi bulunmayan dosyalar için yapılabilir."
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d8b4ae] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#b9473d]"
          >
            <Archive className="h-4 w-4" />
            Arşivle
          </ConfirmSubmitButton>
        </form>
      </section>

      {archiveError ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {archiveError}
        </div>
      ) : null}

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">AI Analizi</h2>
              <p className="mt-2 text-sm leading-6 text-[#647067]">
                Bu alan ileride AI/OCR fatura okuma sistemi için kullanılacak.
              </p>
            </div>
            {supportsAiExtraction ? (
              <Link
                href={`/ai-extraction/new?fileAttachmentId=${file.id}`}
                className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
              >
                <Plus className="h-4 w-4" />
                AI Analiz Kaydı Oluştur
              </Link>
            ) : null}
          </div>

          {!supportsAiExtraction ? (
            <div className="mt-4 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-4 py-3 text-sm text-[#647067]">
              Bu dosya türü veya ilişki tipi AI analiz hazırlığı için uygun değil.
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {file.aiExtractionJobs.length === 0 ? (
              <p className="text-sm text-[#647067]">Bu dosyaya bağlı AI analiz kaydı yok.</p>
            ) : (
              file.aiExtractionJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/ai-extraction/${job.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[#223028]">
                      {aiExtractionStatusLabels[job.status]}
                    </span>
                    <span className="mt-1 block text-xs text-[#647067]">
                      Oluşturulma: {formatDate(job.createdAt)} · Güven:{" "}
                      {formatConfidence(job.confidence)}
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 text-[#647067]" />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
