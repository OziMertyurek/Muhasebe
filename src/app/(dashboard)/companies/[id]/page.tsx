import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { deleteCompanyAction } from "@/app/(dashboard)/companies/actions";
import { RelatedFilesCard } from "@/components/files/related-files-card";
import {
  companyTypeLabels,
  formatDate,
  formatOptionalCurrency,
  formatPlainValue,
} from "@/lib/company-utils";
import {
  formatStatementMoney,
  formatStatementSignedMoney,
  getCompanyStatement,
} from "@/lib/company-statement-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentTypeLabels } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

function MoneyList({
  items,
  signed = false,
}: {
  items: Array<{ currency: string; amount: { toNumber: () => number } }>;
  signed?: boolean;
}) {
  if (items.length === 0) {
    return <span>-</span>;
  }

  return (
    <span className="space-y-1">
      {items.map((item) => (
        <span key={item.currency} className="block">
          {item.currency}:{" "}
          {signed
            ? formatStatementSignedMoney(item.amount, item.currency)
            : formatStatementMoney(item.amount, item.currency)}
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

export default async function CompanyDetailPage({
  params,
  searchParams,
}: CompanyDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [statement, files] = await Promise.all([
    getCompanyStatement(id),
    prisma.fileAttachment.findMany({
      where: { companyId: id },
      orderBy: { uploadedAt: "desc" },
      take: 5,
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        uploadedAt: true,
      },
    }),
  ]);
  const company = statement.company;

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/companies"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Carilere dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Cari detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {company.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteCompanyAction.bind(null, company.id)}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]">
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Cari silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Firma bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Firma adı" value={company.name} />
            <InfoItem label="Cari tipi" value={companyTypeLabels[company.type]} />
            <InfoItem label="Varsayılan para birimi" value={company.defaultCurrency} />
            <InfoItem
              label="Risk limiti"
              value={formatOptionalCurrency(company.riskLimit, company.defaultCurrency)}
            />
            <InfoItem
              label="Vade günü"
              value={company.paymentTermDays === null ? "-" : `${company.paymentTermDays} gün`}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Vergi bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Vergi no" value={formatPlainValue(company.taxNumber)} />
            <InfoItem label="Vergi dairesi" value={formatPlainValue(company.taxOffice)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">İletişim bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="E-posta" value={formatPlainValue(company.email)} />
            <InfoItem label="Telefon" value={formatPlainValue(company.phone)} />
            <InfoItem label="Ülke" value={formatPlainValue(company.country)} />
            <InfoItem label="Şehir" value={formatPlainValue(company.city)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Adres ve notlar</h2>
          <div className="mt-5 space-y-4">
            <InfoItem label="Adres" value={formatPlainValue(company.address)} />
            <InfoItem label="Notlar" value={formatPlainValue(company.notes)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Toplam satış faturası</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.totalSales} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Toplam alış faturası</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.totalPurchases} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Net bakiye</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.netBalance} signed />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Toplam tahsilat</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.totalCollections} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Toplam ödeme</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.totalPayments} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Kalan alacak / borç</p>
          <div className="mt-3 text-sm font-semibold leading-6 text-[#16201b]">
            <p>
              Alacak: <MoneyList items={statement.summary.remainingReceivable} />
            </p>
            <p className="mt-1">
              Borç: <MoneyList items={statement.summary.remainingPayable} />
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Son faturalar</h2>
          <div className="mt-5 space-y-3">
            {statement.recentInvoices.length === 0 ? (
              <EmptyState text="Bu cariye ait fatura bulunamadı" />
            ) : (
              statement.recentInvoices.map((invoice) => (
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
                      <p className="mt-1 text-sm text-[#647067]">
                        {invoiceTypeLabels[invoice.type]} · {formatDate(invoice.invoiceDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#16201b]">
                      {formatStatementMoney(invoice.totalAmount, invoice.currency)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">
            Son tahsilat / ödeme hareketleri
          </h2>
          <div className="mt-5 space-y-3">
            {statement.recentPayments.length === 0 ? (
              <EmptyState text="Bu cariye ait tahsilat / ödeme bulunamadı" />
            ) : (
              statement.recentPayments.map((payment) => (
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
                        {payment.invoice?.invoiceNumber ?? "Genel cari hareket"} ·{" "}
                        {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#16201b]">
                      {formatStatementMoney(payment.amount, payment.currency)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Son giderler</h2>
          <div className="mt-5 space-y-3">
            {statement.recentExpenses.length === 0 ? (
              <EmptyState text="Bu cariye ait gider bulunamadı" />
            ) : (
              statement.recentExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="block rounded-md border border-[#e5e9e5] px-4 py-3 transition hover:border-[#aebdae]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#223028]">{expense.title}</p>
                      <p className="mt-1 text-sm text-[#647067]">
                        {expense.category?.name ?? "Kategori yok"} ·{" "}
                        {expenseStatusLabels[expense.status]} · {formatDate(expense.expenseDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#16201b]">
                      {formatStatementMoney(expense.amount, expense.currency)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Cari Ekstre</h2>
            <p className="mt-1 text-sm text-[#647067]">
              Son hareketler para birimi bazında ayrı bakiye ile hesaplanır.
            </p>
          </div>
          <Link
            href={`/companies/${company.id}/statement`}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <ExternalLink className="h-4 w-4" />
            Tam Ekstreyi Gör
          </Link>
        </div>
        <div className="mt-5 overflow-x-auto">
          {statement.movements.length === 0 ? (
            <EmptyState text="Bu cariye ait hareket bulunamadı" />
          ) : (
            <table className="min-w-[820px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">İşlem</th>
                  <th className="px-4 py-3">Referans</th>
                  <th className="px-4 py-3">Borç</th>
                  <th className="px-4 py-3">Alacak</th>
                  <th className="px-4 py-3">Bakiye</th>
                  <th className="px-4 py-3">Para birimi</th>
                </tr>
              </thead>
              <tbody>
                {statement.movements.slice(-5).map((movement) => (
                  <tr key={movement.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(movement.date)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{movement.label}</td>
                    <td className="px-4 py-3 text-[#46534b]">{movement.reference}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {movement.debit.equals(0)
                        ? "-"
                        : formatStatementMoney(movement.debit, movement.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {movement.credit.equals(0)
                        ? "-"
                        : formatStatementMoney(movement.credit, movement.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {formatStatementSignedMoney(movement.balance, movement.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{movement.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <RelatedFilesCard
        files={files}
        addHref={`/files/new?relatedType=COMPANY&companyId=${company.id}`}
      />
    </div>
  );
}
