import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const tcmbTodayUrl = "https://www.tcmb.gov.tr/kurlar/today.xml";
const trackedCurrencies = ["USD", "EUR", "GBP"] as const;
const sourceName = "TCMB";

export type TrackedCurrency = (typeof trackedCurrencies)[number];

export type ExchangeRateItem = {
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

export type ExchangeRatesResult = {
  rates: ExchangeRateItem[];
  message: string | null;
};

type ParsedTcmbRate = {
  currency: TrackedCurrency;
  baseCurrency: "TRY";
  buyRate: string | null;
  sellRate: string | null;
  effectiveDate: Date;
  source: typeof sourceName;
  fetchedAt: Date;
  isManual: false;
  note: string | null;
};

export async function getLatestExchangeRates(): Promise<ExchangeRatesResult> {
  const rates = await Promise.all(
    trackedCurrencies.map((currency) =>
      prisma.exchangeRate.findFirst({
        where: { currency, baseCurrency: "TRY" },
        orderBy: [{ effectiveDate: "desc" }, { fetchedAt: "desc" }],
      }),
    ),
  );
  const normalizedRates = rates
    .filter((rate): rate is NonNullable<(typeof rates)[number]> => Boolean(rate))
    .map((rate) => normalizeExchangeRate(rate));

  return {
    rates: normalizedRates,
    message: normalizedRates.length === 0 ? "Henüz kur verisi yok." : null,
  };
}

export async function refreshTcmbExchangeRates(): Promise<ExchangeRatesResult> {
  const parsedRates = await fetchTcmbExchangeRates();

  for (const rate of parsedRates) {
    const existingRate = await prisma.exchangeRate.findFirst({
      where: {
        currency: rate.currency,
        baseCurrency: rate.baseCurrency,
        effectiveDate: rate.effectiveDate,
        source: rate.source,
        isManual: false,
      },
      select: { id: true },
    });

    const data = {
      buyRate: rate.buyRate ? new Prisma.Decimal(rate.buyRate) : null,
      sellRate: rate.sellRate ? new Prisma.Decimal(rate.sellRate) : null,
      fetchedAt: rate.fetchedAt,
      note: rate.note,
    };

    if (existingRate) {
      await prisma.exchangeRate.update({
        where: { id: existingRate.id },
        data,
      });
    } else {
      await prisma.exchangeRate.create({
        data: {
          currency: rate.currency,
          baseCurrency: rate.baseCurrency,
          effectiveDate: rate.effectiveDate,
          source: rate.source,
          isManual: rate.isManual,
          ...data,
        },
      });
    }
  }

  return getLatestExchangeRates();
}

async function fetchTcmbExchangeRates(): Promise<ParsedTcmbRate[]> {
  let response: Response;

  try {
    response = await fetch(tcmbTodayUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("TCMB kur servisine ulaşılamadı.");
  }

  if (!response.ok) {
    throw new Error("TCMB kur servisi geçici olarak yanıt vermiyor.");
  }

  const xml = await response.text();
  const effectiveDate = parseTcmbEffectiveDate(xml);
  const fetchedAt = new Date();
  const rates = trackedCurrencies
    .map((currency) => parseCurrencyBlock(xml, currency, effectiveDate, fetchedAt))
    .filter((rate): rate is ParsedTcmbRate => Boolean(rate));

  if (rates.length === 0) {
    throw new Error("TCMB kur verisi okunamadı.");
  }

  return rates;
}

function parseCurrencyBlock(
  xml: string,
  currency: TrackedCurrency,
  effectiveDate: Date,
  fetchedAt: Date,
): ParsedTcmbRate | null {
  const blockMatch = xml.match(
    new RegExp(`<Currency[^>]+CurrencyCode="${currency}"[^>]*>([\\s\\S]*?)<\\/Currency>`, "i"),
  );

  if (!blockMatch?.[1]) {
    return null;
  }

  const buyRate = normalizeDecimal(readXmlValue(blockMatch[1], "ForexBuying"));
  const sellRate = normalizeDecimal(readXmlValue(blockMatch[1], "ForexSelling"));

  if (!buyRate && !sellRate) {
    return null;
  }

  return {
    currency,
    baseCurrency: "TRY",
    buyRate,
    sellRate,
    effectiveDate,
    source: sourceName,
    fetchedAt,
    isManual: false,
    note: "TCMB günlük döviz kuru",
  };
}

function parseTcmbEffectiveDate(xml: string) {
  const dateValue = xml.match(/<Tarih_Date[^>]+Date="([^"]+)"/i)?.[1];

  if (dateValue) {
    const [month, day, year] = dateValue.split("/").map(Number);

    if (year && month && day) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  const turkishDateValue = xml.match(/<Tarih_Date[^>]+Tarih="([^"]+)"/i)?.[1];

  if (turkishDateValue) {
    const [day, month, year] = turkishDateValue.split(/[./-]/).map(Number);

    if (year && month && day) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  return new Date();
}

function readXmlValue(xml: string, tagName: string) {
  return xml.match(new RegExp(`<${tagName}>(.*?)<\\/${tagName}>`, "i"))?.[1] ?? null;
}

function normalizeDecimal(value: string | null) {
  const normalizedValue = value?.trim().replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? normalizedValue : null;
}

function normalizeExchangeRate(
  rate: NonNullable<Awaited<ReturnType<typeof prisma.exchangeRate.findFirst>>>,
): ExchangeRateItem {
  return {
    id: rate.id,
    currency: rate.currency,
    baseCurrency: rate.baseCurrency,
    buyRate: rate.buyRate?.toString() ?? null,
    sellRate: rate.sellRate?.toString() ?? null,
    effectiveDate: rate.effectiveDate.toISOString(),
    source: rate.source,
    fetchedAt: rate.fetchedAt.toISOString(),
    isManual: rate.isManual,
    note: rate.note,
  };
}
