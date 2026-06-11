import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { deleteRecurringExpenseAction } from "@/app/(dashboard)/recurring-expenses/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";
import { formatDayOfMonth } from "@/lib/recurring-expense-utils";

type RecurringExpenseDetailPageProps = {
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

function PlaceholderCard({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#223028]">{title}</h2>
      <p className="mt-2 text-sm text-[#647067]">Bu alan sonraki aşamada bağlanacak.</p>
    </div>
  );
}

export default async function RecurringExpenseDetailPage({
  params,
  searchParams,
}: RecurringExpenseDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const recurringExpense = await prisma.recurringExpense.findFirst({
    where: { id, deletedAt: null },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!recurringExpense) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/recurring-expenses"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Sabit giderlere dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Sabit gider detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {recurringExpense.title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/recurring-expenses/${recurringExpense.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteRecurringExpenseAction.bind(null, recurringExpense.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]"
              message="Bu sabit gider tanımını silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak ve daha sonra geri yüklenebilecek."
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Sabit gider silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Sabit gider bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Gider adı" value={recurringExpense.title} />
            <InfoItem
              label="Kategori"
              value={formatPlainValue(recurringExpense.category?.name)}
            />
            <InfoItem
              label="Tutar"
              value={formatMoney(recurringExpense.amount, recurringExpense.currency)}
            />
            <InfoItem label="Para birimi" value={recurringExpense.currency} />
            <InfoItem
              label="Ayın günü"
              value={formatDayOfMonth(recurringExpense.dayOfMonth)}
            />
            <InfoItem
              label="Durum"
              value={recurringExpense.isActive ? "Aktif" : "Pasif"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Tarih bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Başlangıç tarihi" value={formatDate(recurringExpense.startDate)} />
            <InfoItem
              label="Bitiş tarihi"
              value={recurringExpense.endDate ? formatDate(recurringExpense.endDate) : "-"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#16201b]">Açıklama</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(recurringExpense.description)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PlaceholderCard title="Bu ayki gider kaydı" />
        <PlaceholderCard title="Geçmiş aylık ödemeler" />
        <PlaceholderCard title="Hatırlatma bağlantısı" />
      </section>
    </div>
  );
}
