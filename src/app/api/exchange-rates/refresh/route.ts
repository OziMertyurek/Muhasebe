import { NextResponse } from "next/server";
import {
  getLatestExchangeRates,
  refreshTcmbExchangeRates,
} from "@/lib/exchange-rates";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export async function POST(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  try {
    return NextResponse.json({
      ...(await refreshTcmbExchangeRates()),
      refreshed: true,
    });
  } catch {
    return NextResponse.json(
      {
        ...(await getLatestExchangeRates()),
        refreshed: false,
        message: "Güncelleme yapılamadı, son kayıtlı kur gösteriliyor.",
      },
      { status: 503 },
    );
  }
}
