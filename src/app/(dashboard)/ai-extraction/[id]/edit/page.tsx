import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateAiExtractionAction } from "@/app/(dashboard)/ai-extraction/actions";
import { AiExtractionForm } from "@/components/ai-extraction/ai-extraction-form";
import { getAiExtractionFileOptions } from "@/lib/ai-extraction-utils";
import { prisma } from "@/lib/prisma";

type EditAiExtractionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAiExtractionPage({ params }: EditAiExtractionPageProps) {
  const { id } = await params;
  const [job, fileOptions] = await Promise.all([
    prisma.aiExtractionJob.findUnique({
      where: { id },
      include: {
        fileAttachment: {
          select: { id: true, originalFileName: true },
        },
      },
    }),
    getAiExtractionFileOptions(),
  ]);

  if (!job) {
    notFound();
  }

  const options = fileOptions.some((file) => file.id === job.fileAttachmentId)
    ? fileOptions
    : [
        {
          id: job.fileAttachmentId,
          label: `${job.fileAttachment.originalFileName} - mevcut dosya`,
        },
        ...fileOptions,
      ];

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <Link
          href={`/ai-extraction/${job.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Analiz detayına dön
        </Link>
        <p className="mt-4 text-sm font-medium text-[#607167]">AI Fatura Okuma</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          AI analiz kaydını düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Durum, ham metin, JSON, güven skoru ve hata mesajını manuel simülasyon için düzenleyin.
        </p>
      </section>

      <AiExtractionForm
        action={updateAiExtractionAction.bind(null, job.id)}
        fileOptions={options}
        initialValues={{
          fileAttachmentId: job.fileAttachmentId,
          status: job.status,
          rawExtractedText: job.rawExtractedText,
          extractedJson: job.extractedJson,
          confidence: job.confidence,
          errorMessage: job.errorMessage,
        }}
        submitLabel="Analiz Kaydını Güncelle"
        lockFile
      />
    </div>
  );
}
