import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
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
import {
  importantDateCategoryLabels,
  priorityLabels,
} from "@/lib/important-date-utils";

export const dynamic = "force-dynamic";

const metricIcons = {
  receivable: ArrowDownLeft,
  payable: ArrowUpRight,
  net: WalletCards,
  liquidAccounts: WalletCards,
};

function MoneyLines({
  items,
  signed = false,
}: {
  items: Array<{ currency: string; amount: { toNumber: () => number } }>;
  signed?: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-[#647067]">Kayıt yok</span>;
  }

  const visibleItems = items.slice(0, 2);
  const remainingCount = items.length - visibleItems.length;

  return (
    <span className="block min-w-0 space-y-1">
      {visibleItems.map((item) => (
        <span
          key={item.currency}
          className="flex min-w-0 flex-wrap items-baseline gap-x-1"
        >
          <span className="shrink-0">{item.currency}:</span>
          <span className="min-w-0 break-all">
            {signed
              ? formatDashboardSignedMoney(item.amount, item.currency)
              : formatDashboardMoney(item.amount, item.currency)}
          </span>
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="block text-sm font-medium text-[#647067]">
          +{remainingCount} para birimi
        </span>
      ) : null}
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
  dataTour,
}: {
  children: ReactNode;
  className?: string;
  dataTour?: string;
}) {
  return (
    <section
      data-tour={dataTour}
      className={`rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm ${className}`}
    >
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
  href,
}: {
  title: string;
  value: ReactNode;
  description: ReactNode;
  tone: "positive" | "warning" | "neutral" | "danger";
  icon: keyof typeof metricIcons;
  href: string;
}) {
  const Icon = metricIcons[icon];
  const toneClasses = {
    positive: "border-[#b9d8c7] bg-[#f8fcf9] text-[#14543f]",
    warning: "border-[#ead7a8] bg-[#fffaf0] text-[#765116]",
    neutral: "border-[#dce2dc] bg-white text-[#34445c]",
    danger: "border-[#e0c4bf] bg-[#fff8f6] text-[#8b2f28]",
  };

  return (
    <Link
      href={href}
      className="block min-w-0 rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm transition hover:border-[#8ea99b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#607167]">{title}</p>
          <p className="mt-2 min-w-0 text-lg font-semibold leading-tight tracking-normal text-[#16201b] xl:text-xl">
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
    </Link>
  );
}

function AttentionItem({
  title,
  value,
  description,
  href,
  severity = "neutral",
  dataTour,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
  severity?: "critical" | "warning" | "info" | "success" | "neutral";
  dataTour?: string;
}) {
  const severityClasses = {
    critical: "border-[#e0c4bf] bg-[#fff8f6]",
    warning: "border-[#ead7a8] bg-[#fffaf0]",
    info: "border-[#c9d7e8] bg-[#f7fbff]",
    success: "border-[#b9d8c7] bg-[#f8fcf9]",
    neutral: "border-[#dce2dc] bg-white",
  };
  const iconClasses = {
    critical: "border-[#e0c4bf] bg-white text-[#8b2f28]",
    warning: "border-[#ead7a8] bg-white text-[#765116]",
    info: "border-[#c9d7e8] bg-white text-[#34445c]",
    success: "border-[#b9d8c7] bg-white text-[#14543f]",
    neutral: "border-[#dce2dc] bg-white text-[#607167]",
  };
  const Icon = severity === "critical" ? AlertTriangle : severity === "success" ? CheckCircle2 : FileWarning;

  return (
    <Link
      href={href}
      data-tour={dataTour}
      className={`block min-w-0 rounded-lg border p-4 shadow-sm transition hover:border-[#8ea99b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc] ${severityClasses[severity]}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#607167]">{title}</p>
          <p className="mt-2 truncate text-xl font-semibold text-[#16201b]">{value}</p>
        </div>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${iconClasses[severity]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#647067]">{description}</p>
    </Link>
  );
}

function AttentionHealthyState() {
  return (
    <div className="rounded-lg border border-[#b9d8c7] bg-[#f8fcf9] p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#b9d8c7] bg-white text-[#14543f]">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#607167]">Dikkat merkezi</p>
          <p className="mt-2 text-xl font-semibold text-[#16201b]">Bugün acil işlem yok</p>
          <p className="mt-2 text-sm leading-5 text-[#647067]">
            Vadesi geçmiş fatura, geciken hatırlatma veya yedek uyarısı bulunmuyor.
          </p>
        </div>
      </div>
    </div>
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
      className="block min-w-0 overflow-hidden rounded-md border border-[#e5e9e5] px-3 py-2.5 transition hover:border-[#aebdae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#223028]">{title}</p>
          <p className="mt-1 min-w-0 truncate text-xs text-[#647067]">{meta}</p>
        </div>
        {trailing ? (
          <span className="max-w-48 break-words text-right text-sm font-semibold text-[#16201b]">
            {trailing}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function formatRelativeDashboardTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Şimdi";
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)} dk önce`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)} saat önce`;
  }

  if (diffMs < 2 * day) {
    return "Dün";
  }

  return `${Math.floor(diffMs / day)} gün önce`;
}

function TimelineRow({
  item,
}: {
  item: {
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    createdAt: Date;
    href: string | null;
  };
}) {
  const content = (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#eef4ef] text-lg"
      >
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#16201b]">{item.title}</p>
            <p className="mt-1 line-clamp-1 text-sm text-[#647067]">{item.subtitle}</p>
          </div>
          <p className="shrink-0 text-xs font-medium text-[#607167]">
            {formatRelativeDashboardTime(item.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );

  if (!item.href) {
    return (
      <div className="min-w-0 rounded-md border border-[#e5e9e5] px-3 py-2.5">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="block min-w-0 rounded-md border border-[#e5e9e5] px-3 py-2.5 transition hover:border-[#aebdae] hover:bg-[#fbfcfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
    >
      {content}
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
      title: "Alacaklar",
      value: <MoneyLines items={cards.receivables} />,
      description: "Kalan satış faturası tutarı.",
      tone: "positive" as const,
      href: "/reports/receivables-payables",
    },
    {
      id: "payable" as const,
      title: "Borçlar",
      value: <MoneyLines items={cards.payables} />,
      description: "Kalan alış faturası tutarı.",
      tone: "danger" as const,
      href: "/reports/receivables-payables",
    },
    {
      id: "net" as const,
      title: "Net Durum",
      value: <MoneyLines items={cards.net} signed />,
      description: "Alacak ve borç farkı.",
      tone: "neutral" as const,
      href: "/reports/receivables-payables",
    },
    {
      id: "liquidAccounts" as const,
      title: "Kasa & Banka Tahmini",
      value: <MoneyLines items={cards.liquidAccountEstimate} signed />,
      description: "Aktif nakit, banka ve döviz hesapları.",
      tone: "positive" as const,
      href: "/reports/accounts-summary",
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
  const attentionItems = [
    cards.overdueSalesInvoiceCount > 0
      ? {
          id: "overdue-sales",
          title: "Geciken tahsilatlar",
          value: `${cards.overdueSalesInvoiceCount} fatura`,
          description: "Vadesi geçmiş satış faturalarını kontrol edin.",
          href: "/reports/due-invoices?view=past&invoiceType=SALES",
          severity: "critical" as const,
        }
      : null,
    cards.overdueImportantDateCount > 0
      ? {
          id: "overdue-reminders",
          title: "Geciken hatırlatmalar",
          value: `${cards.overdueImportantDateCount} kayıt`,
          description: "Bekleyen geçmiş tarihli hatırlatmalar var.",
          href: "/important-dates?status=PENDING&upcoming=past",
          severity: "critical" as const,
        }
      : null,
    cards.overduePurchaseInvoiceCount > 0
      ? {
          id: "overdue-purchases",
          title: "Geciken ödemeler",
          value: `${cards.overduePurchaseInvoiceCount} fatura`,
          description: "Vadesi geçmiş alış faturalarını kontrol edin.",
          href: "/reports/due-invoices?view=past&invoiceType=PURCHASE",
          severity: "warning" as const,
        }
      : null,
    cards.todayInvoiceCount > 0
      ? {
          id: "today-invoices",
          title: "Bugün vadesi gelen faturalar",
          value: `${cards.todayInvoiceCount} fatura`,
          description: "Bugün vadesi dolan açık faturalar var.",
          href: "/reports/due-invoices?view=7",
          severity: "warning" as const,
        }
      : null,
    cards.todayImportantDateCount > 0
      ? {
          id: "today-reminders",
          title: "Bugünkü hatırlatmalar",
          value: `${cards.todayImportantDateCount} kayıt`,
          description: "Bugün takip edilmesi gereken hatırlatmalar var.",
          href: "/important-dates?status=PENDING&upcoming=today",
          severity: "warning" as const,
        }
      : null,
    backupReminder.isDue
      ? {
          id: "backup-due",
          title: "Yedek alınmalı",
          value: "Yedek önerilir",
          description: backupReminder.lastFullBackupAt
            ? "Son tam yedek tarihi kontrol edilmeli."
            : "Henüz tam yedek alınmadı.",
          href: "/settings/backup",
          severity: "warning" as const,
          dataTour: "backup",
        }
      : null,
    cards.failedAiExtractionCount > 0
      ? {
          id: "failed-ai",
          title: "Hatalı AI analizleri",
          value: `${cards.failedAiExtractionCount} kayıt`,
          description: "Kontrol bekleyen hatalı analiz kayıtları var.",
          href: "/ai-extraction?status=FAILED",
          severity: "warning" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const visibleAttentionItems = attentionItems.slice(0, 3);
  const hiddenAttentionCount = attentionItems.length - visibleAttentionItems.length;

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#46534b] shadow-sm transition hover:border-[#8ea99b] hover:text-[#16201b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
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
                  ? "inline-flex h-12 min-w-0 items-center gap-3 rounded-lg bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
                  : "inline-flex h-12 min-w-0 items-center gap-3 rounded-lg border border-[#dce2dc] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#8ea99b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.title}</span>
            </Link>
          );
        })}
      </section>

      <section className="space-y-2">
        {attentionItems.length === 0 ? (
          <AttentionHealthyState />
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              {visibleAttentionItems.map((item) => (
                <AttentionItem
                  key={item.id}
                  title={item.title}
                  value={item.value}
                  description={item.description}
                  href={item.href}
                  severity={item.severity}
                  dataTour={item.dataTour}
                />
              ))}
            </div>
            {hiddenAttentionCount > 0 ? (
              <p className="px-1 text-xs font-medium text-[#607167]">
                +{hiddenAttentionCount} diğer konu
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {financialStats.map((stat) => (
          <MetricCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            tone={stat.tone}
            icon={stat.id}
            href={stat.href}
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
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
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
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
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
        <SectionHeader eyebrow="Son hareketler" title="İşlem zaman akışı" />
        <div className="mt-4 space-y-2.5">
          {lists.timeline.length === 0 ? (
            <EmptyState text="Henüz görüntülenecek işlem bulunmuyor." />
          ) : (
            lists.timeline.map((item) => <TimelineRow key={item.id} item={item} />)
          )}
        </div>
      </DashboardPanel>

      <section className="grid gap-3 lg:grid-cols-4">
        <DashboardPanel
          className="lg:col-span-2"
          dataTour={backupReminder.isDue ? undefined : "backup"}
        >
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
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
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
