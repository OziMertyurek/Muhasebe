import { AlertTriangle } from "lucide-react";

export function HostedDatabaseUnavailableNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f3] px-4 py-10 text-[#16201b]">
      <section className="w-full max-w-xl rounded-lg border border-[#ead7a8] bg-white p-6 shadow-sm">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#fff6df] text-[#745214]">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="mt-5 text-sm font-medium text-[#745214]">Hosted Web</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Veritabani baglantisi kurulamadi
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#647067]">
          Uygulama calisiyor, ancak sirket verilerine ulasmak icin PostgreSQL baglantisi
          gereklidir. Lutfen hosted ortamindaki DATABASE_URL ayarini ve veritabani
          erisimini kontrol edin.
        </p>
      </section>
    </main>
  );
}
