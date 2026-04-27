/**
 * Consolidate per-feature messages/<dir>/<lang>.json into messages/<lang>.json
 * under a designated namespace key.
 *
 * Run once; afterwards `messages/<feature>/` folders can be deleted.
 *
 * Usage:
 *   npx tsx scripts/consolidate-translations.ts
 *   npx tsx scripts/consolidate-translations.ts --apply   # actually write & delete folders
 */

import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MSG_DIR = path.join(ROOT, "messages");

const SUBLANDINGS: { dir: string; key: string }[] = [
  { dir: "online-orders", key: "onlineOrders" },
  { dir: "reservations", key: "reservationsPage" },
  { dir: "color-scheme", key: "colorSchemePage" },
  { dir: "easy-menu", key: "easyMenuPage" },
  { dir: "ai-translation", key: "aiTranslationPage" },
  { dir: "mobile-management", key: "mobileManagementPage" },
  { dir: "custom-design", key: "customDesignPage" },
  { dir: "multilingual", key: "multilingualPage" },
  { dir: "instant-setup", key: "instantSetupPage" },
  { dir: "analytics", key: "analyticsPage" },
  { dir: "ai-images", key: "aiImagesPage" },
  { dir: "personal-support", key: "personalSupportPage" },
  { dir: "dashboard", key: "dashboard" },
];

async function readJson(p: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listLangs(): Promise<string[]> {
  const entries = await fs.readdir(MSG_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => e.name.replace(/\.json$/, ""));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const langs = await listLangs();
  console.log(`Languages: ${langs.length}`);

  for (const lang of langs) {
    const mainPath = path.join(MSG_DIR, `${lang}.json`);
    const main = (await readJson(mainPath)) || {};

    let added = 0;
    for (const { dir, key } of SUBLANDINGS) {
      const subPath = path.join(MSG_DIR, dir, `${lang}.json`);
      const sub = await readJson(subPath);
      if (sub && Object.keys(sub).length > 0) {
        if (!main[key]) {
          main[key] = sub;
          added++;
        } else {
          // Merge if main already had key (shouldn't normally happen).
          main[key] = { ...sub, ...main[key] };
          added++;
        }
      }
    }

    if (apply) {
      await fs.writeFile(mainPath, JSON.stringify(main, null, 2) + "\n", "utf-8");
    }
    console.log(`  ${lang}: +${added} sublanding namespaces`);
  }

  if (apply) {
    for (const { dir } of SUBLANDINGS) {
      const subDir = path.join(MSG_DIR, dir);
      try {
        await fs.rm(subDir, { recursive: true, force: true });
        console.log(`Removed ${path.relative(ROOT, subDir)}`);
      } catch {}
    }
  } else {
    console.log("\nDry run. Pass --apply to write and delete folders.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
