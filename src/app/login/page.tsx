import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import {
  getSafeRedirectPath,
  isLocalPinConfigured,
  isLocalSessionValid,
} from "@/lib/security-utils";

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

  if (!pinConfigured) {
    redirect(nextPath);
  }

  if (await isLocalSessionValid()) {
    redirect(nextPath);
  }

  const hasInvalidError = params?.error === "invalid";
  const isLoggedOut = params?.loggedOut === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4 py-10 text-[#16201b]">
      <section className="w-full max-w-md rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-[#607167]">Güvenli giriş</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              Local Muhasebe Takip Sistemi
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              Devam etmek için uygulama PIN’inizi girin.
            </p>
          </div>
        </div>

        {hasInvalidError ? (
          <div className="mt-5 rounded-md border border-[#f0c7c0] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#9f2f21]">
            PIN hatalı. Lütfen tekrar deneyin.
          </div>
        ) : null}

        {isLoggedOut ? (
          <div className="mt-5 rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 py-3 text-sm text-[#46534b]">
            Oturum kapatıldı. Yeniden giriş yapabilirsiniz.
          </div>
        ) : null}

        <form action="/login/submit" method="post" className="mt-6 space-y-4">
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
              autoFocus
              className="mt-2 w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
              required
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-[#1f6f54] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185741]"
          >
            Giriş Yap
          </button>
        </form>
      </section>
    </main>
  );
}
