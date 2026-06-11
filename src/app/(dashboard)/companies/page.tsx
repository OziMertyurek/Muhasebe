import Link from "next/link";
import { CompanyType } from "@prisma/client";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteCompanyAction } from "@/app/(dashboard)/companies/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { companyTypeLabels, companyTypeOptions, formatDate } from "@/lib/company-utils";
import { buildExportHref } from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";

type CompaniesPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
  }>;
};

function getCompanyType(value?: string) {
  if (value && Object.values(CompanyType).includes(value as CompanyType)) {
    return value as CompanyType;
  }

  return undefined;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const type = getCompanyType(params?.type);
  const exportHref = buildExportHref("/exports/companies", {
    q: query,
    type,
  });
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(query ? { name: { contains: query } } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Cariler</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Cari hesaplar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Müşteri ve tedarikçi firmaları tek merkezden yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={exportHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            CSV Dışa Aktar
          </Link>
          <Link
            href="/companies/new"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Cari
          </Link>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Firma adına göre ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm cari tipleri</option>
            {companyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {companies.length === 0 ? (
          <EmptyState
            title="Henüz cari eklenmedi"
            description="İlk müşteri veya tedarikçi kaydınızı Yeni Cari butonuyla ekleyebilirsiniz."
            actionHref="/companies/new"
            actionLabel="Yeni Cari"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Firma adı</th>
                  <th className="px-4 py-3">Cari tipi</th>
                  <th className="px-4 py-3">Şehir</th>
                  <th className="px-4 py-3">Ülke</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Oluşturulma</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{company.name}</td>
                    <td className="px-4 py-3 text-[#46534b]">{companyTypeLabels[company.type]}</td>
                    <td className="px-4 py-3 text-[#46534b]">{company.city ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">{company.country ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">{company.email ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">{company.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">{company.defaultCurrency}</td>
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(company.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/companies/${company.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/companies/${company.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteCompanyAction.bind(null, company.id)}>
                          <ConfirmSubmitButton
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] text-[#8b2f28] transition hover:border-[#c79a92]"
                            message="Bu cariyi silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak. Bağlı faturalar, ödemeler ve giderler geçmiş kayıtlarda etkilenebilir."
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
