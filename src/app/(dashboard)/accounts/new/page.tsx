import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAccountAction } from "@/app/(dashboard)/accounts/actions";
import { AccountForm } from "@/components/accounts/account-form";

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/accounts"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Hesaplara dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni hesap</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Hesap ekle
          </h1>
        </div>
      </section>

      <AccountForm action={createAccountAction} submitLabel="Hesabı kaydet" />
    </div>
  );
}
