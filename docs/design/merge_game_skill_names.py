"""Bring src/data/skills.json in line with the game's own skill data (the gamedata archive's `skill` records).

The manifest build_dashboard_skills.py reads names many skills differently from the game (160 of 299), while the
meter and the Report name them as the game does ("Tempest Shot"): those lookups found no skill and showed no icon.
This renames every skill to the game's name and adds the skills the manifest lacks (Dodge, Dismiss: <spirit>...).
The meter's own names (src/data/i18n/skills/en.json, per skill code) differ again for some skills: those go in
`alias`, which findSkill also matches. Meter names still without a skill (skills missing from both sources,
Theostones) get the icon the meter itself would show for their code (public/src/js/skillIcons.js) in
src/data/skill_name_icons.json.
Run it after build_dashboard_skills.py.

Usage: python3 docs/design/merge_game_skill_names.py [path/to/gamedata.sqlite]
"""

import json
import pathlib
import sqlite3
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "src/data/skills.json"
DB = sys.argv[1] if len(sys.argv) > 1 else "/mnt/c/Users/nazar/AppData/Roaming/com.letrionlabs.powermeter/gamedata/gamedata.sqlite"

db = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
game = {g["id"]: g for g in (json.loads(r[0]) for r in db.execute("SELECT data_json FROM records WHERE category = 'skill'"))}
skills = json.loads(OUT.read_text(encoding="utf-8"))
for s in skills:
    if s["id"] in game:
        s["name"] = game[s["id"]]["name"]
known = {s["id"] for s in skills}
for g in game.values():
    if g["id"] in known:
        continue
    row = {
        "id": g["id"],
        "name": g["name"],
        "class": g["class_name"].capitalize(),
        "type": "Stigma" if g["acquire"] == "Stigma" else g["kind"],
        "icon": g["icon"],
        "desc": " ".join(g.get("effect", "").split()),
    }
    skills.append({k: v for k, v in row.items() if v})

# Meter names of every code of the skill (the code's last 4 digits are the level/variant).
meter = json.loads((ROOT / "src/data/i18n/skills/en.json").read_text(encoding="utf-8"))
for s in skills:
    names = sorted({n for code, n in meter.items() if code[:-4] == s["id"][:-4] and n and n != s["name"]})
    s.pop("alias", None)
    if names:
        s["alias"] = names

OUT.write_text(
    "[\n" + ",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in skills) + "\n]\n",
    encoding="utf-8",
)
print(f"{len(skills)} skills -> {OUT.relative_to(ROOT)}")

# Same rules as skillIcons.js getIconCandidates; basic attacks (swords icon there) are left out.
table = json.loads((ROOT / "src/data/skill_icons.json").read_text(encoding="utf-8"))
CLASS_CODES = {"11": "GL", "12": "TE", "13": "AS", "14": "RA", "15": "SO", "16": "EL", "17": "CL", "18": "CH"}


def meter_icon(code):
    code = code[:8].ljust(8, "0")
    if code.startswith("30"):
        n = int(code[5:7])
        return f"Icon_Item_Usable_Godstone_WP_r_{n:03x}" if n > 0 else None
    if code[2:6] == "0000" and code[6:] != "00":
        return None
    if code[:4] in table:
        return table[code[:4]]
    return f"ICON_{CLASS_CODES[code[:2]]}_SKILL_{int(code[2:4]):03d}"


named = {s["name"] for s in skills} | {a for s in skills for a in s.get("alias", [])}
extra = {}
for code, name in sorted(meter.items()):
    if name and name not in named and name not in extra and (code[:2] in CLASS_CODES or code.startswith("30")):
        icon = meter_icon(code)
        if icon:
            extra[name] = icon
EXTRA = ROOT / "src/data/skill_name_icons.json"
EXTRA.write_text(json.dumps(extra, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
print(f"{len(extra)} meter names -> {EXTRA.relative_to(ROOT)}")
