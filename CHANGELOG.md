# Changelog

Every release needs a `## <version>` section here: CI copies its bullet points into the
GitHub release and into the in-app update window, and refuses to publish without it.
The same section must also exist, translated, in changelog/<lang>.md for every UI language.

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
