# p-backlog — owner tickets

Every owner message that starts with "New task" is one ticket here.
Status: `open` · `in-progress` · `green` (built, CI green, not yet seen on the phone) · `done` (verified on the phone) · `blocked` (waiting on the owner).

| # | Opened | App | Ticket | Status | Notes |
|---|--------|-----|--------|--------|-------|
| T-001 | 2026-10-18 | cloud-media | Settings ⚙ (Profile, Configs) with per-tab Configs: Music, Videos, Gallery, Books, Feed, Movies (sources + torrent) | green | Ship 39110245299. Profile can't open cloud-account directly (Tauri opener) |
| T-002 | 2026-10-18 | cloud-mail | Offline cache 1–12 months (default 6); fix "Session request failed: HTTP 401" | green | App: Ship 39110632849. Edge: cloud-u-containers 0ec52455, deployed |
| T-003 | 2026-10-18 | cloud-sa | Observ: Logcat out of About, own tab before About | green | f6c7aa0bc |
| T-004 | 2026-10-18 | cloud-browser | Declare and open .mhtml/.mht files | green | e0a44e4c5 |
| T-005 | 2026-10-18 | cloud-drive | Settings ⚙ (Profile, Configs); Configs order General, Webserver, Backups, Others; Webserver opens c3-webserver | green | 2897b022e |
| T-006 | 2026-10-18 | c3-webserver | Linux webserver parity; 8002 emulated, 8003 diagnostics; private DNS termux/nix/emulated/cloud.app; Pages links; Configs About + Engines | green | Superseded in part by T-019 (exact Linux UI on 8002) |
| T-007 | 2026-10-18 | cloud-drive | File menu: Open with…, Unzip…, Convert… (MHTML → HTML + assets, images, md, json, pdf) | green | 0904b3f14 |
| T-008 | 2026-10-18 | cloud-sa | Restore D-on-black launcher icon; show the SuperApp in Cloud → All apps | green | 65fce3357 |
| T-009 | 2026-10-18 | fleet | All launcher labels "Cloud …" in Title Case (e.g. Cloud Browser, Cloud Gallery) | green | 9a7f107dd, 0f3e13a1c |
| T-010 | 2026-10-18 | cloud-c3 | Containers table: export (copy, CSV, Markdown) + fix vertical scroll | green | f8489cc8a |
| T-011 | 2026-10-18 | cloud-sa | Configs › Network: Webserver tile after DNS | green | 863400342 |
| T-012 | 2026-10-18 | cloud-store | Search as its own nav item and the opening page: Cloud, Phone, Search, Feed, Access | green | 6fd72cc53 |
| T-013 | 2026-10-18 | cloud-sa | Configs › Network: one "Apps Access" tile → cloud-store Access (single source) | green | 863400342 |
| T-014 | 2026-10-18 | cloud-store | Access › Identity tab (shared-uid groups from fleet-identity.json) | green | 2a03092db, 66e9b53e4 |
| T-015 | 2026-10-18 | cloud-sa | Cloud → CONFIGS tiles small, all on one screen; distinct icons | green | ebb271a29, 863400342 |
| T-016 | 2026-10-18 | cloud-sa | Notify page identical to Samsung One UI notification centre | green | 5864de7b3 |
| T-017 | 2026-10-18 | cloud-browser | Tab switcher cards show a snapshot of the page | green | 84aea5521 |
| T-018 | 2026-10-18 | termux, nix | Both terminals natively run the Linux webserver (8000, 8001) via the shared lib | in-progress | libs/fleet-webserver |
| T-019 | 2026-10-18 | c3-webserver | 8002: delete custom page; serve only /storage/emulated/0 with the exact Linux UI; one shared lib for all 3 apps | green | 9151c9a16, Ship 39136337270 |
| T-020 | 2026-10-20 | cloud-c3 | Infra: Storage (hardware only), drop API/DB duplicates of Containers; add Providers, VMs, Electronics, Domains (diegonmarcos.com, Cloudflare, MX/SPF/DKIM/DMARC) | in-progress | |

## Blocked on the owner

| # | What | Unblocks |
|---|------|----------|
| B-1 | Put the phone back on WireGuard | On-phone check of every `green` ticket |
| B-2 | Add the GARMIN_USERNAME / GARMIN_PASSWORD secrets | Garmin watch-face build |
| B-3 | Update Cloud Terminal, then clear its data | Termux shared-uid migration |
| B-4 | Update nix and grant it storage permission | Nix shared store |
| B-5 | Open the current cloud-drive build once | Merge `cloud-shared-store-drive-join` |
