import Link from "next/link";
import { ArrowLeft, FileUp, ScanText, ShieldCheck } from "lucide-react";
import { createAiExtractionAction } from "@/app/(dashboard)/ai-extraction/actions";
import { AiExtractionForm } from "@/components/ai-extraction/ai-extraction-form";
import { getAiExtractionFileOptions } from "@/lib/ai-extraction-utils";

type NewAiExtractionPageProps = {
  searchParams?: Promise<{
    fileAttachmentId?: string;
  }>;
};

const preparationSteps = [
  "Dosyayı arşive ekleyin",
  "AI analiz kaydını oluşturun",
  "Metin çıkarma ve alan kontrolünü detay ekranında tamamlayın",
];

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
          Yüklenmiş bir fatura dosyası için kontrollü analiz kaydı oluşturun. Dosya içeriği
          kullanıcı onayı olmadan cari veya fatura kayıtlarını değiştirmez.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {preparationSteps.map((step, index) => (
          <div
            key={step}
            className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#e8f2ed] text-sm font-semibold text-[#14543f]">
              {index + 1}
            </span>
            <p className="mt-3 text-sm font-semibold text-[#16201b]">{step}</p>
          </div>
        ))}
      </section>

      {fileOptions.length === 0 ? (
        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
                <FileUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#16201b]">Uygun dosya bulunamadı</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
                  AI analizi için PDF, PNG, JPG, JPEG veya WEBP türünde ve ilişki tipi Fatura
                  ya da Diğer olan bir dosya eklemelisiniz.
                </p>
              </div>
            </div>
            <Link
              href="/files/new"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
            >
              <FileUp className="h-4 w-4" />
              Dosya Ekle
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-[#dce2dc] bg-[#fbfcfa] p-4 text-sm leading-6 text-[#647067] shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#14543f]">
                <ScanText className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-[#16201b]">Analiz güvenliği</p>
                <p className="mt-1">
                  Önce kayıt oluşturulur, sonra metin çıkarma ve parser sonuçları detay ekranında
                  gözden geçirilir. Son kaydetme adımı kullanıcı kontrolündedir.
                </p>
              </div>
              <ShieldCheck className="ml-auto hidden h-5 w-5 text-[#1f6f54] sm:block" />
            </div>
          </section>
          <AiExtractionForm
            action={createAiExtractionAction}
            fileOptions={fileOptions}
            initialValues={{
              fileAttachmentId: selectedFileExists ? selectedFileId : "",
              status: "PENDING",
            }}
            submitLabel="Analiz Kaydı Oluştur"
          />
        </>
      )}
    </div>
  );
}