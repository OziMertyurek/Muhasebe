import "server-only";

import { existsSync } from "node:fs";
import {
  getDatabasePath,
  getDesktopDatabasePath,
  getDesktopUploadsDir,
  getUploadsDir,
} from "@/lib/app-paths";

export type DesktopMigrationRecommendedAction =
  | "COPY_LOCAL_DB_TO_DESKTOP"
  | "CREATE_EMPTY_DESKTOP_DB"
  | "USE_EXISTING_DESKTOP_DB";

export type DesktopMigrationDryRun = {
  localDatabaseExists: boolean;
  desktopDatabaseExists: boolean;
  localUploadsExists: boolean;
  desktopUploadsExists: boolean;
  shouldCopyDatabase: boolean;
  shouldCopyUploads: boolean;
  overwriteRisk: boolean;
  recommendedAction: DesktopMigrationRecommendedAction;
  warnings: string[];
  errors: string[];
};

export function checkLocalDatabase() {
  return existsSync(getDatabasePath());
}

export function checkDesktopDatabase() {
  return existsSync(getDesktopDatabasePath());
}

export function checkLocalUploads() {
  return existsSync(getUploadsDir());
}

export function checkDesktopUploads() {
  return existsSync(getDesktopUploadsDir());
}

export function getRecommendedDesktopMigrationAction(
  localDatabaseExists = checkLocalDatabase(),
  desktopDatabaseExists = checkDesktopDatabase(),
): DesktopMigrationRecommendedAction {
  if (desktopDatabaseExists) {
    return "USE_EXISTING_DESKTOP_DB";
  }

  if (localDatabaseExists) {
    return "COPY_LOCAL_DB_TO_DESKTOP";
  }

  return "CREATE_EMPTY_DESKTOP_DB";
}

export function getDesktopMigrationDryRun(): DesktopMigrationDryRun {
  const localDatabaseExists = checkLocalDatabase();
  const desktopDatabaseExists = checkDesktopDatabase();
  const localUploadsExists = checkLocalUploads();
  const desktopUploadsExists = checkDesktopUploads();
  const recommendedAction = getRecommendedDesktopMigrationAction(
    localDatabaseExists,
    desktopDatabaseExists,
  );
  const shouldCopyDatabase = recommendedAction === "COPY_LOCAL_DB_TO_DESKTOP";
  const shouldCopyUploads = localUploadsExists && !desktopUploadsExists;
  const warnings: string[] = [];
  const errors: string[] = [];

  if (desktopDatabaseExists) {
    warnings.push("Desktop DB mevcut; otomatik overwrite yapilmamali.");
  }

  if (!localDatabaseExists && !desktopDatabaseExists) {
    warnings.push("Local ve desktop DB bulunamadi; bos desktop DB ve migration akisi gerekir.");
  }

  if (localUploadsExists && desktopUploadsExists) {
    warnings.push("Local ve desktop uploads klasorleri mevcut; kopyalama sirasinda cakisma raporu gerekir.");
  }

  if (localUploadsExists && !desktopUploadsExists) {
    warnings.push("Local uploads mevcut; desktop uploads klasorune kopyalama onerilebilir.");
  }

  return {
    localDatabaseExists,
    desktopDatabaseExists,
    localUploadsExists,
    desktopUploadsExists,
    shouldCopyDatabase,
    shouldCopyUploads,
    overwriteRisk: false,
    recommendedAction,
    warnings,
    errors,
  };
}
