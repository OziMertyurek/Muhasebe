import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createExpenseAction } from "@/app/(dashboard)/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { getActiveExpenseCategories } from "@/lib/expense-categories";
import { prisma } from "@/lib/prisma";

export default async function NewExpensePage() {
  const [categories, companies, financialAccounts] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/expenses"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Giderlere dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni gider</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Gider ekle
          </h1>
        </div>
      </section>

      <ExpenseForm
        action={createExpenseAction}
        categories={categories}
        companies={companies}
        financialAccounts={financialAccounts}
        submitLabel="Gideri kaydet"
      />
    </div>
  );
}
