import type {
  ImportantDateCategory,
  Priority,
  ReminderStatus,
  RepeatType,
} from "#prisma/client";

export const importantDateCategoryLabels: Record<ImportantDateCategory, string> = {
  GENERAL: "Genel",
  CREDIT_CARD: "Kredi KartÄ±",
  TAX: "Vergi",
  CONTRACT: "SÃ¶zleÅŸme",
  VEHICLE: "AraÃ§",
  INVOICE: "Fatura",
  EXPENSE: "Gider",
  COMPANY: "Cari / Firma",
  OTHER: "DiÄŸer",
};

export const repeatTypeLabels: Record<RepeatType, string> = {
  NONE: "Tek seferlik",
  DAILY: "GÃ¼nlÃ¼k",
  WEEKLY: "HaftalÄ±k",
  MONTHLY: "AylÄ±k",
  YEARLY: "YÄ±llÄ±k",
};

export const priorityLabels: Record<Priority, string> = {
  LOW: "DÃ¼ÅŸÃ¼k",
  NORMAL: "Normal",
  HIGH: "YÃ¼ksek",
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  PENDING: "Bekliyor",
  DONE: "TamamlandÄ±",
  CANCELLED: "Ä°ptal",
};

export const importantDateCategoryOptions = Object.entries(importantDateCategoryLabels).map(
  ([value, label]) => ({ value: value as ImportantDateCategory, label }),
);

export const repeatTypeOptions = Object.entries(repeatTypeLabels).map(([value, label]) => ({
  value: value as RepeatType,
  label,
}));

export const priorityOptions = Object.entries(priorityLabels).map(([value, label]) => ({
  value: value as Priority,
  label,
}));

export const reminderStatusOptions = Object.entries(reminderStatusLabels).map(
  ([value, label]) => ({ value: value as ReminderStatus, label }),
);

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatReminderDays(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value} gÃ¼n Ã¶nce`;
}

export function formatOptionalTime(value: string | null) {
  return value || "-";
}

export function getLocalDateRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getRelatedRecordLabel(importantDate: {
  company?: { name: string } | null;
  invoice?: { invoiceNumber: string } | null;
  expense?: { title: string } | null;
  financialAccount?: { name: string } | null;
}) {
  if (importantDate.company) {
    return importantDate.company.name;
  }

  if (importantDate.invoice) {
    return importantDate.invoice.invoiceNumber;
  }

  if (importantDate.expense) {
    return importantDate.expense.title;
  }

  if (importantDate.financialAccount) {
    return importantDate.financialAccount.name;
  }

  return "-";
}
