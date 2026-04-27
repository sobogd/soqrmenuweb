/**
 * Auto-translate messages/en.json into every other locale via Gemini.
 *
 * Always overwrites target files (en.json is single source of truth).
 *
 * Env:
 *   GEMINI_API_KEY    required (or in .env)
 *   GEMINI_MODEL      optional, default "gemini-2.5-flash"
 *
 * Usage:
 *   npx tsx scripts/translate-messages.ts                # all languages
 *   npx tsx scripts/translate-messages.ts es de fr       # only listed
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface LangInfo {
  name: string;
  native: string;
  notes?: string;
}

const LANGUAGES: Record<string, LangInfo> = {
  es: { name: "Spanish", native: "Español", notes: "In restaurant context, prefer 'carta' over 'menú' for the document of dishes; 'menú' is acceptable for fixed-price set or app-UI sense. Use 'tú' for diner-facing strings, 'usted' formal for owner-dashboard." },
  de: { name: "German", native: "Deutsch", notes: "Use 'Speisekarte' for the menu document. Formal 'Sie' for owner-dashboard, informal 'du' for diner-facing." },
  fr: { name: "French", native: "Français", notes: "Use 'carte' for the menu document, 'menu' for fixed-price set. Formal 'vous' everywhere." },
  it: { name: "Italian", native: "Italiano", notes: "'menù' or 'carta' both fine; pick what feels short. Formal 'Lei' for dashboard, informal 'tu' for diner." },
  pt: { name: "Portuguese", native: "Português", notes: "Default to Brazilian Portuguese. Use 'cardápio' for menu document. Informal 'você'." },
  nl: { name: "Dutch", native: "Nederlands", notes: "'menukaart' for the document. Formal 'u' for dashboard, 'je' for diner." },
  pl: { name: "Polish", native: "Polski", notes: "'menu' or 'karta dań'. Formal 'Pan/Pani' for dashboard." },
  ru: { name: "Russian", native: "Русский", notes: "'меню' стандартно. На «вы» в дашборде, на «ты» в публичном меню (для гостей)." },
  uk: { name: "Ukrainian", native: "Українська", notes: "«меню». На «ви» в адмінці." },
  sv: { name: "Swedish", native: "Svenska" },
  da: { name: "Danish", native: "Dansk" },
  no: { name: "Norwegian", native: "Norsk" },
  fi: { name: "Finnish", native: "Suomi" },
  cs: { name: "Czech", native: "Čeština" },
  el: { name: "Greek", native: "Ελληνικά" },
  tr: { name: "Turkish", native: "Türkçe" },
  ro: { name: "Romanian", native: "Română" },
  hu: { name: "Hungarian", native: "Magyar" },
  bg: { name: "Bulgarian", native: "Български" },
  hr: { name: "Croatian", native: "Hrvatski" },
  sk: { name: "Slovak", native: "Slovenčina" },
  sl: { name: "Slovenian", native: "Slovenščina" },
  et: { name: "Estonian", native: "Eesti" },
  lv: { name: "Latvian", native: "Latviešu" },
  lt: { name: "Lithuanian", native: "Lietuvių" },
  sr: { name: "Serbian", native: "Српски", notes: "Use Cyrillic script." },
  ca: { name: "Catalan", native: "Català" },
  ga: { name: "Irish", native: "Gaeilge" },
  is: { name: "Icelandic", native: "Íslenska" },
  fa: { name: "Persian (Farsi)", native: "فارسی", notes: "Right-to-left. Polite register." },
  ar: { name: "Arabic", native: "العربية", notes: "Modern Standard Arabic. Right-to-left. Polite register." },
  ja: { name: "Japanese", native: "日本語", notes: "Polite form (です/ます). Use katakana for menu terms when natural (メニュー)." },
  ko: { name: "Korean", native: "한국어", notes: "Polite form (-습니다/-요)." },
  zh: { name: "Chinese", native: "中文", notes: "Simplified Chinese. '菜单' for menu." },
};

const SYSTEM_PROMPT = `
You translate UI strings for IQ Rest, a SaaS that lets restaurants build
multilingual digital QR-menus.

Product surface:
  - Public menu (/m/<slug>) — what diners scan and read
  - Dashboard — restaurant owners manage menu, orders, bookings, tables,
    branding, languages, billing, analytics
  - Marketing landings — feature pages and pricing

Your job: produce native, concise UI copy. NOT translation-as-explanation.
Match how Stripe / Notion / Apple Settings phrase the same concepts in the
target language. Short. Direct. Imperative for buttons.

Hard rules:
1. Output ONLY a JSON object mapping keys to translated strings. No prose,
   no markdown fences, no commentary.
2. Preserve every JSON key verbatim — do NOT translate keys.
3. Preserve every ICU placeholder verbatim: {count}, {name}, {min}, {date},
   {price}, etc. Same braces, same identifier.
4. Preserve technical/HTML markers: <br/>, \\n, &amp;, etc.
5. Do NOT translate brand/proper names: "IQ Rest", "WhatsApp", "Instagram",
   "Stripe", "PRO", "BASIC", "FREE", "QR".
6. Keep button/label strings short. Match source length within ±30% when
   possible. UI copy should not "explain" — be terse.
7. SEO strings (any path under "seo" or "*.seo.*") can be slightly richer to
   include keywords, but still natural — never keyword-stuffed.
8. Use the language's native restaurant terminology when context fits
   (Spanish "carta", German "Speisekarte", PT-BR "cardápio", etc).
9. Address: formal in dashboard (owner is a customer), informal in diner-
   facing public menu. When ambiguous, use formal.
10. Numeric units stick to the placeholder: "{min} min" → render the unit in
    target language but keep the placeholder. Example FR: "{min} min".
`.trim();

async function translateChunk(
  chunk: Record<string, unknown>,
  langInfo: LangInfo,
): Promise<Record<string, unknown>> {
  const userPrompt = `
Target language: ${langInfo.name} (${langInfo.native}).
${langInfo.notes ? "Language-specific notes: " + langInfo.notes : ""}

Translate the JSON below. Return ONLY the translated JSON with the same
structure. No commentary.

${JSON.stringify(chunk, null, 2)}
`.trim();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 16000,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(content);
}

function splitObject(obj: Record<string, unknown>, maxKeys: number): Record<string, unknown>[] {
  const keys = Object.keys(obj);
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < keys.length; i += maxKeys) {
    const chunk: Record<string, unknown> = {};
    for (const k of keys.slice(i, i + maxKeys)) chunk[k] = obj[k];
    out.push(chunk);
  }
  return out;
}

async function translateSection(
  section: Record<string, unknown>,
  langInfo: LangInfo,
  sectionName: string,
): Promise<Record<string, unknown>> {
  const str = JSON.stringify(section);
  if (str.length < 8000) return translateChunk(section, langInfo);

  console.log(`    [${langInfo.name}] section "${sectionName}" large, splitting...`);
  const chunks = splitObject(section, 3);
  const merged: Record<string, unknown> = {};
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`    chunk ${i + 1}/${chunks.length}\r`);
    try {
      Object.assign(merged, await translateChunk(chunks[i], langInfo));
    } catch (e) {
      console.error(`\n    chunk ${i + 1} failed:`, e);
      Object.assign(merged, chunks[i]);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  process.stdout.write("\n");
  return merged;
}

async function translateFile(sourcePath: string, targetLang: string) {
  const langInfo = LANGUAGES[targetLang];
  if (!langInfo) {
    console.error(`Unknown language: ${targetLang}`);
    return;
  }

  console.log(`\n=== ${langInfo.name} (${targetLang}) ===`);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
  const targetPath = path.join(path.dirname(sourcePath), `${targetLang}.json`);

  const result: Record<string, unknown> = {};
  const topKeys = Object.keys(source);

  for (let i = 0; i < topKeys.length; i++) {
    const key = topKeys[i];
    const section = source[key];
    console.log(`  [${i + 1}/${topKeys.length}] ${key}`);
    try {
      if (typeof section === "object" && section !== null && !Array.isArray(section)) {
        result[key] = await translateSection(section as Record<string, unknown>, langInfo, key);
      } else if (typeof section === "string") {
        const wrapped = await translateChunk({ _: section }, langInfo);
        result[key] = wrapped._ ?? section;
      } else {
        result[key] = section;
      }
      fs.writeFileSync(targetPath + ".tmp", JSON.stringify(result, null, 2), "utf-8");
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error(`  ${key} failed:`, e);
      result[key] = section;
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
  if (fs.existsSync(targetPath + ".tmp")) fs.unlinkSync(targetPath + ".tmp");
  console.log(`  Wrote ${targetPath}`);
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const messagesDir = path.join(process.cwd(), "messages");
  const sourcePath = path.join(messagesDir, "en.json");

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    process.exit(1);
  }

  const langs = args.length > 0 ? args : Object.keys(LANGUAGES);
  console.log(`Translating to: ${langs.join(", ")}`);

  for (const lang of langs) {
    await translateFile(sourcePath, lang);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
