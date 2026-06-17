import "server-only";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { appInfo } from "@/lib/app-info";
import {
  getDesktopAppDataDir,
  getDesktopBackupsDir,
  getDesktopDatabasePath,
  getDesktopLogsDir,
  getDesktopRestoreBackupsDir,
  getDesktopUploadsDir,
  getProjectRoot,
  getPythonWorkerScriptPath,
  getRestoreBackupsDir,
  isDesktopMode,
} from "@/lib/app-paths";
import {
  formatBackupReminderDate,
  getBackupReminderStatus,
} from "@/lib/backup-reminder-utils";
import { getDesktopBootstrapStatus } from "@/lib/desktop-bootstrap-utils";
import { getDesktopMigrationDryRun } from "@/lib/desktop-migration-dry-run-utils";
import { getDesktopRuntimeSummary } from "@/lib/desktop-runtime-utils";
import { getDatabaseBackupInfo, getUploadsBackupInfo } from "@/lib/backup-utils";
import { isOnboardingCompleted } from "@/lib/onboarding-utils";
import { isLocalPinConfigured } from "@/lib/security-utils";

export type SystemStatusLevel = "healthy" | "warning" | "error" | "unknown";

export type SystemStatusCheck = {
  id: string;
  title: string;
  status: SystemStatusLevel;
  label: string;
  description: string;
  suggestion?: string;
};

export type SystemStatusSummary = {
  appName: string;
  version: string;
  mode: string;
  database: string;
  checkedAt: Date;
  checks: SystemStatusCheck[];
  suggestions: string[];
};

type CommandResult =
  | { ok: true; command: string; output: string }
  | { ok: false; command?: string; error: string };

const commandTimeoutMs = 15_000;

export async function getSystemStatus(): Promise<SystemStatusSummary> {
  const database = getDatabaseBackupInfo();
  const uploads = getUploadsBackupInfo();
  const restoreBackupsPath = getRestoreBackupsDir();
  const desktopChecks = getDesktopPreparationChecks();

  const [
    onboardingCompleted,
    pinConfigured,
    backupReminder,
    pythonStatus,
  ] = await Promise.all([
    isOnboardingCompleted(),
    isLocalPinConfigured(),
    getBackupReminderStatus(),
    checkPythonCommand(),
  ]);

  const markItDownStatus = await checkMarkItDownWorker(pythonStatus);
  const checks: SystemStatusCheck[] = [
    {
      id: "onboarding",
      title: "İlk kurulum",
      status: onboardingCompleted ? "healthy" : "warning",
      label: onboardingCompleted ? "Tamamlandı" : "Tamamlanmadı",
      description: onboardingCompleted
        ? "İlk kurulum sihirbazı tamamlanmış görünüyor."
        : "İlk kurulum tamamlanmadan bazı ekranlar kullanıma hazır olmayabilir.",
    },
    {
      id: "pin",
      title: "Local PIN",
      status: pinConfigured ? "healthy" : "warning",
      label: pinConfigured ? "Aktif" : "Pasif",
      description: pinConfigured
        ? "Uygulama local PIN ile korunuyor."
        : "PIN belirlenmediği için uygulama bu bilgisayarda doğrudan açılabilir.",
      suggestion: pinConfigured ? undefined : "Güvenlik için PIN belirleyin.",
    },
    {
      id: "backup-reminder",
      title: "Yedek hatırlatma",
      status: backupReminder.tone === "warning" ? "warning" : "healthy",
      label: backupReminder.enabled ? `${backupReminder.intervalDays} gün` : "Kapalı",
      description: backupReminder.message,
      suggestion: backupReminder.isDue ? "Tam yedek almanız önerilir." : undefined,
    },
    {
      id: "last-backup",
      title: "Son tam yedek",
      status: backupReminder.lastFullBackupAt ? "healthy" : "warning",
      label: formatBackupReminderDate(backupReminder.lastFullBackupAt),
      description:
        backupReminder.daysSinceLastBackup === null
          ? "Henüz kayıtlı tam yedek tarihi yok."
          : `Son tam yedek üzerinden ${backupReminder.daysSinceLastBackup} gün geçti.`,
      suggestion: backupReminder.lastFullBackupAt
        ? undefined
        : "Tam yedek almanız önerilir.",
    },
    {
      id: "database-file",
      title: "Veritabanı dosyası",
      status: database.exists ? "healthy" : "error",
      label: database.exists ? "Var" : "Yok",
      description: database.exists
        ? "SQLite veritabanı dosyası mevcut."
        : "SQLite veritabanı dosyası bulunamadı.",
      suggestion: database.exists
        ? undefined
        : "Veritabanı bulunamadı, migration kontrol edilmeli.",
    },
    {
      id: "uploads-folder",
      title: "Upload klasörü",
      status: uploads.exists ? "healthy" : "warning",
      label: uploads.exists ? "Var" : "Yok",
      description: uploads.exists
        ? "Upload klasörü mevcut."
        : "Upload klasörü henüz oluşmamış.",
      suggestion: uploads.exists ? undefined : "Upload klasörü oluşturulmalı.",
    },
    {
      id: "restore-backups-folder",
      title: "Restore güvenlik yedeği klasörü",
      status: existsSync(restoreBackupsPath) ? "healthy" : "unknown",
      label: existsSync(restoreBackupsPath) ? "Var" : "Henüz yok",
      description: existsSync(restoreBackupsPath)
        ? "Restore öncesi güvenlik yedeği klasörü mevcut."
        : "Henüz restore işlemi yapılmadıysa bu klasör oluşmamış olabilir.",
    },
    ...desktopChecks,
    {
      id: "python",
      title: "Python",
      status: pythonStatus.ok ? "healthy" : "warning",
      label: pythonStatus.ok ? "Çalışıyor" : "Bulunamadı",
      description: pythonStatus.ok
        ? `Python komutu çalışıyor: ${pythonStatus.output}`
        : "Python bulunamadı. MarkItDown ile fatura metni çıkarma çalışmayabilir.",
      suggestion: pythonStatus.ok ? undefined : "python-worker kurulumu yapılmalı.",
    },
    markItDownStatus,
  ];

  return {
    appName: appInfo.appName,
    version: appInfo.version,
    mode: appInfo.mode,
    database: appInfo.database,
    checkedAt: new Date(),
    checks,
    suggestions: Array.from(
      new Set(
        checks
          .map((check) => check.suggestion)
          .filter((suggestion): suggestion is string => Boolean(suggestion)),
      ),
    ),
  };
}

function getDesktopPreparationChecks(): SystemStatusCheck[] {
  const desktopMode = isDesktopMode();

  try {
    const appDataDir = getDesktopAppDataDir();
    const bootstrapStatus = getDesktopBootstrapStatus();
    const migrationDryRun = getDesktopMigrationDryRun();
    const runtimeSummary = getDesktopRuntimeSummary();
    const desktopDirs = [
      dirname(getDesktopDatabasePath()),
      getDesktopUploadsDir(),
      getDesktopRestoreBackupsDir(),
      getDesktopBackupsDir(),
      getDesktopLogsDir(),
    ];
    const allDirsExist = desktopDirs.every((dir) => existsSync(dir));

    return [
      {
        id: "desktop-mode",
        title: "Desktop modu",
        status: desktopMode ? "healthy" : "unknown",
        label: desktopMode ? "Aktif" : "Pasif",
        description: desktopMode
          ? "Uygulama desktop modu icin hazirlanan ayarlarla calisiyor."
          : "Uygulama su anda normal local web modu ile calisiyor.",
      },
      {
        id: "desktop-appdata",
        title: "Desktop AppData hazirligi",
        status: appDataDir ? "healthy" : "warning",
        label: appDataDir ? "Hesaplanabilir" : "Hesaplanamadi",
        description: appDataDir
          ? "Windows AppData tabanli desktop veri klasoru hesaplanabiliyor. Tam path gizlilik icin gosterilmiyor."
          : "Desktop veri klasoru hesaplanamadi.",
      },
      {
        id: "desktop-data-folders",
        title: "Desktop veri klasorleri",
        status: desktopMode
          ? bootstrapStatus.readyForDesktopRuntime
            ? "healthy"
            : "warning"
          : "unknown",
        label: allDirsExist ? "Hazir" : "Olusturulmadi",
        description: desktopMode
          ? bootstrapStatus.readyForDesktopRuntime
            ? "Desktop veri klasorleri runtime icin hazir gorunuyor."
            : "Desktop mode aktif ancak bootstrap klasor yapisi tam hazir degil."
          : "Desktop mode aktif olmadigi icin AppData veri klasorleri otomatik olusturulmadi.",
        suggestion:
          desktopMode && !bootstrapStatus.readyForDesktopRuntime
            ? "Desktop baslatma akisi ensureDesktopDataStructure() fonksiyonunu kontrollu sekilde cagirmali."
            : undefined,
      },
      {
        id: "desktop-bootstrap",
        title: "Desktop bootstrap",
        status: bootstrapStatus.readyForDesktopRuntime ? "healthy" : "unknown",
        label: bootstrapStatus.readyForDesktopRuntime ? "Hazir" : "Beklemede",
        description: bootstrapStatus.readyForDesktopRuntime
          ? "Desktop klasor yapisi hazir. Tam path gizlilik icin gosterilmiyor."
          : "Desktop bootstrap helper hazir; normal local modda otomatik klasor olusturmaz.",
        suggestion:
          desktopMode && bootstrapStatus.warnings.length > 0
            ? bootstrapStatus.warnings[0]
            : undefined,
      },
      {
        id: "desktop-database-file",
        title: "Desktop veritabani",
        status: bootstrapStatus.databaseFileExists ? "healthy" : "unknown",
        label: bootstrapStatus.databaseFileExists ? "Var" : "Henuz yok",
        description: bootstrapStatus.databaseFileExists
          ? "Desktop SQLite veritabani dosyasi mevcut gorunuyor."
          : "Desktop SQLite veritabani henuz olusturulmadi veya migrate edilmedi.",
      },
      {
        id: "desktop-runtime-env",
        title: "Desktop runtime env",
        status: runtimeSummary.databaseUrlAvailable ? "healthy" : "warning",
        label: runtimeSummary.helperReady ? "Hazir" : "Kontrol edilmeli",
        description: runtimeSummary.databaseUrlAvailable
          ? "Desktop runtime helper APP_MODE ve SQLite DATABASE_URL degerlerini uretebiliyor. Tam DATABASE_URL gizlilik icin gosterilmiyor."
          : "Desktop runtime DATABASE_URL degeri uretilemedi.",
      },
      {
        id: "desktop-migration-dry-run-local-db",
        title: "Desktop migration dry-run: local DB",
        status: migrationDryRun.localDatabaseExists ? "healthy" : "unknown",
        label: migrationDryRun.localDatabaseExists ? "Var" : "Yok",
        description:
          "Dry-run analizi local SQLite veritabani varligini kontrol eder; dosya kopyalama yapmaz.",
      },
      {
        id: "desktop-migration-dry-run-desktop-db",
        title: "Desktop migration dry-run: desktop DB",
        status: migrationDryRun.desktopDatabaseExists ? "healthy" : "unknown",
        label: migrationDryRun.desktopDatabaseExists ? "Var" : "Yok",
        description:
          "Dry-run analizi AppData desktop DB durumunu path gostermeden kontrol eder.",
        suggestion: migrationDryRun.desktopDatabaseExists
          ? "Desktop DB mevcutsa otomatik overwrite yapilmamalidir."
          : undefined,
      },
      {
        id: "desktop-migration-dry-run-uploads",
        title: "Desktop migration dry-run: uploads",
        status:
          migrationDryRun.localUploadsExists || migrationDryRun.desktopUploadsExists
            ? "healthy"
            : "unknown",
        label: `Local: ${migrationDryRun.localUploadsExists ? "Var" : "Yok"} / Desktop: ${
          migrationDryRun.desktopUploadsExists ? "Var" : "Yok"
        }`,
        description:
          "Dry-run analizi upload klasorlerinin durumunu kontrol eder; upload kopyalama yapmaz.",
        suggestion: migrationDryRun.shouldCopyUploads
          ? "Local uploads mevcut; desktop uploads icin kontrollu kopyalama gerekebilir."
          : undefined,
      },
      {
        id: "desktop-migration-dry-run-action",
        title: "Desktop migration dry-run",
        status: migrationDryRun.errors.length > 0 ? "error" : "unknown",
        label: formatDesktopMigrationAction(migrationDryRun.recommendedAction),
        description:
          "Bu sadece analizdir; DB veya upload dosyasi kopyalamaz, DATABASE_URL degistirmez.",
        suggestion: migrationDryRun.warnings[0],
      },
    ];
  } catch {
    return [
      {
        id: "desktop-appdata",
        title: "Desktop AppData hazirligi",
        status: "warning",
        label: "Kontrol edilemedi",
        description: "Desktop veri klasoru durumu kontrol edilemedi.",
      },
    ];
  }
}

function formatDesktopMigrationAction(
  action: ReturnType<typeof getDesktopMigrationDryRun>["recommendedAction"],
) {
  if (action === "COPY_LOCAL_DB_TO_DESKTOP") {
    return "Local DB kopyalama onerilir";
  }

  if (action === "CREATE_EMPTY_DESKTOP_DB") {
    return "Bos desktop DB olusturulmali";
  }

  return "Mevcut desktop DB kullanilmali";
}

async function checkPythonCommand(): Promise<CommandResult> {
  const configuredCommand = process.env.MARKITDOWN_PYTHON;
  const candidates = [
    ...(configuredCommand ? [configuredCommand] : []),
    "py",
    "python",
  ];

  for (const command of Array.from(new Set(candidates))) {
    const result = await runCommand(command, ["--version"], 5_000);

    if (result.ok) {
      return result;
    }
  }

  return {
    ok: false,
    error: "Python komutu bulunamadı.",
  };
}

async function checkMarkItDownWorker(
  pythonStatus: CommandResult,
): Promise<SystemStatusCheck> {
  if (!pythonStatus.ok) {
    return {
      id: "markitdown-worker",
      title: "MarkItDown worker",
      status: "warning",
      label: "Kontrol edilemedi",
      description:
        "Python bulunamadığı için MarkItDown worker testi çalıştırılamadı.",
      suggestion: "python-worker kurulumu yapılmalı.",
    };
  }

  const scriptPath = getPythonWorkerScriptPath();

  if (!existsSync(scriptPath)) {
    return {
      id: "markitdown-worker",
      title: "MarkItDown worker",
      status: "error",
      label: "Worker yok",
      description: "MarkItDown worker scripti bulunamadı.",
      suggestion: "python-worker klasörü ve extract_markdown.py dosyası kontrol edilmeli.",
    };
  }

  const result = await runCommand(
    pythonStatus.command,
    [scriptPath, "README.md"],
    commandTimeoutMs,
  );

  if (result.ok && result.output) {
    return {
      id: "markitdown-worker",
      title: "MarkItDown worker",
      status: "healthy",
      label: "Çalışıyor",
      description: "MarkItDown worker güvenli test dosyasından metin çıkarabildi.",
    };
  }

  const errorMessage = result.ok ? "" : result.error;

  return {
    id: "markitdown-worker",
    title: "MarkItDown worker",
    status: "warning",
    label: "Çalışmıyor",
    description: isMissingMarkItDownPackage(errorMessage)
      ? "MarkItDown paketi bulunamadı. python-worker kurulumu yapılmalı."
      : "MarkItDown worker çalıştırılamadı.",
    suggestion: "python-worker klasöründe pip install -r requirements.txt çalıştırın.",
  };
}

function runCommand(
  command: string,
  args: string[],
  timeout: number,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd: getProjectRoot(),
        shell: false,
        timeout,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const output = `${stdout || stderr}`.trim().split(/\r?\n/)[0] ?? "";

        if (error) {
          resolve({
            ok: false,
            command,
            error: (stderr || error.message).trim(),
          });
          return;
        }

        resolve({
          ok: true,
          command,
          output,
        });
      },
    );
  });
}

function isMissingMarkItDownPackage(error: string) {
  const normalized = error.toLocaleLowerCase("tr-TR");

  return normalized.includes("markitdown") || normalized.includes("no module named");
}
