# PowerMeter — Roadmap

> Tool non ufficiale per Aion 2 by Letrion Labs. Interfaccia in italiano (+ 10 lingue),
> contenuti di gioco in inglese. Aggiornato: 2026-09-26.

## Decisioni fissate

| Tema | Decisione |
|---|---|
| Nome | **PowerMeter** (gioco di parole su Combat Power) |
| Licenza | GPL-3.0 (riuso del core di cattura di A2Tools-DPS-Meter) |
| Monetizzazione | Patreon: il client resta gratuito e completo, i supporter sbloccano **servizi server-side** (cloud sync, storico log illimitato, vanity URL, perk non-codice) |
| Dominio | `powermeter.letrionlabs.it` (provvisorio) → `powermeter.gg` in futuro. Base URL sempre configurabile, vecchi link con 301 permanente |
| Repo | https://github.com/Nazariodeletteriis/PowerMeter (privato) |
| Regione di riferimento | Global / EU |
| Desktop | Tauri 2 — Rust (cattura pacchetti via Npcap, solo Windows) + UI TypeScript |
| Server | Node.js 24 LTS + TypeScript su Netsons cPanel (Setup Node.js App), deploy via `git pull` |
| Database | PostgreSQL 18 (Netsons) |
| Dati di gioco | Opzione C: cron server-side importa da questlog.gg e shugo.gg nel nostro Postgres; l'app legge solo da noi |
| Login | Discord OAuth (Patreon collegato in R6) |
| Build Windows | GitHub Actions (runner Windows) produce l'MSI; Nazario testa in gioco |
| Rischio ToS NCSoft | Accettato. Disclaimer "tool non ufficiale" in app e sul sito |
| Design | Prima Claude Design (brief in `docs/design/DESIGN_BRIEF.md`), poi rifinitura |

## Fonti delle feature

- **A2Tools-DPS-Meter** (GPL-3.0) — core cattura e calcolo DPS. Si riusa il codice.
- **AbyssLogs** (abysslogs.com) — riferimento di punta per meter, report e community. Solo UX, niente codice.
- **Aion2-TM-DesktopApp** (licenza custom) — task, timer, armory. Solo feature, si riscrive da zero.
- **questlog.gg/aion-2** — database, builder, mappa, crafting, armory. Solo feature, dati via import.

## Release

Ogni release è utilizzabile da sola. Alla fine di R6 ci sono tutte le feature delle 4 fonti.

### R1 — Meter
- Monorepo, CI GitHub Actions con MSI Windows, i18n 11 lingue (it, en, de, fr, es, pt, ru, ja, ko, zh-Hans, zh-Hant)
- App desktop: shell della dashboard, onboarding (requisiti Npcap/admin, lingua, personaggio, disclaimer)
- **DPS meter** nel widget overlay trascinabile: party DPS, breakdown skill, crit/back/parry/perfect/double, DOT, evocazioni, 4 target mode (Boss, Last Hit, All Targets, Train), grafico, ping, temi, hotkey, click-through
- Storico combattimenti locale con auto-save sui boss

### R2 — Logs online
- Server su Netsons + Postgres, login Discord
- Upload con un click, report web stile AbyssLogs (dungeon → segmento → tentativo, tabella skill 13 colonne, skill timeline, buff timeline con uptime)
- Link condivisibile `/e/<id>`, browse dei log pubblici, classifiche per regione/boss/classe, statistiche di classe
- Widget: lobby dungeon (CP, gear score, stato pronto)

### R3 — Build
- Importer dati di gioco (cron) + API
- Database (oggetti, skill, NPC, quest, dungeon), character builder, gear viewer, skill planner, Daevanion planner
- Profili multi-personaggio, **build e profili condivisibili via URL**, feed build della community
- **Widget in modalità Build**: pezzi posseduti/mancanti, statistiche, CP

### R4 — Mondo
- Mappa interattiva (layer, progressi, percorsi), crafting calculator, Arcana, Pantheon, Genius Insight
- Armory: ricerca personaggi, tier list, meta, pagine classe

### R5 — Organizer
- Task (daily/weekly/season), checklist, timer (reset, Shugo, Rift, custom), shopping list, Flow Map, template
- Export/import CSV/Excel/HTML, notifiche Discord via webhook

### R6 — Supporter
- Collegamento Patreon, cloud sync, storico log illimitato, vanity URL, perk
