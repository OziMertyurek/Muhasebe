import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Landmark, Pencil, Trash2 } from "lucide-react";
import { deleteExpenseAction } from "@/app/(dashboard)/expenses/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { RelatedFilesCard } from "@/components/files/related-files-card";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";

type ExpenseDetailPageProps = {
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

export default async function ExpenseDetailPage({
  params,
  searchParams,
}: ExpenseDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const expense = await prisma.expense.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      financialAccount: { select: { id: true, name: true } },
      files: {
        orderBy: { uploadedAt: "desc" },
        take: 5,
        select: {
          id: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!expense) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/expenses"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Giderlere dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Gider detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {expense.title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/expenses/${expense.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteExpenseAction.bind(null, expense.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92] hover:bg-[#fff7f5] focus:outline-none focus:ring-2 focus:ring-[#efd3cf]"
              message="Bu gider kaydını silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak ve daha sonra geri yüklenebilecek."
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Gider silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
          <h2 className="text-base font-semibold text-[#16201b]">Gider ana bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Gider başlığı" value={expense.title} />
            <InfoItem label="Kategori" value={formatPlainValue(expense.category?.name)} />
            <InfoItem label="Gider tarihi" value={formatDate(expense.expenseDate)} />
            <InfoItem label="Durum" value={expenseStatusLabels[expense.status]} />
            <InfoItem
              label="Ödeme tarihi"
              value={expense.paymentDate ? formatDate(expense.paymentDate) : "-"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
          <h2 className="text-base font-semibold text-[#16201b]">Tutar bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Tutar" value={formatMoney(expense.amount, expense.currency)} />
            <InfoItem label="Para birimi" value={expense.currency} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
          <h2 className="text-base font-semibold text-[#16201b]">Bağlantılar</h2>
          <div className="mt-5 space-y-3">
            {expense.company ? (
              <Link
                href={`/companies/${expense.company.id}`}
                className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {expense.company.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#647067]">Cari detayına git</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-[#647067]">Cari firma seçilmedi.</p>
            )}

            {expense.financialAccount ? (
              <Link
                href={`/accounts/${expense.financialAccount.id}`}
                className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef5f1] text-[#1f6f54]">
                  <Landmark className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {expense.financialAccount.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#647067]">Hesap detayına git</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-[#647067]">Finansal hesap seçilmedi.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm ring-1 ring-black/0">
          <h2 className="text-base font-semibold text-[#16201b]">Açıklama</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(expense.description)}
          </p>
        </div>
      </section>

      <RelatedFilesCard
        files={expense.files}
        addHref={`/files/new?relatedType=EXPENSE&expenseId=${expense.id}`}
      />
    </div>
  );
}
