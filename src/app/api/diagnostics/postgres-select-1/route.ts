import { timingSafeEqual } from "node:crypto";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENABLED_VALUE = "true";
const MIN_TOKEN_LENGTH = 32;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function hasValidToken(request: Request, expectedToken: string) {
  const actualToken = getBearerToken(request);

  if (!actualToken) {
    return false;
  }

  const expected = Buffer.from(expectedToken);
  const actual = Buffer.from(actualToken);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  if (process.env.POSTGRES_DIAGNOSTIC_ENABLED !== ENABLED_VALUE) {
    return jsonResponse({ status: "not_found" }, 404);
  }

  const diagnosticToken = process.env.POSTGRES_DIAGNOSTIC_TOKEN?.trim();

  if (!diagnosticToken || diagnosticToken.length < MIN_TOKEN_LENGTH) {
    return jsonResponse({ status: "misconfigured" }, 503);
  }

  if (!hasValidToken(request, diagnosticToken)) {
    return jsonResponse({ status: "unauthorized" }, 401);
  }

  const databaseUrl = process.env.POSTGRES_DIAGNOSTIC_DATABASE_URL;

  if (!databaseUrl?.startsWith("postgresql://") && !databaseUrl?.startsWith("postgres://")) {
    return jsonResponse({ status: "misconfigured" }, 503);
  }

  const startedAt = performance.now();
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
  });

  try {
    await client.connect();
    const result = await client.query<{ ok: number }>("SELECT 1 AS ok");
    const ok = result.rows[0]?.ok === 1;

    return jsonResponse({
      status: ok ? "ok" : "unexpected_result",
      query: "SELECT 1",
      latencyMs: Math.round(performance.now() - startedAt),
    }, ok ? 200 : 502);
  } catch {
    return jsonResponse({ status: "failed" }, 502);
  } finally {
    await client.end().catch(() => undefined);
  }
}
