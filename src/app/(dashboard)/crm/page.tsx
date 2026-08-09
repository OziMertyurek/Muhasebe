import Link from "next/link";
import { Download, Eye, Pencil, Plus, Search, Upload } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpHint } from "@/components/ui/help-hint";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildCrmCompanyWhere,
  crmCompanyStatusLabels,
  crmCompanyStatusOptions,
  crmReplyStatusLabels,
  crmReplyStatusOptions,
  formatCrmDate,
  formatCrmValue,
  getCrmCompanyStatus,
  getCrmReplyStatus,
  getCrmReplyTone,
  getCrmStatusTone,
  parseCrmDate,
} from "@/lib/crm-company-utils";
import { buildExportHref } from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";

type CrmPageProps = {
  searchParams?: Promise<{
    q?: string;
    country?: string;
    status?: string;
    replyStatus?: string;
    followUpFrom?: string;
    followUpTo?: string;
    source?: string;
  }>;
};

export default async function CrmPage({ searchParams }: CrmPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const country = params?.country?.trim() ?? "";
  const source = params?.source?.trim() ?? "";
  const status = getCrmCompanyStatus(params?.status);
  const replyStatus = getCrmReplyStatus(params?.replyStatus);
  const followUpFrom = parseCrmDate(params?.followUpFrom);
  const followUpTo = parseCrmDate(params?.followUpTo);
  const where = buildCrmCompanyWhere({
    q: query,
    country,
    source,
    status,
    replyStatus,
    followUpFrom,
    followUpTo,
  });
  const exportHref = buildExportHref("/exports/crm-companies", {
    q: query,
    country,
    status,
    replyStatus,
    followUpFrom: params?.followUpFrom,
    followUpTo: params?.followUpTo,
    source,
  });
  const crmCompanies = await prisma.crmCompany.findMany({
    where,
    orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
    include: {
      linkedCompany: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Firma Takip</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Dış ticaret firma listesi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-[#647067]">
            Yurt dışı potansiyel firmaları, durumları ve takip tarihlerini ayrı bir CRM listesinde izleyin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/crm/import"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
          >
            <Upload className="h-4 w-4" />
            İçe Aktar
          </Link>
          <a
            href={exportHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            CSV Dışa Aktar
          </a>
          <Link
            href="/crm/new"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Firma
          </Link>
        </div>
      </section>

      <HelpHint
        title="Firma takip için ipucu"
        items={[
          "Excel'deki potansiyel firma listenizi burada düzenli takip edin.",
          "Takip tarihi ve durum alanlarını güncel tutun.",
          "Cari kayıtları bu listeye otomatik karışmaz.",
        ]}
        href="/help"
      />

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_150px_180px_160px_145px_145px_145px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Firma, e-posta veya yetkili ara"
              className="h-11 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
            />
          </label>
          <input
            name="country"
            defaultValue={country}
            placeholder="Ülke"
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">Tüm durumlar</option>
            {crmCompanyStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="replyStatus"
            defaultValue={replyStatus ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">Tüm cevaplar</option>
            {crmReplyStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            name="followUpFrom"
            type="date"
            defaultValue={params?.followUpFrom ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
            title="Takip tarihi başlangıç"
          />
          <input
            name="followUpTo"
            type="date"
            defaultValue={params?.followUpTo ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
            title="Takip tarihi bitiş"
          />
          <input
            name="source"
            defaultValue={source}
            placeholder="Kaynak"
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          />
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] hover:bg-white">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white">
        {crmCompanies.length === 0 ? (
          <EmptyState
            title="Henüz firma takip kaydı yok"
            description="İlk potansiyel firmayı ekleyerek dış ticaret takibinizi başlatabilirsiniz."
            actionHref="/crm/new"
            actionLabel="Yeni Firma"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f5f7f3] text-xs font-semibold uppercase tracking-[0.08em] text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Firma adı</th>
                  <th className="px-4 py-3">Ülke</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Yetkili</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Cevap</th>
                  <th className="px-4 py-3">Son iletişim</th>
                  <th className="px-4 py-3">Takip tarihi</th>
                  <th className="px-4 py-3">Kaynak</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {crmCompanies.map((crmCompany) => (
                  <tr key={crmCompany.id} className="border-t border-[#e5e9e5] transition hover:bg-[#f7f9f7]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {crmCompany.companyName}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{formatCrmValue(crmCompany.country)}</td>
                    <td className="px-4 py-3 text-[#46534b]">{formatCrmValue(crmCompany.email)}</td>
                    <td className="px-4 py-3 text-[#46534b]">{formatCrmValue(crmCompany.contactPerson)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={getCrmStatusTone(crmCompany.status)}>
                        {crmCompanyStatusLabels[crmCompany.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={getCrmReplyTone(crmCompany.replyStatus)}>
                        {crmReplyStatusLabels[crmCompany.replyStatus]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatCrmDate(crmCompany.lastContactDate)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatCrmDate(crmCompany.followUpDate)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{formatCrmValue(crmCompany.source)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/crm/${crmCompany.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/crm/${crmCompany.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
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
