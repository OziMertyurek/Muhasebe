import Link from "next/link";
import { AiExtractionStatus, FileRelatedType } from "@prisma/client";
import { Eye, FileSearch, Pencil, Plus, Search } from "lucide-react";
import {
  aiExtractionRelatedTypeLabels,
  aiExtractionRelatedTypeOptions,
  aiExtractionStatusLabels,
  aiExtractionStatusOptions,
  formatConfidence,
  hasExtractionError,
} from "@/lib/ai-extraction-utils";
import { formatDate } from "@/lib/company-utils";
import { prisma } from "@/lib/prisma";

type AiExtractionPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    relatedType?: string;
  }>;
};

function getStatus(value?: string) {
  if (value && Object.values(AiExtractionStatus).includes(value as AiExtractionStatus)) {
    return value as AiExtractionStatus;
  }

  return undefined;
}

function getRelatedType(value?: string) {
  if (value === "INVOICE" || value === "OTHER") {
    return value as Extract<FileRelatedType, "INVOICE" | "OTHER">;
  }

  return undefined;
}

export default async function AiExtractionPage({ searchParams }: AiExtractionPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const status = getStatus(params?.status);
  const relatedType = getRelatedType(params?.relatedType);
  const jobs = await prisma.aiExtractionJob.findMany({
    where: {
      ...(status ? { status } : {}),
      fileAttachment: {
        ...(relatedType ? { relatedType } : {}),
        ...(query ? { originalFileName: { contains: query } } : {}),
      },
    },
    include: {
      fileAttachment: {
        select: {
          id: true,
          originalFileName: true,
          relatedType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">AI Fatura Okuma</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            AI analiz kayıtları
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Dosya Arşivi’ndeki PDF ve görseller için ileride çalışacak AI/OCR analiz
            kayıtlarını takip edin.
          </p>
        </div>
        <Link
          href="/ai-extraction/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <Plus className="h-4 w-4" />
          Yeni Analiz Kaydı
        </Link>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_170px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Dosya adına göre ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm durumlar</option>
            {aiExtractionStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="relatedType"
            defaultValue={relatedType ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm ilişki tipleri</option>
            {aiExtractionRelatedTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {jobs.length === 0 ? (
          <div className="p-8 text-center">
            <FileSearch className="mx-auto h-10 w-10 text-[#9aa69d]" />
            <p className="mt-3 text-sm font-semibold text-[#223028]">
              Henüz AI analiz kaydı yok
            </p>
            <p className="mt-2 text-sm text-[#647067]">
              İlk kaydı Yeni Analiz Kaydı butonuyla oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Oluşturulma</th>
                  <th className="px-4 py-3">Dosya adı</th>
                  <th className="px-4 py-3">İlişki tipi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Güven skoru</th>
                  <th className="px-4 py-3">Hata var mı?</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {job.fileAttachment.originalFileName}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {aiExtractionRelatedTypeLabels[job.fileAttachment.relatedType]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {aiExtractionStatusLabels[job.status]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatConfidence(job.confidence)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {hasExtractionError(job.errorMessage) ? "Var" : "Yok"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/ai-extraction/${job.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/ai-extraction/${job.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
