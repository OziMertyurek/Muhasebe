import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  DatabaseBackup,
  History,
  Info,
  Monitor,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { appInfo } from "@/lib/app-info";
import { isOnboardingCompleted } from "@/lib/onboarding-utils";
import { isLocalPinConfigured } from "@/lib/security-utils";

export const dynamic = "force-dynamic";

const settingCards = [
  {
    title: "Şirket Bilgileri",
    description: "Şirket adı, vergi bilgileri, iletişim ve varsayılan ayarları düzenleyin.",
    href: "/settings/company",
    icon: Building2,
  },
  {
    title: "Yedekleme",
    description: "SQLite veritabanı yedeğini indirin ve upload dosyaları için kontrol listesini izleyin.",
    href: "/settings/backup",
    icon: DatabaseBackup,
  },
  {
    title: "Sistem Durumu",
    description: "Veritabanı, yedekleme, PIN, Python ve MarkItDown kontrollerini görün.",
    href: "/settings/system-status",
    icon: Activity,
  },
  {
    title: "Güvenlik / PIN",
    description: "Local giriş PIN'ini belirleyin veya değiştirin.",
    href: "/settings/security",
    icon: ShieldCheck,
  },
  {
    title: "Silinen Kayıtlar",
    description: "Çöp kutusuna taşınan kayıtları inceleyin ve gerektiğinde geri yükleyin.",
    href: "/trash",
    icon: Trash2,
  },
  {
    title: "İşlem Geçmişi",
    description: "Sistemde yapılan önemli işlemleri görüntüleyin.",
    href: "/audit-logs",
    icon: History,
  },
  {
    title: "Uygulama Bilgileri",
    description: "Local çalışma modu, veri kaynağı ve aktif modülleri görün.",
    href: "/settings#app-info",
    icon: Info,
  },
];

const activeModules = [
  "Cariler",
  "Faturalar",
  "Tahsilat / Ödeme",
  "Kasa & Banka",
  "Giderler",
  "Sabit Giderler",
  "Önemli Tarihler",
  "Raporlar",
  "Dosya Arşivi",
  "AI/OCR Fatura Okuma Hazırlık",
  "CSV Export",
  "PDF Çıktı",
  "Ayarlar / Yedekleme",
  "Cari Ekstre",
];

const plannedModules = [
  "Gerçek AI/OCR entegrasyonu",
  "Gelişmiş yedek geri yükleme",
];

export default async function SettingsPage() {
  const [pinConfigured, onboardingCompleted] = await Promise.all([
    isLocalPinConfigured(),
    isOnboardingCompleted(),
  ]);

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <p className="text-sm font-medium text-[#607167]">Ayarlar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Sistem ayarları
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Şirket bilgileri, uygulama durumu ve yerel yedekleme adımlarını buradan yönetin.
        </p>
      </section>

      {!pinConfigured ? (
        <section className="rounded-lg border border-[#f0d9a2] bg-[#fffaf0] p-4 text-sm text-[#745214]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Bu local uygulama için henüz PIN belirlenmemiş. Bilgisayarı kullanan
              başka biri uygulamayı açabilir.
            </p>
            <Link
              href="/settings/security"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#1f6f54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#185741]"
            >
              PIN Belirle
            </Link>
          </div>
        </section>
      ) : null}

      {onboardingCompleted ? (
        <section className="rounded-lg border border-[#c7dfcf] bg-[#f4fbf6] p-4 text-sm text-[#1f6f54]">
          <p className="font-semibold text-[#16201b]">İlk kurulum tamamlandı</p>
          <p className="mt-1">
            İlk kurulum bilgilerini güncellemek için Şirket Bilgileri ve Güvenlik / PIN
            sayfalarını kullanabilirsiniz.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {settingCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              href={card.href}
              className="group flex min-h-44 flex-col justify-between rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm transition hover:border-[#8ea99b]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-semibold text-[#16201b]">
                  {card.title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#647067]">
                  {card.description}
                </span>
              </span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1f6f54]">
                Aç
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </section>

      <section
        id="app-info"
        className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
            <Monitor className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Uygulama bilgileri</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#46534b] md:grid-cols-4">
              <InfoLine label="Uygulama adı" value={appInfo.appName} />
              <InfoLine label="Sürüm" value={`v${appInfo.version}`} />
              <InfoLine label="Çalışma modu" value={`${appInfo.mode} kullanım`} />
              <InfoLine label="Veritabanı tipi" value={appInfo.database} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[#16201b]">Aktif modüller</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeModules.map((module) => (
                <div
                  key={module}
                  className="flex items-center gap-2 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-3 py-2 text-sm text-[#46534b]"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#1f6f54]" />
                  {module}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#16201b]">
              Sonraki planlanan modüller
            </h3>
            <div className="mt-3 space-y-2">
              {plannedModules.map((module) => (
                <div
                  key={module}
                  className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-3 py-2 text-sm text-[#46534b]"
                >
                  {module}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-3 py-2">
      <p className="text-xs font-medium text-[#647067]">{label}</p>
      <p className="mt-1 font-semibold text-[#16201b]">{value}</p>
    </div>
  );
}
