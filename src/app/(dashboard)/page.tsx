import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  FilePlus2,
  Plus,
  ReceiptText,
  Inbox,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { GuidedTourButton } from "@/components/ui/guided-tour";
import {
  formatBackupReminderDate,
  getBackupReminderStatus,
} from "@/lib/backup-reminder-utils";
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
  unpaidInvoices: FilePlus2,
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

function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-[#d8e0d9] bg-[#fbfcfa] px-5 py-7 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#eef4ef] text-[#607167]">
        <Inbox className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#223028]">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const [dashboard, backupReminder] = await Promise.all([
    getDashboardData(),
    getBackupReminderStatus(),
  ]);
  const { cards, lists } = dashboard;

  const dashboardStats = [
    {
      id: "receivable" as const,
      title: "Toplam alacak",
      value: <MoneyLines items={cards.receivables} />,
      description: "Tahsil edilmeyi bekleyen bakiye.",
      tone: "positive" as const,
    },
    {
      id: "payable" as const,
      title: "Toplam borç",
      value: <MoneyLines items={cards.payables} />,
      description: "Ödemeyi bekleyen bakiye.",
      tone: "danger" as const,
    },
    {
      id: "net" as const,
      title: "Net durum",
      value: <MoneyLines items={cards.net} signed />,
      description: "Alacak ve borç farkı.",
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
  ];

  const quickActions = [
    {
      title: "Yeni Cari",
      href: "/companies/new",
      icon: Building2,
      description: "Müşteri veya tedarikçi.",
    },
    {
      title: "Yeni Fatura",
      href: "/invoices/new",
      icon: FilePlus2,
      description: "Satış veya alış faturası.",
    },
    {
      title: "Tahsilat / Ödeme",
      href: "/payments/new",
      icon: ArrowDownLeft,
      description: "Cari hareketi kaydet.",
    },
    {
      title: "Yeni Gider",
      href: "/expenses/new",
      icon: ReceiptText,
      description: "Gider kaydı oluştur.",
    },
  ];

  return (
    <div className="space-y-6">
      <section
        data-tour="dashboard-summary"
        className="rounded-lg border border-[#dce2dc] bg-white p-5 lg:flex lg:items-center lg:justify-between lg:gap-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#16201b]">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Alacak, borç, vade ve son hareketlerin kısa özeti.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 lg:mt-0 lg:justify-end">
          <Link
            href="/invoices/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <FilePlus2 className="h-4 w-4" />
            Yeni Fatura
          </Link>
          <GuidedTourButton compact />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5">
          <h2 className="text-base font-semibold text-[#16201b]">Hızlı işlemler</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-3 py-3 text-left transition hover:border-[#8ea99b] hover:bg-white"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#14543f]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#647067]">
                    {action.description}
                  </span>
                </span>
              </Link>
            );
          })}
          </div>
        </div>

        <div data-tour="backup" className="rounded-lg border border-[#dce2dc] bg-white p-5">
          <h2 className="text-base font-semibold text-[#16201b]">Durum</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0ed] pb-3">
              <span className="text-[#647067]">Veri</span>
              <span className="font-semibold text-[#223028]">Yerel</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0ed] pb-3">
              <span className="text-[#647067]">Güvenlik</span>
              <span className="font-semibold text-[#223028]">PIN aktif</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#647067]">Yedek</span>
              <span className="max-w-52 text-right font-semibold text-[#223028]">
                {backupReminder.tone === "warning" ? "Kontrol önerilir" : "Güncel"}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-[#fbfcfa] px-3 py-2 text-xs text-[#647067]">
            <span>Son yedek: {formatBackupReminderDate(backupReminder.lastFullBackupAt)}</span>
            <Link href="/settings/backup" className="font-semibold text-[#1f6f54] hover:text-[#195d47]">
              Aç
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Son 5 fatura</h2>
          <div className="mt-5 space-y-3">
            {lists.recentInvoices.length === 0 ? (
              <EmptyState
                text="Henüz fatura kaydı yok"
                action={
                  <Link
                    href="/invoices/new"
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
                  >
                    İlk faturayı ekle
                  </Link>
                }
              />
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
              <EmptyState
                text="Henüz ödeme veya tahsilat yok"
                action={
                  <Link
                    href="/payments/new"
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
                  >
                    İlk hareketi ekle
                  </Link>
                }
              />
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
              <EmptyState
                text="Henüz gider kaydı yok"
                action={
                  <Link
                    href="/expenses/new"
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
                  >
                    İlk gideri ekle
                  </Link>
                }
              />
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
              <EmptyState
                text="Yaklaşan hatırlatma yok"
                action={
                  <Link
                    href="/important-dates/new"
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
                  >
                    Hatırlatma ekle
                  </Link>
                }
              />
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
