import Link from "next/link";
import { FinancialAccountType } from "#prisma/client";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/app/(dashboard)/accounts/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { accountTypeLabels, accountTypeOptions } from "@/lib/account-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";

type AccountsPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    active?: string;
  }>;
};

function getAccountType(value?: string) {
  if (value && Object.values(FinancialAccountType).includes(value as FinancialAccountType)) {
    return value as FinancialAccountType;
  }

  return undefined;
}

function getActiveFilter(value?: string) {
  if (value === "active") {
    return true;
  }

  if (value === "passive") {
    return false;
  }

  return undefined;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const type = getAccountType(params?.type);
  const isActive = getActiveFilter(params?.active);
  const accounts = await prisma.financialAccount.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [{ name: { contains: query } }, { bankName: { contains: query } }],
          }
        : {}),
      ...(type ? { type } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Kasa & Banka</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Finansal hesaplar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Nakit kasa, banka, kredi kartÄ±, POS ve dÃ¶viz hesaplarÄ±nÄ± yÃ¶netin.
          </p>
        </div>
        <Link
          href="/accounts/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <Plus className="h-4 w-4" />
          Yeni Hesap
        </Link>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_170px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Hesap adÄ± veya banka adÄ±na gÃ¶re ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">TÃ¼m hesap tipleri</option>
            {accountTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="active"
            defaultValue={params?.active ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">TÃ¼m durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {accounts.length === 0 ? (
          <EmptyState
            title="HenÃ¼z hesap eklenmedi"
            description="Ä°lk kasa, banka veya kredi kartÄ± hesabÄ±nÄ±zÄ± Yeni Hesap butonuyla ekleyebilirsiniz."
            actionHref="/accounts/new"
            actionLabel="Yeni Hesap"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Hesap adÄ±</th>
                  <th className="px-4 py-3">Hesap tipi</th>
                  <th className="px-4 py-3">Banka</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">AÃ§Ä±lÄ±ÅŸ bakiyesi</th>
                  <th className="px-4 py-3">Mevcut bakiye</th>
                  <th className="px-4 py-3">Aktif mi?</th>
                  <th className="px-4 py-3 text-right">Ä°ÅŸlemler</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{account.name}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {accountTypeLabels[account.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{account.bankName ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">{account.currency}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(account.openingBalance, account.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(account.currentBalance, account.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={account.isActive ? "positive" : "neutral"}>
                        {account.isActive ? "Aktif" : "Pasif"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/accounts/${account.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/accounts/${account.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="DÃ¼zenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteAccountAction.bind(null, account.id)}>
                          <ConfirmSubmitButton
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] text-[#8b2f28] transition hover:border-[#c79a92]"
                            message="Bu finansal hesabÄ± silmek istediÄŸine emin misin? KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±nacak. BaÄŸlÄ± hareketler geÃ§miÅŸte gÃ¶rÃ¼nmeye devam edebilir."
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
