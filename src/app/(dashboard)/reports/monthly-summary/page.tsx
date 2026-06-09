import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Download,
  ReceiptText,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/company-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { buildExportHref, formatMonthForFileName } from "@/lib/export-utils";
import { formatMoney, invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/payment-utils";
import {
  formatReportMoney,
  formatReportSignedMoney,
  getMonthlySummaryReport,
  getReportMonths,
  getReportYears,
} from "@/lib/report-utils";

type MonthlySummaryPageProps = {
  searchParams?: Promise<{
    month?: string;
    year?: string;
  }>;
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
    <span className="block space-y-1">
      {items.map((item) => (
        <span key={item.currency} className="block">
          {item.currency}:{" "}
          {signed
            ? formatReportSignedMoney(item.amount, item.currency)
            : formatReportMoney(item.amount, item.currency)}
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

export default async function MonthlySummaryPage({
  searchParams,
}: MonthlySummaryPageProps) {
  const params = await searchParams;
  const report = await getMonthlySummaryReport(params?.month, params?.year);
  const months = getReportMonths();
  const years = getReportYears();
  const exportHref = buildExportHref("/exports/monthly-summary", {
    month: formatMonthForFileName(report.range.year, report.range.month),
  });
  const pdfHref = buildExportHref("/exports/monthly-summary-pdf", {
    month: formatMonthForFileName(report.range.year, report.range.month),
  });
  const cards = [
    {
      title: "Satış faturaları",
      value: <MoneyLines items={report.totals.salesInvoices} />,
      icon: ArrowDownLeft,
    },
    {
      title: "Alış faturaları",
      value: <MoneyLines items={report.totals.purchaseInvoices} />,
      icon: ArrowUpRight,
    },
    {
      title: "Tahsilatlar",
      value: <MoneyLines items={report.totals.collections} />,
      icon: Banknote,
    },
    {
      title: "Ödemeler",
      value: <MoneyLines items={report.totals.payments} />,
      icon: Banknote,
    },
    {
      title: "Giderler",
      value: <MoneyLines items={report.totals.expenses} />,
      icon: ReceiptText,
    },
    {
      title: "Net",
      value: <MoneyLines items={report.totals.net} signed />,
      icon: Search,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Raporlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Aylık özet
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Seçilen ay için gelir, gider, tahsilat ve ödeme hareketlerini özetleyin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={exportHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            CSV Dışa Aktar
          </Link>
          <Link
            href={pdfHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            PDF İndir
          </Link>
          <Link
            href="/reports"
            className="inline-flex h-10 w-fit items-center rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
          >
            Raporlara dön
          </Link>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[220px_160px_auto]">
          <select
            name="month"
            defaultValue={report.range.month}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            name="year"
            defaultValue={report.range.year}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Göster
          </button>
        </div>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#607167]">{card.title}</p>
                  <p className="mt-3 text-xl font-semibold text-[#16201b]">{card.value}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-[#607167]">Bu ayki ödenmiş giderler</p>
        <div className="mt-3 text-xl font-semibold text-[#16201b]">
          <MoneyLines items={report.totals.paidExpenses} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ReportList title="Son satış faturaları">
          {report.lists.salesInvoices.length === 0 ? (
            <EmptyState text="Bu ay için satış faturası bulunamadı." />
          ) : (
            report.lists.salesInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#16201b]">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-[#647067]">{invoice.company.name}</p>
                  </div>
                  <p className="font-semibold text-[#16201b]">
                    {formatMoney(invoice.totalAmount, invoice.currency)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[#647067]">
                  {invoiceTypeLabels[invoice.type]} · {formatDate(invoice.invoiceDate)}
                </p>
              </Link>
            ))
          )}
        </ReportList>

        <ReportList title="Son alış faturaları">
          {report.lists.purchaseInvoices.length === 0 ? (
            <EmptyState text="Bu ay için alış faturası bulunamadı." />
          ) : (
            report.lists.purchaseInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#16201b]">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-[#647067]">{invoice.company.name}</p>
                  </div>
                  <p className="font-semibold text-[#16201b]">
                    {formatMoney(invoice.totalAmount, invoice.currency)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[#647067]">
                  {invoiceTypeLabels[invoice.type]} · {formatDate(invoice.invoiceDate)}
                </p>
              </Link>
            ))
          )}
        </ReportList>

        <ReportList title="Son tahsilat / ödeme hareketleri">
          {report.lists.payments.length === 0 ? (
            <EmptyState text="Bu ay için tahsilat / ödeme hareketi bulunamadı." />
          ) : (
            report.lists.payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/payments/${payment.id}`}
                className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#16201b]">
                      {paymentTypeLabels[payment.type]}
                    </p>
                    <p className="mt-1 text-sm text-[#647067]">
                      {payment.company?.name ?? payment.invoice?.invoiceNumber ?? "Genel hareket"}
                    </p>
                  </div>
                  <p className="font-semibold text-[#16201b]">
                    {formatMoney(payment.amount, payment.currency)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[#647067]">
                  {paymentMethodLabels[payment.method]} · {formatDate(payment.paymentDate)}
                </p>
              </Link>
            ))
          )}
        </ReportList>

        <ReportList title="Son giderler">
          {report.lists.expenses.length === 0 ? (
            <EmptyState text="Bu ay için gider kaydı bulunamadı." />
          ) : (
            report.lists.expenses.map((expense) => (
              <Link
                key={expense.id}
                href={`/expenses/${expense.id}`}
                className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#16201b]">{expense.title}</p>
                    <p className="mt-1 text-sm text-[#647067]">
                      {expense.category?.name ?? expense.company?.name ?? "Kategori yok"}
                    </p>
                  </div>
                  <p className="font-semibold text-[#16201b]">
                    {formatMoney(expense.amount, expense.currency)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[#647067]">
                  {expenseStatusLabels[expense.status]} · {formatDate(expense.expenseDate)}
                </p>
              </Link>
            ))
          )}
        </ReportList>
      </section>
    </div>
  );
}

function ReportList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#16201b]">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}
