import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/company-utils";
import {
  fileRelatedTypeLabels,
  fileRelatedTypeOptions,
  formatFileSize,
  getFileKind,
  getMimeFilterWhere,
  getRelatedRecordHref,
  getRelatedRecordLabel,
} from "@/lib/file-utils";
import { prisma } from "@/lib/prisma";
import { FileRelatedType } from "@prisma/client";

type FilesPageProps = {
  searchParams?: Promise<{
    q?: string;
    relatedType?: string;
    kind?: string;
  }>;
};

function getRelatedType(value?: string) {
  if (value && Object.values(FileRelatedType).includes(value as FileRelatedType)) {
    return value as FileRelatedType;
  }

  return undefined;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const relatedType = getRelatedType(params?.relatedType);
  const files = await prisma.fileAttachment.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { originalFileName: { contains: query } },
              { storedFileName: { contains: query } },
            ],
          }
        : {}),
      ...(relatedType ? { relatedType } : {}),
      ...getMimeFilterWhere(params?.kind),
    },
    include: {
      invoice: { select: { id: true, invoiceNumber: true } },
      expense: { select: { id: true, title: true } },
      company: { select: { id: true, name: true } },
      payment: { select: { id: true, description: true, paymentDate: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Dosya Arşivi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Ek dosyalar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Fatura PDF dosyası, dekont, sözleşme ve gider belgelerini ilişkili kayıtlarla saklayın.
          </p>
        </div>
        <Link
          href="/files/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <FilePlus2 className="h-4 w-4" />
          Dosya Ekle
        </Link>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_160px_auto]">
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
            name="relatedType"
            defaultValue={relatedType ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm ilişki tipleri</option>
            {fileRelatedTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="kind"
            defaultValue={params?.kind ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm dosya türleri</option>
            <option value="pdf">PDF</option>
            <option value="image">Görsel</option>
            <option value="document">Word</option>
            <option value="sheet">Excel</option>
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {files.length === 0 ? (
          <EmptyState
            title="Henüz dosya eklenmedi"
            description="İlk dosyanızı Dosya Ekle butonuyla yükleyebilirsiniz."
            actionHref="/files/new"
            actionLabel="Dosya Ekle"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Yüklenme tarihi</th>
                  <th className="px-4 py-3">Orijinal dosya adı</th>
                  <th className="px-4 py-3">İlişki tipi</th>
                  <th className="px-4 py-3">İlişkili kayıt</th>
                  <th className="px-4 py-3">Dosya türü</th>
                  <th className="px-4 py-3">Dosya boyutu</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const relatedHref = getRelatedRecordHref(file);

                  return (
                    <tr key={file.id} className="border-t border-[#e5e9e5]">
                      <td className="px-4 py-3 text-[#46534b]">{formatDate(file.uploadedAt)}</td>
                      <td className="px-4 py-3 font-semibold text-[#16201b]">
                        {file.originalFileName}
                      </td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {fileRelatedTypeLabels[file.relatedType]}
                      </td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {relatedHref ? (
                          <Link href={relatedHref} className="font-semibold text-[#1f6f54]">
                            {getRelatedRecordLabel(file)}
                          </Link>
                        ) : (
                          getRelatedRecordLabel(file)
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#46534b]">{getFileKind(file.mimeType)}</td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/files/${file.id}`}
                          className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
                        >
                          Detay
                        </Link>
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
