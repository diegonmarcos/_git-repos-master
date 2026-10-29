# Obsidian community plugins (vendored)

Release assets (manifest.json, main.js, styles.css) are fetched from each plugin's
GitHub **latest release** by `9_others/obsidian/install-plugins.sh` (list:
`9_others/obsidian/plugins.list`, lock: `9_others/obsidian/plugins.lock`) and
committed here unmodified, except `remotely-save/main.js`: it embeds the upstream Google OAuth app client id/secret, which GitHub push protection rejects, so it is gitignored and fetched per device by running the script. Every licence below permits redistribution of the
unmodified build with its notice; source is at the linked repo.
Default settings (`data.json`) are managed in `0_apps/src/obsidian/plugins/<id>/data.json`
and deployed here; edit them there. Update: `bash 9_others/obsidian/install-plugins.sh`
(or `--only id1,id2`), then commit.

| id | version | licence | source |
|---|---|---|---|
| obsidian-excalidraw-plugin | 2.29.0 | AGPL-3.0 | https://github.com/zsviczian/obsidian-excalidraw-plugin |
| templater-obsidian | 2.26.0 | AGPL-3.0-only | https://github.com/silentvoid13/Templater |
| dataview | 0.5.68 | MIT | https://github.com/blacksmithgu/obsidian-dataview |
| obsidian-tasks-plugin | 8.6.0 | MIT | https://github.com/obsidian-tasks-group/obsidian-tasks |
| table-editor-obsidian | 0.23.2 | GPL-3.0 | https://github.com/tgrosinger/advanced-tables-obsidian |
| obsidian-git | 2.42.0 | MIT | https://github.com/vinzent03/obsidian-git |
| calendar | 2.0.0 | MIT | https://github.com/liamcain/obsidian-calendar-plugin |
| obsidian-style-settings | 1.0.9 | GPL-3.0 | https://github.com/obsidian-community/obsidian-style-settings |
| obsidian-kanban | 2.0.51 | GPL-3.0 | https://github.com/obsidian-community/obsidian-kanban |
| remotely-save | 0.5.25 | Apache-2.0 | https://github.com/remotely-save/remotely-save |
| quickadd | 2.33.1 | MIT | https://github.com/chhoumann/quickadd |
| omnisearch | 1.32.0 | GPL-3.0 | https://github.com/scambier/obsidian-omnisearch |
| beautiful-mermaid-renderer | 0.2.5 | Apache-2.0 | https://github.com/qiaoborui/obsidian-beautiful-mermaid |
| periodic-notes | 0.0.17 | MIT | https://github.com/liamcain/obsidian-periodic-notes |
| pdf-plus | 0.40.31 | MIT | https://github.com/ryotaushio/obsidian-pdf-plus |
| obsidian-zotero-desktop-connector | 3.2.1 | GPL-3.0 | https://github.com/obsidian-community/obsidian-zotero-integration |
| obsidian-html-plugin | 1.0.19 | MIT | https://github.com/nuthrash/obsidian-html-plugin |
| json-viewer | 0.1.2 | MIT | https://github.com/viggomeesters/obsidian-json-viewer |
| xml-viewer | 0.1.1 | MIT | https://github.com/viggomeesters/obsidian-xml-viewer |
| notebook-navigator | 3.5.0 | GPL-3.0 | https://github.com/johansan/notebook-navigator |

Choice notes: HTML viewer = HTML Reader (`obsidian-html-plugin`, most downloaded
HTML viewer); JSON/XML = `json-viewer` + `xml-viewer` (same author; most-used
read-only viewers for each format). Beautiful Mermaid id = `beautiful-mermaid-renderer`.

## Safety defaults
- **Obsidian Git**: auto-commit, auto-push and auto-pull are OFF (`autoSaveInterval`,
  `autoPushInterval`, `autoPullInterval` = 0, `disablePush: true`). This repo is
  worked on `main` directly. To enable: Settings, Obsidian Git, set "Auto commit-and-sync
  interval" (minutes) and turn off "Disable push" (or set those keys in data.json, locally).
- **Remotely Save**: no credentials, every auto-run timer -1 (disabled). Configure on
  the device only; never commit credentials (data.json would carry them).

## Settings changed (#1287)
- **Notebook Navigator** (added): `confirmBeforeDelete: true`, `autoRevealActiveFile: true`; everything else stays at the plugin defaults.
- **HTML Reader**: `mhtmlSupport: true`. This is the plugin's own "MHTML File Format Support" toggle (main.js: it registers `mht`, `mhtml` and converts them to HTML). Do not add the extensions to `extraFileExt` as well. `opMode` was the invalid value `1`; it is now `"BalanceMode"`, the plugin's default enum string. Relaunch Obsidian after changing either setting.
- **Dataview**: `enableDataviewJs: true`, `enableInlineDataviewJs: true`. JS queries run arbitrary code from any note, so open only trusted vaults.
- **PDF++**: `enablePDFEdit: true` ("Editing PDF files directly", experimental per upstream: no warranty against corruption, the viewer reloads after each written highlight, keep backups, and `.git` history is the backup here). Also `author` (written into annotations), `enableAnnotationDeletion`/`enableAnnotationContentEdit: true`, `warnBacklinkedAnnotationDelete: true`, `enableEditEncryptedPDF: false`.
- **Omnisearch**: `indexedFileTypes: ["md","canvas"]` (json, xml and html removed) and `hideExcluded: true`. `app.json` `userIgnoreFilters` now also lists `repo-folders-tree.json` and `repo-folders-tree.html`.

### Why JSON "hung"
`json-viewer` 0.1.2 is not the cause. Its main.js renders eagerly only up to 2000 nodes, caps the outline at 1000 entries, pages children 250 at a time, caps "Expand all" at 5000 rows, and loads raw source lazily. JSON.parse of 1.3 MB is cheap. It is also the only plugin that registers `.json`, so there is no extension clash.

The culprit is **Omnisearch**. With `json`, `html` and `xml` in `indexedFileTypes`, it tokenised every such file with no size limit: 89 files, 5.7 MB. Two generated files make up most of that: `repo-folders-tree.json` (1.3 MB, 43k nodes) and `repo-folders-tree.html` (4.2 MB). Both are rewritten on every commit, and Omnisearch's `vault.on("modify")` handler then re-flags them for indexing. Its excluded-files check (`isUserIgnored`) only applies when `hideExcluded` is on, and it was off. On the phone that indexing blocks the UI right after a sync or pull, which is when those JSON files get opened.
