import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { deleteCrmCompanyAction } from "@/app/(dashboard)/crm/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  crmCompanyStatusLabels,
  crmReplyStatusLabels,
  formatCrmDate,
  formatCrmTags,
  formatCrmValue,
  getCrmReplyTone,
  getCrmStatusTone,
} from "@/lib/crm-company-utils";
import { prisma } from "@/lib/prisma";

type CrmCompanyDetailPageProps = {
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

export default async function CrmCompanyDetailPage({
  params,
  searchParams,
}: CrmCompanyDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const crmCompany = await prisma.crmCompany.findFirst({
    where: { id, deletedAt: null },
    include: {
      linkedCompany: { select: { id: true, name: true } },
    },
  });

  if (!crmCompany) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/crm"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Firma takibe dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Firma takip detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {crmCompany.companyName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/${crmCompany.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteCrmCompanyAction.bind(null, crmCompany.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] transition hover:border-[#c79a92] hover:bg-[#fff7f5]"
              message="Bu firma takip kaydını silmek istediğine emin misin?"
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Firma takip kaydı silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-6">
          <h2 className="text-base font-semibold text-[#16201b]">Firma bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Firma adı" value={crmCompany.companyName} />
            <InfoItem label="Ülke" value={formatCrmValue(crmCompany.country)} />
            <InfoItem label="E-posta" value={formatCrmValue(crmCompany.email)} />
            <InfoItem label="Web sitesi" value={formatCrmValue(crmCompany.website)} />
            <InfoItem label="Yetkili kişi" value={formatCrmValue(crmCompany.contactPerson)} />
            <InfoItem label="Telefon" value={formatCrmValue(crmCompany.phone)} />
            <InfoItem label="Sektör" value={formatCrmValue(crmCompany.sector)} />
            <InfoItem label="Kaynak" value={formatCrmValue(crmCompany.source)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-6">
          <h2 className="text-base font-semibold text-[#16201b]">Takip durumu</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-[#607167]">Durum</p>
              <div className="mt-2">
                <StatusBadge tone={getCrmStatusTone(crmCompany.status)}>
                  {crmCompanyStatusLabels[crmCompany.status]}
                </StatusBadge>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#607167]">Cevap durumu</p>
              <div className="mt-2">
                <StatusBadge tone={getCrmReplyTone(crmCompany.replyStatus)}>
                  {crmReplyStatusLabels[crmCompany.replyStatus]}
                </StatusBadge>
              </div>
            </div>
            <InfoItem label="Son iletişim tarihi" value={formatCrmDate(crmCompany.lastContactDate)} />
            <InfoItem label="Takip tarihi" value={formatCrmDate(crmCompany.followUpDate)} />
            <InfoItem label="Etiketler" value={formatCrmValue(formatCrmTags(crmCompany.tagsJson))} />
            <div>
              <p className="text-xs font-semibold uppercase text-[#607167]">Bağlı cari</p>
              {crmCompany.linkedCompany ? (
                <Link
                  href={`/companies/${crmCompany.linkedCompany.id}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
                >
                  {crmCompany.linkedCompany.name}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="mt-1 text-sm leading-6 text-[#223028]">-</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-6">
        <h2 className="text-base font-semibold text-[#16201b]">Notlar</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#46534b]">
          {formatCrmValue(crmCompany.notes)}
        </p>
      </section>
    </div>
  );
}
