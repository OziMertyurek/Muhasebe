import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  formatAuditAction,
  formatAuditDate,
  formatAuditEntityType,
  formatAuditJson,
  getAuditEntityHref,
  getAuditLogById,
} from "@/lib/audit-log-utils";

type AuditLogDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AuditLogDetailPage({ params }: AuditLogDetailPageProps) {
  const { id } = await params;
  const log = await getAuditLogById(id);

  if (!log) {
    notFound();
  }

  const entityHref = getAuditEntityHref(log);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/audit-logs"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            İşlem geçmişine dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">İşlem detayı</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {log.title}
          </h1>
        </div>
        {entityHref ? (
          <Link
            href={entityHref}
            className="inline-flex h-10 w-fit items-center rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            İlgili kaydı aç
          </Link>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-3">
        <InfoItem label="İşlem tarihi" value={formatAuditDate(log.createdAt)} />
        <InfoItem label="Kayıt tipi" value={formatAuditEntityType(log.entityType)} />
        <InfoItem label="Kayıt ID" value={log.entityId ?? "-"} />
        <InfoItem label="İşlem tipi" value={formatAuditAction(log.action)} />
        <InfoItem label="Başlık" value={log.title} />
        <InfoItem label="Açıklama" value={log.description ?? "-"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <JsonPanel title="Önceki veri JSON" value={log.beforeJson} />
        <JsonPanel title="Sonraki veri JSON" value={log.afterJson} />
        <JsonPanel title="Metadata JSON" value={log.metadataJson} />
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

function JsonPanel({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#16201b]">{title}</h2>
      <pre className="mt-4 max-h-[520px] overflow-auto rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 text-xs leading-5 text-[#223028]">
        <code>{formatAuditJson(value)}</code>
      </pre>
    </div>
  );
}
