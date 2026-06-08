"use client";

import type { AiExtractionStatus } from "@prisma/client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import type {
  AiExtractionFormState,
} from "@/app/(dashboard)/ai-extraction/actions";
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
    "mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
  ].join(" ");
}

function textareaClass(hasError?: boolean) {
  return [
    "mt-2 min-h-36 w-full rounded-md border bg-white px-3 py-2 font-mono text-sm text-[#16201b] outline-none transition",
    hasError ? "border-[#b9473d]" : "border-[#cfd8cf] focus:border-[#1f6f54]",
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
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">AI analiz kaydı</h2>

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
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor" : submitLabel}
        </button>
      </div>
    </form>
  );
}
