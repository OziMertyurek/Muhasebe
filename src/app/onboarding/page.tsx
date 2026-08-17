import { redirect } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  DatabaseBackup,
  LockKeyhole,
  Settings2,
} from "lucide-react";
import { getCompanySettings } from "@/lib/settings-utils";
import { isOnboardingCompleted } from "@/lib/onboarding-utils";
import { isLocalPinConfigured, isLocalSessionValid } from "@/lib/security-utils";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  company: "Lütfen şirket bilgileri bölümündeki hataları düzeltin.",
  pin: "PIN en az 4 karakter olmalı ve tekrar alanıyla aynı olmalıdır.",
  backup: "Tamamlamak için yedekleme uyarısını okuduğunuzu onaylamalısınız.",
  save: "İlk kurulum kaydedilirken bir hata oluştu.",
  auth: "Bu işlemi tamamlamak için önce PIN ile giriş yapmalısınız.",
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [completed, pinConfigured, sessionValid, settings, params] = await Promise.all([
    isOnboardingCompleted(),
    isLocalPinConfigured(),
    isLocalSessionValid(),
    getCompanySettings(),
    searchParams,
  ]);

  if (completed) {
    redirect("/");
  }

  if (pinConfigured && !sessionValid) {
    redirect("/login?next=/onboarding");
  }

  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="min-h-screen bg-[#f4f6f3] px-4 py-8 text-[#16201b]">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-lg border border-[#dce2dc] bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">İlk kurulum</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Muhasebe Takip Sistemi’ne hoş geldiniz
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#647067]">
            Başlamadan önce şirket bilgilerinizi, varsayılan ayarlarınızı ve güvenli
            giriş PIN’inizi birlikte hazırlayalım.
          </p>
        </section>

        {errorMessage ? (
          <div className="rounded-md border border-[#f0c7c0] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#9f2f21]">
            {errorMessage}
          </div>
        ) : null}

        <form action="/onboarding/complete" method="post" className="space-y-5">
          <Step
            number="1"
            icon={Building2}
            title="Şirket bilgileri"
            description="Bu bilgiler Ayarlar > Şirket Bilgileri alanında daha sonra güncellenebilir."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                name="company.name"
                label="Şirket adı"
                defaultValue={settings["company.name"]}
                required
              />
              <TextField
                name="company.taxNumber"
                label="Vergi no"
                defaultValue={settings["company.taxNumber"]}
              />
              <TextField
                name="company.taxOffice"
                label="Vergi dairesi"
                defaultValue={settings["company.taxOffice"]}
              />
              <TextField
                name="company.email"
                label="E-posta"
                type="email"
                defaultValue={settings["company.email"]}
              />
              <TextField
                name="company.phone"
                label="Telefon"
                defaultValue={settings["company.phone"]}
              />
              <TextField
                name="company.country"
                label="Ülke"
                defaultValue={settings["company.country"] || "Türkiye"}
              />
              <TextField
                name="company.city"
                label="Şehir"
                defaultValue={settings["company.city"]}
              />
              <div className="md:col-span-2">
                <label htmlFor="company.address" className="text-sm font-semibold">
                  Adres
                </label>
                <textarea
                  id="company.address"
                  name="company.address"
                  defaultValue={settings["company.address"]}
                  rows={3}
                  className="mt-2 w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
                />
              </div>
            </div>
          </Step>

          <Step
            number="2"
            icon={Settings2}
            title="Varsayılan ayarlar"
            description="Fatura ve formlarda varsayılan olarak kullanılacak temel değerler."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="app.defaultCurrency" className="text-sm font-semibold">
                  Varsayılan para birimi
                </label>
                <select
                  id="app.defaultCurrency"
                  name="app.defaultCurrency"
                  defaultValue={settings["app.defaultCurrency"] || "TRY"}
                  className="mt-2 w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <TextField
                name="app.defaultVatRate"
                label="Varsayılan KDV oranı"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings["app.defaultVatRate"] || "20"}
              />
            </div>
          </Step>

          <Step
            number="3"
            icon={LockKeyhole}
            title={pinConfigured ? "PIN durumu" : "PIN oluştur"}
            description={
              pinConfigured
                ? "Giriş PIN’i zaten tanımlı. İsterseniz bu adımda yeni PIN belirleyebilirsiniz."
                : "Uygulamayı açan başka kişilerin verilerinizi görmesini engellemek için PIN belirleyin."
            }
          >
            {pinConfigured ? (
              <div className="mb-4 rounded-md border border-[#c7dfcf] bg-[#f4fbf6] px-4 py-3 text-sm text-[#1f6f54]">
                Mevcut PIN korunabilir. Değiştirmek istemiyorsanız aşağıdaki alanları boş bırakın.
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                name="pin"
                label={pinConfigured ? "Yeni PIN" : "PIN"}
                type="password"
                autoComplete="new-password"
                minLength={4}
                required={!pinConfigured}
              />
              <TextField
                name="pinConfirm"
                label="PIN tekrar"
                type="password"
                autoComplete="new-password"
                minLength={4}
                required={!pinConfigured}
              />
            </div>
          </Step>

          <Step
            number="4"
            icon={DatabaseBackup}
            title="Yedekleme uyarısı"
            description="Hosted Web ortamında altyapı yedekleri operasyondan, kullanıcı dışa aktarımları uygulama içinden yönetilir."
          >
            <div className="rounded-md border border-[#ead7a8] bg-[#fffaf0] p-4 text-sm leading-6 text-[#745214]">
              <p>GitHub sadece kodu saklar.</p>
              <p>Canlı veritabanı ve dosyalar hosted ortamın kalıcı altyapısında tutulur.</p>
              <p>Düzenli olarak Ayarlar &gt; Yedekleme üzerinden iş verisi dışa aktarımı alınabilir.</p>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-[#46534b]">
              <input
                type="checkbox"
                name="backupAcknowledged"
                value="yes"
                required
                className="mt-1 h-4 w-4 rounded border-[#cfd8cf] text-[#1f6f54]"
              />
              <span>Yedekleme uyarısını okudum ve düzenli tam yedek almam gerektiğini anladım.</span>
            </label>
          </Step>

          <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#1f6f54]" />
                <div>
                  <h2 className="text-lg font-semibold">Kurulumu tamamla</h2>
                  <p className="mt-1 text-sm text-[#647067]">
                    Bilgiler güvenli ayarlara kaydedilecek ve dashboard açılacak.
                  </p>
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1f6f54] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185741]"
              >
                Tamamla
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </form>

        <div className="flex items-start gap-2 rounded-lg border border-[#dce2dc] bg-white px-4 py-3 text-sm text-[#647067] shadow-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#745214]" />
          <p>
            İlk kurulumdan sonra bu bilgileri Ayarlar sayfasından ayrı ayrı
            güncelleyebilirsiniz.
          </p>
        </div>
      </div>
    </main>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  description,
  children,
}: {
  number: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f] shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[#607167]">
            Adım {number}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#647067]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  name,
  label,
  type = "text",
  defaultValue = "",
  autoComplete,
  required,
  min,
  minLength,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  min?: string;
  minLength?: number;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
        {required ? <span className="text-[#9f2f21]"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        min={min}
        minLength={minLength}
        step={step}
        className="mt-2 w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
      />
    </div>
  );
}
