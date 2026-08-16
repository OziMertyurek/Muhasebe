import type {
  FinancialAccount,
  Invoice,
  Prisma,
  RecurringExpense,
} from "#prisma/client";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";

const recurringReminderPrefix = "AUTO:RECURRING_EXPENSE:";
const creditCardStatementMarker = "AUTO:CREDIT_CARD_STATEMENT";
const creditCardDueMarker = "AUTO:CREDIT_CARD_DUE";
const invoiceDueMarker = "AUTO:INVOICE_DUE";

type CreditCardReminderAccount = Pick<
  FinancialAccount,
  "id" | "name" | "type" | "statementDay" | "dueDay"
>;

type InvoiceReminderInvoice = Pick<
  Invoice,
  "id" | "invoiceNumber" | "type" | "dueDate" | "status" | "companyId" | "deletedAt"
>;

type RecurringReminderExpense = Pick<
  RecurringExpense,
  "id" | "title" | "dayOfMonth" | "isActive" | "deletedAt"
>;

export async function syncCreditCardReminders(account: CreditCardReminderAccount) {
  if (account.type !== "CREDIT_CARD") {
    await cancelCreditCardReminders(account.id, "Finansal hesap kredi kartÄ± olmadÄ±ÄŸÄ± iÃ§in hatÄ±rlatma iptal edildi.");
    return;
  }

  if (account.statementDay) {
    await upsertImportantDate({
      where: {
        financialAccountId: account.id,
        category: "CREDIT_CARD",
        OR: [
          { description: { contains: creditCardStatementMarker } },
          { title: `${account.name} hesap kesim tarihi` },
        ],
      },
      data: {
        title: `${account.name} hesap kesim tarihi`,
        description: `${creditCardStatementMarker}\nBu kredi kartÄ± iÃ§in aylÄ±k hesap kesim tarihi hatÄ±rlatmasÄ±.`,
        category: "CREDIT_CARD",
        repeatType: "MONTHLY",
        reminderDaysBefore: 3,
        priority: "NORMAL",
        status: "PENDING",
        date: getNextMonthlyDate(account.statementDay),
        financialAccountId: account.id,
      },
      auditTitle: `Kredi kartÄ± hatÄ±rlatmasÄ± gÃ¼ncellendi: ${account.name} hesap kesim tarihi`,
    });
  } else {
    await cancelCreditCardReminder(account.id, creditCardStatementMarker);
  }

  if (account.dueDay) {
    await upsertImportantDate({
      where: {
        financialAccountId: account.id,
        category: "CREDIT_CARD",
        OR: [
          { description: { contains: creditCardDueMarker } },
          { title: `${account.name} son Ã¶deme tarihi` },
        ],
      },
      data: {
        title: `${account.name} son Ã¶deme tarihi`,
        description: `${creditCardDueMarker}\nBu kredi kartÄ± iÃ§in aylÄ±k son Ã¶deme tarihi hatÄ±rlatmasÄ±.`,
        category: "CREDIT_CARD",
        repeatType: "MONTHLY",
        reminderDaysBefore: 3,
        priority: "HIGH",
        status: "PENDING",
        date: getNextMonthlyDate(account.dueDay),
        financialAccountId: account.id,
      },
      auditTitle: `Kredi kartÄ± hatÄ±rlatmasÄ± gÃ¼ncellendi: ${account.name} son Ã¶deme tarihi`,
    });
  } else {
    await cancelCreditCardReminder(account.id, creditCardDueMarker);
  }
}

export async function cancelCreditCardReminders(financialAccountId: string, reason: string) {
  const reminders = await prisma.importantDate.findMany({
    where: {
      financialAccountId,
      category: "CREDIT_CARD",
      deletedAt: null,
      status: { not: "CANCELLED" },
      OR: [
        { description: { contains: creditCardStatementMarker } },
        { description: { contains: creditCardDueMarker } },
        { title: { contains: "hesap kesim tarihi" } },
        { title: { contains: "son Ã¶deme tarihi" } },
      ],
    },
    select: { id: true, title: true, status: true },
  });

  if (reminders.length === 0) {
    return;
  }

  await prisma.importantDate.updateMany({
    where: { id: { in: reminders.map((reminder) => reminder.id) } },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    entityType: "IMPORTANT_DATE",
    action: "STATUS_CHANGE",
    title: "Kredi kartÄ± hatÄ±rlatmalarÄ± iptal edildi",
    description: reason,
    metadata: { financialAccountId, reminderIds: reminders.map((reminder) => reminder.id) },
  });
}

export async function syncInvoiceDueReminder(invoice: InvoiceReminderInvoice) {
  const existing = await prisma.importantDate.findFirst({
    where: {
      invoiceId: invoice.id,
      category: "INVOICE",
      deletedAt: null,
      OR: [
        { description: { contains: invoiceDueMarker } },
        { title: `Fatura vadesi: ${invoice.invoiceNumber}` },
      ],
    },
  });

  if (!invoice.dueDate || invoice.status === "CANCELLED" || invoice.deletedAt) {
    if (existing && existing.status !== "CANCELLED") {
      await prisma.importantDate.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
        select: { id: true },
      });
      await createAuditLog({
        entityType: "IMPORTANT_DATE",
        entityId: existing.id,
        action: "STATUS_CHANGE",
        title: `Fatura vade hatÄ±rlatmasÄ± iptal edildi: ${invoice.invoiceNumber}`,
        description: "Fatura vadesi kaldÄ±rÄ±ldÄ±, iptal edildi veya fatura silindi.",
      });
    }
    return;
  }

  const status = invoice.status === "PAID" ? "DONE" : "PENDING";
  const description =
    invoice.type === "SALES"
      ? `${invoiceDueMarker}\nBu satÄ±ÅŸ faturasÄ±nÄ±n vadesi yaklaÅŸÄ±yor.`
      : `${invoiceDueMarker}\nBu alÄ±ÅŸ faturasÄ±nÄ±n Ã¶deme vadesi yaklaÅŸÄ±yor.`;

  await upsertImportantDate({
    existing,
    where: { invoiceId: invoice.id, category: "INVOICE", deletedAt: null },
    data: {
      title: `Fatura vadesi: ${invoice.invoiceNumber}`,
      description,
      category: "INVOICE",
      repeatType: "NONE",
      reminderDaysBefore: 3,
      priority: invoice.type === "SALES" ? "HIGH" : "NORMAL",
      status,
      date: invoice.dueDate,
      invoiceId: invoice.id,
      companyId: invoice.companyId,
    },
    auditTitle: `Fatura vade hatÄ±rlatmasÄ± gÃ¼ncellendi: ${invoice.invoiceNumber}`,
  });
}

export async function syncRecurringExpenseReminder(recurringExpense: RecurringReminderExpense) {
  const marker = `${recurringReminderPrefix}${recurringExpense.id}`;
  const existing = await prisma.importantDate.findFirst({
    where: {
      category: "EXPENSE",
      deletedAt: null,
      OR: [
        { description: { contains: marker } },
        { title: `Sabit gider: ${recurringExpense.title}` },
      ],
    },
  });

  if (!recurringExpense.isActive || recurringExpense.deletedAt) {
    if (existing && existing.status !== "CANCELLED") {
      await prisma.importantDate.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
        select: { id: true },
      });
      await createAuditLog({
        entityType: "IMPORTANT_DATE",
        entityId: existing.id,
        action: "STATUS_CHANGE",
        title: `Sabit gider hatÄ±rlatmasÄ± iptal edildi: ${recurringExpense.title}`,
        description: "Sabit gider pasif yapÄ±ldÄ± veya silindi.",
      });
    }
    return;
  }

  await upsertImportantDate({
    existing,
    where: { category: "EXPENSE", description: { contains: marker }, deletedAt: null },
    data: {
      title: `Sabit gider: ${recurringExpense.title}`,
      description: `${marker}\nBu sabit gider iÃ§in aylÄ±k Ã¶deme hatÄ±rlatmasÄ±.`,
      category: "EXPENSE",
      repeatType: "MONTHLY",
      reminderDaysBefore: 3,
      priority: "NORMAL",
      status: "PENDING",
      date: getNextMonthlyDate(recurringExpense.dayOfMonth),
    },
    auditTitle: `Sabit gider hatÄ±rlatmasÄ± gÃ¼ncellendi: ${recurringExpense.title}`,
  });
}

function getNextMonthlyDate(dayOfMonth: number, from = new Date()) {
  const target = new Date(from.getFullYear(), from.getMonth(), clampDay(from, dayOfMonth));
  target.setHours(0, 0, 0, 0);

  if (target < startOfToday(from)) {
    const nextMonth = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      clampDay(nextMonth, dayOfMonth),
    );
  }

  return target;
}

function clampDay(date: Date, dayOfMonth: number) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.min(dayOfMonth, lastDay);
}

function startOfToday(date: Date) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  today.setHours(0, 0, 0, 0);
  return today;
}

async function cancelCreditCardReminder(financialAccountId: string, marker: string) {
  await prisma.importantDate.updateMany({
    where: {
      financialAccountId,
      category: "CREDIT_CARD",
      deletedAt: null,
      status: { not: "CANCELLED" },
      description: { contains: marker },
    },
    data: { status: "CANCELLED" },
  });
}

async function upsertImportantDate({
  existing,
  where,
  data,
  auditTitle,
}: {
  existing?: { id: string } | null;
  where: Prisma.ImportantDateWhereInput;
  data: Prisma.ImportantDateUncheckedCreateInput;
  auditTitle: string;
}) {
  const current = existing ?? (await prisma.importantDate.findFirst({ where, select: { id: true } }));
  let reminderId: string;
  let action: "CREATE" | "UPDATE";

  if (current) {
    const reminder = await prisma.importantDate.update({
      where: { id: current.id },
      data,
      select: { id: true },
    });
    reminderId = reminder.id;
    action = "UPDATE";
  } else {
    const reminder = await prisma.importantDate.create({
      data,
      select: { id: true },
    });
    reminderId = reminder.id;
    action = "CREATE";
  }

  await createAuditLog({
    entityType: "IMPORTANT_DATE",
    entityId: reminderId,
    action,
    title: auditTitle,
    description:
      action === "CREATE"
        ? "Otomatik hatÄ±rlatma oluÅŸturuldu."
        : "Otomatik hatÄ±rlatma gÃ¼ncellendi.",
    after: data,
  });
}
