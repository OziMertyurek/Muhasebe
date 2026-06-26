import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateCrmCompanyAction } from "@/app/(dashboard)/crm/actions";
import { CrmCompanyForm } from "@/components/crm/crm-company-form";
import { formatCrmDateInput, formatCrmTags } from "@/lib/crm-company-utils";
import { prisma } from "@/lib/prisma";

type EditCrmCompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCrmCompanyPage({ params }: EditCrmCompanyPageProps) {
  const { id } = await params;
  const crmCompany = await prisma.crmCompany.findFirst({
    where: { id, deletedAt: null },
  });

  if (!crmCompany) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/crm/${crmCompany.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Firma takip düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {crmCompany.companyName}
          </h1>
        </div>
      </section>

      <CrmCompanyForm
        action={updateCrmCompanyAction.bind(null, crmCompany.id)}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          companyName: crmCompany.companyName,
          country: crmCompany.country,
          email: crmCompany.email,
          website: crmCompany.website,
          contactPerson: crmCompany.contactPerson,
          phone: crmCompany.phone,
          sector: crmCompany.sector,
          source: crmCompany.source,
          status: crmCompany.status,
          replyStatus: crmCompany.replyStatus,
          lastContactDate: formatCrmDateInput(crmCompany.lastContactDate),
          followUpDate: formatCrmDateInput(crmCompany.followUpDate),
          tags: formatCrmTags(crmCompany.tagsJson),
          notes: crmCompany.notes,
        }}
      />
    </div>
  );
}
