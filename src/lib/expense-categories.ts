import { prisma } from "@/lib/prisma";

const defaultExpenseCategoryNames = [
  "Kira",
  "Muhasebe",
  "İnternet",
  "Telefon",
  "Kargo",
  "Ofis",
  "Vergi",
  "Yazılım",
  "Banka Masrafı",
  "Araç",
  "Numune",
  "Diğer",
];

export async function ensureDefaultExpenseCategories() {
  const categoryCount = await prisma.expenseCategory.count();

  if (categoryCount > 0) {
    return;
  }

  await prisma.expenseCategory.createMany({
    data: defaultExpenseCategoryNames.map((name) => ({ name })),
  });
}

export async function getActiveExpenseCategories() {
  await ensureDefaultExpenseCategories();

  return prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
