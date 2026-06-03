import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateImportantDateAction } from "@/app/(dashboard)/important-dates/actions";
import { ImportantDateForm } from "@/components/important-dates/important-date-form";
import { getImportantDateFormOptions } from "@/lib/important-date-options";
import { formatDateInput } from "@/lib/important-date-utils";
import { prisma } from "@/lib/prisma";

type EditImportantDatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditImportantDatePage({ params }: EditImportantDatePageProps) {
  const { id } = await params;
  const [importantDate, options] = await Promise.all([
    prisma.importantDate.findFirst({
      where: { id, deletedAt: null },
    }),
    getImportantDateFormOptions(),
  ]);

  if (!importantDate) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/important-dates/${importantDate.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Önemli tarih düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {importantDate.title}
          </h1>
        </div>
      </section>

      <ImportantDateForm
        action={updateImportantDateAction.bind(null, importantDate.id)}
        companies={options.companies}
        invoices={options.invoices}
        expenses={options.expenses}
        financialAccounts={options.financialAccounts}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          title: importantDate.title,
          description: importantDate.description,
          category: importantDate.category,
          date: formatDateInput(importantDate.date),
          time: importantDate.time,
          repeatType: importantDate.repeatType,
          reminderDaysBefore: importantDate.reminderDaysBefore,
          priority: importantDate.priority,
          status: importantDate.status,
          companyId: importantDate.companyId,
          invoiceId: importantDate.invoiceId,
          expenseId: importantDate.expenseId,
          financialAccountId: importantDate.financialAccountId,
        }}
      />
    </div>
  );
}
