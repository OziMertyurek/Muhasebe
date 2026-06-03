import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateAccountAction } from "@/app/(dashboard)/accounts/actions";
import { AccountForm } from "@/components/accounts/account-form";
import { prisma } from "@/lib/prisma";

type EditAccountPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { id } = await params;
  const account = await prisma.financialAccount.findFirst({
    where: { id, deletedAt: null },
  });

  if (!account) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/accounts/${account.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Hesap düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {account.name}
          </h1>
        </div>
      </section>

      <AccountForm
        action={updateAccountAction.bind(null, account.id)}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          name: account.name,
          type: account.type,
          bankName: account.bankName,
          iban: account.iban,
          currency: account.currency,
          openingBalance: account.openingBalance.toString(),
          currentBalance: account.currentBalance.toString(),
          creditLimit: account.creditLimit?.toString() ?? null,
          statementDay: account.statementDay,
          dueDay: account.dueDay,
          isActive: account.isActive,
          notes: account.notes,
        }}
      />
    </div>
  );
}
