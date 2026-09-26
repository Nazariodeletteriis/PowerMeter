# PowerMeter

Real-time DPS meter, combat logs and build planner for **AION 2** — by Letrion Labs.
Interface in 11 languages (Italian included); in-game content (skills, items, bosses) keeps the
names the game shows.

> PowerMeter is an unofficial fan tool. It is not affiliated with or endorsed by NCSOFT.
> It reads combat traffic passively; use it at your own risk.

## Credits

The packet capture and DPS engine come from
**[A2Tools DPS Meter](https://github.com/taengu/A2Tools-DPS-Meter)** by **taengu**, licensed under
GPL-3.0. PowerMeter tracks it as the `upstream` remote so protocol and game-data fixes can be merged
after every game patch. Thank you!

## Requirements

- Windows 10/11 (x64)
- [Npcap](https://npcap.com) installed with **"WinPcap API-compatible Mode"** enabled
- Run PowerMeter **as Administrator** (raw packet capture)

## Download

Windows installers are built by GitHub Actions on every push to `main`
(artifact `PowerMeter-msi` on the workflow run) and attached to releases on `v*` tags.

## Development

Prerequisites: Rust (stable), Node.js 24, Npcap.

```bash
npm install
npm run tauri dev     # run
npm run tauri build   # MSI in src-tauri/target/release/bundle/msi/
cargo test --manifest-path src-tauri/Cargo.toml
```

Merging engine fixes from A2Tools:

```bash
git fetch upstream
git merge upstream/main   # keep our name/version/identifier on conflicts
```

Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md).

## License

[GPL-3.0](LICENSE) — same as the A2Tools DPS Meter engine it is built on.
