import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  FolderKanban,
  Landmark,
  PieChart,
  WalletCards,
} from "lucide-react";

const reports = [
  {
    title: "Aylık özet",
    description: "Seçilen ay için fatura, ödeme, tahsilat ve gider toplamlarını görün.",
    href: "/reports/monthly-summary",
    icon: CalendarClock,
  },
  {
    title: "Alacak / borç durumu",
    description: "Cari bazlı kalan alacak, kalan borç ve net bakiyeleri inceleyin.",
    href: "/reports/receivables-payables",
    icon: WalletCards,
  },
  {
    title: "Vadesi gelen faturalar",
    description: "Geciken, bu hafta ve önümüzdeki 30 gün vadesi gelen faturaları takip edin.",
    href: "/reports/due-invoices",
    icon: Banknote,
  },
  {
    title: "Gider kategorileri",
    description: "Aylık giderleri kategori bazında ve para birimi ayrımıyla analiz edin.",
    href: "/reports/expense-categories",
    icon: PieChart,
  },
  {
    title: "Kasa & banka özeti",
    description: "Finansal hesapların tahmini bakiyelerini hareketlerle birlikte görün.",
    href: "/reports/accounts-summary",
    icon: Landmark,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <p className="text-sm font-medium text-[#607167]">Raporlar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Finans raporları
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Cari, fatura, ödeme, gider ve hesap kayıtlarını sade raporlarla kontrol edin.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <Link
              key={report.href}
              href={report.href}
              className="group flex min-h-44 flex-col justify-between rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm transition hover:border-[#8ea99b]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-semibold text-[#16201b]">
                  {report.title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#647067]">
                  {report.description}
                </span>
              </span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1f6f54]">
                Raporu aç
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Veri kaynağı</h2>
            <p className="mt-1 text-sm leading-6 text-[#647067]">
              Bu raporlar gerçek Prisma kayıtlarından üretilir. Silinmiş kayıtlar ve iptal
              edilmiş faturalar/giderler hesaplara dahil edilmez.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
