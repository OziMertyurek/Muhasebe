import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateCompanyAction } from "@/app/(dashboard)/companies/actions";
import { CompanyForm } from "@/components/companies/company-form";
import { prisma } from "@/lib/prisma";

type EditCompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, deletedAt: null },
  });

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/companies/${company.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Cari düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {company.name}
          </h1>
        </div>
      </section>

      <CompanyForm
        action={updateCompanyAction.bind(null, company.id)}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          name: company.name,
          type: company.type,
          taxNumber: company.taxNumber,
          taxOffice: company.taxOffice,
          email: company.email,
          phone: company.phone,
          country: company.country,
          city: company.city,
          address: company.address,
          defaultCurrency: company.defaultCurrency,
          riskLimit: company.riskLimit?.toString() ?? null,
          paymentTermDays: company.paymentTermDays,
          notes: company.notes,
        }}
      />
    </div>
  );
}
