#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║ clone.sh — pick which repos to have locally                      ║
# ║                                                                  ║
# ║   ./clone.sh                list what exists and what does not   ║
# ║   ./clone.sh <name>...      clone those, then link them          ║
# ║   ./clone.sh --all          clone everything in repos.json       ║
# ║   ./clone.sh --group <g>    clone one farm folder (e.g. 2.CG)     ║
# ║   ./clone.sh --link         relink whatever is already cloned    ║
# ║   ./clone.sh --relink       rewrite every link from the registry ║
# ║   ./clone.sh --sync         push fleet-shared files to all repos ║
# ║   ./clone.sh --check        verify registry + links (repos-sot.js)║
# ║   ./clone.sh --full         full history (or CLONE_DEPTH=0)       ║
# ╚══════════════════════════════════════════════════════════════════╝
#
# This repo is an INDEX, not a container. Clones live outside it (in
# $CLOUD_GIT_BASE, default ~/cloud-shared-store/git) and appear here as symlinks:
#
#     repo-master/1.1.Cloudy/cloudy-u-desktop            ->  ~/cloud-shared-store/git/cloudy-u-desktop
#     repo-master/1.2.Cloud-me/Pvt/cloud-me-pvt-vault     ->  ~/cloud-shared-store/git/cloud-me-pvt-vault
#
# Every repo in the registry has a link, committed, whether or not you have
# cloned it. A link to a repo you do not have dangles — that is the index
# working, not a fault: `ls` is the project, and the broken entries are your
# to-clone list.
#
# Why not submodules: a submodule pins a commit and wants --recursive, which
# here meant cloud-master containing cloud containing cloud-master (an
# unterminating recursive clone), private repos breaking init for anyone
# without those credentials, and every repository dragged along to read one
# file. An index of working clones is a different thing from a pinned build
# input, and this is the former.

set -eu

REG_DIR="$(cd "$(dirname "$0")" && pwd)"      # 0_registry/: repos.json, repos-sot.js, this script
SCRIPT_DIR="$(cd "$REG_DIR/.." && pwd)"      # repo root: farm folders, _dotfiles/, 9_others/
REGISTRY="$REG_DIR/repos.json"
[ -f "$REGISTRY" ] || { echo "FATAL: $REGISTRY missing" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "FATAL: node required to read $REGISTRY" >&2; exit 1; }
# The store's directory name is declared once, in repos.json::shared_store_dir.
STORE_DIR="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).shared_store_dir)' "$REGISTRY")"
BASE="${CLOUD_GIT_BASE:-$HOME/$STORE_DIR/git}"
# legacy_store_migration begin (build.json::shared_store.legacy_name): one-time, idempotent, never deletes user data.
# The old store name is only ever an INPUT here: whatever is under it is merged into the store and the old
# link/dir goes. Same text as cloud-u-android ac_cloud-termux/rootfs/enter.sh (the reference, executed in its tests).
legacy_store_merge() {  # $1 = dir emptied into $2; $3 = where a differing file of the same name is kept
    for e in "$1"/* "$1"/.[!.]* "$1"/..?*; do
        [ -e "$e" ] || [ -L "$e" ] || continue
        n="${e##*/}"
        if [ ! -e "$2/$n" ] && [ ! -L "$2/$n" ]; then mv "$e" "$2/$n"
        elif [ -d "$e" ] && [ ! -L "$e" ] && [ -d "$2/$n" ] && [ ! -L "$2/$n" ]; then
            ( legacy_store_merge "$e" "$2/$n" "$3/$n" ); rmdir "$e" 2>/dev/null || true
        elif [ -f "$e" ] && [ ! -L "$e" ] && [ -f "$2/$n" ] && cmp -s "$e" "$2/$n"; then rm -f "$e"
        else
            mkdir -p "$3"; t="$3/$n"; [ ! -e "$t" ] && [ ! -L "$t" ] || t="$t.$$"
            mv "$e" "$t"
        fi
    done
}
legacy_store_migrate() {  # $1 = the old name in $HOME, $2 = the store
    if [ -L "$1" ]; then
        if [ ! -e "$2" ] && [ ! -L "$2" ]; then mv "$1" "$2"; else rm -f "$1"; fi
        return 0
    fi
    [ -d "$1" ] || return 0
    mkdir -p "$2" 2>/dev/null || true
    legacy_store_merge "$1" "$2" "$2/.legacy-backup-$(date +%Y%m%d)"
    rmdir "$1" 2>/dev/null || echo "⚠ $1 still has content or is a mount point; it is left in place and migrated again at the next login" >&2
}
# legacy_store_migration end
# One-time, idempotent: the store's old name is merged into the store and removed (never deletes user data).
legacy_store_migrate "$HOME/cloud-drive-shared-store" "$HOME/$STORE_DIR"  # legacy_store_migration

# ── clone depth ─────────────────────────────────────────────────────────────
# Default is SHALLOW: git clone --depth 1 --shallow-submodules (fast, small
# disk; one clone per repo, never a second "full" copy). Full history is the
# opt-out: pass --full anywhere, or CLONE_DEPTH=0, or CLONE_DEPTH=<n> for a
# deeper shallow clone. Later: git -C <clone> fetch --unshallow.
# Submodules follow the same depth (--shallow-submodules; for an existing
# clone: git submodule update --init --depth 1).
CLONE_DEPTH="${CLONE_DEPTH:-1}"
_args=""
for _a in "$@"; do
    [ "$_a" = "--full" ] && { CLONE_DEPTH=0; continue; }
    _args="$_args $_a"
done
# shellcheck disable=SC2086
set -- $_args
case "$CLONE_DEPTH" in
    0) CLONE_OPTS="" ;;
    *[!0-9]*|"") echo "FATAL: CLONE_DEPTH must be a number (0 = full)" >&2; exit 1 ;;
    *) CLONE_OPTS="--depth $CLONE_DEPTH --shallow-submodules" ;;
esac

# Registry readers. node, not jq: node is already required by every build.sh
# in the fleet, jq is not guaranteed present.
_names() { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(r.repos.map(x=>x.name).join(" "))' "$REGISTRY"; }
_field() { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const e=r.repos.find(x=>x.name===process.argv[2]);process.stdout.write(e?String(e[process.argv[3]]??""):"")' "$REGISTRY" "$1" "$2"; }
# #1291 links are placed by `farm` (<code>.<Name> folders from projects-repos.json, e.g. 1.2.Cloud-me/Pvt);
# `group` is a legacy family key that places nothing. A repo with no farm lives
# at the root; that empty name is emitted as the sentinel "." (word-splitting
# would drop it) and translated back at the point of use.
_groups() { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write([...new Set(r.repos.map(x=>x.farm||"."))].sort().join(" "))' "$REGISTRY"; }
# Where the clone actually lives under $BASE. Defaults to the repo name; the
# d_lecole entries override it because those clones sit in ~/cloud-shared-store/git/lecole-42/.
# Without this the only way to index them would be to move them, which is a
# separate decision from indexing them.
_path() { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const e=r.repos.find(x=>x.name===process.argv[2]);process.stdout.write(e&&e.path?e.path:process.argv[2])' "$REGISTRY" "$1"; }

# An entry with no `farm` links at the ROOT of this repo; one with a farm
# links inside that (possibly nested) directory. Depth follows: ../ from the
# root, one more ../ per farm folder (1.2.Cloud-me/Pvt -> ../../../). Getting that wrong does not fail loudly — it produces a link that
# resolves somewhere plausible and wrong.
_linkpath() { [ -n "$2" ] && printf '%s/%s/%s' "$SCRIPT_DIR" "$2" "$1" || printf '%s/%s' "$SCRIPT_DIR" "$1"; }
# $1 is the PATH under $BASE, not the name — they differ whenever an entry sets
# `path`, and using the name there yields a link that dangles silently.
_linktarget() { _up='../'; if [ -n "$2" ]; then _r="$2/"; while [ -n "$_r" ]; do _up="../$_up"; _r="${_r#*/}"; done; fi; printf '%s%s' "$_up" "$1"; }

# The links are RELATIVE and COMMITTED.
#
# Absolute would not survive the trip. Git stores a symlink's target verbatim,
# so a committed /home/diego/git/cloud-infra-desktop resolves on exactly one machine and
# dangles everywhere else — the same failure .mcp.json had as a link to
# /home/diego/.mcp.json. Relative has no such dependency: clone the repos as
# siblings anywhere ($CLOUD_GIT_BASE, ~/cloud-shared-store/git, /srv, a container) and every link
# resolves.
# #1073 `status: pending_creation` = declared, GitHub repo not created yet.
# Every farmer skips it: no clone, no committed link (a link to a repo that
# does not exist is not a to-clone entry, it is a promise nobody can keep).
_pending() { [ "$(_field "$1" status)" = "pending_creation" ]; }

link_one() {
    _n="$1"; _g=$(_field "$_n" farm); _pp=$(_path "$_n")
    _pending "$_n" && return 1
    _p=$(_linkpath "$_n" "$_g")
    mkdir -p "$(dirname "$_p")"
    # The link is written from the REGISTRY, never from what happens to be on
    # disk: every entry gets a link, committed, whether or not this machine
    # has the clone. A link to a repo you do not have dangles, and that is the
    # index working -- `ls` is the project and the broken entries are your
    # to-clone list. See the header, and cloud/clone.sh, which never had this.
    #
    # This used to `rm -f "$_p"` when the clone was absent. The links are
    # TRACKED, so --relink on any machine with a partial checkout staged
    # deletions of the links every other machine depends on, and a single
    # `git commit -a` propagated them to everyone; it silently removed
    # b_front/ffront and c_gh/gh-profile-diegonmarcos during the 2026-08-27
    # migration. Deleting a committed file because of local state is not a
    # relink -- and an empty group dir is precisely the to-clone list the
    # header promises, not breakage.
    # -n so relinking an existing link replaces it instead of nesting inside it.
    ln -sfn "$(_linktarget "$_pp" "$_g")" "$_p"
    return 0
}

clone_one() {
    _n="$1"; _u=$(_field "$_n" url); _t="$BASE/$(_path "$_n")"
    if _pending "$_n"; then
        printf "  - %-24s pending_creation: repo not created yet, skipped\n" "$_n"
        return 0
    fi
    if [ -d "$_t/.git" ]; then
        printf "  = %-24s already cloned at %s\n" "$_n" "$_t"
    else
        printf "  + %-24s cloning -> %s\n" "$_n" "$_t"
        mkdir -p "$BASE"
        if ! git clone $CLONE_OPTS "$_u" "$_t"; then
            printf "  ! %-24s CLONE FAILED" "$_n"
            [ "$(_field "$_n" private)" = "true" ] && printf " (private — check your credentials)"
            printf "\n"
            return 1
        fi
    fi
    link_one "$_n" && printf "  > %-24s linked\n" "$_n"
}

do_list() {
    printf "base: %s   (override with \$CLOUD_GIT_BASE)\n\n" "$BASE"
    for g in $(_groups); do
        [ "$g" = "." ] && g=""
        [ -n "$g" ] && printf "%s/\n" "$g" || printf "./  (repo root)\n"
        for n in $(_names); do
            [ "$(_field "$n" farm)" = "$g" ] || continue
            if _pending "$n"; then
                s="pending_creation (repo not created yet; skipped by clone/link)"
            elif [ -d "$BASE/$(_path "$n")/.git" ]; then
                [ -L "$(_linkpath "$n" "$g")" ] && s="cloned + linked" || s="cloned, NOT linked (run --link)"
            else
                s="not cloned"
                [ "$(_field "$n" private)" = "true" ] && s="$s (private)"
            fi
            printf "  %-24s %s\n" "$n" "$s"
        done
        printf "\n"
    done
    printf "clone with:  0_registry/clone.sh <name>...  |  --group <g>  |  --all\n"
}

# ── fleet-shared files ──────────────────────────────────────────────────────
# Some files must be byte-identical across every repo that has the module they
# belong to, and until now "must be" meant "someone remembers to copy it".
# Nobody did: deploy-dotfiles.sh had drifted in cloud-infra-desktop and was
# absent in four repos that CALL it, and .mcp.json's own _doc conceded the hop
# was manual. The registry now names those files (fleet_files) and this copies
# them.
#
# The opt-in rule is the entry's `requires` directory, declared in the registry.
# It is explicit rather than inferred, because the obvious inference — "copy
# where the destination's parent directory exists" — is wrong for any
# destination at the repo ROOT: the root always exists. That version of this
# function put .mcp.json into all sixteen repos with no dotfiles module at all
# (cloud-notes, cloud-u-linux, every lecole-42 entry) the first time it ran.
# `requires` names the directory that PROVES the module is present, so a
# root-level file is gated by the module it belongs to, not by its own path.
#
# A repo without that directory is not a repo that failed to get the file — it
# is a repo the file does not belong in. Creating the path would invent a module.
#
# Copies only on DIFFERENCE, so a no-op sync touches no mtimes and leaves every
# working tree clean — this is safe to run from the session-start hook.
_ff_count() { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String((r.fleet_files||[]).length))' "$REGISTRY"; }
_ff_from()  { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(r.fleet_files[+process.argv[2]].from)' "$REGISTRY" "$1"; }
_ff_to()    { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(r.fleet_files[+process.argv[2]].to.join(" "))' "$REGISTRY" "$1"; }
_ff_req()   { node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(r.fleet_files[+process.argv[2]].requires||"")' "$REGISTRY" "$1"; }

sync_all() {
    n=$(_ff_count); i=0; copied=0; skipped=0
    while [ "$i" -lt "$n" ]; do
        src="$BASE/$(_ff_from "$i")"
        dests=$(_ff_to "$i")
        req=$(_ff_req "$i")
        # An entry with no `requires` would silently degrade to "copy
        # everywhere" — the exact bug described above. Refuse instead.
        [ -n "$req" ] || { printf "  ! %-46s no 'requires' in registry — skipped\\n" "$(_ff_from "$i")"; i=$((i+1)); continue; }
        if [ ! -f "$src" ] && [ ! -d "$src" ]; then
            # Not fatal, and deliberately so: a container that cloned only part
            # of the fleet still gets every OTHER shared file. The absent source
            # is named so it is obvious which clone is missing.
            printf "  ! %-46s source absent — skipped\n" "$(_ff_from "$i")"
            i=$((i+1)); continue
        fi
        printf "  = %s\n" "$(_ff_from "$i")"
        # The index itself is a target too: it carries _dotfiles/apps/ and 9_others/
        # like any other repo, and excluding it is how an index drifts from the
        # fleet it indexes.
        for repo_path in "$SCRIPT_DIR" $(for m in $(_names); do echo "$BASE/$(_path "$m")"; done); do
            [ -d "$repo_path/.git" ] || continue
            [ -d "$repo_path/$req" ] || { skipped=$((skipped+1)); continue; }
            for d in $dests; do
                dest="$repo_path/$d"
                if [ -d "$src" ]; then
                    # Directory entry (c3-infra skill/hooks/agents): mirror the tree, only on difference.
                    diff -rq "$src" "$dest" >/dev/null 2>&1 && continue
                    mkdir -p "$dest"; cp -a "$src"/. "$dest"/
                    copied=$((copied+1)); printf "      -> %s\n" "${repo_path#"$BASE"/}/$d"; continue
                fi
                cmp -s "$src" "$dest" 2>/dev/null && continue
                cp -f "$src" "$dest"
                # Executability is part of the file: deploy-dotfiles.sh is
                # invoked as `sh <path>` today, but a copy that silently loses
                # +x breaks the moment anyone calls it directly.
                [ -x "$src" ] && chmod +x "$dest"
                copied=$((copied+1))
                printf "      -> %s\n" "${repo_path#"$BASE"/}/$d"
            done
        done
        i=$((i+1))
    done
    printf "\nsync: %d file(s) written, %d destination(s) skipped (module absent)\n" "$copied" "$skipped"
    printf "sync: mcp.json is GENERATED — regenerate it in cloud-t-infra first if the\n"
    printf "      service build.json .mcp blocks changed, then re-run --sync.\n"
}

case "${1:-}" in
    ""|-l|--list) do_list ;;
    --link)
        for n in $(_names); do link_one "$n" && printf "  > %-24s linked\n" "$n"; done
        ;;
    --relink)
        # Rewrite every link from the registry. Use after adding, renaming or
        # regrouping a repo in repos.json; the result is committed like any
        # other change.
        for n in $(_names); do
            g=$(_field "$n" farm)
            link_one "$n" && printf "  > %-24s %s -> %s\n" "$n" "${g:+$g/}$n" "$(_linktarget "$(_path "$n")" "$g")"
        done
        ;;
    --sync)
        sync_all
        ;;
    --check)
        # Registry self-consistency + committed links agree with it.
        node "$REG_DIR/repos-sot.js" check "$REGISTRY"
        ;;
    --all)
        fail=0
        for n in $(_names); do clone_one "$n" || fail=$((fail+1)); done
        [ "$fail" -eq 0 ] || { echo; echo "$fail repo(s) failed — see above."; exit 1; }
        ;;
    --group)
        # a farm folder (6.Projects, or 1.2.Cloud-me for everything under it) or a legacy group key (a_cloud)
        g="${2:?usage: clone.sh --group <farm-folder|legacy-group>}"; g="${g%/}"
        for n in $(_names); do f=$(_field "$n" farm)
            { [ "$f" = "$g" ] || [ "${f#"$g"/}" != "$f" ] || [ "$(_field "$n" group)" = "$g" ]; } && { clone_one "$n" || true; }; done
        ;;
    -h|--help)
        sed -n '2,15p' "$0" | sed 's/^# \?//'
        ;;
    *)
        for n in "$@"; do
            case " $(_names) " in
                *" $n "*) clone_one "$n" || true ;;
                *) echo "unknown repo: $n  (see 0_registry/clone.sh --list)" >&2; exit 1 ;;
            esac
        done
        ;;
esac
