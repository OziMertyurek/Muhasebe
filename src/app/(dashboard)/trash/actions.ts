"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getTrashType,
  isSupportedTrashType,
  restoreRecord,
  type TrashRecordType,
} from "@/lib/trash-utils";

const listPathsByType: Record<TrashRecordType, string[]> = {
  companies: ["/companies"],
  invoices: ["/invoices", "/reports", "/"],
  payments: ["/payments", "/invoices", "/reports", "/"],
  accounts: ["/accounts"],
  expenses: ["/expenses", "/reports", "/"],
  "recurring-expenses": ["/recurring-expenses", "/"],
  "important-dates": ["/important-dates", "/"],
  files: ["/files"],
  "ai-extractions": ["/ai-extraction"],
};

export async function restoreTrashRecordAction(type: TrashRecordType, id: string) {
  const safeType = getTrashType(type);

  if (!safeType || !isSupportedTrashType(safeType)) {
    redirect("/trash?error=unsupported");
  }

  try {
    await restoreRecord(safeType, id);
  } catch {
    redirect(`/trash?type=${safeType}&error=restore`);
  }

  revalidatePath("/trash");
  for (const path of listPathsByType[safeType]) {
    revalidatePath(path);
  }

  redirect(`/trash?type=${safeType}&restored=1`);
}
