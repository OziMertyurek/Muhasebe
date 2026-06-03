import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { deleteCompanyAction } from "@/app/(dashboard)/companies/actions";
import {
  companyTypeLabels,
  formatOptionalCurrency,
  formatPlainValue,
} from "@/lib/company-utils";
import { prisma } from "@/lib/prisma";

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: CompanyDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const company = await prisma.company.findFirst({
    where: { id, deletedAt: null },
  });

  if (!company) {
    notFound();
  }

  const placeholders = [
    "Faturalar",
    "Tahsilat / Ödeme Hareketleri",
    "Giderler",
    "Önemli Tarihler",
    "Cari Ekstre",
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/companies"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Carilere dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Cari detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {company.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteCompanyAction.bind(null, company.id)}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]">
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Cari silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Firma bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Firma adı" value={company.name} />
            <InfoItem label="Cari tipi" value={companyTypeLabels[company.type]} />
            <InfoItem label="Varsayılan para birimi" value={company.defaultCurrency} />
            <InfoItem
              label="Risk limiti"
              value={formatOptionalCurrency(company.riskLimit, company.defaultCurrency)}
            />
            <InfoItem
              label="Vade günü"
              value={
                company.paymentTermDays === null ? "-" : `${company.paymentTermDays} gün`
              }
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Vergi bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Vergi no" value={formatPlainValue(company.taxNumber)} />
            <InfoItem label="Vergi dairesi" value={formatPlainValue(company.taxOffice)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">İletişim bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="E-posta" value={formatPlainValue(company.email)} />
            <InfoItem label="Telefon" value={formatPlainValue(company.phone)} />
            <InfoItem label="Ülke" value={formatPlainValue(company.country)} />
            <InfoItem label="Şehir" value={formatPlainValue(company.city)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Adres ve notlar</h2>
          <div className="mt-5 space-y-4">
            <InfoItem label="Adres" value={formatPlainValue(company.address)} />
            <InfoItem label="Notlar" value={formatPlainValue(company.notes)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {placeholders.map((title) => (
          <div key={title} className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
            <h3 className="text-sm font-semibold text-[#223028]">{title}</h3>
            <p className="mt-2 text-sm text-[#647067]">Bu alan sonraki aşamada bağlanacak.</p>
          </div>
        ))}
      </section>
    </div>
  );
}
