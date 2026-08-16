import packageJson from "../../package.json";
import { getDatabaseEngineLabel, getRuntimeModeLabel } from "@/lib/app-paths";

export const appInfo = {
  appName: "Muhasebe Takip Sistemi",
  version: packageJson.version,
  mode: getRuntimeModeLabel(),
  database: getDatabaseEngineLabel(),
};
