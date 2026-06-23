import Link from "next/link";
import { Eye, History, Search } from "lucide-react";
import { HelpHint } from "@/components/ui/help-hint";
import { EmptyState } from "@/components/ui/empty-state";
import {
  auditActionOptions,
  auditEntityTypeOptions,
  formatAuditAction,
  formatAuditDate,
  formatAuditEntityType,
  getAuditEntityHref,
  getAuditLogs,
} from "@/lib/audit-log-utils";

type AuditLogsPageProps = {
  searchParams?: Promise<{
    q?: string;
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const params = await searchParams;
  const logs = await getAuditLogs({
    query: params?.q,
    entityType: params?.entityType,
    action: params?.action,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <p className="text-sm font-medium text-[#607167]">Ayarlar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          İşlem Geçmişi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Sistemde yapılan önemli işlemleri, geri yüklemeleri, yedekleme
          hareketlerini ve kayıt değişikliklerini buradan takip edin.
        </p>
      </section>

      <HelpHint
        title="Islem gecmisi icin ipucu"
        items={[
          "Onemli kayit, yedekleme ve restore islemlerini buradan izleyin.",
          "Filtrelerle belirli islem tiplerini daha hizli bulun.",
          "Supheli bir durumda son hareketleri kontrol edin.",
        ]}
      />

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={params?.q ?? ""}
              placeholder="Başlık, açıklama veya kayıt ID ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="entityType"
            defaultValue={params?.entityType ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm kayıt tipleri</option>
            {auditEntityTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="action"
            defaultValue={params?.action ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm işlemler</option>
            {auditActionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="dateFrom"
            defaultValue={params?.dateFrom ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          />
          <input
            type="date"
            name="dateTo"
            defaultValue={params?.dateTo ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          />
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae] focus:outline-none focus:ring-2 focus:ring-[#d8eadf]">
            Filtrele
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {logs.length === 0 ? (
          <EmptyState
            title="Henüz işlem kaydı yok"
            description="Yedekleme, geri yükleme, kayıt oluşturma ve önemli değişiklikler yapıldıkça burada listelenir."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">İşlem</th>
                  <th className="px-4 py-3">Kayıt tipi</th>
                  <th className="px-4 py-3">Başlık</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3">İlgili kayıt</th>
                  <th className="px-4 py-3 text-right">Detay</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const entityHref = getAuditEntityHref(log);

                  return (
                    <tr key={log.id} className="border-t border-[#e5e9e5]">
                      <td className="px-4 py-3 text-[#46534b]">{formatAuditDate(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[#edf2ef] px-2.5 py-1 text-xs font-semibold text-[#46534b]">
                          {formatAuditAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {formatAuditEntityType(log.entityType)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#16201b]">{log.title}</td>
                      <td className="px-4 py-3 text-[#46534b]">{log.description ?? "-"}</td>
                      <td className="px-4 py-3 text-[#46534b]">
                        {entityHref ? (
                          <Link className="font-semibold text-[#1f6f54]" href={entityHref}>
                            Kaydı aç
                          </Link>
                        ) : (
                          log.entityId ?? "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Link
                            href={`/audit-logs/${log.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
