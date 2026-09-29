// The terms and the privacy policy the onboarding asks users to accept are the
// same texts published on powermeter.letrionlabs.it. Their source is the
// website's static pages in the private PowerMeter-server repo; this copies
// each <section lang="xx"> into src/data/legal/<xx>.json = { terms, privacy }
// as plain HTML. Links become their text: the dashboard window must not
// navigate away. Headings drop one level (h1 → h2…): the onboarding step owns
// the page's h1. Languages without a section fall back to English in the app.
// Run: node scripts/sync-legal.mjs [path/to/PowerMeter-server/site]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = process.argv[2] ?? new URL("../../PowerMeter-server/site/", import.meta.url).pathname;
const OUT = new URL("../src/data/legal/", import.meta.url).pathname;

const sections = (page) => {
  const html = readFileSync(`${SITE}/${page}.html`, "utf8");
  const found = {};
  for (const [, lang, body] of html.matchAll(/<section id="[\w-]+" lang="([\w-]+)">([\s\S]*?)<\/section>/g))
    found[lang] = body.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, "$1")
      .replace(/<(\/?)h([1-5])\b/g, (_, slash, n) => `<${slash}h${+n + 1}`)
      .trim();
  return found;
};

const terms = sections("terms");
const privacy = sections("privacy");
mkdirSync(OUT, { recursive: true });
for (const lang of Object.keys(terms)) {
  if (!privacy[lang]) throw new Error(`privacy.html has no "${lang}" section`);
  writeFileSync(`${OUT}${lang}.json`, JSON.stringify({ terms: terms[lang], privacy: privacy[lang] }, null, 1) + "\n");
  console.log(lang);
}
