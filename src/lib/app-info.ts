import packageJson from "../../package.json";

export const appInfo = {
  appName: "Local Muhasebe Takip Sistemi",
  version: packageJson.version,
  mode: "Local",
  database: "SQLite",
} as const;
