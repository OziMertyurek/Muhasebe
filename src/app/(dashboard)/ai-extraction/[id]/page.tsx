import Link from "next/link";
import { AiExtractionStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Pencil } from "lucide-react";
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
import type { ParsedInvoiceData } from "@/lib/invoice-parser";
import { prisma } from "@/lib/prisma";

type AiExtractionDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    extracted?: string;
    parsed?: string;
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

function TextBlock({
  title,
  value,
  emptyMessage = "Henüz veri yok.",
}: {
  title: string;
  value: string | null;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#16201b]">{title}</h2>
      {value ? (
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 font-mono text-sm leading-6 text-[#223028]">
          {value}
        </pre>
      ) : (
        <p className="mt-4 text-sm text-[#647067]">{emptyMessage}</p>
      )}
    </div>
  );
}

function PreviewValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-3">
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#223028]">
        {value || "Bulunamadı"}
      </p>
    </div>
  );
}

function InvoicePreviewCard({ data }: { data: ParsedInvoiceData | null }) {
  const currency = data?.currency || "TRY";

  return (
    <section className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#16201b]">Çıkarılan Fatura Bilgileri</h2>
      {data ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PreviewValue label="Fatura No" value={data.invoiceNumber} />
            <PreviewValue label="Fatura Tarihi" value={data.invoiceDate} />
            <PreviewValue label="Vade Tarihi" value={data.dueDate} />
            <PreviewValue label="Firma Adı" value={data.companyName} />
            <PreviewValue label="Vergi No" value={data.taxNumber} />
            <PreviewValue label="Vergi Dairesi" value={data.taxOffice} />
            <PreviewValue label="Ara Toplam" value={formatParsedAmount(data.subtotal, currency)} />
            <PreviewValue label="KDV" value={formatParsedAmount(data.vatAmount, currency)} />
            <PreviewValue
              label="İskonto"
              value={formatParsedAmount(data.discountAmount, currency)}
            />
            <PreviewValue
              label="Genel Toplam"
              value={formatParsedAmount(data.totalAmount, currency)}
            />
            <PreviewValue label="Para Birimi" value={data.currency} />
            <PreviewValue
              label="Tahmini Fatura Tipi"
              value={formatInvoiceTypeSuggestion(data.invoiceTypeSuggestion)}
            />
            <PreviewValue
              label="Güven Skoru"
              value={typeof data.confidenceScore === "number" ? `%${Math.round(data.confidenceScore * 100)}` : null}
            />
          </div>
          <div className="mt-5 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4">
            <p className="text-sm font-semibold text-[#223028]">Uyarılar</p>
            {data.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-[#647067]">
                {data.warnings.map((warning) => (
                  <li key={warning}>- {warning}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#647067]">Uyarı yok.</p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#647067]">
          Henüz çıkarılmış fatura bilgisi yok. Ham metin oluştuktan sonra Fatura Bilgilerini Çıkar
          butonunu kullanabilirsiniz.
        </p>
      )}
      <p className="mt-5 text-sm leading-6 text-[#647067]">
        Bu önizleme local regex parser ile oluşturulur. Henüz otomatik Invoice kaydı oluşturmaz.
      </p>
    </section>
  );
}

function parseExtractedInvoiceJson(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    return {
      invoiceNumber: getNullableString(parsed, "invoiceNumber"),
      invoiceDate: getNullableString(parsed, "invoiceDate"),
      dueDate: getNullableString(parsed, "dueDate"),
      companyName: getNullableString(parsed, "companyName"),
      taxNumber: getNullableString(parsed, "taxNumber"),
      taxOffice: getNullableString(parsed, "taxOffice"),
      subtotal: getNullableNumber(parsed, "subtotal"),
      vatAmount: getNullableNumber(parsed, "vatAmount"),
      discountAmount: getNumber(parsed, "discountAmount") ?? 0,
      totalAmount: getNullableNumber(parsed, "totalAmount"),
      currency: getString(parsed, "currency") || "TRY",
      invoiceTypeSuggestion: getInvoiceTypeSuggestion(parsed),
      confidenceScore: getNumber(parsed, "confidenceScore") ?? 0,
      warnings: getStringArray(parsed, "warnings"),
    } satisfies ParsedInvoiceData;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function getNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getNullableNumber(record: Record<string, unknown>, key: string) {
  return getNumber(record, key);
}

function getStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getInvoiceTypeSuggestion(record: Record<string, unknown>) {
  const value = record.invoiceTypeSuggestion;

  if (value === "SALES" || value === "PURCHASE" || value === "UNKNOWN") {
    return value;
  }

  return "UNKNOWN";
}

function formatParsedAmount(value: number | null, currency: string) {
  if (value === null) {
    return null;
  }

  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("tr-TR")} ${currency}`;
  }
}

function formatInvoiceTypeSuggestion(value: ParsedInvoiceData["invoiceTypeSuggestion"]) {
  if (value === "SALES") return "Ben fatura kestim";
  if (value === "PURCHASE") return "Bana fatura kesildi";
  return "Belirlenemedi";
}

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

  const parsedInvoiceData = parseExtractedInvoiceJson(job.extractedJson);

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
        <div className="flex flex-wrap gap-2">
          <form action={`/ai-extraction/${job.id}/extract`} method="post">
            <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]">
              <FileText className="h-4 w-4" />
              MarkItDown ile Metin Çıkar
            </button>
          </form>
          <form action={`/ai-extraction/${job.id}/parse`} method="post">
            <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#274c77] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203f64]">
              <FileText className="h-4 w-4" />
              Fatura Bilgilerini Çıkar
            </button>
          </form>
          <Link
            href={`/ai-extraction/${job.id}/edit`}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
        </div>
      </section>

      {query?.error === "status" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Durum güncellenirken bir hata oluştu.
        </div>
      ) : null}

      {query?.error === "markitdown" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          MarkItDown çalıştırılamadı. Python ve markitdown paketinin kurulu olduğundan emin olun.
        </div>
      ) : null}

      {query?.error === "parse-empty" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Önce MarkItDown ile metin çıkarılmalıdır.
        </div>
      ) : null}

      {query?.error === "parse" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Fatura bilgileri çıkarılırken bir hata oluştu.
        </div>
      ) : null}

      {query?.extracted === "1" ? (
        <div className="rounded-md border border-[#b8dcc7] bg-[#f4fbf6] px-4 py-3 text-sm font-medium text-[#1f6f54]">
          Dosyadan metin başarıyla çıkarıldı ve ham metin alanına kaydedildi.
        </div>
      ) : null}

      {query?.parsed === "1" ? (
        <div className="rounded-md border border-[#b8dcc7] bg-[#f4fbf6] px-4 py-3 text-sm font-medium text-[#1f6f54]">
          Fatura bilgileri ham metinden çıkarıldı ve JSON alanına kaydedildi.
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

      <InvoicePreviewCard data={parsedInvoiceData} />

      <section className="grid gap-5 lg:grid-cols-3">
        <TextBlock
          title="Ham çıkarılan metin"
          value={job.rawExtractedText}
          emptyMessage="Henüz metin çıkarılmadı."
        />
        <TextBlock title="Çıkarılan JSON" value={job.extractedJson} />
        <TextBlock title="Hata mesajı" value={job.errorMessage} />
      </section>
    </div>
  );
}
