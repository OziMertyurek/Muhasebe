/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("muhasebeSupport", {
  isAvailable: true,
  openDataFolder: () => ipcRenderer.invoke("support:open-data-folder"),
  openLogsFolder: () => ipcRenderer.invoke("support:open-logs-folder"),
  exportDiagnosticsReport: () =>
    ipcRenderer.invoke("support:export-diagnostics-report"),
});
