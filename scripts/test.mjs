import { spawn } from "node:child_process";

const port = 49000 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}`;
const cleanEnv = { ...process.env };
delete cleanEnv.FORCE_COLOR;
delete cleanEnv.NO_COLOR;

const server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...cleanEnv,
    HOST: "127.0.0.1",
    PORT: String(port),
    NOTION_INTAKE_DRY_RUN: "1",
  },
  stdio: ["ignore", "pipe", "inherit"],
});

const commands = [
  ["--test", "tests/repository-contract.test.mjs", "tests/deployment-package.test.mjs", "tests/hero-scroll.test.mjs"],
  ["tests/careers-deadline.test.mjs"],
  ["tests/application-payload.test.mjs"],
  ["tests/applications-api.test.mjs"],
  ["tests/server-runtime.test.mjs"],
  ["tests/role-location-metadata.test.mjs"],
  ["tests/careers-apply-submit.test.mjs"],
  ["tests/pb-role-apply.test.mjs"],
  ["tests/pb-integration.test.mjs"],
  ["tests/lemon-band.test.mjs"],
];

async function waitForServer() {
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

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...cleanEnv, BASE_URL: baseUrl },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${process.execPath} ${args.join(" ")} exited with ${code ?? signal}.`));
    });
  });
}

try {
  await waitForServer();
  for (const args of commands) await runNode(args);
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
}
