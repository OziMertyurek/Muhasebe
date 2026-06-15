import { AppShell } from "@/components/layout/app-shell";
import { requireLocalAuth } from "@/lib/security-utils";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireLocalAuth();

  return <AppShell>{children}</AppShell>;
}
