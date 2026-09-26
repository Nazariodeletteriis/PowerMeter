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

## Install

Windows 10/11 (x64). One download, nothing to install beforehand:

1. Download the PowerMeter `.msi` from the [latest release](../../releases/latest) and run it.
2. Launch PowerMeter and accept the Windows admin prompt (packet capture needs it).
3. The first-run setup checks for Npcap, the capture driver. If it is missing, click
   **Install Npcap**: PowerMeter fetches the official installer from npcap.com and starts it —
   just click *I Agree → Install → Finish*. No special options are needed.

Npcap's license does not allow shipping it inside the MSI, which is why the setup fetches it for
you instead. Updates arrive in-app.

## Development

Prerequisites: Rust (stable), Node.js 24, Npcap.

```bash
npm install
npm run tauri dev     # run (from an elevated terminal: the app requires admin)
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
