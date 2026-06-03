import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  FilePlus2,
  FileWarning,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/company-utils";
import {
  formatDashboardMoney,
  formatDashboardSignedMoney,
  getDashboardData,
} from "@/lib/dashboard-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import {
  importantDateCategoryLabels,
  priorityLabels,
} from "@/lib/important-date-utils";
import { invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentTypeLabels } from "@/lib/payment-utils";

const statIcons = {
  receivable: ArrowDownLeft,
  payable: ArrowUpRight,
  net: WalletCards,
  unpaidInvoices: FileWarning,
  monthlyExpenses: ReceiptText,
  upcomingDates: CalendarClock,
};

export const dynamic = "force-dynamic";

function MoneyLines({
  items,
  signed = false,
}: {
  items: Array<{ currency: string; amount: { toNumber: () => number } }>;
  signed?: boolean;
}) {
  if (items.length === 0) {
    return <span>0</span>;
  }

  return (
    <span className="block space-y-1">
      {items.map((item) => (
        <span key={item.currency} className="block">
          {item.currency}:{" "}
          {signed
            ? formatDashboardSignedMoney(item.amount, item.currency)
            : formatDashboardMoney(item.amount, item.currency)}
        </span>
      ))}
    </span>
  );
}

function SmallMoneyLines({
  items,
}: {
  items: Array<{ currency: string; amount: { toNumber: () => number } }>;
}) {
  if (items.length === 0) {
    return <span>Kayıt yok</span>;
  }

  return (
    <span className="space-x-2">
      {items.map((item) => (
        <span key={item.currency}>
          {item.currency}: {formatDashboardMoney(item.amount, item.currency)}
        </span>
      ))}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-4 py-5 text-sm text-[#647067]">
      {text}
    </div>
  );
}

export default async function DashboardPage() {
  const dashboard = await getDashboardData();
  const { cards, lists } = dashboard;

  const dashboardStats = [
    {
      id: "receivable" as const,
      title: "Toplam alacak",
      value: <MoneyLines items={cards.receivables} />,
      description: "Satış faturalarından tahsilatlar düşüldükten sonra kalan tutar.",
      tone: "positive" as const,
    },
    {
      id: "payable" as const,
      title: "Toplam borç",
      value: <MoneyLines items={cards.payables} />,
      description: "Alış faturalarından ödemeler düşüldükten sonra kalan tutar.",
      tone: "danger" as const,
    },
    {
      id: "net" as const,
      title: "Net durum",
      value: <MoneyLines items={cards.net} signed />,
      description: "Para birimi bazında alacak ve borç farkı.",
      tone: "neutral" as const,
    },
    {
      id: "monthlyExpenses" as const,
      title: "Bu ayki giderler",
      value: <MoneyLines items={cards.monthlyExpenses} />,
      description: "Bu ay kaydedilen iptal edilmemiş giderlerin toplamı.",
      tone: "neutral" as const,
    },
    {
      id: "unpaidInvoices" as const,
      title: "Ödenmemiş faturalar",
      value: `${cards.unpaidInvoiceCount} adet`,
      description: (
        <>
          Kalan tutar: <SmallMoneyLines items={cards.unpaidInvoiceRemaining} />
        </>
      ),
      tone: "warning" as const,
    },
    {
      id: "upcomingDates" as const,
      title: "Yaklaşan tarihler",
      value: `${cards.upcomingImportantDateCount} kayıt`,
      description: `${cards.overdueImportantDateCount} geciken bekleyen hatırlatma var.`,
      tone: "warning" as const,
    },
  ];

  const quickActions = [
    {
      title: "Yeni Cari",
      href: "/companies/new",
      icon: Building2,
      description: "Müşteri veya tedarikçi kaydı oluşturun.",
    },
    {
      title: "Yeni Fatura",
      href: "/invoices/new",
      icon: FilePlus2,
      description: "Ben fatura kestim veya bana fatura kesildi.",
    },
    {
      title: "Para Aldım / Para Ödedim",
      href: "/payments/new",
      icon: ArrowDownLeft,
      description: "Tahsilat veya ödeme hareketi kaydedin.",
    },
    {
      title: "Yeni Gider",
      href: "/expenses/new",
      icon: ReceiptText,
      description: "Tek seferlik veya ödenmiş gider ekleyin.",
    },
    {
      title: "Yeni Hatırlatma",
      href: "/important-dates/new",
      icon: CalendarClock,
      description: "Vergi, vade veya sözleşme tarihi not alın.",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Genel bakış</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Finans durumu
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Fatura, tahsilat, ödeme, gider ve hatırlatmaları gerçek kayıtlarınızla takip edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/payments/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Para aldım / Para ödedim
          </Link>
          <Link
            href="/expenses/new"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <ReceiptText className="h-4 w-4" />
            Gider ekle
          </Link>
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

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Bu ayki ödenmiş giderler</p>
          <div className="mt-3 text-xl font-semibold text-[#16201b]">
            <MoneyLines items={cards.monthlyPaidExpenses} />
          </div>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Aktif sabit giderler</p>
          <p className="mt-3 text-xl font-semibold text-[#16201b]">
            {cards.activeRecurringExpenseCount} kayıt
          </p>
          <p className="mt-2 text-sm text-[#647067]">
            Aylık toplam: <SmallMoneyLines items={cards.activeRecurringExpenseTotals} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Cari sayısı</p>
          <p className="mt-3 text-xl font-semibold text-[#16201b]">
            {cards.companyBreakdown.total} kayıt
          </p>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            Müşteri: {cards.companyBreakdown.CUSTOMER} · Tedarikçi:{" "}
            {cards.companyBreakdown.SUPPLIER} · İkisi de: {cards.companyBreakdown.BOTH}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Hızlı işlemler</h2>
            <p className="mt-1 text-sm text-[#647067]">
              Sık kullanılan kayıt ekranlarına doğrudan geçin.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-28 flex-col items-start justify-between rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 text-left transition hover:border-[#8ea99b] hover:bg-white"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {action.title}
                  </span>
                  <span className="mt-2 block text-sm leading-5 text-[#647067]">
                    {action.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Son 5 fatura</h2>
          <div className="mt-5 space-y-3">
            {lists.recentInvoices.length === 0 ? (
              <EmptyState text="Kayıt yok" />
            ) : (
              lists.recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#223028]">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="mt-1 text-sm text-[#647067]">{invoice.company.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#16201b]">
                      {formatDashboardMoney(invoice.totalAmount, invoice.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#647067]">
                    {invoiceTypeLabels[invoice.type]} · {invoiceStatusLabels[invoice.status]} ·{" "}
                    {formatDate(invoice.invoiceDate)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Son 5 ödeme/tahsilat</h2>
          <div className="mt-5 space-y-3">
            {lists.recentPayments.length === 0 ? (
              <EmptyState text="Kayıt yok" />
            ) : (
              lists.recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/payments/${payment.id}`}
                  className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#223028]">
                        {paymentTypeLabels[payment.type]}
                      </p>
                      <p className="mt-1 text-sm text-[#647067]">
                        {payment.company?.name ?? payment.invoice?.invoiceNumber ?? "Genel hareket"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#16201b]">
                      {formatDashboardMoney(payment.amount, payment.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#647067]">
                    {formatDate(payment.paymentDate)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Son 5 gider</h2>
          <div className="mt-5 space-y-3">
            {lists.recentExpenses.length === 0 ? (
              <EmptyState text="Kayıt yok" />
            ) : (
              lists.recentExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#223028]">{expense.title}</p>
                      <p className="mt-1 text-sm text-[#647067]">
                        {expense.category?.name ?? expense.company?.name ?? "Kategori yok"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#16201b]">
                      {formatDashboardMoney(expense.amount, expense.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#647067]">
                    {expenseStatusLabels[expense.status]} · {formatDate(expense.expenseDate)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">
                Yaklaşan önemli tarihler
              </h2>
              <p className="mt-1 text-sm text-[#647067]">
                Bugünden itibaren 7 gün içindeki bekleyen hatırlatmalar.
              </p>
            </div>
            <Link
              href="/important-dates/new"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
            >
              <Plus className="h-4 w-4" />
              Ekle
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {lists.upcomingImportantDates.length === 0 ? (
              <EmptyState text="Yaklaşan hatırlatma yok" />
            ) : (
              lists.upcomingImportantDates.map((item) => (
                <Link
                  key={item.id}
                  href={`/important-dates/${item.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#223028]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#647067]">
                      {importantDateCategoryLabels[item.category]} · {priorityLabels[item.priority]}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#eef5f1] px-3 py-1 text-sm font-semibold text-[#1f6f54]">
                    {formatDate(item.date)}
                    {item.time ? ` · ${item.time}` : ""}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">
            Bu hafta vadesi gelen faturalar
          </h2>
          <p className="mt-1 text-sm text-[#647067]">
            Bugün ve önümüzdeki 7 gün içinde vadesi gelen ödenmemiş faturalar.
          </p>
          <div className="mt-5 space-y-3">
            {lists.dueInvoicesThisWeek.length === 0 ? (
              <EmptyState text="Bu hafta vadesi gelen fatura yok" />
            ) : (
              lists.dueInvoicesThisWeek.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#223028]">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="mt-1 text-sm text-[#647067]">{invoice.companyName}</p>
                  </div>
                  <span className="text-right text-sm">
                    <span className="block font-semibold text-[#16201b]">
                      {formatDashboardMoney(invoice.remainingAmount, invoice.currency)}
                    </span>
                    <span className="mt-1 block text-[#647067]">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
