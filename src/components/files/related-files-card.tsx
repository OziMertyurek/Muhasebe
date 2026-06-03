import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { formatDate } from "@/lib/company-utils";
import { formatFileSize, getFileKind } from "@/lib/file-utils";

type RelatedFile = {
  id: string;
  originalFileName: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: Date;
};

export function RelatedFilesCard({
  title = "Bağlı dosyalar",
  files,
  addHref,
}: {
  title?: string;
  files: RelatedFile[];
  addHref: string;
}) {
  return (
    <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#16201b]">{title}</h2>
          <p className="mt-1 text-sm text-[#647067]">Son eklenen dosyalar.</p>
        </div>
        <Link
          href={addHref}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
        >
          <FilePlus2 className="h-4 w-4" />
          Dosya Ekle
        </Link>
      </div>

      {files.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-[#cfd8cf] p-4 text-sm text-[#647067]">
          Bağlı dosya yok.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {files.map((file) => (
            <Link
              key={file.id}
              href={`/files/${file.id}`}
              className="flex items-center justify-between gap-4 rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
            >
              <span>
                <span className="block text-sm font-semibold text-[#223028]">
                  {file.originalFileName}
                </span>
                <span className="mt-1 block text-sm text-[#647067]">
                  {getFileKind(file.mimeType)} · {formatFileSize(file.fileSize)}
                </span>
              </span>
              <span className="shrink-0 text-sm text-[#647067]">{formatDate(file.uploadedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
