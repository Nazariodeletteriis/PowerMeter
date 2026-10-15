# Changelog

Every release needs a `## <version>` section here: CI copies its bullet points into the
GitHub release and into the in-app update window, and refuses to publish without it.
The same section must also exist, translated, in changelog/<lang>.md for every UI language.

## 0.5.10

- Fixed: The widget stayed on "Not connected" / "no packets" even after PowerMeter had connected to the game: it now follows the connection every few seconds.

## 0.5.9

- New: When PowerMeter cannot connect to the game, the widget says why (no packets from the network adapters, no game packets, game window not recognised…) and "Copy diagnosis" copies a report to paste in Discord.
- Fixed: Wi-Fi: network adapters are no longer opened in promiscuous mode, which on many Wi-Fi drivers captured nothing at all.
- Fixed: Network adapters that tag their packets (Killer and other gaming adapters) are now read.
- Fixed: The "not connected" warning never appeared: the widget took "no port yet" for a port.
- Changed: Widget: Reset is in the footer, bottom left.

## 0.5.8

- New: Redesigned widget: DPS / HEAL / AGGRO tabs, boss name with HP bar, ranked rows with class-coloured DPS bars. The Compact layout follows the same style.
- Changed: Widget layouts are now just "Interface" and "Compact". The Classic layouts are gone: if you used one, you move to the matching new layout.
- Fixed: PowerMeter finds the game even when its window has a different title (for example "AION 2"): it recognises it by its program.
- Fixed: Npcap installed without "WinPcap API-compatible mode" now works; if Npcap cannot start, the widget says so.
- Fixed: Network adapters turned on after start (VPN, ExitLag, Wi-Fi after sleep) are captured without restarting, and the meter no longer stays stuck on a dead connection.
- Fixed: World map: markers and zone borders were upside down (Asmodian cubes in the sea). Now they sit on land on every map.
- Changed: Supporter: the three Patreon plans unlock everything; they differ only in billing period and discount.

## 0.5.7

- New: Character Builder: Pet tab: your pet collection as in the game's Pet window (categories, level, progress x/75, MAX), opened with "Show pets". PowerMeter reads it from the game at login; you can also mark pets by hand. The count matches the game (Special pets excluded).
- Fixed: Character Builder: a worn item missing from the item data (like the Cleric's guard) stays in its slot instead of disappearing.
- Fixed: Switching character in game now switches the whole Character tab, Character Builder included, not just the header.

## 0.5.6

- New: Fight report: the damage of every hit is now recorded, so a selected time range shows each skill's real damage, not an estimate (fights from now on).
- New: Trainer in the widget too, Compact Beta included: the target icon in the footer.
- New: Trainer: a Restart button runs the countdown and the reset again.
- Fixed: Your character is recognised even when PowerMeter starts while you are already in the game: no more number instead of your name.
- Fixed: Trainer: it measures again (it stayed empty), and the widget no longer switches it back to PVE.
- Fixed: "Only my DPS" in the widget now hides the other players.
- Fixed: Compact Beta widget: the top bar stays readable on hover (it showed only "I").

## 0.5.4

- New: DPS Meter: Trainer mode: a 3-2-1 countdown, then your DPS on the training dummy only.
- New: "Only my DPS" flag in the widget footer and in the DPS Meter: hides everyone else.
- New: Fight history: training dummy tests are saved as their own fights, a few seconds after you stop.
- New: Compact Beta widget: animated DPS bars, cleaner rows and a Reset button in the footer.
- Fixed: Reset no longer turns party members into numbers: names and classes stay.
- Fixed: Switching widget layout shows names and classes right away, never a number.
- Fixed: Classic layout and widget history: class icons were missing.
- Fixed: Fight report: clicking a name selects that player, and the time range no longer flickers while you drag.

## 0.5.3

- New: Admin panel inside the app: admins open it from Settings. The web panel is gone.
- Fixed: Items that had no icon (such as Wrathful Mind) now show it, from the official game icons.
- Fixed: Dungeons: Conquest cards are no longer always red: they unlock with your character's Gear Score.
- Changed: Dungeons: a dungeon opens only once your Gear Score unlocks it; locked ones stay closed.

## 0.5.2

- New: Admins open the new web admin panel from the Supporter page.
- New: A suspended account sees a clear message when signing in.
- Changed: The app sends its version to the PowerMeter server, to see which versions are in use.

## 0.5.1

- Changed: Crafting is simpler: the item you pick with its materials beside it, below it only the next step with its materials, then the table of the materials you need and the ones you have.
- Changed: Crafting: the item list is wider and easier to read.
- Changed: Crafting: the quantities you have are one inventory per character, shared by every item.

## 0.5.0

- New: Crafting redone: Alchemy, Blacksmithing, Cooking, Armorsmithing and Handicrafting tabs, each with its own sub-categories.
- New: Crafting tree: pick an item and see its whole chain, from the base to the last step, with every material; start from an intermediate item to see the rest of the chain.
- New: Crafting inventory: enter the materials you already have and mark the steps you crafted; they come off what is still missing, saved per character.
- New: Widget: DPS, HEAL and AGGRO tabs: damage, healing done and damage taken by every player.
- New: Widget: the Copy button copies the fight as an image: paste it on Discord with Ctrl+V.
- New: Builder: your real Gear Score and Combat Power, read from the game.
- New: Dungeons: unlocked by your character's Gear Score, with how much is missing for the locked ones.
- New: Builder: Pet, Wings, Pantheon, Achievements and Closet sections (coming soon).
- Changed: Fight history (widget and dashboard) shows the last 10 fights, with a button to show 10 more.
- Changed: Widget: the Build and Lobby tabs are removed.
- Fixed: Widget: switching tab no longer resizes the widget.

## 0.4.9

- New: Roles: everyone starts as Player with a full 30-day trial (Discord login and a Discord account at least 8 months old); then Party, rotations and Gear Viewer are for the plans. Patreon plans are coming soon.
- New: Dungeons page redone: Exploration and Conquest cards with entry requirements, rewards and drops.
- New: Builder: the skill bar is shown as in game, every set with the skills chained above each slot (stigmas included).
- New: Widget: Copy button for the fight's DPS, ready to paste on Discord.
- New: Widget: volume of the event alert in the settings.
- New: After a character switch, a hint suggests a teleport to refresh the character.
- Fixed: Switching character switches the whole profile, Builder and Daevanion included.
- Fixed: Widget resize: no more transparent edges blocking the game, size remembered, the minimized icon can be dragged.
- Fixed: An Npcap already installed is recognised: no request to install it again.
- Fixed: Quests: the list no longer starts with unnamed quests.
- Changed: Packet and debug logs are only for the Debugger and Admin roles.
- Changed: Calculators and Armory removed.
- Changed: Terms and privacy updated: you will be asked to accept them again.

## 0.4.8

- New: Builder: each god of the Daevanion tab shows its board in small, with the nodes you took; the magnifier enlarges it.
- Fixed: The top bar follows the character you switch to in game (the game window title kept bringing back the previous one).
- Fixed: Builder: your skill bar is read when you enter the world, not only when you change it.
- Fixed: Skill Database and Daevanion: every skill shows its icon.

## 0.4.7

- New: Report: Inspect shows the gear of the other players in the fight (weapon, armor, necklace, earrings, with enhancement).
- New: Builder: your Daevanion comes from the game, points per god; click a god to see its Daevanion skills.
- New: Builder: the Skills tab shows your skill bar in game, per character.
- New: Builder: enhancement levels (+N) are read from the game.
- New: The widget event alert plays the Timer sound, if you turned it on.
- Fixed: Widget: “Average DPS by class” shows the fight on the meter instead of fixed numbers.
- Fixed: Runes and amulet now show in the gear taken from the game.
- Fixed: Report and Skill Database: icons for many more skills (damage over time, Theostones, renamed skills); every game skill is listed.
- Fixed: Widget: more space between the event alert and the boss bar.
- Fixed: Chanter and Templar icons in their class colors.
- Fixed: A Ranger's guard is kept in the off-hand slot.

## 0.4.6

- Fixed: Builder: the gear is read again when you enter the world (a large login packet was being dropped, so the current gear stayed empty).
- Fixed: The gear goes to the character you are playing: switching character no longer saves the new one's gear on the previous one.
- Fixed: Gear taken from the game now shows the item icons.

## 0.4.5

- New: Builder: your current gear comes from the game (read at login and on every change), with item stats and enhancement levels.
- New: The widget warns 10 minutes before an event (rift, world bosses, Shugo Festival, resets) with a countdown.
- Fixed: Report: only real players, named as in the logs; no more grey rows with numbers.
- Fixed: A character already in your list is recognised even if its name was typed slightly differently: no prompt to create it again.
- Fixed: Items: the shield shows as off-hand for every class.

## 0.4.4

- New: The meter switches mode by itself: BOSS at a boss, PVP against players, PVE for everything else.
- Changed: TRAIN is gone: training dummies count as PVE, in the widget and in the dashboard.
- New: RESET button always visible in the widget, next to the mode selector.
- New: Boss kills are uploaded automatically (when signed in, can be turned off in Settings); log pages show only in-game character names.
- New: Rankings (biggest hit, fastest kill, party DPS) and the best players of each class in Class stats.
- New: Rotation tab in the Report; the Report opens your last boss with the dungeon and Boss 1/2/3.
- New: History grouped by dungeon, with a real Dungeon filter.
- New: Skill Planner fills the skill bar from the game; passives as points, level 1–20.
- New: Builder with current and wanted gear and the stat difference.
- New: Item filters (category, slot, grade, level, trade, faction, source, class); Gear Viewer can select, compare and pin.
- Fixed: The widget no longer freezes when switching mode, and the STAGGER bar updates without new damage.
- Fixed: Lost packets recovered and lower latency: the meter follows the fight in real time.
- Changed: Marketplace removed.

## 0.4.3

- New: When an update is available, a window shows it as soon as you open the app, with Update now and Release notes buttons.

## 0.4.2

- New: STAGGER bar under the boss HP bar in the widget, with the real gauge: it drops with your hits and shows when the boss is broken.
- Fixed: The widget and its Settings now follow the chosen language (they stayed in English in the installed app).
- Fixed: Daily and weekly resets at 07:00 UTC, shown in your local time.
- Fixed: Your own HP no longer mixes with the monsters' HP.

## 0.4.1

- Changed: New DPS Meter widget design: bigger, easier to click buttons, clearer boss bar and player rows with class icons.
- New: Class average DPS view in the widget, from the button next to the lock.

## 0.4.0

- New: Database: search, items, NPCs and monsters with their drops and a Map button that shows where they are, quests, dungeons, crafting and skills, with the game data.
- New: Gear Viewer with the game data.
- New: Timers: 9 recurring events in your local time, with a countdown and an optional sound.
- New: Daevanion Planner: the game's Daevanion boards, pick the nodes and see the stats and skill levels they give.
- New: Character Builder: base stats, enhancement levels and an estimate of CP and DPS for the build.
- Changed: PowerMeter is described everywhere as an unofficial, amateur project made for the Aion 2 community.
- Fixed: the game is detected reliably when launched from Purple.
- Fixed: DPS and damage no longer turn negative on very large multi-hit attacks.
- Fixed: heals from a healer who has not used a skill yet in the fight are no longer lost.
- Fixed: in My characters, clicking a character opens its build in the Character Builder directly.
- Fixed: the Character Builder no longer shows likes and replies that do not exist: a build starts at 0.
- Fixed: a monster's card is no longer empty, and the Map button opens its map in a popup.
- Fixed: Gear Viewer shows each piece once instead of twice.
- Fixed: Dungeons lists every dungeon, each once.

## 0.3.9

- Changed: updated Terms: in Recluta and Daeva, the Database, Gear Viewer, crafting helper and calculator are included once official game data is available. You will be asked to accept the Terms again.

## 0.3.8

- Removed: Database, Gear Viewer, Armory, Daevanion planner, Crafting, Calculators and Marketplace show "Official data coming" until official game data is available.
- Removed: the Character Builder keeps skills, description and comments; gear, stats, Gear Score and collections will return with official data, and the gear saved in your builds has been cleared.
- Removed: Build community lists only your own builds; community builds, favorites and the spawn points on the map are gone.
- Changed: Spacetime Rift and Shugo Festival show only the details confirmed by NCSOFT; the Rift portal stays open 15 minutes.

## 0.3.7

- Changed: Recluta, Daeva and the free trial work on 1 PC per account, Empyrean on 2; after moving to a plan with fewer PCs, the PCs registered first keep access.

## 0.3.6

- Fixed: the Supporter page no longer turns the window black when the admin panel lists users; if a page ever fails, it shows the error with a retry instead of a black window.

## 0.3.5

- New: Monsters found inside a dungeon show the world map with the dungeon entrance and a link to the dungeon (Found inside), and monsters of Verteron's Illusion Curtain layer are now on the Verteron map.

## 0.3.4

- New: Supporter plans on Patreon (Recluta 3 €, Daeva 7 €, Empyrean 15 € a month). The meter and most tabs stay free; Database, Fight report, Online logs and Rankings need Recluta, Party, Crafting and Calculators need Daeva. Locked tabs stay in the menu with a padlock and a blurred preview.
- New: 14-day free trial of everything, once per Discord account: sign in with Discord to start it.
- New: a plan works on up to 2 PCs per account (a PC frees its place after 30 days unused), and the free trial is one per person, tied to both the Discord account and the PC.
- New: Supporter page: your plan and where it comes from, link or unlink Patreon, and the plans side by side.
- New: Build community shows the community's builds from questlog.gg, with class, tag, region and search filters; open any of them in the Character Builder and duplicate it to make it yours.
- New: NPC, monster and dungeon cards show a minimap of where they are, and quest cards show where the quest giver, the targets, the turn-in NPC and the dungeon are. Added the Poeta, Ishalgen, Eltnen and Morheim maps.
- Changed: "Your builds" lists only the builds you created or duplicated; "Liked" is now "Favorites" and is kept after a restart.
- Changed: maps load only the part you are looking at.

## 0.3.3

- New: NPCs and monsters in the database show their spawn points on the map (Show on map), for Verteron, Altgard and Reshanta.
- Changed: the main build is now per character, not per class: two characters of the same class keep separate gear. Until a character edits its own, it starts from the previous shared build.
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
