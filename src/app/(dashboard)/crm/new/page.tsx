import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCrmCompanyAction } from "@/app/(dashboard)/crm/actions";
import { CrmCompanyForm } from "@/components/crm/crm-company-form";

export default function NewCrmCompanyPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/crm"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Firma takibe dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni firma</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Firma takip kaydı ekle
          </h1>
        </div>
      </section>

      <CrmCompanyForm action={createCrmCompanyAction} submitLabel="Firmayı kaydet" />
    </div>
  );
}
