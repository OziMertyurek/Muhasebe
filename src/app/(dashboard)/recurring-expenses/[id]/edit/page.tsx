import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateRecurringExpenseAction } from "@/app/(dashboard)/recurring-expenses/actions";
import { RecurringExpenseForm } from "@/components/recurring-expenses/recurring-expense-form";
import { getActiveExpenseCategories } from "@/lib/expense-categories";
import { prisma } from "@/lib/prisma";
import { formatDateInput } from "@/lib/recurring-expense-utils";

type EditRecurringExpensePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecurringExpensePage({
  params,
}: EditRecurringExpensePageProps) {
  const { id } = await params;
  const [recurringExpense, categories] = await Promise.all([
    prisma.recurringExpense.findFirst({
      where: { id, deletedAt: null },
    }),
    getActiveExpenseCategories(),
  ]);

  if (!recurringExpense) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/recurring-expenses/${recurringExpense.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Sabit gider düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {recurringExpense.title}
          </h1>
        </div>
      </section>

      <RecurringExpenseForm
        action={updateRecurringExpenseAction.bind(null, recurringExpense.id)}
        categories={categories}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          title: recurringExpense.title,
          categoryId: recurringExpense.categoryId,
          amount: recurringExpense.amount.toString(),
          currency: recurringExpense.currency,
          dayOfMonth: recurringExpense.dayOfMonth,
          startDate: formatDateInput(recurringExpense.startDate),
          endDate: recurringExpense.endDate
            ? formatDateInput(recurringExpense.endDate)
            : null,
          isActive: recurringExpense.isActive,
          description: recurringExpense.description,
        }}
      />
    </div>
  );
}
