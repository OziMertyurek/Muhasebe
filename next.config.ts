import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/**": [
      ".env",
      ".env.local",
      "prisma/dev.db",
      "prisma/dev.db-journal",
      "storage/**/*",
      "build/**/*",
      "dist/**/*",
      "*.log",
      "**/*.zip",
      "**/*.pdf",
      "**/*.csv",
      "tmp-*",
      "**/tmp-*",
    ],
    "next-server": [
      ".env",
      ".env.local",
      "prisma/dev.db",
      "prisma/dev.db-journal",
      "storage/**/*",
      "build/**/*",
      "dist/**/*",
      "*.log",
      "**/*.zip",
      "**/*.pdf",
      "**/*.csv",
      "tmp-*",
      "**/tmp-*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
