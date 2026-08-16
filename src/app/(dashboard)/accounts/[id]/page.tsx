import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "#prisma/client";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/app/(dashboard)/accounts/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { accountTypeLabels } from "@/lib/account-utils";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { paymentTypeLabels } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

type AccountDetailPageProps = {
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

export default async function AccountDetailPage({
  params,
  searchParams,
}: AccountDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const account = await prisma.financialAccount.findFirst({
    where: { id, deletedAt: null },
    include: {
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      },
      expenses: {
        where: { deletedAt: null },
        orderBy: { expenseDate: "desc" },
        include: {
          category: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!account) {
    notFound();
  }

  const collectionTotal = account.payments
    .filter((payment) => payment.type === "COLLECTION")
    .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
  const paymentTotal = account.payments
    .filter((payment) => payment.type === "PAYMENT")
    .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
  const estimatedBalance = account.openingBalance.plus(collectionTotal).minus(paymentTotal);
  const expenseTotal = account.expenses.reduce(
    (total, expense) => total.plus(expense.amount),
    new Prisma.Decimal(0),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/accounts"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Hesaplara dÃ¶n
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Hesap detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {account.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/accounts/${account.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            DÃ¼zenle
          </Link>
          <form action={deleteAccountAction.bind(null, account.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]"
              message="Bu finansal hesabÄ± silmek istediÄŸine emin misin? KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±nacak. BaÄŸlÄ± hareketler geÃ§miÅŸte gÃ¶rÃ¼nmeye devam edebilir."
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Hesap silinirken bir hata oluÅŸtu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Hesap ana bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Hesap adÄ±" value={account.name} />
            <InfoItem label="Hesap tipi" value={accountTypeLabels[account.type]} />
            <InfoItem label="Aktif mi?" value={account.isActive ? "Aktif" : "Pasif"} />
            <InfoItem label="Para birimi" value={account.currency} />
            <InfoItem
              label="AÃ§Ä±lÄ±ÅŸ bakiyesi"
              value={formatMoney(account.openingBalance, account.currency)}
            />
            <InfoItem
              label="Mevcut bakiye"
              value={formatMoney(account.currentBalance, account.currency)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Banka / IBAN bilgisi</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Banka" value={formatPlainValue(account.bankName)} />
            <InfoItem label="IBAN" value={formatPlainValue(account.iban)} />
          </div>
        </div>

        {account.type === "CREDIT_CARD" ? (
          <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#16201b]">Kredi kartÄ± bilgileri</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <InfoItem
                label="Kredi limiti"
                value={
                  account.creditLimit ? formatMoney(account.creditLimit, account.currency) : "-"
                }
              />
              <InfoItem
                label="Hesap kesim gÃ¼nÃ¼"
                value={account.statementDay ? `${account.statementDay}. gÃ¼n` : "-"}
              />
              <InfoItem
                label="Son Ã¶deme gÃ¼nÃ¼"
                value={account.dueDay ? `${account.dueDay}. gÃ¼n` : "-"}
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Hareket Ã¶zeti</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <InfoItem
              label="GiriÅŸ toplamÄ±"
              value={formatMoney(collectionTotal, account.currency)}
            />
            <InfoItem label="Ã‡Ä±kÄ±ÅŸ toplamÄ±" value={formatMoney(paymentTotal, account.currency)} />
            <InfoItem
              label="Tahmini bakiye"
              value={formatMoney(estimatedBalance, account.currency)}
            />
            <InfoItem label="Gider toplamÄ±" value={formatMoney(expenseTotal, account.currency)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#16201b]">Notlar</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(account.notes)}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">Bu hesaba baÄŸlÄ± hareketler</h2>
        {account.payments.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-[#cfd8cf] p-4 text-sm text-[#647067]">
            Bu hesaba baÄŸlÄ± tahsilat veya Ã¶deme hareketi yok.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Ä°ÅŸlem tipi</th>
                  <th className="px-4 py-3">Cari</th>
                  <th className="px-4 py-3">Fatura</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">AÃ§Ä±klama</th>
                </tr>
              </thead>
              <tbody>
                {account.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {paymentTypeLabels[payment.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {payment.company ? (
                        <Link href={`/companies/${payment.company.id}`}>{payment.company.name}</Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {payment.invoice ? (
                        <Link href={`/invoices/${payment.invoice.id}`}>
                          {payment.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatPlainValue(payment.description)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#16201b]">Bu hesaba baÄŸlÄ± giderler</h2>
        {account.expenses.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-[#cfd8cf] p-4 text-sm text-[#647067]">
            Bu hesaba baÄŸlÄ± gider kaydÄ± yok.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Gider</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Cari</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {account.expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(expense.expenseDate)}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      <Link href={`/expenses/${expense.id}`}>{expense.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {expense.category?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {expense.company ? (
                        <Link href={`/companies/${expense.company.id}`}>{expense.company.name}</Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {expenseStatusLabels[expense.status]}
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
