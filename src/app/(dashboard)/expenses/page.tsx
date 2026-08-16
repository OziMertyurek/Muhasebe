import Link from "next/link";
import { ExpenseStatus } from "#prisma/client";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteExpenseAction } from "@/app/(dashboard)/expenses/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpHint } from "@/components/ui/help-hint";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/company-utils";
import { buildExportHref } from "@/lib/export-utils";
import { getActiveExpenseCategories } from "@/lib/expense-categories";
import { expenseStatusLabels, expenseStatusOptions } from "@/lib/expense-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";

type ExpensesPageProps = {
  searchParams?: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

function getExpenseStatus(value?: string) {
  if (value && Object.values(ExpenseStatus).includes(value as ExpenseStatus)) {
    return value as ExpenseStatus;
  }

  return undefined;
}

function getExpenseStatusTone(status: ExpenseStatus) {
  if (status === "PAID") {
    return "positive" as const;
  }

  if (status === "CANCELLED") {
    return "danger" as const;
  }

  return "warning" as const;
}

function parseDateFilter(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const status = getExpenseStatus(params?.status);
  const categoryId = params?.categoryId?.trim() || undefined;
  const dateFrom = parseDateFilter(params?.dateFrom);
  const dateTo = parseDateFilter(params?.dateTo);
  const dateToExclusive = dateTo
    ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate() + 1)
    : undefined;
  const exportHref = buildExportHref("/exports/expenses", {
    q: query,
    categoryId,
    status,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });
  const pdfHref = buildExportHref("/exports/expenses-pdf", {
    q: query,
    categoryId,
    status,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });
  const categories = await getActiveExpenseCategories();
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom || dateToExclusive
        ? {
            expenseDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateToExclusive ? { lt: dateToExclusive } : {}),
            },
          }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      financialAccount: { select: { id: true, name: true } },
    },
    orderBy: { expenseDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Giderler</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Gider kayÄ±tlarÄ±
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Tek seferlik veya gerÃ§ekleÅŸmiÅŸ giderleri kategori, cari ve hesapla takip edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            CSV DÄ±ÅŸa Aktar
          </a>
          <a
            href={pdfHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            PDF Ä°ndir
          </a>
          <Link
            href="/expenses/new"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Gider
          </Link>
        </div>
      </section>

      <HelpHint
        title="Gider kaydi icin ipucu"
        items={[
          "Isletme giderlerinizi duzenli olarak kaydedin.",
          "Kategori ve tarih bilgisi raporlarin dogrulugu icin onemlidir.",
          "Odendi / Odenmedi durumunu guncel tutun.",
        ]}
        href="/help#giderler"
      />

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm ring-1 ring-black/0">
        <div className="grid gap-3 xl:grid-cols-[1fr_190px_160px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="BaÅŸlÄ±k, aÃ§Ä±klama veya firma ara"
              className="h-11 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
            />
          </label>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">TÃ¼m kategoriler</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">TÃ¼m durumlar</option>
            {expenseStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            name="dateFrom"
            type="date"
            defaultValue={params?.dateFrom ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          />
          <input
            name="dateTo"
            type="date"
            defaultValue={params?.dateTo ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          />
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm ring-1 ring-black/0">
        {expenses.length === 0 ? (
          <EmptyState
            title="HenÃ¼z gider eklenmedi"
            description="Ä°lk gider kaydÄ±nÄ±zÄ± Yeni Gider butonuyla ekleyebilirsiniz."
            actionHref="/expenses/new"
            actionLabel="Yeni Gider"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f5f7f3] text-xs font-semibold uppercase tracking-[0.08em] text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Gider baÅŸlÄ±ÄŸÄ±</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Cari firma</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Finansal hesap</th>
                  <th className="px-4 py-3 text-right">Ä°ÅŸlemler</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-[#e5e9e5] transition hover:bg-[#fbfcfa]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(expense.expenseDate)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{expense.title}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {expense.category?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{expense.company?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{expense.currency}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={getExpenseStatusTone(expense.status)}>
                        {expenseStatusLabels[expense.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {expense.financialAccount?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/expenses/${expense.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
                          title="DÃ¼zenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteExpenseAction.bind(null, expense.id)}>
                          <ConfirmSubmitButton
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] bg-white text-[#8b2f28] transition hover:border-[#c79a92] hover:bg-[#fff7f5] focus:outline-none focus:ring-2 focus:ring-[#efd3cf]"
                            message="Bu gider kaydÄ±nÄ± silmek istediÄŸine emin misin? KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±nacak ve daha sonra geri yÃ¼klenebilecek."
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmSubmitButton>
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
