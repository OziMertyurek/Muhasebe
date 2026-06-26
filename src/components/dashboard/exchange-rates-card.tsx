"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { clsx } from "clsx";

type ExchangeRateItem = {
  id: string;
  currency: string;
  baseCurrency: string;
  buyRate: string | null;
  sellRate: string | null;
  effectiveDate: string;
  source: string;
  fetchedAt: string;
  isManual: boolean;
  note: string | null;
};

type ExchangeRatesResponse = {
  rates: ExchangeRateItem[];
  message: string | null;
  refreshed?: boolean;
};

type ExchangeRatesCardProps = {
  initialRates: ExchangeRateItem[];
  initialMessage: string | null;
};

const currencies = ["USD", "EUR", "GBP"];

export function ExchangeRatesCard({
  initialRates,
  initialMessage,
}: ExchangeRatesCardProps) {
  const [rates, setRates] = useState(initialRates);
  const [message, setMessage] = useState(initialMessage);
  const [isPending, startTransition] = useTransition();

  const latestFetchedAt = getLatestDate(rates.map((rate) => rate.fetchedAt));
  const source = rates[0]?.source ?? "TCMB";

  function refreshRates() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/exchange-rates/refresh", {
          method: "POST",
          credentials: "same-origin",
        });
        const data = (await response.json()) as ExchangeRatesResponse;

        if (data.rates.length > 0) {
          setRates(data.rates);
        }

        setMessage(data.message ?? (response.ok ? "Kurlar güncellendi." : null));
      } catch {
        setMessage("Güncelleme yapılamadı, son kayıtlı kur gösteriliyor.");
      }
    });
  }

  return (
    <section className="rounded-lg border border-[#dce2dc] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#16201b]">Döviz Kurları</h2>
          <p className="mt-1 text-xs text-[#647067]">
            Günlük TCMB alış/satış bilgisi.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshRates}
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-xs font-semibold text-[#223028] transition hover:border-[#aebdae] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", isPending && "animate-spin")} />
          Yenile
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {rates.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d8e0d9] bg-[#fbfcfa] px-3 py-4 text-sm text-[#647067]">
            Henüz kur verisi yok. TCMB’den güncelleyin.
          </div>
        ) : (
          currencies.map((currency) => {
            const rate = rates.find((item) => item.currency === currency);

            return (
              <div
                key={currency}
                className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-3 rounded-md border border-[#edf0ed] px-3 py-2 text-sm"
              >
                <span className="font-semibold text-[#16201b]">{currency}</span>
                <span>
                  <span className="block text-[11px] uppercase tracking-wide text-[#8a978d]">
                    Alış
                  </span>
                  <span className="font-semibold text-[#223028]">
                    {rate?.buyRate ? formatRate(rate.buyRate) : "-"}
                  </span>
                </span>
                <span>
                  <span className="block text-[11px] uppercase tracking-wide text-[#8a978d]">
                    Satış
                  </span>
                  <span className="font-semibold text-[#223028]">
                    {rate?.sellRate ? formatRate(rate.sellRate) : "-"}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-md bg-[#fbfcfa] px-3 py-2 text-xs text-[#647067] sm:flex-row sm:items-center sm:justify-between">
        <span>Kaynak: {source}</span>
        <span>{latestFetchedAt ? `Son güncelleme: ${formatDateTime(latestFetchedAt)}` : "Güncelleme bekleniyor"}</span>
      </div>

      {message ? (
        <p className="mt-3 rounded-md bg-[#fff8e8] px-3 py-2 text-xs font-medium text-[#745214]">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function formatRate(value: string) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(Number(value));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function getLatestDate(values: string[]) {
  const timestamps = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
}
