import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, LogIn, ShieldCheck } from "lucide-react";
import { getRootRouteDecision } from "@/lib/hosted-auth-flow";
import { isLocalSessionValid } from "@/lib/security-utils";

export const dynamic = "force-dynamic";

export default async function PublicEntryPage() {
  const decision = getRootRouteDecision({
    sessionValid: await isLocalSessionValid(),
  });

  if (decision === "dashboard") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f4f6f3] px-4 py-8 text-[#16201b]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#1f6f54] text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-[#607167]">Hosted Web</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">
                Muhasebe Takip
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#647067]">
                Mevcut şirket hesabınıza giriş yapın veya sistemi ilk kez kullanıyorsanız
                yeni şirket kurulumunu başlatın.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <Link
              href="/login?next=/dashboard"
              className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#b9d8c7] bg-white p-5 shadow-sm transition hover:border-[#1f6f54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                <LogIn className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">Giriş Yap</span>
                <span className="mt-1 block text-sm leading-5 text-[#647067]">
                  Kurulumu tamamlanmış şirket hesabına güvenli PIN ile erişin.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#607167] transition group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/onboarding"
              className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm transition hover:border-[#8ea99b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7e5dc]"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#eef4ef] text-[#46534b]">
                <Building2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">Yeni Şirket Kurulumu</span>
                <span className="mt-1 block text-sm leading-5 text-[#647067]">
                  Sistemi ilk kez kullanıyorsanız şirket bilgileri ve ilk PIN’i oluşturun.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#607167] transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
