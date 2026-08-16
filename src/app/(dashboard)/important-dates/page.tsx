import Link from "next/link";
import {
  ImportantDateCategory,
  Prisma,
  Priority,
  ReminderStatus,
} from "#prisma/client";
import { CheckCircle2, Eye, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  deleteImportantDateAction,
  markImportantDateDoneAction,
  markImportantDatePendingAction,
} from "@/app/(dashboard)/important-dates/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpHint } from "@/components/ui/help-hint";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/company-utils";
import {
  addDays,
  getLocalDateRange,
  getRelatedRecordLabel,
  importantDateCategoryLabels,
  importantDateCategoryOptions,
  priorityLabels,
  priorityOptions,
  reminderStatusLabels,
  reminderStatusOptions,
  repeatTypeLabels,
} from "@/lib/important-date-utils";
import { prisma } from "@/lib/prisma";

type ImportantDatesPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    status?: string;
    priority?: string;
    upcoming?: string;
  }>;
};

function getEnumFilter<T extends Record<string, string>>(
  enumObject: T,
  value?: string,
): T[keyof T] | undefined {
  if (value && Object.values(enumObject).includes(value)) {
    return value as T[keyof T];
  }

  return undefined;
}

function getUpcomingWhere(value: string | undefined, today: Date, tomorrow: Date) {
  if (value === "today") {
    return { gte: today, lt: tomorrow };
  }

  if (value === "week") {
    return { gte: today, lt: addDays(today, 8) };
  }

  if (value === "month") {
    return {
      gte: new Date(today.getFullYear(), today.getMonth(), 1),
      lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
    };
  }

  if (value === "past") {
    return { lt: today };
  }

  return undefined;
}

function getReminderStatusTone(status: ReminderStatus) {
  if (status === "DONE") {
    return "positive" as const;
  }

  if (status === "CANCELLED") {
    return "danger" as const;
  }

  return "warning" as const;
}

export default async function ImportantDatesPage({ searchParams }: ImportantDatesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const category = getEnumFilter(ImportantDateCategory, params?.category);
  const status = getEnumFilter(ReminderStatus, params?.status);
  const priority = getEnumFilter(Priority, params?.priority);
  const { start: today, end: tomorrow } = getLocalDateRange();
  const upcomingDateFilter = getUpcomingWhere(params?.upcoming, today, tomorrow);

  const baseWhere: Prisma.ImportantDateWhereInput = {
    deletedAt: null,
    ...(query
      ? {
          OR: [{ title: { contains: query } }, { description: { contains: query } }],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(upcomingDateFilter ? { date: upcomingDateFilter } : {}),
  };

  const [importantDates, todayCount, weekCount, overdueCount, pendingCount] = await Promise.all([
    prisma.importantDate.findMany({
      where: baseWhere,
      include: {
        company: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        expense: { select: { id: true, title: true } },
        financialAccount: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { title: "asc" }],
    }),
    prisma.importantDate.count({
      where: { deletedAt: null, date: { gte: today, lt: tomorrow } },
    }),
    prisma.importantDate.count({
      where: {
        deletedAt: null,
        status: "PENDING",
        date: { gte: today, lt: addDays(today, 8) },
      },
    }),
    prisma.importantDate.count({
      where: { deletedAt: null, status: "PENDING", date: { lt: today } },
    }),
    prisma.importantDate.count({
      where: { deletedAt: null, status: "PENDING" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Ã–nemli Tarihler</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            HatÄ±rlatmalar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Vergi gÃ¼nÃ¼, sÃ¶zleÅŸme bitiÅŸi, kredi kartÄ± tarihleri ve Ã¶deme sÃ¶zlerini takip edin.
          </p>
        </div>
        <Link
          href="/important-dates/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <Plus className="h-4 w-4" />
          HatÄ±rlatma Ekle
        </Link>
      </section>

      <HelpHint
        title="Hatirlatmalar icin ipucu"
        items={[
          "Vergi, vade, sozlesme ve kart tarihlerini buradan takip edin.",
          "Oncelik ve durum alanlarini guncel tutun.",
          "Geciken bekleyenleri duzenli kontrol edin.",
        ]}
        href="/help#baslangic"
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">BugÃ¼nkÃ¼ Ã¶nemli tarihler</p>
          <p className="mt-2 text-2xl font-semibold text-[#16201b]">{todayCount}</p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Bu hafta yaklaÅŸanlar</p>
          <p className="mt-2 text-2xl font-semibold text-[#16201b]">{weekCount}</p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Geciken bekleyenler</p>
          <p className="mt-2 text-2xl font-semibold text-[#16201b]">{overdueCount}</p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Toplam bekleyen</p>
          <p className="mt-2 text-2xl font-semibold text-[#16201b]">{pendingCount}</p>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm ring-1 ring-black/0">
        <div className="grid gap-3 xl:grid-cols-[1fr_170px_150px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="BaÅŸlÄ±k veya aÃ§Ä±klama ara"
              className="h-11 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
            />
          </label>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">TÃ¼m kategoriler</option>
            {importantDateCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">TÃ¼m durumlar</option>
            {reminderStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={priority ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">TÃ¼m Ã¶ncelikler</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="upcoming"
            defaultValue={params?.upcoming ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">TÃ¼mÃ¼</option>
            <option value="today">BugÃ¼n</option>
            <option value="week">Bu hafta</option>
            <option value="month">Bu ay</option>
            <option value="past">GeÃ§miÅŸ</option>
          </select>
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm ring-1 ring-black/0">
        {importantDates.length === 0 ? (
          <EmptyState
            title="HenÃ¼z Ã¶nemli tarih eklenmedi"
            description="Ä°lk hatÄ±rlatmanÄ±zÄ± HatÄ±rlatma Ekle butonuyla oluÅŸturabilirsiniz."
            actionHref="/important-dates/new"
            actionLabel="HatÄ±rlatma Ekle"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f5f7f3] text-xs font-semibold uppercase tracking-[0.08em] text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Saat</th>
                  <th className="px-4 py-3">BaÅŸlÄ±k</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Ã–ncelik</th>
                  <th className="px-4 py-3">Tekrar</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Ä°liÅŸkili kayÄ±t</th>
                  <th className="px-4 py-3 text-right">Ä°ÅŸlemler</th>
                </tr>
              </thead>
              <tbody>
                {importantDates.map((importantDate) => (
                  <tr key={importantDate.id} className="border-t border-[#e5e9e5] transition hover:bg-[#fbfcfa]">
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatDate(importantDate.date)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{importantDate.time ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {importantDate.title}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {importantDateCategoryLabels[importantDate.category]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={importantDate.priority === "HIGH" ? "warning" : "neutral"}>
                        {priorityLabels[importantDate.priority]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {repeatTypeLabels[importantDate.repeatType]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={getReminderStatusTone(importantDate.status)}>
                        {reminderStatusLabels[importantDate.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {getRelatedRecordLabel(importantDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {importantDate.status === "PENDING" ? (
                          <form action={markImportantDateDoneAction.bind(null, importantDate.id)}>
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#1f6f54] transition hover:border-[#aebdae]"
                              title="TamamlandÄ± olarak iÅŸaretle"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          </form>
                        ) : importantDate.status === "DONE" ? (
                          <form
                            action={markImportantDatePendingAction.bind(null, importantDate.id)}
                          >
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#46534b] transition hover:border-[#aebdae]"
                              title="Bekliyor olarak geri al"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </form>
                        ) : null}
                        <Link
                          href={`/important-dates/${importantDate.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/important-dates/${importantDate.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
                          title="DÃ¼zenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteImportantDateAction.bind(null, importantDate.id)}>
                          <ConfirmSubmitButton
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] bg-white text-[#8b2f28] transition hover:border-[#c79a92] hover:bg-[#fff7f5] focus:outline-none focus:ring-2 focus:ring-[#efd3cf]"
                            message="Bu Ã¶nemli tarih / hatÄ±rlatma kaydÄ±nÄ± silmek istediÄŸine emin misin? KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±nacak ve daha sonra geri yÃ¼klenebilecek."
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
