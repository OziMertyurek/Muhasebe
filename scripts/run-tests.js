/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/muhasebe_test",
};

const result = spawnSync(
  process.execPath,
  ["--test", "--experimental-strip-types", "tests/*.test.ts"],
  {
    stdio: "inherit",
    env,
  },
);

process.exit(result.status ?? 1);
