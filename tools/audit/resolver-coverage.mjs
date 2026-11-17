// How much of the saved fight history has a resolved skill and boss name. Read-only, prints aggregates only
// (no player names). The backend stores names already resolved (lookup.rs returns "" when a code is unknown), so
// an empty or numeric name is what counts as unresolved here.
//
// Run: node tools/audit/resolver-coverage.mjs [history dir]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "/mnt/c/Users/nazar/AppData/Roaming/com.letrionlabs.powermeter/history/";
const unresolved = (name) => !name?.trim() || /^\d+$/.test(name.trim());

let files = 0, bad = 0, dmg = 0, dmgOk = 0, bossFights = 0, bossOk = 0;
const missing = new Map(); // skill code -> [damage, fights]
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  let r;
  try {
    r = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch {
    bad++;
    continue;
  }
  files++;
  if (r.mode === "boss" || (!r.mode && !r.isTrain)) {
    bossFights++;
    if (!unresolved(r.bossName)) bossOk++;
  }
  const seen = new Set();
  for (const s of r.details?.skills ?? []) {
    const d = Number(s.dmg) || 0;
    dmg += d;
    if (!unresolved(s.name)) {
      dmgOk += d;
      continue;
    }
    const m = missing.get(s.code) ?? [0, 0];
    m[0] += d;
    if (!seen.has(s.code)) m[1]++, seen.add(s.code);
    missing.set(s.code, m);
  }
}

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(2) + "%" : "n/a");
console.log(`records: ${files} (unreadable: ${bad})`);
console.log(`skill damage with a resolved name: ${pct(dmgOk, dmg)} of ${dmg.toLocaleString("en")}`);
console.log(`boss fights with a resolved boss name: ${pct(bossOk, bossFights)} of ${bossFights}`);
console.log(`unresolved skill codes: ${missing.size}`);
console.log("top 20 unresolved by damage (code, damage, share, fights):");
for (const [code, [d, n]] of [...missing].sort((a, b) => b[1][0] - a[1][0]).slice(0, 20))
  console.log(`  ${code}\t${d.toLocaleString("en")}\t${pct(d, dmg)}\t${n}`);
