"use client";

import { useState, useSyncExternalStore } from "react";
import { FileDown, FolderOpen, LifeBuoy } from "lucide-react";

type SupportActionResult = {
  ok: boolean;
  fileName?: string;
};

type SupportApi = {
  isAvailable: true;
  openDataFolder: () => Promise<SupportActionResult>;
  openLogsFolder: () => Promise<SupportActionResult>;
  exportDiagnosticsReport: () => Promise<SupportActionResult>;
};

declare global {
  interface Window {
    muhasebeSupport?: SupportApi;
  }
}

type SupportAction = "data" | "logs" | "diagnostics";

function getSupportAvailability() {
  return typeof window !== "undefined" && Boolean(window.muhasebeSupport?.isAvailable);
}

function subscribeToSupportAvailability() {
  return () => undefined;
}

export function SupportToolsCard() {
  const isAvailable = useSyncExternalStore(
    subscribeToSupportAvailability,
    getSupportAvailability,
    () => false,
  );
  const [isBusy, setIsBusy] = useState<SupportAction | null>(null);
  const [message, setMessage] = useState(
    "Bu araçlar masaüstü uygulamasında kullanılabilir.",
  );

  async function runAction(action: SupportAction) {
    const api = window.muhasebeSupport;

    if (!api) {
      setMessage("Bu araçlar masaüstü uygulamasında kullanılabilir.");
      return;
    }

    setIsBusy(action);

    try {
      if (action === "data") {
        await api.openDataFolder();
        setMessage("Veri klasörü açıldı.");
      } else if (action === "logs") {
        await api.openLogsFolder();
        setMessage("Log klasörü açıldı.");
      } else {
        const result = await api.exportDiagnosticsReport();
        setMessage(
          result.fileName
            ? `Hata raporu dışa aktarıldı: ${result.fileName}`
            : "Hata raporu dışa aktarıldı.",
        );
      }
    } catch {
      setMessage("İşlem tamamlanamadı. Lütfen uygulama loglarını kontrol edin.");
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[#607167]">
                Masaüstü destek
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#16201b]">Destek Araçları</h2>
            </div>
            <span className="inline-flex w-fit rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-2.5 py-1 text-xs font-semibold text-[#607167]">
              {isAvailable ? "Hazır" : "Sadece masaüstü"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            Veri klasörü, log klasörü ve güvenli hata raporu işlemleri masaüstü uygulamasında
            tek tıkla çalışır.
          </p>
          <p className="mt-3 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-3 py-2 text-xs leading-5 text-[#647067]">
            Hata raporu .env, DATABASE_URL, tam dosya yolu, fatura dosyası veya yedek içeriği
            eklemeden maskeli sistem özeti üretir.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <SupportButton
              disabled={!isAvailable || Boolean(isBusy)}
              icon={FolderOpen}
              label="Veri Klasörünü Aç"
              loading={isBusy === "data"}
              onClick={() => runAction("data")}
            />
            <SupportButton
              disabled={!isAvailable || Boolean(isBusy)}
              icon={FolderOpen}
              label="Log Klasörünü Aç"
              loading={isBusy === "logs"}
              onClick={() => runAction("logs")}
            />
            <SupportButton
              disabled={!isAvailable || Boolean(isBusy)}
              icon={FileDown}
              label="Hata Raporu Dışa Aktar"
              loading={isBusy === "diagnostics"}
              onClick={() => runAction("diagnostics")}
            />
          </div>

          <p className="mt-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] px-3 py-2 text-sm text-[#647067]">
            {message}
          </p>
        </div>
      </div>
    </section>
  );
}

function SupportButton({
  disabled,
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  disabled: boolean;
  icon: typeof FolderOpen;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#cbd8cf] bg-white px-4 py-2 text-sm font-semibold text-[#1f6f54] shadow-sm transition hover:border-[#9fbead] hover:bg-[#f2faf5] focus:outline-none focus:ring-2 focus:ring-[#d8eadf] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      {loading ? "İşleniyor..." : label}
    </button>
  );
}