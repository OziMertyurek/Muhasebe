import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createImportantDateAction } from "@/app/(dashboard)/important-dates/actions";
import { ImportantDateForm } from "@/components/important-dates/important-date-form";
import { getImportantDateFormOptions } from "@/lib/important-date-options";

export default async function NewImportantDatePage() {
  const options = await getImportantDateFormOptions();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/important-dates"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Önemli tarihlere dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni önemli tarih</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Hatırlatma ekle
          </h1>
        </div>
      </section>

      <ImportantDateForm
        action={createImportantDateAction}
        companies={options.companies}
        invoices={options.invoices}
        expenses={options.expenses}
        financialAccounts={options.financialAccounts}
        submitLabel="Hatırlatmayı kaydet"
      />
    </div>
  );
}
