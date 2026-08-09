import { spawn } from "node:child_process";

const cleanEnv = { ...process.env };
delete cleanEnv.FORCE_COLOR;
delete cleanEnv.NO_COLOR;

// PORT=0 lets the kernel hand out a free port: a derived port (for example from the pid) can
// already be held by another listener or a concurrently running suite, and the loser of that
// race then serves its whole run against a server it does not own — which disappears mid-suite
// as ERR_CONNECTION_REFUSED the moment the owner tears it down.
const server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...cleanEnv,
    HOST: "127.0.0.1",
    PORT: "0",
    NOTION_INTAKE_DRY_RUN: "1",
  },
  stdio: ["ignore", "pipe", "inherit"],
});
server.stdout.setEncoding("utf8");
let serverOutput = "";
const listening = new Promise((resolve, reject) => {
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk;
    const match = serverOutput.match(/http:\/\/[^\s]*?:(\d+)/);
    if (match) resolve(Number.parseInt(match[1], 10));
  });
  server.once("exit", (code, signal) => reject(new Error(`Development server exited with ${code ?? signal} before it started listening.`)));
});

const commands = [
  ["--test", "tests/repository-contract.test.mjs", "tests/deployment-package.test.mjs", "tests/hero-scroll.test.mjs", "tests/nav-float.test.mjs", "tests/api-endpoints.test.mjs"],
  ["tests/careers-deadline.test.mjs"],
  ["tests/role-state-api.test.mjs"],
  ["tests/application-payload.test.mjs"],
  ["tests/applications-api.test.mjs"],
  ["tests/server-runtime.test.mjs"],
  ["tests/role-location-metadata.test.mjs"],
  ["tests/careers-apply-submit.test.mjs"],
  ["tests/careers-upload-limits.test.mjs"],
  ["tests/pb-role-apply.test.mjs"],
  ["tests/role-state-browser.test.mjs"],
  ["tests/pb-integration.test.mjs"],
  ["tests/hero-performance-browser.test.mjs"],
  ["tests/lemon-band.test.mjs"],
  ["tests/nav-float-browser.test.mjs"],
  ["tests/hero-reveal-browser.test.mjs"],
  ["tests/footer-wordmark.test.mjs"],
  ["tests/values-heading.test.mjs"],
  ["tests/people-grid-browser.test.mjs"],
];

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Development server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Development server did not become ready at ${baseUrl}.`);
}

function runNode(args, baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...cleanEnv, BASE_URL: baseUrl },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      // A server that dies mid-suite surfaces inside a test as an opaque connection refusal, so
      // name the real cause here instead.
      if (server.exitCode !== null || server.signalCode !== null) {
        reject(new Error(`Development server exited with ${server.exitCode ?? server.signalCode} while running ${args.join(" ")}.`));
      } else if (code === 0) resolve();
      else reject(new Error(`${process.execPath} ${args.join(" ")} exited with ${code ?? signal}.`));
    });
  });
}

try {
  const port = await listening;
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl);
  for (const args of commands) await runNode(args, baseUrl);
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
}
