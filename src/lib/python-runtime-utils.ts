import "server-only";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { getProjectRoot } from "@/lib/app-paths";

export type PythonRuntimeSource =
  | "configured"
  | "bundled"
  | "system-py"
  | "system-python";

export type PythonRuntimeStatus =
  | {
      ok: true;
      command: string;
      source: PythonRuntimeSource;
      label: string;
      version: string;
      output: string;
      bundledAvailable: boolean;
    }
  | {
      ok: false;
      source?: PythonRuntimeSource;
      label: string;
      error: string;
      bundledAvailable: boolean;
    };

type PythonRuntimeCandidate = {
  command: string;
  source: PythonRuntimeSource;
  label: string;
};

const pythonVersionTimeoutMs = 5_000;

export function getBundledPythonPath() {
  const projectRoot = getProjectRoot();
  const candidates = [
    process.env.BUNDLED_PYTHON_PATH,
    join(/* turbopackIgnore: true */ projectRoot, "..", "python", "python.exe"),
    join(/* turbopackIgnore: true */ projectRoot, "build", "python", "python.exe"),
    join(/* turbopackIgnore: true */ projectRoot, "dist", "bundled-python", "python.exe"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? "";
}

export function isBundledPythonAvailable() {
  const bundledPythonPath = getBundledPythonPath();

  return Boolean(bundledPythonPath && existsSync(bundledPythonPath));
}

export async function resolvePythonRuntime(): Promise<PythonRuntimeStatus> {
  const bundledAvailable = isBundledPythonAvailable();
  const candidates = getPythonRuntimeCandidates();

  for (const candidate of candidates) {
    if (isFileSystemCommand(candidate.command) && !existsSync(candidate.command)) {
      continue;
    }

    const result = await runPythonVersion(candidate.command);

    if (result.ok) {
      return {
        ok: true,
        command: candidate.command,
        source: candidate.source,
        label: candidate.label,
        version: result.version,
        output: result.version,
        bundledAvailable,
      };
    }
  }

  return {
    ok: false,
    label: "Python bulunamadi",
    error:
      "Paketli Python bulunamadi ve sistem Python komutlari calistirilamadi.",
    bundledAvailable,
  };
}

function getPythonRuntimeCandidates(): PythonRuntimeCandidate[] {
  const candidates: PythonRuntimeCandidate[] = [];

  if (process.env.MARKITDOWN_PYTHON) {
    candidates.push({
      command: process.env.MARKITDOWN_PYTHON,
      source: "configured",
      label: "Yapilandirilmis Python",
    });
  }

  const bundledPythonPath = getBundledPythonPath();
  if (bundledPythonPath && existsSync(bundledPythonPath)) {
    candidates.push({
      command: bundledPythonPath,
      source: "bundled",
      label: "Paketli Python",
    });
  }

  candidates.push(
    {
      command: "py",
      source: "system-py",
      label: "Sistem py launcher",
    },
    {
      command: "python",
      source: "system-python",
      label: "Sistem Python",
    },
  );

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.source}:${candidate.command}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function runPythonVersion(command: string): Promise<{ ok: true; version: string } | { ok: false }> {
  return new Promise((resolve) => {
    execFile(
      command,
      ["--version"],
      {
        shell: false,
        timeout: pythonVersionTimeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ ok: false });
          return;
        }

        const version = `${stdout || stderr}`.trim().split(/\r?\n/)[0] || "Python";
        resolve({ ok: true, version });
      },
    );
  });
}

function isFileSystemCommand(command: string) {
  return isAbsolute(command) || command.includes("\\") || command.includes("/");
}
