import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import {
  getSafeRedirectPath,
  isHostedProductionRuntime,
  isLocalPinConfigured,
  isLocalSessionValid,
} from "@/lib/security-utils";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    loggedOut?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params?.next);
  const pinConfigured = await isLocalPinConfigured();
  const requiresPinSetup = !pinConfigured && isHostedProductionRuntime();

  if (!pinConfigured && !requiresPinSetup) {
    redirect(nextPath);
  }

  if (await isLocalSessionValid()) {
    redirect(nextPath);
  }

  const hasInvalidError = params?.error === "invalid";
  const hasPinRequiredError = params?.error === "pin-required" || requiresPinSetup;
  const isLoggedOut = params?.loggedOut === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f3] px-4 py-10 text-[#16201b]">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-[#dce2dc] bg-white shadow-sm md:grid-cols-[1fr_420px]">
        <div className="hidden bg-[#eef4ef] p-8 md:flex md:flex-col md:justify-between">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#1f6f54] text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-normal text-[#16201b]">
              Muhasebe Takip
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#647067]">
              Hosted Muhasebe Takip hesabınıza güvenli PIN ile erişin. Verileriniz
              ortak PostgreSQL veritabanında saklanır.
            </p>
          </div>
          <div className="rounded-lg border border-[#d1ddd3] bg-white/70 p-4 text-sm leading-6 text-[#46534b]">
            Aynı şirket verilerine bilgisayar, telefon veya tabletten yeniden giriş yaparak ulaşabilirsiniz.
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-[#607167]">Güvenli giriş</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                Muhasebe Takip hesabına giriş
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#647067]">
                Devam etmek için şirket hesabınızın güvenli PIN’ini girin.
              </p>
            </div>
          </div>

          {hasInvalidError ? (
            <div className="mt-5 rounded-md border border-[#f0c7c0] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#9f2f21]">
              PIN hatalı. Lütfen tekrar deneyin.
            </div>
          ) : null}

          {hasPinRequiredError ? (
            <div className="mt-5 rounded-md border border-[#f0c7c0] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#9f2f21]">
              Önce yeni şirket kurulumu tamamlanmalı ve güvenli giriş PIN’i oluşturulmalıdır.
            </div>
          ) : null}

          {isLoggedOut ? (
            <div className="mt-5 rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 py-3 text-sm text-[#46534b]">
              Oturum kapatıldı. Yeniden giriş yapabilirsiniz.
            </div>
          ) : null}

          <form action="/login/submit" method="post" className="mt-7 space-y-5">
            <input type="hidden" name="next" value={nextPath} />
            <div>
              <label htmlFor="pin" className="text-sm font-semibold text-[#16201b]">
                PIN / Şifre
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                autoComplete="current-password"
                autoFocus={!requiresPinSetup}
                className="mt-2 h-11 w-full rounded-md border border-[#cfd8cf] bg-white px-3 text-sm text-[#16201b] outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
                disabled={requiresPinSetup}
                required
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#185741] disabled:cursor-not-allowed disabled:bg-[#9aa79f]"
              disabled={requiresPinSetup}
            >
              Giriş Yap
            </button>
          </form>

          <p className="mt-6 border-t border-[#edf1ed] pt-4 text-xs leading-5 text-[#647067]">
            Bu PIN, mevcut Hosted Web hesabına erişimi korur. Yeni cihazlarda aynı şirket verilerine
            ulaşmak için tekrar giriş yapılması gerekir.
          </p>
        </div>
      </section>
    </main>
  );
}
