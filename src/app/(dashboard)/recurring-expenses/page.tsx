import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteRecurringExpenseAction } from "@/app/(dashboard)/recurring-expenses/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/company-utils";
import { getActiveExpenseCategories } from "@/lib/expense-categories";
import { formatMoney } from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";
import { formatDayOfMonth } from "@/lib/recurring-expense-utils";

type RecurringExpensesPageProps = {
  searchParams?: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
  }>;
};

function getActiveFilter(value?: string) {
  if (value === "active") {
    return true;
  }

  if (value === "passive") {
    return false;
  }

  return undefined;
}

function buildMonthlyTotals(
  expenses: Array<{ amount: Prisma.Decimal; currency: string }>,
) {
  const totals = expenses.reduce((map, expense) => {
    const current = map.get(expense.currency) ?? new Prisma.Decimal(0);
    map.set(expense.currency, current.plus(expense.amount));
    return map;
  }, new Map<string, Prisma.Decimal>());

  return Array.from(totals.entries()).sort(([firstCurrency], [secondCurrency]) =>
    firstCurrency.localeCompare(secondCurrency),
  );
}

export default async function RecurringExpensesPage({
  searchParams,
}: RecurringExpensesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const categoryId = params?.categoryId?.trim() || undefined;
  const isActive = getActiveFilter(params?.status);

  const [categories, recurringExpenses, activeSummaryExpenses, passiveCount] =
    await Promise.all([
      getActiveExpenseCategories(),
      prisma.recurringExpense.findMany({
        where: {
          deletedAt: null,
          ...(query
            ? {
                OR: [
                  { title: { contains: query } },
                  { description: { contains: query } },
                ],
              }
            : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        },
        include: { category: { select: { id: true, name: true } } },
        orderBy: [{ isActive: "desc" }, { dayOfMonth: "asc" }, { title: "asc" }],
      }),
      prisma.recurringExpense.findMany({
        where: { deletedAt: null, isActive: true },
        select: { amount: true, currency: true },
      }),
      prisma.recurringExpense.count({
        where: { deletedAt: null, isActive: false },
      }),
    ]);

  const activeCount = activeSummaryExpenses.length;
  const monthlyTotals = buildMonthlyTotals(activeSummaryExpenses);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Sabit Giderler</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Sabit gider tanımları
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Her ay tekrar eden kira, abonelik ve düzenli ödemeleri şablon olarak takip edin.
          </p>
        </div>
        <Link
          href="/recurring-expenses/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <Plus className="h-4 w-4" />
          Yeni Sabit Gider
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Aktif sabit gider</p>
          <p className="mt-2 text-2xl font-semibold text-[#16201b]">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Aylık toplam sabit gider</p>
          {monthlyTotals.length === 0 ? (
            <p className="mt-2 text-2xl font-semibold text-[#16201b]">-</p>
          ) : (
            <div className="mt-2 space-y-1">
              {monthlyTotals.map(([currency, amount]) => (
                <p key={currency} className="text-lg font-semibold text-[#16201b]">
                  {formatMoney(amount, currency)}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Pasif sabit gider</p>
          <p className="mt-2 text-2xl font-semibold text-[#16201b]">{passiveCount}</p>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Gider adı veya açıklama ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm kategoriler</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={params?.status ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {recurringExpenses.length === 0 ? (
          <EmptyState
            title="Henüz sabit gider eklenmedi"
            description="İlk sabit gider tanımınızı Yeni Sabit Gider butonuyla ekleyebilirsiniz."
            actionHref="/recurring-expenses/new"
            actionLabel="Yeni Sabit Gider"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Gider adı</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Ayın günü</th>
                  <th className="px-4 py-3">Başlangıç tarihi</th>
                  <th className="px-4 py-3">Bitiş tarihi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {recurringExpenses.map((recurringExpense) => (
                  <tr key={recurringExpense.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {recurringExpense.title}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {recurringExpense.category?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(recurringExpense.amount, recurringExpense.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {recurringExpense.currency}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatDayOfMonth(recurringExpense.dayOfMonth)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatDate(recurringExpense.startDate)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {recurringExpense.endDate ? formatDate(recurringExpense.endDate) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={recurringExpense.isActive ? "positive" : "neutral"}>
                        {recurringExpense.isActive ? "Aktif" : "Pasif"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/recurring-expenses/${recurringExpense.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/recurring-expenses/${recurringExpense.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteRecurringExpenseAction.bind(null, recurringExpense.id)}>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] text-[#8b2f28] transition hover:border-[#c79a92]"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
