import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { isLocalPinConfigured } from "@/lib/security-utils";

export const dynamic = "force-dynamic";

type SecuritySettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  current: "Mevcut PIN hatalı. Lütfen tekrar deneyin.",
  length: "Yeni PIN en az 4 karakter olmalıdır.",
  match: "Yeni PIN ve tekrar alanı aynı olmalıdır.",
};

export default async function SecuritySettingsPage({
  searchParams,
}: SecuritySettingsPageProps) {
  const params = await searchParams;
  const pinConfigured = await isLocalPinConfigured();
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f6f54]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ayarlara dön
        </Link>
        <p className="mt-5 text-sm font-medium text-[#607167]">Güvenlik</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Local PIN / Şifre
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Bu PIN sadece bu local uygulamaya giriş için kullanılır. Online kullanıcı
          hesabı oluşturmaz.
        </p>
      </section>

      {!pinConfigured ? (
        <div className="rounded-lg border border-[#f0d9a2] bg-[#fffaf0] p-4 text-sm text-[#745214]">
          Henüz PIN belirlenmemiş. Uygulama bu bilgisayarda doğrudan açılabilir.
          Aşağıdan PIN belirleyerek giriş ekranını aktif edebilirsiniz.
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-[#cfd8cf] bg-white p-4 text-sm text-[#46534b] shadow-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1f6f54]" />
          <div>
            <p className="font-semibold text-[#16201b]">PIN koruması aktif</p>
            <p className="mt-1">
              Uygulama kapatılıp tekrar açıldığında ya da çıkış yapıldığında giriş
              ekranı gösterilir.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">
              {pinConfigured ? "PIN değiştir" : "PIN belirle"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#647067]">
              PIN veritabanında düz metin olarak saklanmaz; tek yönlü hash ile tutulur.
            </p>
          </div>
        </div>

        {params?.saved === "1" ? (
          <div className="mt-5 rounded-md border border-[#c7dfcf] bg-[#f4fbf6] px-4 py-3 text-sm font-medium text-[#1f6f54]">
            PIN ayarı başarıyla kaydedildi.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-md border border-[#f0c7c0] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#9f2f21]">
            {errorMessage}
          </div>
        ) : null}

        <form
          action="/settings/security/update"
          method="post"
          className="mt-6 grid gap-5 lg:grid-cols-2"
        >
          {pinConfigured ? (
            <Field
              id="currentPin"
              name="currentPin"
              label="Mevcut PIN"
              autoComplete="current-password"
              required
            />
          ) : null}

          <Field
            id="newPin"
            name="newPin"
            label="Yeni PIN"
            autoComplete="new-password"
            helpText="En az 4 karakter olmalıdır. Sadece rakam olmak zorunda değildir."
            required
          />

          <Field
            id="confirmPin"
            name="confirmPin"
            label="Yeni PIN tekrar"
            autoComplete="new-password"
            required
          />

          <div className="flex items-end gap-3 lg:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-[#1f6f54] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185741]"
            >
              {pinConfigured ? "PIN’i Güncelle" : "PIN Belirle"}
            </button>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-md border border-[#cfd8cf] bg-white px-4 py-2.5 text-sm font-semibold text-[#46534b] transition hover:border-[#8ea99b]"
            >
              İptal
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  helpText,
  autoComplete,
  required,
}: {
  id: string;
  name: string;
  label: string;
  helpText?: string;
  autoComplete: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-[#16201b]">
        {label}
        {required ? <span className="text-[#9f2f21]"> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        minLength={4}
        required={required}
        className="mt-2 w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
      />
      {helpText ? <p className="mt-2 text-xs leading-5 text-[#647067]">{helpText}</p> : null}
    </div>
  );
}
