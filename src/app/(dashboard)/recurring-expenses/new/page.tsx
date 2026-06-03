import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createRecurringExpenseAction } from "@/app/(dashboard)/recurring-expenses/actions";
import { RecurringExpenseForm } from "@/components/recurring-expenses/recurring-expense-form";
import { getActiveExpenseCategories } from "@/lib/expense-categories";

export default async function NewRecurringExpensePage() {
  const categories = await getActiveExpenseCategories();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/recurring-expenses"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Sabit giderlere dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni sabit gider</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Sabit gider ekle
          </h1>
        </div>
      </section>

      <RecurringExpenseForm
        action={createRecurringExpenseAction}
        categories={categories}
        submitLabel="Sabit gideri kaydet"
      />
    </div>
  );
}
