import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  Pencil,
  Receipt,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  deleteImportantDateAction,
  markImportantDateDoneAction,
  markImportantDatePendingAction,
} from "@/app/(dashboard)/important-dates/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import {
  formatOptionalTime,
  formatReminderDays,
  importantDateCategoryLabels,
  priorityLabels,
  reminderStatusLabels,
  repeatTypeLabels,
} from "@/lib/important-date-utils";
import { prisma } from "@/lib/prisma";

type ImportantDateDetailPageProps = {
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

function RelatedLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-[#223028]">{title}</span>
        <span className="mt-1 block text-sm text-[#647067]">{description}</span>
      </span>
    </Link>
  );
}

export default async function ImportantDateDetailPage({
  params,
  searchParams,
}: ImportantDateDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const importantDate = await prisma.importantDate.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      expense: { select: { id: true, title: true } },
      financialAccount: { select: { id: true, name: true } },
    },
  });

  if (!importantDate) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/important-dates"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Önemli tarihlere dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Önemli tarih detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {importantDate.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {importantDate.status === "PENDING" ? (
            <form action={markImportantDateDoneAction.bind(null, importantDate.id)}>
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#1f6f54] shadow-sm transition hover:border-[#aebdae]">
                <CheckCircle2 className="h-4 w-4" />
                Tamamlandı
              </button>
            </form>
          ) : importantDate.status === "DONE" ? (
            <form action={markImportantDatePendingAction.bind(null, importantDate.id)}>
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]">
                <RotateCcw className="h-4 w-4" />
                Bekliyor
              </button>
            </form>
          ) : null}
          <Link
            href={`/important-dates/${importantDate.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteImportantDateAction.bind(null, importantDate.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]"
              message="Bu önemli tarih / hatırlatma kaydını silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak ve daha sonra geri yüklenebilecek."
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Önemli tarih silinirken bir hata oluştu.
        </div>
      ) : null}
      {query?.error === "status" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Durum değiştirilirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Hatırlatma bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Başlık" value={importantDate.title} />
            <InfoItem
              label="Kategori"
              value={importantDateCategoryLabels[importantDate.category]}
            />
            <InfoItem label="Tarih" value={formatDate(importantDate.date)} />
            <InfoItem label="Saat" value={formatOptionalTime(importantDate.time)} />
            <InfoItem label="Tekrar tipi" value={repeatTypeLabels[importantDate.repeatType]} />
            <InfoItem
              label="Hatırlatma günü"
              value={formatReminderDays(importantDate.reminderDaysBefore)}
            />
            <InfoItem label="Öncelik" value={priorityLabels[importantDate.priority]} />
            <InfoItem label="Durum" value={reminderStatusLabels[importantDate.status]} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Açıklama</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(importantDate.description)}
          </p>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#16201b]">İlişkili kayıtlar</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {importantDate.company ? (
              <RelatedLink
                href={`/companies/${importantDate.company.id}`}
                title={importantDate.company.name}
                description="Cari detayına git"
                icon={<Building2 className="h-5 w-5" />}
              />
            ) : null}
            {importantDate.invoice ? (
              <RelatedLink
                href={`/invoices/${importantDate.invoice.id}`}
                title={importantDate.invoice.invoiceNumber}
                description="Fatura detayına git"
                icon={<FileText className="h-5 w-5" />}
              />
            ) : null}
            {importantDate.expense ? (
              <RelatedLink
                href={`/expenses/${importantDate.expense.id}`}
                title={importantDate.expense.title}
                description="Gider detayına git"
                icon={<Receipt className="h-5 w-5" />}
              />
            ) : null}
            {importantDate.financialAccount ? (
              <RelatedLink
                href={`/accounts/${importantDate.financialAccount.id}`}
                title={importantDate.financialAccount.name}
                description="Hesap detayına git"
                icon={<Landmark className="h-5 w-5" />}
              />
            ) : null}
            {!importantDate.company &&
            !importantDate.invoice &&
            !importantDate.expense &&
            !importantDate.financialAccount ? (
              <p className="text-sm text-[#647067]">İlişkili kayıt seçilmedi.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
