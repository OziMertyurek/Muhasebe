/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectDir = path.join(__dirname, "..");
const targetDir = path.join(projectDir, "build", "python");
const requirementsPath = path.join(projectDir, "python-worker", "requirements.txt");

function runJson(command, args) {
  const output = execFileSync(command, args, {
    cwd: projectDir,
    encoding: "utf8",
    windowsHide: true,
  });

  return JSON.parse(output.trim());
}

function findPythonRuntime() {
  const script =
    "import json, pathlib, sys; " +
    "print(json.dumps({" +
    "'executable': sys.executable, " +
    "'prefix': sys.prefix, " +
    "'base_prefix': sys.base_prefix, " +
    "'root': str(pathlib.Path(sys.executable).parent)" +
    "}))";

  const configured = process.env.PYTHON_BUNDLE_SOURCE;

  if (configured) {
    const executable = path.join(configured, "python.exe");
    if (!fs.existsSync(executable)) {
      throw new Error("PYTHON_BUNDLE_SOURCE icinde python.exe bulunamadi.");
    }

    return {
      root: configured,
      executable,
    };
  }

  for (const command of ["py", "python"]) {
    try {
      const result = runJson(command, ["-c", script]);
      return {
        root: result.root,
        executable: result.executable,
      };
    } catch {
      // Try the next Python command.
    }
  }

  throw new Error("Paketli Python hazirlamak icin yerel Python bulunamadi.");
}

function assertMarkItDownInstalled(executable) {
  try {
    execFileSync(executable, ["-c", "import markitdown, markdownify"], {
      cwd: projectDir,
      stdio: "ignore",
      windowsHide: true,
    });
  } catch {
    throw new Error(
      `MarkItDown bagimliliklari bulunamadi. Once bu Python icin kurun: ${executable} -m pip install -r ${requirementsPath}`,
    );
  }
}

function shouldSkip(sourcePath) {
  const lower = sourcePath.toLowerCase();

  return (
    lower.includes(`${path.sep}__pycache__${path.sep}`) ||
    lower.endsWith(".pyc") ||
    lower.endsWith(".pyo") ||
    lower.includes(`${path.sep}tests${path.sep}`) ||
    lower.includes(`${path.sep}test${path.sep}`)
  );
}

function copyFiltered(source, target) {
  const stat = fs.statSync(source);

  if (shouldSkip(source)) {
    return;
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyFiltered(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function verifyPreparedRuntime() {
  const targetPython = path.join(targetDir, "python.exe");
  execFileSync(targetPython, ["--version"], {
    cwd: projectDir,
    stdio: "inherit",
    windowsHide: true,
  });
  execFileSync(targetPython, ["-c", "import markitdown, markdownify; print('markitdown-ok')"], {
    cwd: projectDir,
    stdio: "inherit",
    windowsHide: true,
  });
}

const runtime = findPythonRuntime();
assertMarkItDownInstalled(runtime.executable);

fs.rmSync(targetDir, { recursive: true, force: true });
copyFiltered(runtime.root, targetDir);
verifyPreparedRuntime();

console.log("Bundled Python runtime hazirlandi: build/python");
