#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");

const DEFAULT_PORT = 3000;
const DEFAULT_PATH = "/dashboard";
const DEFAULT_RUNNING_TIMEOUT = 90_000;
const POLL_INTERVAL = 2_000;

const port = Number(process.env.SPEED_INSIGHTS_PORT ?? DEFAULT_PORT);
const path = process.env.SPEED_INSIGHTS_PATH ?? DEFAULT_PATH;
const runTimeout = Number(process.env.SPEED_INSIGHTS_TIMEOUT ?? DEFAULT_RUNNING_TIMEOUT);
const url = `http://localhost:${port}${path}`;

const waitForReady = async () => {
  const deadline = Date.now() + runTimeout;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        return;
      }
    } catch {
      // ignore until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error(
    `Timed out (${runTimeout}ms) waiting for ${url}. Start the dev server (e.g. npm run dev) before auditing.`
  );
};

const runSpeedInsights = () => {
  const args = [
    "@vercel/speed-insights",
    "--urls",
    url,
    "--runs",
    "3",
    "--output",
    "speed-insights-dashboard.json",
    "--emulatedFormFactor",
    "desktop",
  ];

  const child = spawn("npx", args, { stdio: "inherit", shell: true });

  child.on("close", (code) => {
    if (code !== 0) {
      process.exit(code);
    }
  });
};

(async () => {
  try {
    console.log(`Waiting for ${url} to respond (timeout ${runTimeout}ms)...`);
    await waitForReady();
    console.log("Target available, running Speed Insights audit...");
    runSpeedInsights();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
