// Works around a bug in @opennextjs/aws 4.2.0 (used by @opennextjs/cloudflare):
// its edge converter does `import cookieParser from "cookie"`, but cookie 1.x
// has no default export, so every request that carries a cookie (signed-in
// users) crashes Next.js middleware/proxy on Cloudflare with
// "Cannot read properties of undefined (reading 'parse')".
// Runs after `npm install` (postinstall). Safe to run many times; remove once
// OpenNext ships a fix.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Wherever npm placed the adapter (hoisted, or under @opennextjs/cloudflare).
const roots = [
  join(process.cwd(), "node_modules/@opennextjs/aws"),
  join(process.cwd(), "node_modules/@opennextjs/cloudflare/node_modules/@opennextjs/aws"),
].filter((r) => existsSync(r));

const files = [
  "dist/overrides/converters/edge.js",
  "dist/overrides/converters/node.js",
];
for (const root of roots) for (const rel of files) {
  const file = join(root, rel);
  if (!existsSync(file)) continue;
  const src = readFileSync(file, "utf8");
  const bad = /^import (\w+) from "cookie";$/m;
  if (!bad.test(src)) continue;
  writeFileSync(file, src.replace(bad, 'import * as $1 from "cookie";'));
  console.log(`[patch-opennext] fixed cookie import in ${rel}`);
}
