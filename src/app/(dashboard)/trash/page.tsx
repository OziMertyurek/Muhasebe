import Link from "next/link";
import { ArchiveRestore, Ban, ExternalLink, Info, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { restoreTrashRecordAction } from "@/app/(dashboard)/trash/actions";
import {
  formatDeletedRecord,
  getDeletedRecords,
  getTrashType,
  getTrashTypeLabel,
  trashTabs,
} from "@/lib/trash-utils";

type TrashPageProps = {
  searchParams?: Promise<{
    type?: string;
    restored?: string;
    error?: string;
  }>;
};

export default async function TrashPage({ searchParams }: TrashPageProps) {
  const params = await searchParams;
  const selectedType = getTrashType(params?.type);
  const { counts, records } = await getDeletedRecords(selectedType);
  const formattedRecords = records.map(formatDeletedRecord);
  const totalCount = trashTabs.reduce((total, tab) => total + counts[tab.type], 0);
  const selectedTab = selectedType
    ? trashTabs.find((tab) => tab.type === selectedType)
    : undefined;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Ayarlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Çöp Kutusu
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Silinen kayıtları burada görebilir ve ihtiyaç olduğunda geri
            yükleyebilirsiniz. Kalıcı silme bu aşamada kapalıdır.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
        >
          Ayarlara dön
        </Link>
      </section>

      {params?.restored === "1" ? (
        <div className="rounded-md border border-[#b8d9c8] bg-[#f0faf4] px-4 py-3 text-sm font-medium text-[#14543f]">
          Kayıt başarıyla geri yüklendi.
        </div>
      ) : null}

      {params?.error ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          {params.error === "unsupported"
            ? "Bu kayıt tipi için geri yükleme bu aşamada desteklenmiyor."
            : "Kayıt geri yüklenirken bir hata oluştu."}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <TrashTab href="/trash" label="Tümü" active={!selectedType} count={totalCount} />
          {trashTabs.map((tab) => (
            <TrashTab
              key={tab.type}
              href={`/trash?type=${tab.type}`}
              label={tab.label}
              active={selectedType === tab.type}
              count={counts[tab.type]}
              muted={!tab.supported}
            />
          ))}
        </div>
      </section>

      {selectedTab && !selectedTab.supported ? (
        <section className="rounded-lg border border-[#eadcb8] bg-[#fffaf0] p-5 text-sm text-[#765c19] shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-semibold">{selectedTab.label} için not</h2>
              <p className="mt-2 leading-6">
                Bu kayıt tipinde şu anda soft delete alanı bulunmadığı için veritabanı
                şeması değiştirilmeden çöp kutusuna dahil edilmedi. Fiziksel dosyalar
                silinmez; dosya ve AI kayıtları için geri yüklenebilir silme sonraki
                güvenli migration aşamasında ele alınabilir.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {formattedRecords.length === 0 ? (
          <EmptyState
            title={
              selectedType
                ? `${getTrashTypeLabel(selectedType)} için silinen kayıt yok`
                : "Çöp kutusunda kayıt yok"
            }
            description="Silinen kayıtlar normal listelerden gizlenir ve gerektiğinde buradan geri yüklenebilir."
            icon={Trash2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Kayıt tipi</th>
                  <th className="px-4 py-3">Başlık / açıklama</th>
                  <th className="px-4 py-3">Silinme tarihi</th>
                  <th className="px-4 py-3">Kısa bilgi</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {formattedRecords.map((record) => (
                  <tr key={`${record.type}-${record.id}`} className="border-t border-[#e5e9e5] transition hover:bg-[#fbfcfa]">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[#edf2ef] px-2.5 py-1 text-xs font-semibold text-[#46534b]">
                        {record.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#16201b]">{record.title}</p>
                      <p className="mt-1 text-xs text-[#647067]">{record.id}</p>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{record.deletedAtLabel}</td>
                    <td className="px-4 py-3 text-[#46534b]">{record.description || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {record.detailHref ? (
                          <Link
                            href={record.detailHref}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                            title="Detay"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        ) : null}
                        {record.canRestore ? (
                          <form action={restoreTrashRecordAction.bind(null, record.type, record.id)}>
                            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-[#b8d9c8] bg-[#f4fbf6] px-3 text-sm font-semibold text-[#14543f] transition hover:border-[#8ebf9f]">
                              <ArchiveRestore className="h-4 w-4" />
                              Geri Yükle
                            </button>
                          </form>
                        ) : null}
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e9e5] px-3 text-sm font-semibold text-[#8a918b]"
                          disabled
                          title="Kalıcı silme sonraki aşamada dikkatli şekilde eklenecek."
                        >
                          <Ban className="h-4 w-4" />
                          Kalıcı silme yok
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TrashTab({
  href,
  label,
  active,
  count,
  muted = false,
}: {
  href: string;
  label: string;
  active: boolean;
  count: number;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
        active
          ? "border-[#1f6f54] bg-[#e8f2ed] text-[#14543f]"
          : "border-[#dce2dc] bg-white text-[#46534b] hover:border-[#aebdae]",
        muted ? "opacity-75" : "",
      ].join(" ")}
    >
      {label}
      <span className="rounded-full bg-[#f1f4f1] px-2 py-0.5 text-xs text-[#607167]">
        {count}
      </span>
    </Link>
  );
}
