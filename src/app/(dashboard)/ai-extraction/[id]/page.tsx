import Link from "next/link";
import { AiExtractionStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import {
  updateAiExtractionStatusAction,
} from "@/app/(dashboard)/ai-extraction/actions";
import {
  aiExtractionStatusLabels,
  aiExtractionStatusOptions,
  formatConfidence,
} from "@/lib/ai-extraction-utils";
import { formatDate } from "@/lib/company-utils";
import { fileRelatedTypeLabels, formatFileSize, getFileKind } from "@/lib/file-utils";
import { prisma } from "@/lib/prisma";

type AiExtractionDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#16201b]">{title}</h2>
      {value ? (
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 font-mono text-sm leading-6 text-[#223028]">
          {value}
        </pre>
      ) : (
        <p className="mt-4 text-sm text-[#647067]">Henüz veri yok.</p>
      )}
    </div>
  );
}

const previewFields = [
  "Fatura no",
  "Cari firma",
  "Fatura tarihi",
  "Vade tarihi",
  "Ara toplam",
  "KDV",
  "Genel toplam",
  "Para birimi",
  "Fatura tipi",
];

export default async function AiExtractionDetailPage({
  params,
  searchParams,
}: AiExtractionDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const job = await prisma.aiExtractionJob.findUnique({
    where: { id },
    include: {
      fileAttachment: {
        select: {
          id: true,
          originalFileName: true,
          storedFileName: true,
          filePath: true,
          mimeType: true,
          fileSize: true,
          relatedType: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/ai-extraction"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            AI analiz kayıtlarına dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">AI Fatura Okuma</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-[#16201b]">
            {job.fileAttachment.originalFileName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Bu kayıt sadece AI/OCR entegrasyonu için hazırlık ve manuel simülasyon amaçlıdır.
          </p>
        </div>
        <Link
          href={`/ai-extraction/${job.id}/edit`}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <Pencil className="h-4 w-4" />
          Düzenle
        </Link>
      </section>

      {query?.error === "status" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Durum güncellenirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#16201b]">Dosya bilgileri</h2>
            <Link
              href={`/files/${job.fileAttachment.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
            >
              Dosya detay
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Orijinal dosya" value={job.fileAttachment.originalFileName} />
            <InfoItem label="Saklanan dosya" value={job.fileAttachment.storedFileName} />
            <InfoItem label="Dosya türü" value={getFileKind(job.fileAttachment.mimeType)} />
            <InfoItem label="Mime type" value={job.fileAttachment.mimeType ?? "-"} />
            <InfoItem label="Dosya boyutu" value={formatFileSize(job.fileAttachment.fileSize)} />
            <InfoItem label="Yüklenme" value={formatDate(job.fileAttachment.uploadedAt)} />
            <InfoItem
              label="İlişki tipi"
              value={fileRelatedTypeLabels[job.fileAttachment.relatedType]}
            />
            <InfoItem label="Dosya yolu" value={job.fileAttachment.filePath} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Analiz durumu</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Durum" value={aiExtractionStatusLabels[job.status]} />
            <InfoItem label="Güven skoru" value={formatConfidence(job.confidence)} />
            <InfoItem label="Oluşturulma" value={formatDate(job.createdAt)} />
            <InfoItem label="Güncellenme" value={formatDate(job.updatedAt)} />
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-[#607167]">Hızlı durum değişimi</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiExtractionStatusOptions.map((option) => (
                <form
                  key={option.value}
                  action={updateAiExtractionStatusAction.bind(
                    null,
                    job.id,
                    option.value as AiExtractionStatus,
                  )}
                >
                  <button
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] disabled:opacity-60"
                    disabled={job.status === option.value}
                  >
                    {option.label} yap
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">
          Fatura Önizleme / Onay Alanı
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {previewFields.map((field) => (
            <div key={field} className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-3">
              <p className="text-xs font-semibold uppercase text-[#607167]">{field}</p>
              <p className="mt-2 text-sm text-[#647067]">Bu alan sonraki aşamada bağlanacak</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-[#647067]">
          Gerçek AI/OCR entegrasyonu eklendiğinde çıkarılan bilgiler burada kontrol edilip
          faturaya dönüştürülebilecek.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <TextBlock title="Ham çıkarılan metin" value={job.rawExtractedText} />
        <TextBlock title="Çıkarılan JSON" value={job.extractedJson} />
        <TextBlock title="Hata mesajı" value={job.errorMessage} />
      </section>
    </div>
  );
}
