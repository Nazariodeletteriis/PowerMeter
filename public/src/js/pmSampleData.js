// PowerMeter: SAMPLE DATA from the design handoff
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Widget.dc.html,
// sections 8.5 Build and 8.6 Lobby). Aion 2 goes live on 30/09: until the dashboard
// hands over the active build and the engine reports the party roster, the widget's
// Build and Lobby modes show this. Replace window.PM_SAMPLE.build / .lobby with real
// data and pmWidget.js picks it up unchanged. Item, stat and boss names are game
// terms and stay in English; `source.kind` is translated by the widget.
window.PM_SAMPLE = {
  build: {
    character: "Kaelthas",
    name: "Ashen Burst",
    className: "Sorcerer",
    cp: 48215,
    cpTarget: 50380,
    progress: 0.73,
    owned: 11,
    total: 15,
    // [short label, rarity, enchant level, owned, target item when missing]
    slots: [
      ["MH", "Mythic", 15, true],
      ["OH", "Legendary", 12, false, "Orb of the Crimson Veil"],
      ["H", "Heroic", 10, true],
      ["S", "Legendary", 12, true],
      ["C", "Legendary", 11, true],
      ["G", "Heroic", 8, false, "Gloves of Storm Oath"],
      ["L", "Legendary", 12, true],
      ["B", "Rare", 9, false, "Shoes of the Ashen Tide"],
      ["Be", "Heroic", 7, true],
      ["W", "Legendary", 10, true],
      ["N", "Heroic", 0, true],
      ["E1", "Rare", 0, false, "Earring of the Ashen Tide"],
      ["E2", "Rare", 0, true],
      ["R1", "Heroic", 0, false, "Ring of Crimson Oath"],
      ["R2", "Rare", 0, true],
      ["Ti", "Common", 0, true],
    ],
    missing: [
      { item: "Orb of the Crimson Veil", rarity: "Legendary", source: { kind: "drop", text: "Vorathis the Ashbound" } },
      { item: "Gloves of Storm Oath", rarity: "Heroic", source: { kind: "craft", text: "Armorsmith" } },
      { item: "Shoes of the Ashen Tide", rarity: "Legendary", source: { kind: "drop", text: "Grimtooth Warden" } },
      { item: "Earring of the Ashen Tide", rarity: "Heroic", source: { kind: "drop", text: "Vorathis the Ashbound" } },
      { item: "Ring of Crimson Oath", rarity: "Heroic", source: { kind: "shop", text: "1.800 Abyss Points" } },
    ],
    // [stat, current, target]
    stats: [
      ["Attack", "3.412", "3.580"],
      ["Magic Boost", "2.890", "3.105"],
      ["Critical Strike", "1.180", "1.265"],
      ["Accuracy", "2.240", "2.240"],
      ["Casting Speed", "24%", "24%"],
      ["HP", "28.400", "28.950"],
    ],
  },
  lobby: {
    dungeon: "Ashen Sanctum",
    // [name, class key, CP, gear score, ready]
    members: [
      ["Kaelthas", "sorcerer", 48215, 312, true],
      ["Nyxara", "assassin", 47880, 309, true],
      ["Vharok", "gladiator", 46120, 301, true],
      ["Ironveil", "templar", 49010, 318, true],
      ["Elowyn", "chanter", 45300, 296, false],
      ["Solenne", "cleric", 46650, 304, true],
    ],
  },
};
