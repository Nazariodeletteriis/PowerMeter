"""Build src/data/skills.json for the dashboard from aion2-skills/skills_manifest.json.

The icons are NOT bundled (NCSoft assets): the dashboard loads them from the
game CDN by name, like the meter does (public/src/js/skillIcons.js). This keeps
only the icon's CDN name, e.g. icon_gl_skill_002.png -> ICON_GL_SKILL_002
(checked against the CDN: every generated name answers 200).

Cooldown, cast time, MP cost, range and the English summary come from each
skill's `source` tooltip file (akunito/my_nixos, scraped from inven.co.kr);
fields the source does not have are left out, never made up.

Usage: python3 docs/design/build_dashboard_skills.py
"""

import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "docs/design/aion2-skills/skills_manifest.json"
OUT = ROOT / "src/data/skills.json"
# The dashboard calls the Elementalist by its older name (src/dashboard/ui.tsx CLASSES).
CLASS_NAMES = {"Elementalist": "Spiritmaster"}

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

tooltips = {}
for url in sorted({s["source"] for s in manifest}):
    with urllib.request.urlopen(url) as res:
        for tip in json.load(res)["skills"]:
            tooltips[tip["code"]] = tip

skills = []
for s in manifest:
    tip = tooltips[s["id"]]
    row = {
        "id": s["id"],
        "name": s["name"],
        "class": CLASS_NAMES.get(s["class"], s["class"]),
        "type": s["type"],
        # The CDN is case-sensitive and spells passives ICON_GL_SKILL_Passive_001.
        "icon": s["icon_url"].rsplit("/", 1)[1].rsplit(".", 1)[0].upper().replace("_PASSIVE_", "_Passive_"),
    }
    # A passive's "instant" cooldown/cast is filler in the source, not data.
    if s["type"] != "Passive":
        row["cd"] = tip.get("cd")
        row["cast"] = tip.get("cast")
    row["cost"] = tip.get("cost")
    row["range"] = tip.get("range")
    row["desc"] = tip.get("short")
    skills.append({k: v for k, v in row.items() if v})

assert len({s["id"] for s in skills}) == len(skills), "duplicate skill id"
OUT.write_text(
    "[\n" + ",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in skills) + "\n]\n",
    encoding="utf-8",
)
print(f"{len(skills)} skills -> {OUT.relative_to(ROOT)}")
