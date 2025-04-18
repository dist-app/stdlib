#!/usr/bin/env -S deno run --allow-read=. --allow-write=jsr.json
// Based on https://github.com/oscarotero/jsr-pub/blob/main/mod.ts

import { expandGlob } from "jsr:@std/fs@0.229.3/expand-glob";

const contents = JSON.parse(await Deno.readTextFile('jsr.json'));
contents.exports = await getExports([
  "./src/*.ts",
  "./src/**/*.ts",
]);
await Deno.writeTextFile('jsr.json', JSON.stringify(contents, null, 2));

async function getExports(paths: string[]): Promise<Record<string, string>> {
  const exports: [string, string][] = [];
  const root = Deno.cwd();

  for (const path of paths) {
    for await (const entry of expandGlob(path, { root })) {
      if (entry.isDirectory) {
        continue;
      }
      const name = "." + entry.path.slice(`${root}/src`.length);
      const target = "." + entry.path.slice(root.length);

      if (name.endsWith('/mod.ts')) {
        exports.push([name.replace('/mod.ts', ''), target]);
        continue;
      }
      if (name.includes('/support/')) {
        continue;
      }

      if (!mustBeIgnored(name)) {
        exports.push([name, target]);

        if (name.match(/^\.\/mod\.\w+$/)) {
          exports.push([".", target]);
        }
      }
    }
  }

  exports.sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(exports);
}

function mustBeIgnored(path: string): boolean {
  const extensions = [".ts", ".js", ".tsx", ".jsx", ".mjs"];
  const fileExtension = path.slice(path.lastIndexOf("."));

  if (!extensions.includes(fileExtension)) {
    return true;
  }

  return path.includes("/tests/") ||
    path.includes("/test/") ||
    path.includes("/docs/") ||
    path.includes("/deps.") ||
    path.includes("/deps/") ||
    path.includes("/node_modules/") ||
    path.endsWith(".d.ts") ||
    path.includes("/test.") ||
    path.includes(".test.") ||
    path.includes("_test.") ||
    path.includes("/bench.") ||
    path.includes(".bench.") ||
    path.includes("_bench.") ||
    path.includes("/.") ||
    path.includes("/_");
}
