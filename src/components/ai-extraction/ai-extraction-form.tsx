"use client";

import type { AiExtractionStatus } from "@prisma/client";
import { useActionState } from "react";
import { FileText, Save, ShieldCheck } from "lucide-react";
import type { AiExtractionFormState } from "@/app/(dashboard)/ai-extraction/actions";
import { aiExtractionStatusOptions } from "@/lib/ai-extraction-labels";

type FileOption = {
  id: string;
  label: string;
};

type AiExtractionFormValues = {
  fileAttachmentId?: string;
  status?: AiExtractionStatus;
  rawExtractedText?: string | null;
  extractedJson?: string | null;
  confidence?: number | null;
  errorMessage?: string | null;
};

type AiExtractionFormProps = {
  action: (state: AiExtractionFormState, formData: FormData) => Promise<AiExtractionFormState>;
  fileOptions: FileOption[];
  initialValues?: AiExtractionFormValues;
  submitLabel: string;
  lockFile?: boolean;
};

const initialState: AiExtractionFormState = {};

function fieldClass(hasError?: boolean) {
  return [
    "mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] shadow-sm outline-none transition",
    hasError
      ? "border-[#b9473d] focus:ring-2 focus:ring-[#f1d4d0]"
      : "border-[#cfd8cf] focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-36 w-full rounded-md border bg-white px-3 py-2 font-mono text-sm text-[#16201b] shadow-sm outline-none transition",
    hasError
      ? "border-[#b9473d] focus:ring-2 focus:ring-[#f1d4d0]"
      : "border-[#cfd8cf] focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-[#b9473d]">{message}</p>;
}

export function AiExtractionForm({
  action,
  fileOptions,
  initialValues,
  submitLabel,
  lockFile = false,
}: AiExtractionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="rounded-lg border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28] shadow-sm">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[#607167]">
              Analiz hazırlığı
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#16201b]">AI analiz kaydı</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#647067]">
              Dosyayı seçin, gerekirse çıkarılan metni ve JSON sonucunu kontrol edin. Kaydetme
              işlemi yalnızca analiz kaydını günceller; fatura veya cari bilgisi siz onaylamadan
              değişmez.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 text-[#647067]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1f6f54]" />
            <p>
              Önerilen akış: dosyayı yükle, metni çıkar, alanları kontrol et, cari eşleşmesini
              doğrula ve son olarak kaydı fatura akışına aktar.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[#46534b]">
            Dosya
            <select
              name="fileAttachmentId"
              defaultValue={initialValues?.fileAttachmentId ?? ""}
              className={fieldClass(Boolean(state.errors?.fileAttachmentId))}
              required
              disabled={lockFile}
            >
              <option value="">Dosya seçin</option>
              {fileOptions.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.label}
                </option>
              ))}
            </select>
            {lockFile ? (
              <input
                type="hidden"
                name="fileAttachmentId"
                value={initialValues?.fileAttachmentId ?? ""}
              />
            ) : null}
            <FieldError message={state.errors?.fileAttachmentId} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Durum
            <select
              name="status"
              defaultValue={initialValues?.status ?? "PENDING"}
              className={fieldClass(Boolean(state.errors?.status))}
            >
              {aiExtractionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.status} />
          </label>

          <label className="block text-sm font-medium text-[#46534b]">
            Güven skoru
            <input
              name="confidence"
              type="number"
              min="0"
              max="1"
              step="0.01"
              defaultValue={initialValues?.confidence ?? ""}
              className={fieldClass(Boolean(state.errors?.confidence))}
              placeholder="0.85"
            />
            <FieldError message={state.errors?.confidence} />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
          Ham çıkarılan metin
          <textarea
            name="rawExtractedText"
            defaultValue={initialValues?.rawExtractedText ?? ""}
            className={textareaClass(Boolean(state.errors?.rawExtractedText))}
            placeholder="MarkItDown tarafından çıkarılan metin burada görüntülenir."
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
          Çıkarılan JSON
          <textarea
            name="extractedJson"
            defaultValue={initialValues?.extractedJson ?? ""}
            className={textareaClass(Boolean(state.errors?.extractedJson))}
            placeholder='{"invoiceNumber":"..."}'
          />
          <FieldError message={state.errors?.extractedJson} />
        </label>

        <label className="mt-4 block text-sm font-medium text-[#46534b]">
          Hata mesajı
          <textarea
            name="errorMessage"
            defaultValue={initialValues?.errorMessage ?? ""}
            className={textareaClass(Boolean(state.errors?.errorMessage))}
            placeholder="Varsa kullanıcıya gösterilecek kısa ve anlaşılır hata notu."
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1f6f54] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#d8eadf] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}