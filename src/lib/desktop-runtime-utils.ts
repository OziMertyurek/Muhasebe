import "server-only";

import { getDesktopDatabasePath } from "@/lib/app-paths";

export type DesktopRuntimeEnv = {
  APP_MODE: "desktop";
  DATABASE_URL: string;
};

export type DesktopRuntimeSummary = {
  helperReady: boolean;
  appMode: "desktop";
  databaseUrlScheme: "file";
  databaseTarget: "Desktop SQLite";
  databaseUrlAvailable: boolean;
};

function normalizePathForDatabaseUrl(path: string) {
  return path.replace(/\\/g, "/");
}

export function getDesktopDatabaseUrl() {
  return `file:${normalizePathForDatabaseUrl(getDesktopDatabasePath())}`;
}

export function getDesktopRuntimeEnv(): DesktopRuntimeEnv {
  return {
    APP_MODE: "desktop",
    DATABASE_URL: getDesktopDatabaseUrl(),
  };
}

export function getDesktopRuntimeSummary(): DesktopRuntimeSummary {
  return {
    helperReady: true,
    appMode: "desktop",
    databaseUrlScheme: "file",
    databaseTarget: "Desktop SQLite",
    databaseUrlAvailable: Boolean(getDesktopDatabaseUrl()),
  };
}
