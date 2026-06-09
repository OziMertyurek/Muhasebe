"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4 py-10 text-[#16201b]">
      <section className="w-full max-w-lg rounded-lg border border-[#dce2dc] bg-white p-6 text-center shadow-sm">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#fdecea] text-[#8b2f28]">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-normal">Bir hata oluştu</h1>
        <p className="mt-3 text-sm leading-6 text-[#647067]">
          İşlem tamamlanamadı. Sayfayı yeniden deneyebilir veya ana sayfaya dönebilirsiniz.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <RefreshCw className="h-4 w-4" />
            Tekrar dene
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </section>
    </main>
  );
}
