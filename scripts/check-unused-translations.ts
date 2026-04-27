/**
 * Detects unused keys in messages/dashboard/en.json by grepping the codebase
 * for `t("key")`, `t('key')`, `t(\`key\`)`, and dynamic forms `t(... + "key")`.
 *
 * Usage:
 *   npx tsx scripts/check-unused-translations.ts
 *   npx tsx scripts/check-unused-translations.ts --fix   # remove unused keys
 *
 * Notes:
 * - Walks `messages/dashboard/en.json` recursively, collecting leaf paths.
 * - Resolves `useTranslations("dashboard.<ns>")` to know which leaf paths
 *   become callable as `t("key")` from each file. Currently checks if the
 *   *full* leaf path appears anywhere in the source as a literal — this
 *   catches `t("key")` for the namespace but is conservative for dynamic keys.
 * - `--fix` rewrites en.json with unused keys removed.
 */

import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const JSON_PATH = path.join(ROOT, "messages/en.json");
const SCAN_DIRS = [path.join(ROOT, "app"), path.join(ROOT, "components"), path.join(ROOT, "lib")];

interface Leaf {
  fullPath: string;
  parents: string[];
}

function walk(obj: any, parents: string[], out: Leaf[]) {
  if (typeof obj !== "object" || obj === null) {
    out.push({ fullPath: parents.join("."), parents });
    return;
  }
  for (const k of Object.keys(obj)) {
    walk(obj[k], [...parents, k], out);
  }
}

async function readSourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function visit(d: string) {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
        await visit(p);
      } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        out.push(p);
      }
    }
  }
  await visit(dir);
  return out;
}

function findUsedLeafs(sources: { path: string; text: string }[], leafs: Leaf[]): Set<string> {
  const used = new Set<string>();

  const byNamespace: Map<string, { leafKey: string; full: string }[]> = new Map();
  for (const l of leafs) {
    const ns = l.parents.slice(0, -1).join(".");
    const last = l.parents[l.parents.length - 1];
    const arr = byNamespace.get(ns) || [];
    arr.push({ leafKey: last, full: l.fullPath });
    byNamespace.set(ns, arr);
  }

  const useTransRe = /useTranslations\(\s*["'`]dashboard(?:\.([a-zA-Z0-9_.]+))?["'`]\s*\)/g;
  const tCallRe = /\bt[a-zA-Z]*\(\s*["'`]([a-zA-Z0-9_.]+)["'`]/g;
  // Plain string literal anywhere in the file. Used to catch dynamic forms like
  // `labelKey: "statusPending"` followed by `t(labelKey)`. Conservative — may
  // mark a key used if its name happens to appear elsewhere.
  const literalRe = /["'`]([a-zA-Z][a-zA-Z0-9_]*)["'`]/g;

  for (const { text } of sources) {
    const fileNamespaces: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = useTransRe.exec(text)) !== null) {
      fileNamespaces.push(m[1] || "");
    }
    useTransRe.lastIndex = 0;
    if (fileNamespaces.length === 0) continue;

    // Direct t("key") calls.
    while ((m = tCallRe.exec(text)) !== null) {
      const callKey = m[1];
      for (const ns of fileNamespaces) {
        const candidates = byNamespace.get(ns) || [];
        for (const c of candidates) {
          if (callKey === c.leafKey || callKey.startsWith(c.leafKey + ".")) {
            used.add(c.full);
          }
        }
        if (callKey.includes(".")) {
          const fullCandidate = (ns ? ns + "." : "") + callKey;
          if (leafs.some((l) => l.fullPath === fullCandidate)) {
            used.add(fullCandidate);
          }
        }
      }
    }
    tCallRe.lastIndex = 0;

    // Heuristic: detect dynamic t(varName) — if file calls `t(<identifier>)`,
    // mark every leaf in the file's namespaces whose key appears as a string
    // literal anywhere in the file. This covers `labelKey: "x"` / `t(labelKey)`.
    const hasDynamicCall = /\bt[a-zA-Z]*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[,)]/.test(text);
    if (hasDynamicCall) {
      const literals = new Set<string>();
      while ((m = literalRe.exec(text)) !== null) literals.add(m[1]);
      literalRe.lastIndex = 0;
      for (const ns of fileNamespaces) {
        const candidates = byNamespace.get(ns) || [];
        for (const c of candidates) {
          if (literals.has(c.leafKey)) used.add(c.full);
        }
      }
    }
  }

  return used;
}

function pruneJson(obj: any, parents: string[], keep: Set<string>): any {
  if (typeof obj !== "object" || obj === null) {
    const fp = parents.join(".");
    return keep.has(fp) ? obj : undefined;
  }
  const next: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const val = pruneJson(obj[k], [...parents, k], keep);
    if (val !== undefined) {
      if (typeof val === "object" && Object.keys(val).length === 0) continue;
      next[k] = val;
    }
  }
  return next;
}

async function main() {
  const fix = process.argv.includes("--fix");
  const raw = await fs.readFile(JSON_PATH, "utf-8");
  const json = JSON.parse(raw);

  const leafs: Leaf[] = [];
  walk(json, [], leafs);

  const sourceFiles: string[] = [];
  for (const d of SCAN_DIRS) {
    sourceFiles.push(...(await readSourceFiles(d)));
  }
  const sources = await Promise.all(
    sourceFiles.map(async (p) => ({ path: p, text: await fs.readFile(p, "utf-8") })),
  );

  const used = findUsedLeafs(sources, leafs);
  const unused = leafs.filter((l) => !used.has(l.fullPath));

  console.log(`Total keys: ${leafs.length}`);
  console.log(`Used:       ${used.size}`);
  console.log(`Unused:     ${unused.length}`);
  if (unused.length > 0) {
    console.log("\nUnused keys:");
    for (const l of unused) console.log("  - " + l.fullPath);
  }

  if (fix && unused.length > 0) {
    const pruned = pruneJson(json, [], used);
    await fs.writeFile(JSON_PATH, JSON.stringify(pruned, null, 2) + "\n", "utf-8");
    console.log(`\nWrote pruned ${path.relative(ROOT, JSON_PATH)} (${unused.length} keys removed).`);
  }

  process.exit(unused.length === 0 || fix ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
