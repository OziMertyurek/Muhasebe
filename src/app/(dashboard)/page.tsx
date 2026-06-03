import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  FileWarning,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { dashboardStats, recentActions, upcomingDates } from "@/lib/mock-data";

const statIcons = {
  receivable: ArrowDownLeft,
  payable: ArrowUpRight,
  net: WalletCards,
  unpaidInvoices: FileWarning,
  monthlyExpenses: ReceiptText,
  upcomingDates: CalendarClock,
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Genel bakış</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Finans durumu
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Fatura, tahsilat, ödeme ve hatırlatmaları sade bir yerel panelden takip edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]">
            <ArrowDownLeft className="h-4 w-4" />
            Para aldım
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]">
            <ReceiptText className="h-4 w-4" />
            Gider ekle
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            tone={stat.tone}
            icon={statIcons[stat.id]}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">Hızlı işlemler</h2>
              <p className="mt-1 text-sm text-[#647067]">
                En sık kullanılacak kayıt türleri için başlangıç alanı.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recentActions.map((action) => (
              <button
                key={action.title}
                className="flex min-h-24 flex-col items-start justify-between rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 text-left transition hover:border-[#8ea99b] hover:bg-white"
              >
                <span className="text-sm font-semibold text-[#223028]">{action.title}</span>
                <span className="mt-2 text-sm leading-5 text-[#647067]">{action.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">
                Yaklaşan önemli tarihler
              </h2>
              <p className="mt-1 text-sm text-[#647067]">Bu hafta ve bu ay dikkat edilecekler.</p>
            </div>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
              <CalendarClock className="h-4 w-4" />
              Hatırlatma ekle
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingDates.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between gap-4 rounded-md border border-[#e5e9e5] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#223028]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#647067]">{item.detail}</p>
                </div>
                <span className="shrink-0 rounded-md bg-[#eef5f1] px-3 py-1 text-sm font-semibold text-[#1f6f54]">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
