import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// @sigram/shared no está en node_modules como JS compilado (solo .ts), así
// que se incluye deliberadamente dentro del bundle en vez de marcarse externa.
const external = Object.keys(pkg.dependencies).filter((name) => name !== "@sigram/shared");

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/index.js",
  external,
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
});

console.log("Servidor empaquetado en dist/index.js");
