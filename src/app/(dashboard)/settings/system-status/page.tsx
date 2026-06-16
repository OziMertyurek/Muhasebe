import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  HelpCircle,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import {
  getSystemStatus,
  type SystemStatusCheck,
  type SystemStatusLevel,
} from "@/lib/system-status-utils";

export const dynamic = "force-dynamic";

const statusStyles: Record<
  SystemStatusLevel,
  {
    label: string;
    className: string;
    iconClassName: string;
    icon: typeof CheckCircle2;
  }
> = {
  healthy: {
    label: "Sağlıklı",
    className: "border-[#bfd8cc] bg-[#f2faf5] text-[#14543f]",
    iconClassName: "text-[#1f6f54]",
    icon: CheckCircle2,
  },
  warning: {
    label: "Uyarı",
    className: "border-[#f0d9a2] bg-[#fffaf0] text-[#745214]",
    iconClassName: "text-[#9a6a12]",
    icon: AlertTriangle,
  },
  error: {
    label: "Hata",
    className: "border-[#e0c4bf] bg-[#fff7f5] text-[#8b2f28]",
    iconClassName: "text-[#8b2f28]",
    icon: XCircle,
  },
  unknown: {
    label: "Bilinmiyor",
    className: "border-[#dce2dc] bg-[#fbfcfa] text-[#46534b]",
    iconClassName: "text-[#647067]",
    icon: HelpCircle,
  },
};

export default async function SystemStatusPage() {
  const status = await getSystemStatus();
  const healthyCount = status.checks.filter((check) => check.status === "healthy").length;
  const warningCount = status.checks.filter((check) => check.status === "warning").length;
  const errorCount = status.checks.filter((check) => check.status === "error").length;

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ayarlara dön
        </Link>
        <p className="mt-4 text-sm font-medium text-[#607167]">Ayarlar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Sistem durumu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Local kullanım için uygulama, veritabanı, yedekleme, güvenlik ve MarkItDown
          altyapısının genel sağlık durumunu kontrol edin.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={Activity} label="Uygulama" value={status.appName} />
        <InfoCard icon={ShieldCheck} label="Sürüm" value={`v${status.version}`} />
        <InfoCard
          icon={Database}
          label="Çalışma modu"
          value={`${status.mode} / ${status.database}`}
        />
        <InfoCard
          icon={Clock}
          label="Son kontrol"
          value={formatDateTime(status.checkedAt)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Sağlıklı"
          value={String(healthyCount)}
          className="border-[#bfd8cc] bg-[#f2faf5] text-[#14543f]"
        />
        <SummaryCard
          label="Uyarı"
          value={String(warningCount)}
          className="border-[#f0d9a2] bg-[#fffaf0] text-[#745214]"
        />
        <SummaryCard
          label="Hata"
          value={String(errorCount)}
          className="border-[#e0c4bf] bg-[#fff7f5] text-[#8b2f28]"
        />
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
            <Terminal className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Kontrol sonuçları</h2>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              Bu ekran sadece durum bilgisi gösterir; dosyaları değiştirmez, taşımaz veya
              silmez.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {status.checks.map((check) => (
            <StatusCheckCard key={check.id} check={check} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fff4dc] text-[#765116]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Öneriler</h2>
            {status.suggestions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {status.suggestions.map((suggestion) => (
                  <p
                    key={suggestion}
                    className="rounded-md border border-[#f0d9a2] bg-[#fffaf0] px-4 py-3 text-sm text-[#745214]"
                  >
                    {suggestion}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#647067]">
                Şu anda kritik bir öneri yok.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusCheckCard({ check }: { check: SystemStatusCheck }) {
  const style = statusStyles[check.status];
  const Icon = style.icon;

  return (
    <article className="rounded-lg border border-[#e5e9e5] bg-[#fbfcfa] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#16201b]">{check.title}</h3>
          <p className="mt-1 text-sm font-medium text-[#46534b]">{check.label}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${style.className}`}
        >
          <Icon className={`h-3.5 w-3.5 ${style.iconClassName}`} />
          {style.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#647067]">{check.description}</p>
      {check.suggestion ? (
        <p className="mt-3 rounded-md border border-[#f0d9a2] bg-[#fffaf0] px-3 py-2 text-sm text-[#745214]">
          {check.suggestion}
        </p>
      ) : null}
    </article>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-[#647067]">{label}</p>
          <p className="mt-1 text-sm font-semibold text-[#16201b]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${className}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
