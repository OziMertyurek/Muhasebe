import { AppShell } from "@/components/layout/app-shell";
import { isOnboardingCompleted } from "@/lib/onboarding-utils";
import { requireLocalAuth } from "@/lib/security-utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await isOnboardingCompleted())) {
    redirect("/onboarding");
  }

  await requireLocalAuth("/dashboard");

  return <AppShell>{children}</AppShell>;
}
