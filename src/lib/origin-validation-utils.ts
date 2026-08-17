const validForwardedProtocols = new Set(["http", "https"]);

export type SameOriginValidationResult =
  | {
      ok: true;
      origin: string;
      expectedOrigin: string;
    }
  | {
      ok: false;
      reason:
        | "missing-origin"
        | "malformed-origin"
        | "invalid-request-origin"
        | "origin-mismatch";
      origin?: string;
      expectedOrigin?: string;
    };

export function validateSameOriginRequest(request: Request): SameOriginValidationResult {
  const originHeader = request.headers.get("origin");

  if (!originHeader) {
    return { ok: false, reason: "missing-origin" };
  }

  const origin = normalizeOrigin(originHeader);

  if (!origin) {
    return { ok: false, reason: "malformed-origin" };
  }

  const expectedOrigin = getEffectiveRequestOrigin(request);

  if (!expectedOrigin) {
    return { ok: false, reason: "invalid-request-origin", origin };
  }

  if (origin !== expectedOrigin) {
    return {
      ok: false,
      reason: "origin-mismatch",
      origin,
      expectedOrigin,
    };
  }

  return { ok: true, origin, expectedOrigin };
}

export function getEffectiveRequestOrigin(request: Request) {
  let requestUrl: URL;

  try {
    requestUrl = new URL(request.url);
  } catch {
    return null;
  }

  const protocol = getEffectiveProtocol(request, requestUrl);
  const host = getEffectiveHost(request, requestUrl);

  if (!protocol || !host) {
    return null;
  }

  return normalizeOrigin(`${protocol}://${host}`);
}

export function getFirstForwardedValue(value: string | null) {
  const firstValue = value?.split(",")[0]?.trim();
  return firstValue || null;
}

export function normalizeOrigin(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const protocol = url.protocol.toLowerCase();

  if (protocol !== "http:" && protocol !== "https:") {
    return null;
  }

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (!hostname) {
    return null;
  }

  const port = url.port && !isDefaultPort(protocol, url.port) ? `:${url.port}` : "";
  return `${protocol}//${hostname}${port}`;
}

function getEffectiveProtocol(request: Request, requestUrl: URL) {
  const forwardedProtocol = getFirstForwardedValue(request.headers.get("x-forwarded-proto"))
    ?.toLowerCase()
    .replace(/:$/, "");

  if (forwardedProtocol && validForwardedProtocols.has(forwardedProtocol)) {
    return forwardedProtocol;
  }

  const requestProtocol = requestUrl.protocol.toLowerCase().replace(/:$/, "");
  return validForwardedProtocols.has(requestProtocol) ? requestProtocol : null;
}

function getEffectiveHost(request: Request, requestUrl: URL) {
  return getFirstForwardedValue(request.headers.get("x-forwarded-host"))
    ?? request.headers.get("host")?.trim()
    ?? requestUrl.host;
}

function isDefaultPort(protocol: string, port: string) {
  return (protocol === "http:" && port === "80") || (protocol === "https:" && port === "443");
}
