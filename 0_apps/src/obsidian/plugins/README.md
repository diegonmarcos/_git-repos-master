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
| pdf-plus | 0.40.31 | MIT | https://github.com/ryotaushio/obsidian-pdf-plus |
| obsidian-zotero-desktop-connector | 3.2.1 | GPL-3.0 | https://github.com/obsidian-community/obsidian-zotero-integration |
| obsidian-html-plugin | 1.0.19 | MIT | https://github.com/nuthrash/obsidian-html-plugin |
| json-viewer | 0.1.2 | MIT | https://github.com/viggomeesters/obsidian-json-viewer |
| xml-viewer | 0.1.1 | MIT | https://github.com/viggomeesters/obsidian-xml-viewer |
| show-hidden-files | 1.0.3 | MIT | https://github.com/witi42/obsidian-show-hidden-files |
| new-3d-graph | 2.8.2 | MIT | https://github.com/apoo711/obsidian-3d-graph |

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
- **Show Hidden Files**: data.json sets showHiddenFiles and showAllFileTypes to true, so dotfiles and dotfolders (.claude, .github, dotfiles) show in the file explorer on load. The vault config dir and .trash stay hidden by plugin design.
- **New 3D Graph**: data.json shows tags and links, with colour groups copied from graph.json (#hub, #repo, #visibility/public|private, and each #area/* tag in the area colour; the plugin matches tags exactly, so every area tag used in repos-tree/ is listed). That way the repos-tree notes render as the 3D repo graph.
