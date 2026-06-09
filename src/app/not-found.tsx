import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4 py-10 text-[#16201b]">
      <section className="w-full max-w-lg rounded-lg border border-[#dce2dc] bg-white p-6 text-center shadow-sm">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#fff4dc] text-[#765116]">
          <SearchX className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-normal">Kayıt bulunamadı</h1>
        <p className="mt-3 text-sm leading-6 text-[#647067]">
          Aradığınız sayfa veya kayıt silinmiş, taşınmış ya da artık erişilebilir olmayabilir.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfaya dön
        </Link>
      </section>
    </main>
  );
}
