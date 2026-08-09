"use client";

import { useActionState, useMemo } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import {
  confirmCrmImportAction,
  previewCrmImportAction,
  type CrmImportActionState,
} from "@/app/(dashboard)/crm/import/actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { crmCompanyStatusLabels } from "@/lib/crm-company-utils";
import type { CrmImportRow } from "@/lib/crm-import-utils";

const initialState: CrmImportActionState = {};

function resultTone(result: CrmImportRow["result"]) {
  if (result === "create") {
    return "positive" as const;
  }

  if (result === "error") {
    return "danger" as const;
  }

  return "warning" as const;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function AlertMessage({ state }: { state: CrmImportActionState }) {
  if (!state.message && !state.error) {
    return null;
  }

  return (
    <div
      className={[
        "rounded-md border px-4 py-3 text-sm font-medium",
        state.error
          ? "border-[#e2cfcb] bg-[#fff9f7] text-[#8b2f28]"
          : "border-[#cfe0d5] bg-[#f6faf7] text-[#14543f]",
      ].join(" ")}
    >
      {state.error ?? state.message}
    </div>
  );
}

export function CrmImportForm() {
  const [previewState, previewAction, isPreviewPending] = useActionState(
    previewCrmImportAction,
    initialState,
  );
  const [confirmState, confirmAction, isConfirmPending] = useActionState(
    confirmCrmImportAction,
    initialState,
  );
  const importableRows = useMemo(
    () => previewState.preview?.rows.filter((row) => row.result === "create") ?? [],
    [previewState.preview],
  );
  const payload = useMemo(() => JSON.stringify(importableRows), [importableRows]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              CSV dosyası yükle
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Önce dosyayı ön izleyin. Kayıtlar siz onaylamadan veritabanına yazılmaz.
            </p>
          </div>
          <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
            Excel dosyanızı CSV olarak dışa aktarıp yükleyebilirsiniz.
          </div>
        </div>

        <form action={previewAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--card-soft)] px-3 text-sm text-[var(--foreground)]">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--card)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)]"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isPreviewPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {isPreviewPending ? "Ön izleniyor" : "Ön İzle"}
          </button>
        </form>

        <div className="mt-4 rounded-md bg-[var(--card-soft)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
          Beklenen kolonlar: Firma Adı, Ülke, E-posta, Web Sitesi, Yetkili Kişi,
          Telefon, Sektör, Kaynak, Durum, Cevap Durumu, Son İletişim Tarihi, Takip
          Tarihi, Etiketler, Notlar.
        </div>
      </section>

      <AlertMessage state={previewState} />
      <AlertMessage state={confirmState} />

      {confirmState.importSummary ? (
        <section className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f6faf7] text-[#14543f]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                İçe aktarma özeti
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {confirmState.importSummary.added} kayıt eklendi,{" "}
                {confirmState.importSummary.duplicateSkipped} tekrar kayıt atlandı.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {previewState.preview ? (
        <section className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--card)] p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Toplam satır" value={previewState.preview.summary.totalRows} />
            <SummaryCard label="Eklenecek" value={previewState.preview.summary.toAdd} />
            <SummaryCard label="Tekrar kayıt" value={previewState.preview.summary.duplicates} />
            <SummaryCard label="Hatalı satır" value={previewState.preview.summary.invalidRows} />
          </div>

          <div className="overflow-hidden rounded-md border border-[var(--line)]">
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
                <thead className="bg-[var(--card-soft)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Satır</th>
                    <th className="px-4 py-3">Firma</th>
                    <th className="px-4 py-3">Ülke</th>
                    <th className="px-4 py-3">E-posta</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Sonuç</th>
                    <th className="px-4 py-3">Uyarı / hata</th>
                  </tr>
                </thead>
                <tbody>
                  {previewState.preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3 text-[var(--muted)]">{row.rowNumber}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                        {row.companyName || "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.country || "-"}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.email || "-"}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {crmCompanyStatusLabels[row.status]}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={resultTone(row.result)}>{row.resultLabel}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                        {[...row.errors, ...row.warnings, row.duplicateReason]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form action={confirmAction} className="flex justify-end">
            <input type="hidden" name="payload" value={payload} />
            <button
              type="submit"
              disabled={isConfirmPending || importableRows.length === 0}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConfirmPending ? "Aktarılıyor" : "Eklenecek Satırları Aktar"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
