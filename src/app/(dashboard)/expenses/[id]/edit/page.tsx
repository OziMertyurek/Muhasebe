import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateExpenseAction } from "@/app/(dashboard)/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { getActiveExpenseCategories } from "@/lib/expense-categories";
import { formatDateInput } from "@/lib/expense-utils";
import { prisma } from "@/lib/prisma";

type EditExpensePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params;
  const [expense, categories, companies, financialAccounts] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, deletedAt: null },
    }),
    getActiveExpenseCategories(),
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.financialAccount.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!expense) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/expenses/${expense.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Gider düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {expense.title}
          </h1>
        </div>
      </section>

      <ExpenseForm
        action={updateExpenseAction.bind(null, expense.id)}
        categories={categories}
        companies={companies}
        financialAccounts={financialAccounts}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          title: expense.title,
          categoryId: expense.categoryId,
          companyId: expense.companyId,
          financialAccountId: expense.financialAccountId,
          amount: expense.amount.toString(),
          currency: expense.currency,
          expenseDate: formatDateInput(expense.expenseDate),
          status: expense.status,
          paymentDate: expense.paymentDate ? formatDateInput(expense.paymentDate) : null,
          description: expense.description,
        }}
      />
    </div>
  );
}
