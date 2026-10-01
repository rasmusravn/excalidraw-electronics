// Upstream Excalidraw ships ESM that imports CSS and fonts, so Node can't load it directly.
// Bundle it into .cache/ with those assets emptied out, again whenever the installed version changes.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const outfile = ".cache/excalidraw-upstream.mjs";
const stamp = ".cache/excalidraw-upstream.version";
const { version } = JSON.parse(readFileSync("node_modules/@excalidraw/excalidraw/package.json", "utf8"));
const bundled = (() => {
  try {
    return readFileSync(stamp, "utf8");
  } catch {
    return null;
  }
})();

if (bundled !== version) {
  await build({
    stdin: { contents: 'export * from "@excalidraw/excalidraw";', resolveDir: "." },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    loader: { ".css": "empty", ".woff2": "empty", ".ttf": "empty" },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  });
  writeFileSync(stamp, version);
}
