import { NextResponse } from "next/server";
import { getLatestExchangeRates } from "@/lib/exchange-rates";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  return NextResponse.json(await getLatestExchangeRates());
}
