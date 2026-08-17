export type RootRouteDecision = "dashboard" | "entry";
export type OnboardingRouteDecision = "dashboard" | "setup-completed" | "setup-form";
export type OnboardingSubmitDecision = "reject-duplicate" | "allow";

export function getRootRouteDecision(input: { sessionValid: boolean }): RootRouteDecision {
  return input.sessionValid ? "dashboard" : "entry";
}

export function getOnboardingRouteDecision(input: {
  onboardingCompleted: boolean;
  sessionValid: boolean;
}): OnboardingRouteDecision {
  if (!input.onboardingCompleted) {
    return "setup-form";
  }

  return input.sessionValid ? "dashboard" : "setup-completed";
}

export function getOnboardingSubmitDecision(input: {
  onboardingCompleted: boolean;
}): OnboardingSubmitDecision {
  return input.onboardingCompleted ? "reject-duplicate" : "allow";
}

export function getHostedBusinessDataStorageAudit() {
  return [
    { name: "company setup", canonicalStore: "PostgreSQL AppSetting", browserCanonical: false },
    { name: "cari", canonicalStore: "PostgreSQL Company", browserCanonical: false },
    { name: "invoices", canonicalStore: "PostgreSQL Invoice and InvoiceItem", browserCanonical: false },
    { name: "payments", canonicalStore: "PostgreSQL Payment", browserCanonical: false },
    { name: "products and stock", canonicalStore: "PostgreSQL Product and StockMovement", browserCanonical: false },
    { name: "settings", canonicalStore: "PostgreSQL AppSetting", browserCanonical: false },
  ] as const;
}
