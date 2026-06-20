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
import { getDatabaseBackupInfo, getUploadsBackupInfo } from "@/lib/backup-utils";
import { getDesktopBootstrapStatus } from "@/lib/desktop-bootstrap-utils";
import { getDesktopMigrationDryRun } from "@/lib/desktop-migration-dry-run-utils";
import { getDesktopRuntimeSummary } from "@/lib/desktop-runtime-utils";
import { isOnboardingCompleted } from "@/lib/onboarding-utils";
import {
  resolvePythonRuntime,
  type PythonRuntimeStatus,
} from "@/lib/python-runtime-utils";
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
  const desktopMode = isDesktopMode();

  const [onboardingCompleted, pinConfigured, backupReminder, pythonStatus] =
    await Promise.all([
      isOnboardingCompleted(),
      isLocalPinConfigured(),
      getBackupReminderStatus(),
      checkPythonCommand(),
    ]);

  const markItDownStatus = await checkMarkItDownWorker(pythonStatus);
  const checks: SystemStatusCheck[] = [
    {
      id: "onboarding",
      title: "Ilk kurulum",
      status: onboardingCompleted ? "healthy" : "warning",
      label: onboardingCompleted ? "Tamamlandi" : "Tamamlanmadi",
      description: onboardingCompleted
        ? "Ilk kurulum sihirbazi tamamlanmis gorunuyor."
        : "Ilk kurulum tamamlanmadan bazi ekranlar kullanima hazir olmayabilir.",
    },
    {
      id: "pin",
      title: "Local PIN",
      status: pinConfigured ? "healthy" : "warning",
      label: pinConfigured ? "Aktif" : "Pasif",
      description: pinConfigured
        ? "Uygulama local PIN ile korunuyor."
        : "PIN belirlenmedigi icin uygulama bu bilgisayarda dogrudan acilabilir.",
      suggestion: pinConfigured ? undefined : "Guvenlik icin PIN belirleyin.",
    },
    {
      id: "backup-reminder",
      title: "Yedek hatirlatma",
      status: backupReminder.tone === "warning" ? "warning" : "healthy",
      label: backupReminder.enabled ? `${backupReminder.intervalDays} gun` : "Kapali",
      description: backupReminder.message,
      suggestion: backupReminder.isDue ? "Tam yedek almaniz onerilir." : undefined,
    },
    {
      id: "last-backup",
      title: "Son tam yedek",
      status: backupReminder.lastFullBackupAt ? "healthy" : "warning",
      label: formatBackupReminderDate(backupReminder.lastFullBackupAt),
      description:
        backupReminder.daysSinceLastBackup === null
          ? "Henuz kayitli tam yedek tarihi yok."
          : `Son tam yedek uzerinden ${backupReminder.daysSinceLastBackup} gun gecti.`,
      suggestion: backupReminder.lastFullBackupAt
        ? undefined
        : "Tam yedek almaniz onerilir.",
    },
    {
      id: "database-file",
      title: "Veritabani dosyasi",
      status: database.exists ? "healthy" : "error",
      label: database.exists ? "Var" : "Yok",
      description: database.exists
        ? "SQLite veritabani dosyasi mevcut."
        : "SQLite veritabani dosyasi bulunamadi.",
      suggestion: database.exists
        ? undefined
        : "Veritabani bulunamadi, migration kontrol edilmeli.",
    },
    {
      id: "uploads-folder",
      title: "Upload klasoru",
      status: uploads.exists ? "healthy" : "warning",
      label: uploads.exists ? "Var" : "Yok",
      description: uploads.exists
        ? "Upload klasoru mevcut."
        : "Upload klasoru henuz olusmamis.",
      suggestion: uploads.exists ? undefined : "Upload klasoru olusturulmali.",
    },
    {
      id: "restore-backups-folder",
      title: "Restore guvenlik yedegi klasoru",
      status: existsSync(restoreBackupsPath) ? "healthy" : "unknown",
      label: existsSync(restoreBackupsPath) ? "Var" : "Henuz yok",
      description: existsSync(restoreBackupsPath)
        ? "Restore oncesi guvenlik yedegi klasoru mevcut."
        : "Henuz restore islemi yapilmadiysa bu klasor olusmamis olabilir.",
    },
    ...desktopChecks,
    {
      id: "bundled-python",
      title: "Paketli Python",
      status: pythonStatus.bundledAvailable
        ? "healthy"
        : desktopMode
          ? "warning"
          : "unknown",
      label: pythonStatus.bundledAvailable ? "Var" : "Yok",
      description: pythonStatus.bundledAvailable
        ? "Packaged Windows uygulamasi icin paketli Python runtime bulundu."
        : "Paketli Python runtime bulunamadi; normal web modda sistem Python fallback kullanilabilir.",
      suggestion:
        desktopMode && !pythonStatus.bundledAvailable
          ? "Packaged build icin prepare:bundled-python komutu calistirilmali."
          : undefined,
    },
    {
      id: "python",
      title: "Python",
      status: pythonStatus.ok ? "healthy" : "warning",
      label: pythonStatus.ok ? "Calisiyor" : "Bulunamadi",
      description: pythonStatus.ok
        ? `${pythonStatus.label} calisiyor: ${pythonStatus.version}`
        : "Python bulunamadi. MarkItDown ile fatura metni cikarma calismayabilir.",
      suggestion: pythonStatus.ok ? undefined : "python-worker kurulumu yapilmali.",
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

async function checkPythonCommand(): Promise<PythonRuntimeStatus> {
  return resolvePythonRuntime();
}

async function checkMarkItDownWorker(
  pythonStatus: PythonRuntimeStatus,
): Promise<SystemStatusCheck> {
  if (!pythonStatus.ok) {
    return {
      id: "markitdown-worker",
      title: "MarkItDown worker",
      status: "warning",
      label: "Kontrol edilemedi",
      description:
        "Python bulunamadigi icin MarkItDown worker testi calistirilamadi.",
      suggestion: "python-worker kurulumu yapilmali.",
    };
  }

  const scriptPath = getPythonWorkerScriptPath();

  if (!existsSync(scriptPath)) {
    return {
      id: "markitdown-worker",
      title: "MarkItDown worker",
      status: "error",
      label: "Worker yok",
      description: "MarkItDown worker scripti bulunamadi.",
      suggestion: "python-worker klasoru ve extract_markdown.py dosyasi kontrol edilmeli.",
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
      label: "Calisiyor",
      description: "MarkItDown worker guvenli test dosyasindan metin cikarabildi.",
    };
  }

  const errorMessage = result.ok ? "" : result.error;

  return {
    id: "markitdown-worker",
    title: "MarkItDown worker",
    status: "warning",
    label: "Calismiyor",
    description: isMissingMarkItDownPackage(errorMessage)
      ? "MarkItDown paketi bulunamadi. python-worker kurulumu yapilmali."
      : "MarkItDown worker calistirilamadi.",
    suggestion: "python-worker klasorunde pip install -r requirements.txt calistirin.",
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
            error: sanitizeCommandError(stderr || error.message),
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

function sanitizeCommandError(message: string) {
  return message
    .replace(/[A-Za-z]:\\[^\r\n]+/g, "[path]")
    .replace(/file:[^\s]+/g, "file:[path]")
    .slice(0, 800);
}

function isMissingMarkItDownPackage(error: string) {
  const normalized = error.toLocaleLowerCase("tr-TR");

  return normalized.includes("markitdown") || normalized.includes("no module named");
}
