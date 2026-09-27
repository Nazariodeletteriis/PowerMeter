# Changelog

Every release needs a `## <version>` section here: CI copies its bullet points into the
GitHub release and into the in-app update window, and refuses to publish without it.

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
