import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import { getProjectRoot } from "@/lib/app-paths";

export type NodeRuntimeStatus = {
  bundledAvailable: boolean;
  platform: NodeJS.Platform;
  arch: string;
};

function getBundledNodeRelativePath(platform = process.platform, arch = process.arch) {
  if (platform === "win32") {
    return join("node", "node.exe");
  }

  if (platform === "darwin") {
    return join("node", `darwin-${arch}`, "bin", "node");
  }

  return join("node", `linux-${arch}`, "bin", "node");
}

export function getBundledNodePath() {
  const projectRoot = getProjectRoot();
  const candidates = [
    process.env.BUNDLED_NODE_PATH,
    join(
      /* turbopackIgnore: true */ projectRoot,
      "..",
      getBundledNodeRelativePath(),
    ),
    join(
      /* turbopackIgnore: true */ projectRoot,
      "build",
      getBundledNodeRelativePath(),
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return (
    candidates.find((candidate) => existsSync(/* turbopackIgnore: true */ candidate)) ??
    candidates[0] ??
    ""
  );
}

export function getNodeRuntimeStatus(): NodeRuntimeStatus {
  const bundledNodePath = getBundledNodePath();

  return {
    bundledAvailable: Boolean(
      bundledNodePath && existsSync(/* turbopackIgnore: true */ bundledNodePath),
    ),
    platform: process.platform,
    arch: process.arch,
  };
}
