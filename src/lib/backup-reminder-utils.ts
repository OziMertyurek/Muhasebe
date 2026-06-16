import "server-only";

import { getAppSettingValue, upsertAppSetting } from "@/lib/settings-utils";

export const backupReminderSettingKeys = {
  enabled: "backup.reminderEnabled",
  intervalDays: "backup.reminderIntervalDays",
  lastFullBackupAt: "backup.lastFullBackupAt",
} as const;

export type BackupReminderSettings = {
  enabled: boolean;
  intervalDays: number;
  lastFullBackupAt: Date | null;
};

export type BackupReminderStatus = BackupReminderSettings & {
  daysSinceLastBackup: number | null;
  isDue: boolean;
  message: string;
  tone: "neutral" | "warning" | "positive";
};

const defaultReminderIntervalDays = 7;
const allowedReminderIntervals = new Set([7, 15, 30]);

export async function getBackupReminderSettings(): Promise<BackupReminderSettings> {
  const [enabledValue, intervalValue, lastBackupValue] = await Promise.all([
    getAppSettingValue(backupReminderSettingKeys.enabled),
    getAppSettingValue(backupReminderSettingKeys.intervalDays),
    getAppSettingValue(backupReminderSettingKeys.lastFullBackupAt),
  ]);

  const intervalDays = Number(intervalValue);
  const lastFullBackupAt = parseBackupDate(lastBackupValue);

  return {
    enabled: enabledValue === null ? true : enabledValue === "true",
    intervalDays: allowedReminderIntervals.has(intervalDays)
      ? intervalDays
      : defaultReminderIntervalDays,
    lastFullBackupAt,
  };
}

export async function saveBackupReminderSettings(input: {
  enabled: boolean;
  intervalDays: number;
}) {
  const intervalDays = allowedReminderIntervals.has(input.intervalDays)
    ? input.intervalDays
    : defaultReminderIntervalDays;

  await Promise.all([
    upsertAppSetting(backupReminderSettingKeys.enabled, String(input.enabled)),
    upsertAppSetting(backupReminderSettingKeys.intervalDays, String(intervalDays)),
  ]);
}

export async function updateLastFullBackupDate(date = new Date()) {
  await upsertAppSetting(backupReminderSettingKeys.lastFullBackupAt, date.toISOString());
}

export async function initializeDefaultBackupReminderSettings() {
  await Promise.all([
    upsertAppSetting(backupReminderSettingKeys.enabled, "true"),
    upsertAppSetting(backupReminderSettingKeys.intervalDays, String(defaultReminderIntervalDays)),
  ]);
}

export async function getBackupReminderStatus(): Promise<BackupReminderStatus> {
  const settings = await getBackupReminderSettings();
  const daysSinceLastBackup = settings.lastFullBackupAt
    ? calculateDaysSince(settings.lastFullBackupAt)
    : null;

  if (!settings.enabled) {
    return {
      ...settings,
      daysSinceLastBackup,
      isDue: false,
      message: "Yedek hatırlatma kapalı.",
      tone: "neutral",
    };
  }

  if (!settings.lastFullBackupAt || daysSinceLastBackup === null) {
    return {
      ...settings,
      daysSinceLastBackup,
      isDue: true,
      message: "Henüz tam yedek alınmadı. Tam yedek almanız önerilir.",
      tone: "warning",
    };
  }

  if (daysSinceLastBackup >= settings.intervalDays) {
    return {
      ...settings,
      daysSinceLastBackup,
      isDue: true,
      message: `Son tam yedek üzerinden ${daysSinceLastBackup} gün geçti. Yeni yedek almanız önerilir.`,
      tone: "warning",
    };
  }

  return {
    ...settings,
    daysSinceLastBackup,
    isDue: false,
    message: "Son tam yedek güncel.",
    tone: "positive",
  };
}

export function formatBackupReminderDate(date: Date | null) {
  if (!date) {
    return "Henüz tam yedek alınmadı";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseBackupDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateDaysSince(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfBackupDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = startOfToday.getTime() - startOfBackupDay.getTime();

  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
