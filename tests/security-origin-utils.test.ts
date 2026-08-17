import assert from "node:assert/strict";
import test from "node:test";
import {
  getFirstForwardedValue,
  normalizeOrigin,
  validateSameOriginRequest,
} from "../src/lib/origin-validation-utils.ts";

function request(url: string, headers: Record<string, string>) {
  return new Request(url, {
    method: "POST",
    headers,
  });
}

test("same HTTPS Origin and Host is accepted", () => {
  const result = validateSameOriginRequest(
    request("https://avorayazilim.com/onboarding/complete", {
      origin: "https://avorayazilim.com",
      host: "avorayazilim.com",
    }),
  );

  assert.equal(result.ok, true);
});

test("HTTPS browser Origin is accepted when internal request is HTTP behind forwarded proto", () => {
  const result = validateSameOriginRequest(
    request("http://127.0.0.1:3000/onboarding/complete", {
      origin: "https://avorayazilim.com",
      host: "127.0.0.1:3000",
      "x-forwarded-host": "avorayazilim.com",
      "x-forwarded-proto": "https",
    }),
  );

  assert.equal(result.ok, true);
});

test("X-Forwarded-Host public hostname is used as the effective host", () => {
  const result = validateSameOriginRequest(
    request("http://passenger.internal/onboarding/complete", {
      origin: "https://avorayazilim.com",
      host: "passenger.internal",
      "x-forwarded-host": "avorayazilim.com",
      "x-forwarded-proto": "https",
    }),
  );

  assert.equal(result.ok, true);
});

test("explicit wrong Origin is rejected", () => {
  const result = validateSameOriginRequest(
    request("https://avorayazilim.com/onboarding/complete", {
      origin: "https://example.com",
      host: "avorayazilim.com",
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "origin-mismatch");
});

test("similar attacker hostname is rejected", () => {
  const result = validateSameOriginRequest(
    request("https://avorayazilim.com/onboarding/complete", {
      origin: "https://avorayazilim.com.attacker.example",
      host: "avorayazilim.com",
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "origin-mismatch");
});

test("wrong public scheme is rejected without forwarded HTTPS", () => {
  const result = validateSameOriginRequest(
    request("http://avorayazilim.com/onboarding/complete", {
      origin: "https://avorayazilim.com",
      host: "avorayazilim.com",
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "origin-mismatch");
});

test("malformed Origin is rejected", () => {
  const result = validateSameOriginRequest(
    request("https://avorayazilim.com/onboarding/complete", {
      origin: "not a url",
      host: "avorayazilim.com",
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "malformed-origin");
});

test("localhost development origin is accepted", () => {
  const result = validateSameOriginRequest(
    request("http://localhost:3000/onboarding/complete", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    }),
  );

  assert.equal(result.ok, true);
});

test("forwarded comma-separated values use the first value only", () => {
  assert.equal(getFirstForwardedValue("https, http"), "https");

  const result = validateSameOriginRequest(
    request("http://127.0.0.1:3000/onboarding/complete", {
      origin: "https://avorayazilim.com",
      host: "127.0.0.1:3000",
      "x-forwarded-host": "avorayazilim.com.attacker.example, avorayazilim.com",
      "x-forwarded-proto": "https, http",
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "origin-mismatch");
});

test("onboarding legitimate hosted request passes the guard", () => {
  const result = validateSameOriginRequest(
    request("http://127.0.0.1:3000/onboarding/complete", {
      origin: "https://avorayazilim.com",
      host: "127.0.0.1:3000",
      "x-forwarded-host": "avorayazilim.com",
      "x-forwarded-proto": "https",
    }),
  );

  assert.deepEqual(result, {
    ok: true,
    origin: "https://avorayazilim.com",
    expectedOrigin: "https://avorayazilim.com",
  });
});

test("Origin with a path is rejected instead of normalized loosely", () => {
  assert.equal(normalizeOrigin("https://avorayazilim.com/path"), null);
});
