import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { CrmImportForm } from "@/components/crm/crm-import-form";
import { HelpHint } from "@/components/ui/help-hint";

export default function CrmImportPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/crm"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Firma takibe dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[var(--muted)]">Firma Takip</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[var(--foreground)]">
            CSV içe aktar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--muted)]">
            Excel listenizi CSV olarak dışa aktarın, tekrar kayıtları ve hatalı satırları
            veritabanına yazmadan önce kontrol edin.
          </p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--card)] text-[var(--muted)]">
          <FileSpreadsheet className="h-5 w-5" />
        </span>
      </section>

      <HelpHint
        title="İçe aktarma ipucu"
        items={[
          "Sadece Firma Adı zorunludur.",
          "E-posta aynıysa kayıt tekrar kabul edilir.",
          "Onay vermeden hiçbir satır kaydedilmez.",
        ]}
        href="/help"
      />

      <CrmImportForm />
    </div>
  );
}
