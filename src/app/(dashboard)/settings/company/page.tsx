import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateCompanySettingsAction } from "@/app/(dashboard)/settings/company/actions";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { getCompanySettings } from "@/lib/settings-utils";

type CompanySettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export default async function CompanySettingsPage({
  searchParams,
}: CompanySettingsPageProps) {
  const [settings, params] = await Promise.all([getCompanySettings(), searchParams]);

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ayarlara dön
        </Link>
        <p className="mt-4 text-sm font-medium text-[#607167]">Ayarlar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Şirket bilgileri
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Şirket bilgileri ve varsayılan para birimi/KDV ayarları AppSetting tablosunda saklanır.
        </p>
      </section>

      {params?.saved === "1" ? (
        <div className="rounded-md border border-[#b9d8c7] bg-[#f1faf4] px-4 py-3 text-sm font-medium text-[#14543f]">
          Şirket ayarları başarıyla kaydedildi.
        </div>
      ) : null}

      <CompanySettingsForm action={updateCompanySettingsAction} initialValues={settings} />
    </div>
  );
}
