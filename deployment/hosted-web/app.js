/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

process.env.NODE_ENV = "production";

try {
  require("./server.js");
} catch (error) {
  console.error("Hosted web startup failed.");
  console.error(error);
  process.exit(1);
}
