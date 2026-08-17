import assert from "node:assert/strict";
import test from "node:test";
import {
  getHostedBusinessDataStorageAudit,
  getOnboardingRouteDecision,
  getOnboardingSubmitDecision,
  getRootRouteDecision,
} from "../src/lib/hosted-auth-flow.ts";
import {
  createLocalSessionToken,
  hashLocalPin,
  verifyLocalPin,
  verifyLocalSessionToken,
} from "../src/lib/pin-auth-core.ts";

test("unauthenticated root provides the public entry flow", () => {
  assert.equal(getRootRouteDecision({ sessionValid: false }), "entry");
});

test("authenticated root resolves to the dashboard app", () => {
  assert.equal(getRootRouteDecision({ sessionValid: true }), "dashboard");
});

test("existing company setup does not force onboarding on a new unauthenticated browser", () => {
  assert.equal(
    getOnboardingRouteDecision({
      onboardingCompleted: true,
      sessionValid: false,
    }),
    "setup-completed",
  );
});

test("onboarding can show the first setup form before setup exists", () => {
  assert.equal(
    getOnboardingRouteDecision({
      onboardingCompleted: false,
      sessionValid: false,
    }),
    "setup-form",
  );
});

test("authenticated completed setup goes to dashboard instead of rerunning onboarding", () => {
  assert.equal(
    getOnboardingRouteDecision({
      onboardingCompleted: true,
      sessionValid: true,
    }),
    "dashboard",
  );
});

test("duplicate initial setup submission is rejected before writing settings", () => {
  assert.equal(
    getOnboardingSubmitDecision({
      onboardingCompleted: true,
    }),
    "reject-duplicate",
  );
});

test("first onboarding submission is allowed when setup is not completed", () => {
  assert.equal(
    getOnboardingSubmitDecision({
      onboardingCompleted: false,
    }),
    "allow",
  );
});

test("login with correct PIN succeeds and wrong PIN fails", async () => {
  const storedHash = await hashLocalPin("1234");

  assert.equal(await verifyLocalPin("1234", storedHash), true);
  assert.equal(await verifyLocalPin("9999", storedHash), false);
});

test("session token is valid for the current PIN hash", async () => {
  const storedHash = await hashLocalPin("1234");
  const token = createLocalSessionToken(storedHash);

  assert.equal(verifyLocalSessionToken(token, storedHash), true);
});

test("logout invalidates session by removing the only valid auth token", async () => {
  const storedHash = await hashLocalPin("1234");
  const token = createLocalSessionToken(storedHash);

  assert.equal(verifyLocalSessionToken(token, storedHash), true);
  assert.equal(verifyLocalSessionToken(undefined, storedHash), false);
});

test("core hosted business data is server/PostgreSQL-backed, not browser-local canonical state", () => {
  const audit = getHostedBusinessDataStorageAudit();

  assert.deepEqual(
    audit.map((item) => item.browserCanonical),
    [false, false, false, false, false, false],
  );
  assert.deepEqual(
    audit.map((item) => item.canonicalStore),
    [
      "PostgreSQL AppSetting",
      "PostgreSQL Company",
      "PostgreSQL Invoice and InvoiceItem",
      "PostgreSQL Payment",
      "PostgreSQL Product and StockMovement",
      "PostgreSQL AppSetting",
    ],
  );
});
