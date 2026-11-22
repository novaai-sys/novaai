// Deploys the OpenNext build to Cloudflare and uploads the app's environment
// variables with it, as Worker secrets.
//
// Why: variables saved in the Cloudflare dashboard (Settings > Variables and
// Secrets) didn't reach the deployed Worker, so the live demo and the review
// sync saw nothing. Here the values come from the build environment (Workers
// Builds > Build > Variables and secrets), which the build always receives,
// and travel with each deploy (`wrangler deploy --secrets-file`).
//
// The variable names are read from .env.example, so adding a variable there
// is enough. Values are never printed. The temporary file lives outside the
// repo and is deleted afterwards.
//
// Usage (Workers Builds deploy command): node scripts/cf-deploy.mjs
// CF_DEPLOY_DRY_RUN=1 checks everything without deploying.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const names = [
  ...new Set(
    readFileSync(new URL("../.env.example", import.meta.url), "utf8")
      .split("\n")
      .map((l) => l.match(/^#?\s*([A-Z][A-Z0-9_]+)=/)?.[1])
      .filter(Boolean),
  ),
];

const secrets = {};
const missing = [];
for (const name of names) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim() !== "") secrets[name] = value;
  else missing.push(name);
}

console.log(`[cf-deploy] uploading ${Object.keys(secrets).length} variables: ${Object.keys(secrets).join(", ") || "(none)"}`);
if (missing.length) console.log(`[cf-deploy] not set in the build environment (skipped): ${missing.join(", ")}`);

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const absent = required.filter((n) => !(n in secrets));
if (absent.length) {
  console.error(
    `[cf-deploy] missing required variables: ${absent.join(", ")}.\n` +
      "Add them under Workers & Pages > novaai > Settings > Build > Variables and secrets, then redeploy.",
  );
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "novaai-deploy-"));
const file = join(dir, "secrets.json");
writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });

const args = ["opennextjs-cloudflare", "deploy", "--", "--secrets-file", file];
if (process.env.CF_DEPLOY_DRY_RUN) args.push("--dry-run", "--outdir", join(dir, "out"));

let status = 1;
try {
  status = spawnSync("npx", args, { stdio: "inherit", env: process.env }).status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(status);
