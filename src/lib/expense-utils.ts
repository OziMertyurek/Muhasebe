import type { ExpenseStatus } from "#prisma/client";

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  UNPAID: "Ã–denmedi",
  PAID: "Ã–dendi",
  CANCELLED: "Ä°ptal",
};

export const expenseStatusOptions: Array<{ value: ExpenseStatus; label: string }> = [
  { value: "UNPAID", label: expenseStatusLabels.UNPAID },
  { value: "PAID", label: expenseStatusLabels.PAID },
  { value: "CANCELLED", label: expenseStatusLabels.CANCELLED },
];

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
