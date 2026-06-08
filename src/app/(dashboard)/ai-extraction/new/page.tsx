import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAiExtractionAction } from "@/app/(dashboard)/ai-extraction/actions";
import { AiExtractionForm } from "@/components/ai-extraction/ai-extraction-form";
import { getAiExtractionFileOptions } from "@/lib/ai-extraction-utils";

type NewAiExtractionPageProps = {
  searchParams?: Promise<{
    fileAttachmentId?: string;
  }>;
};

export default async function NewAiExtractionPage({
  searchParams,
}: NewAiExtractionPageProps) {
  const [fileOptions, params] = await Promise.all([
    getAiExtractionFileOptions(),
    searchParams,
  ]);
  const selectedFileId = params?.fileAttachmentId;
  const selectedFileExists = selectedFileId
    ? fileOptions.some((file) => file.id === selectedFileId)
    : false;

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <Link
          href="/ai-extraction"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          AI analiz kayıtlarına dön
        </Link>
        <p className="mt-4 text-sm font-medium text-[#607167]">AI Fatura Okuma</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Yeni AI analiz kaydı
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Bu aşamada gerçek analiz yapılmaz. Seçilen dosya için PENDING durumunda kayıt
          oluşturulur.
        </p>
      </section>

      {fileOptions.length === 0 ? (
        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#223028]">Uygun dosya bulunamadı</p>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            PDF, PNG, JPG, JPEG veya WEBP türünde ve ilişki tipi Fatura ya da Diğer olan bir
            dosya eklemelisiniz.
          </p>
          <Link
            href="/files/new"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            Dosya Ekle
          </Link>
        </div>
      ) : (
        <AiExtractionForm
          action={createAiExtractionAction}
          fileOptions={fileOptions}
          initialValues={{
            fileAttachmentId: selectedFileExists ? selectedFileId : "",
            status: "PENDING",
          }}
          submitLabel="Analiz Kaydı Oluştur"
        />
      )}
    </div>
  );
}
