# Changelog

Every release needs a `## <version>` section here: CI copies its bullet points into the
GitHub release and into the in-app update window, and refuses to publish without it.
The same section must also exist, translated, in changelog/<lang>.md for every UI language.

## 0.3.3

- Changed: character cards in My characters show the Gear Score of the character's main build (owned / target, the same numbers as the Character Builder) instead of an always-empty CP; the top bar no longer shows it either.
- Fixed: a build opened from a character's card uses that character's Arcana and Daevanion, not the active character's.

## 0.3.2

- Fixed: in My characters the whole character card opens its build (before, only the name did, with no visual hint).
- Fixed: the meter follows the character you are actually playing, read from the game; making a character active in My characters no longer changes who the meter tracks.

## 0.3.1

- New: Before you start: the full Terms and conditions and Privacy policy (English, Italian, German, French, Spanish, Portuguese, Russian) must be accepted before PowerMeter reads any combat data. Existing users accept them once at the next launch.
- Changed: "Open widget" is now "Launch DPSMeter".
- Changed: meter modes are shown as BOSS, TRAIN, PVE, PVP, in this order, in the meter, History and Settings.
- Changed: clicking a character's name in My characters opens its build without changing the active character.
- Changed: the update window groups the release notes by type (new, changed, fixed) and is easier to read.
- Fixed: Gear Viewer listed most pieces twice (the same item exists once per faction); now each piece appears once.
- Fixed: the build header showed placeholder like and comment counts instead of the build's real likes.

## 0.3.0

- New: Online logs: the fights you uploaded, with link, visibility (public, unlisted, private) you can change, views, ranking position and delete.
- New: Class statistics: average DPS per class on each boss, most played classes and weekly trend, from the public logs uploaded by the community. The same fight uploaded by several party members counts once.
- New: Gear Viewer: every equipment piece with filters, search and sortable stats. Select items to Pin them at the top or Compare them side by side, with a green arrow on the best value and a red one on the worst.
- New: Armory: search characters by region, faction, server and class, see trending profiles, rankings and a character's full sheet (EU/NA as soon as they are available).
- New: Shugo Festival: live countdown to the next round, its minigames, upcoming rounds and a Festival Shop planner with the tokens you still need.
- New: Spacetime Rift: portal and rift countdowns, the 24-hour schedule and the route for your faction.
- New: Calculators: gear stats and Gear Score between two enhancement levels with soul imprint quality, primary stat bonuses, and Splendent odds for a recipe.
- New: Marketplace (replaces the Shopping list): item search and a watch list; prices, trends and market stats appear once a market data source for EU/NA exists.
- New: Crafting step by step: each step shows the exact item it uses, the Normal and Splendent outcomes and which one the next step needs; on the last tier choose between upgrading the normal piece and crafting until Splendent.
- Changed: Flow Map is replaced by Shugo Festival; Online logs and Class statistics explain what they are for.
- Fixed: wings, titles and pets in the database show the bonuses they give.

## 0.2.14

- New: PvE tab in the meter for mob farming. Damage adds up over every mob you hit, even after it dies, and resets after 5 minutes without hitting mobs, on a zone change or with Reset.
- New: Boss, PvE, Train and PvP are separate: each hit counts only in the tab of its target type. The widget always shows what it is recording (type and target name), and saved fights go into their tab, with a mode filter in Fight history.
- New: Healing received per player (own and from others) and Aggro (hits taken from mobs; Templar and Gladiator marked as TANK; an estimate, labelled as such, until mobs have hit anyone).
- New: Crafting: every craftable item with weapons first, the upgrade chain from the first tier to the last, the recipe tree, and the materials for the quantity you choose with Have and Missing, saved.
- Changed: damage is shown in full everywhere (widget, details window, dashboard meter and report), no more K/M rounding.
- Fixed: the meter no longer stops counting when a mob moves (it was taken for a player), and the Boss tab only shows bosses.
- Fixed: locking the widget no longer empties the player list; Build and Lobby stay visible when locked.
- Fixed: the widget shows the icons of the saved build, even after creating or renaming it.
- Fixed: Upload in the widget uploads the fight that just ended, asks you to sign in with Discord if needed and says when a training fight can't be uploaded.

## 0.2.13

- New: characters have a faction (Elyos or Asmodian). Choose it when you add a character, or on the card of an existing one; it shows on Home and in the Character Builder.
- New: the fight report shows your saved fights: attempts on the same boss, overview, skills, DPS chart, timeline, damage taken, healing and Compare. Clicking a fight in Fight history or on Home opens it in the report.
- New: Export in the fight report saves the whole fight, so it can be loaded back from Fight history → Upload → From file.
- New: Party analysis shows the players, skills and opening rotations of your last fight.
- Changed: all sample data is gone before launch. Pages with nothing to show yet (rankings, community builds, comments, news, activities, meter healing and aggro, widget lobby) show an empty state.
- Changed: Share only gives a real link, once the fight is uploaded from Fight history.
- Changed: settings that are not available yet are shown disabled and marked "Coming soon".
- Fixed: the gear of your main build saved in earlier versions is kept.

## 0.2.12

- New: Upload in Fight history opens a window to upload the selected fights or a file saved with Export, and lets you sign in with Discord from there.
- New: rename a build you created or cloned and save it; Edit and Delete buttons on your builds, with a confirmation window.
- New: the wings stats show the equipped wing's bonuses apart from the collection's.
- Changed: wings, titles and pets that give no stats are listed again, after the others, marked "No stats".
- Changed: Your builds only lists the builds you created or cloned.
- Fixed: Download Npcap starts the installer again (it now asks for administrator rights instead of failing silently).

## 0.2.11

- New: the Character Builder stats are real and live: class base stats, gear (Magicstones and every other socket), Daevanion, collections and titles, computed the way questlog does. The Target view shows the change on each stat.
- New: Pantheon, Arcana and Genus Insight collections, with their stats in the builder.
- New: skills and quests in the database show the English card and, under it, the same card in your language (Italian is an unofficial translation).
- New: delete the builds you created or cloned; your builds and your Daevanion nodes are kept after a restart.
- New: new Windows icon.
- Changed: Gear Score is computed the way questlog does (enhancement, breakthrough, Magicstones, Theostone, Arcana, Daevanion points).
- Changed: a build can only be cloned onto a character of the same class.
- Changed: one Back button: to the build from Missing pieces, to the Character Builder everywhere else.
- Fixed: Upload in Fight history uploads the selected fights.
- Fixed: equipped wings and titles give their bonuses; wings and titles with no stats are no longer listed; flight power is no longer inflated.
- Fixed: the gauntlet skin and the Brawler wings are hidden until the Brawler is out in EU/NA.

## 0.2.10

- New: Character Builder collections (skins, pets, wings, monolith, titles) with their real stat totals; a new character starts from 0. Genus Insight, Pantheon and Arcana are coming in a dedicated update.
- New: real item stats in the Character Builder (base, enhancement, breakthrough, soul imprint lines), real Magicstones, Theostones and Philosopher's Stones, and Gear Score from your pieces.
- New: from an item page, Add to build puts it in your owned gear and Add to target in your target gear.
- New: Compare and Export in the fight report; Export in Fight history.
- Changed: the off-hand slot is the Guard for every class; the Potential slider is gone; Combat Power is no longer shown with made-up numbers.
- Fixed: the build widget shows item icons.
- Fixed: Missing pieces counts every slot (bracelets too); Owned shows an empty build as empty; Back to build returns to the build you were working on.
- Fixed: healing, damage taken and targets bars in the fight report scale over the whole fight, and the attempt counter moves between attempts.
- Fixed: Build community portraits show the character's face.

## 0.2.9

- New: the whole game database is in the app (items, NPCs, quests, dungeons, skills, recipes, titles, achievements, pets, wings and more) with real details, links between entries and Ctrl+K search.
- New: PvP tab in the DPS Meter: damage dealt by you and your party to other players.
- New: Character Builder rebuilt: each slot only offers items of its type, working sliders and stat menus, real owned/target gear, missing pieces, Compare, Widget and Share (Discord).
- New: Build community shows 12 builds per page; Your builds and Liked work.
- Changed: the program file is now PowerMeter.exe.
- Changed: the character chip at the top is a plain button that opens My characters.
- Fixed: exporting characters saves the file to Downloads.
- Fixed: every Fight report tab (skill and buff timeline, damage taken, healing, targets) follows the selected range.
- Fixed: default gear and build lists follow your character's class.

## 0.2.8

- New: My characters works: add, import, export, duplicate and delete characters, and set the active one. Switching character updates the whole dashboard (builder, Skill Planner, Daevanion).
- New: the Daevanion Planner shows the real boards of your character's class.
- New: real item icons in the builder, item pages, search and home.
- New: interactive world map with real markers (data: aion2-interactive-map, CC BY-NC 4.0).
- New: choose tags when creating a new build.
- Changed: the DPS Meter tabs are now Boss, Train and PvP.
- Changed: only EU and NA are shown; the Brawler is hidden until it launches in the West.
- Fixed: switching DPS Meter tab no longer jumps back to Boss.
- Fixed: selecting a range in the fight report updates the statistics below it.
- Fixed: rankings tabs and filters and Build community page numbers work.

## 0.2.7

- Fixed: the release notes in the update window now appear in the language you chose for PowerMeter.

## 0.2.6

- Fixed: every meter theme now has its own colour (as shown in the theme menu); Obsidian and AION2 look right.
- New: the Daevanion Planner shows the real skill icon on skill (+1) nodes.
- New: the dashboard opens maximized; below 1200 px wide the sidebar collapses by itself and the Skill Planner switches to two columns, so nothing overflows down to 1024×600.
- New: build cards in Build community show the class portrait.

## 0.2.5

- Fixed: clicking the lock of a locked meter now really unlocks it (it turns red when you hover it).
- Fixed: in Build and Lobby mode the meter header no longer wraps to two lines when you hover it.
- Fixed: changing the meter theme applies right away.
- New: every meter theme is now a colour variant of the PowerMeter widget, with all its features (DPS/Build/Lobby, lock, update notice).
- New: real skill icons and names across the dashboard (report, party, builder).
- New: the Skill Planner lists the real skills of your class, with cooldown, cast time, cost, range and description where available.

## 0.2.4

- Fixed: changing "Meter layout" in the meter settings now applies right away instead of after a restart.
- Fixed: a locked meter can be unlocked with the mouse: hover the lock in its top-right corner and click it.
- New: locking the meter shows for a few seconds how to unlock it; "Open widget" in the dashboard also unlocks it.

## 0.2.3

- New: the meter shows an "Update available" strip; click it to see the release notes and update in one click.
- Fixed: the update notice now also appears while the dashboard stays open (checks every 30 minutes and when you switch back to it).

## 0.2.2

- New: the dashboard opens on every launch, next to the meter.

## 0.2.1

- Fixed: PowerMeter now starts from the installer's "Launch" checkbox and restarts by itself after an update (it asks for admin rights with the usual Windows prompt).

## 0.2.0

- New: Discord sign-in (Settings → Account) and one-click combat log upload with a shareable link.
- New: redesigned Account page with Discord profile photo and an explicit Save button.
- New: updates download and install inside the app, with live progress.
- Removed: leftover third-party donation links from the original meter.
