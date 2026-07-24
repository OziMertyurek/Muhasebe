import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  DatabaseBackup,
  FilePlus2,
  FileWarning,
  HelpCircle,
  Inbox,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
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

export const dynamic = "force-dynamic";

const metricIcons = {
  receivable: ArrowDownLeft,
  payable: ArrowUpRight,
  net: WalletCards,
  unpaidInvoices: FileWarning,
};

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
    <span className="block min-w-0 space-y-1">
      {items.map((item) => (
        <span key={item.currency} className="block truncate">
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
    <span className="inline-flex max-w-full flex-wrap gap-x-2 gap-y-1">
      {items.map((item) => (
        <span key={item.currency} className="whitespace-nowrap">
          {item.currency}: {formatDashboardMoney(item.amount, item.currency)}
        </span>
      ))}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-normal text-[#607167]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold text-[#16201b]">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed border-[#d8e0d9] bg-[#fbfcfa] px-4 py-6 text-center">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#eef4ef] text-[#607167]">
        <Inbox className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#223028]">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function DashboardPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: ReactNode;
  description: ReactNode;
  tone: "positive" | "warning" | "neutral" | "danger";
  icon: keyof typeof metricIcons;
}) {
  const Icon = metricIcons[icon];
  const toneClasses = {
    positive: "border-[#b9d8c7] bg-[#f8fcf9] text-[#14543f]",
    warning: "border-[#ead7a8] bg-[#fffaf0] text-[#765116]",
    neutral: "border-[#dce2dc] bg-white text-[#34445c]",
    danger: "border-[#e0c4bf] bg-[#fff8f6] text-[#8b2f28]",
  };

  return (
    <article className="min-w-0 rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#607167]">{title}</p>
          <p className="mt-2 min-w-0 text-xl font-semibold leading-tight tracking-normal text-[#16201b]">
            {value}
          </p>
        </div>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${toneClasses[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-[#647067]">{description}</p>
    </article>
  );
}

function AttentionItem({
  title,
  value,
  description,
  href,
  tone = "neutral",
  dataTour,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
  tone?: "warning" | "positive" | "neutral";
  dataTour?: string;
}) {
  const toneClasses = {
    warning: "border-[#ead7a8] bg-[#fffaf0]",
    positive: "border-[#b9d8c7] bg-[#f8fcf9]",
    neutral: "border-[#dce2dc] bg-white",
  };

  return (
    <Link
      href={href}
      data-tour={dataTour}
      className={`block min-w-0 rounded-lg border p-4 shadow-sm transition hover:border-[#8ea99b] ${toneClasses[tone]}`}
    >
      <p className="truncate text-sm font-medium text-[#607167]">{title}</p>
      <p className="mt-2 truncate text-xl font-semibold text-[#16201b]">{value}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#647067]">{description}</p>
    </Link>
  );
}

function ListLink({
  href,
  title,
  meta,
  trailing,
}: {
  href: string;
  title: string;
  meta: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-[#e5e9e5] px-3 py-2.5 transition hover:border-[#aebdae]"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#223028]">{title}</p>
          <p className="mt-1 min-w-0 truncate text-xs text-[#647067]">{meta}</p>
        </div>
        {trailing ? (
          <span className="shrink-0 text-right text-sm font-semibold text-[#16201b]">
            {trailing}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const [dashboard, backupReminder] = await Promise.all([
    getDashboardData(),
    getBackupReminderStatus(),
  ]);
  const { cards, lists } = dashboard;

  const financialStats = [
    {
      id: "receivable" as const,
      title: "Toplam alacak",
      value: <MoneyLines items={cards.receivables} />,
      description: "Tahsilatlar düşüldükten sonra kalan satış faturası tutarı.",
      tone: "positive" as const,
    },
    {
      id: "payable" as const,
      title: "Toplam borç",
      value: <MoneyLines items={cards.payables} />,
      description: "Ödemeler düşüldükten sonra kalan alış faturası tutarı.",
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
      id: "unpaidInvoices" as const,
      title: "Ödenmemiş faturalar",
      value: `${cards.unpaidInvoiceCount} adet`,
      description: (
        <>
          Kalan: <SmallMoneyLines items={cards.unpaidInvoiceRemaining} />
        </>
      ),
      tone: "warning" as const,
    },
  ];

  const quickActions = [
    {
      title: "Yeni Fatura",
      href: "/invoices/new",
      icon: FilePlus2,
    },
    {
      title: "Para Aldım / Ödedim",
      href: "/payments/new",
      icon: ArrowDownLeft,
    },
    {
      title: "Yeni Gider",
      href: "/expenses/new",
      icon: ReceiptText,
    },
    {
      title: "Yeni Cari",
      href: "/companies/new",
      icon: Building2,
    },
    {
      title: "Hatırlatma",
      href: "/important-dates/new",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="space-y-5">
      <section
        data-tour="dashboard-summary"
        className="flex flex-col gap-4 border-b border-[#dce2dc] pb-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#607167]">Genel bakış</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#16201b] md:text-3xl">
            Finans durumu
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Bugünkü işleri, yaklaşan vadeleri ve para durumunu tek ekranda kontrol edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GuidedTourButton compact />
          <Link
            href="/help#baslangic"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#46534b] shadow-sm transition hover:border-[#8ea99b] hover:text-[#16201b]"
          >
            <HelpCircle className="h-4 w-4" />
            Yardım
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const primary = index === 0;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={
                primary
                  ? "inline-flex h-12 min-w-0 items-center gap-3 rounded-lg bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
                  : "inline-flex h-12 min-w-0 items-center gap-3 rounded-lg border border-[#dce2dc] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#8ea99b]"
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.title}</span>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <AttentionItem
          title="Bu hafta vadesi gelen"
          value={`${lists.dueInvoicesThisWeek.length} fatura`}
          description="Ödenmemiş veya kısmi ödenmiş faturaları kontrol edin."
          href="/reports/due-invoices?view=7"
          tone={lists.dueInvoicesThisWeek.length > 0 ? "warning" : "positive"}
        />
        <AttentionItem
          title="Bekleyen hatırlatmalar"
          value={`${cards.upcomingImportantDateCount} yaklaşan`}
          description={`${cards.overdueImportantDateCount} geciken bekleyen hatırlatma var.`}
          href="/important-dates?status=PENDING"
          tone={cards.overdueImportantDateCount > 0 ? "warning" : "neutral"}
        />
        <AttentionItem
          title="Yedek durumu"
          value={backupReminder.isDue ? "Yedek önerilir" : "Güncel"}
          description={backupReminder.message}
          href="/settings/backup"
          tone={backupReminder.tone === "warning" ? "warning" : "positive"}
          dataTour="backup"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {financialStats.map((stat) => (
          <MetricCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            tone={stat.tone}
            icon={stat.id}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel>
          <SectionHeader
            eyebrow="Yaklaşan işler"
            title="Bu hafta vadesi gelen faturalar"
          />
          <div className="mt-4 space-y-2.5">
            {lists.dueInvoicesThisWeek.length === 0 ? (
              <EmptyState text="Bu hafta vadesi gelen fatura yok" />
            ) : (
              lists.dueInvoicesThisWeek.map((invoice) => (
                <ListLink
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  title={invoice.invoiceNumber}
                  meta={`${invoice.companyName} - ${
                    invoice.dueDate ? formatDate(invoice.dueDate) : "-"
                  }`}
                  trailing={formatDashboardMoney(invoice.remainingAmount, invoice.currency)}
                />
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel>
          <SectionHeader
            eyebrow="Yaklaşan işler"
            title="Önemli tarihler"
            action={
              <Link
                href="/important-dates/new"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
              >
                <Plus className="h-4 w-4" />
                Ekle
              </Link>
            }
          />
          <div className="mt-4 space-y-2.5">
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
                <ListLink
                  key={item.id}
                  href={`/important-dates/${item.id}`}
                  title={item.title}
                  meta={`${importantDateCategoryLabels[item.category]} - ${priorityLabels[item.priority]}`}
                  trailing={
                    <>
                      <span className="block">{formatDate(item.date)}</span>
                      {item.time ? (
                        <span className="mt-1 block text-xs font-medium text-[#647067]">
                          {item.time}
                        </span>
                      ) : null}
                    </>
                  }
                />
              ))
            )}
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel>
        <SectionHeader eyebrow="Son hareketler" title="Son hareketler" />
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#223028]">Son faturalar</h3>
            <div className="mt-3 space-y-2.5">
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
                  <ListLink
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    title={invoice.invoiceNumber}
                    meta={`${invoice.company.name} - ${invoiceTypeLabels[invoice.type]} - ${
                      invoiceStatusLabels[invoice.status]
                    }`}
                    trailing={formatDashboardMoney(invoice.totalAmount, invoice.currency)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#223028]">
              Son ödeme/tahsilat
            </h3>
            <div className="mt-3 space-y-2.5">
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
                  <ListLink
                    key={payment.id}
                    href={`/payments/${payment.id}`}
                    title={paymentTypeLabels[payment.type]}
                    meta={`${
                      payment.company?.name ?? payment.invoice?.invoiceNumber ?? "Genel hareket"
                    } - ${formatDate(payment.paymentDate)}`}
                    trailing={formatDashboardMoney(payment.amount, payment.currency)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#223028]">Son giderler</h3>
            <div className="mt-3 space-y-2.5">
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
                  <ListLink
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    title={expense.title}
                    meta={`${
                      expense.category?.name ?? expense.company?.name ?? "Kategori yok"
                    } - ${expenseStatusLabels[expense.status]} - ${formatDate(expense.expenseDate)}`}
                    trailing={formatDashboardMoney(expense.amount, expense.currency)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </DashboardPanel>

      <section className="grid gap-3 lg:grid-cols-4">
        <DashboardPanel className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={
                  backupReminder.tone === "warning"
                    ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#fff4dc] text-[#765116]"
                    : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]"
                }
              >
                <DatabaseBackup className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#16201b]">Yedek durumu</p>
                <p className="mt-1 truncate text-sm text-[#647067]">
                  Son tam yedek: {formatBackupReminderDate(backupReminder.lastFullBackupAt)}
                </p>
              </div>
            </div>
            <Link
              href="/settings/backup"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
            >
              Yedekleme
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel>
          <p className="text-sm font-medium text-[#607167]">Bu ayki giderler</p>
          <div className="mt-2 text-lg font-semibold text-[#16201b]">
            <MoneyLines items={cards.monthlyExpenses} />
          </div>
          <p className="mt-2 text-sm text-[#647067]">
            Ödenen: <SmallMoneyLines items={cards.monthlyPaidExpenses} />
          </p>
        </DashboardPanel>

        <DashboardPanel>
          <p className="text-sm font-medium text-[#607167]">Sabit gider / cari</p>
          <p className="mt-2 text-lg font-semibold text-[#16201b]">
            {cards.activeRecurringExpenseCount} sabit gider
          </p>
          <p className="mt-2 text-sm text-[#647067]">
            {cards.companyBreakdown.total} cari kaydı
          </p>
        </DashboardPanel>
      </section>
    </div>
  );
}
