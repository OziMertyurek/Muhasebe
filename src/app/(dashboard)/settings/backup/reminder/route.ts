import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { saveBackupReminderSettings } from "@/lib/backup-reminder-utils";
import { requireRequestOnboardingCompleted } from "@/lib/onboarding-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export async function POST(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const onboardingResponse = await requireRequestOnboardingCompleted();

  if (onboardingResponse) {
    return onboardingResponse;
  }

  const formData = await request.formData();
  const interval = String(formData.get("reminderInterval") ?? "7");
  const enabled = interval !== "off";
  const intervalDays = enabled ? Number(interval) : 7;

  await saveBackupReminderSettings({ enabled, intervalDays });
  await createAuditLog({
    entityType: "SETTINGS",
    action: "UPDATE",
    title: "Yedek hatırlatma ayarı güncellendi",
    description: enabled
      ? `Tam yedek hatırlatma aralığı ${intervalDays} gün olarak ayarlandı.`
      : "Tam yedek hatırlatması kapatıldı.",
    after: { enabled, intervalDays },
  });

  return NextResponse.redirect(new URL("/settings/backup?reminderSaved=1", request.url), 303);
}
