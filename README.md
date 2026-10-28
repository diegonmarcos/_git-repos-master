# repo_master

The index of every repository this account owns. <!-- repos-count:begin -->`repos.json` registers 61 of them, grouped (the GitHub snapshot in the table below holds 66)<!-- repos-count:end -->, with a
`clone.sh` that pulls down whichever ones you want on this machine. This repo is
the index, so it has no entry pointing at itself.

| group | what |
|---|---|
| `2_vault` | secrets (sops/age) — sorts first, everything else needs it |
| `a_cloud` | the cloud project: infra, services, data, devices, tooling |
| `b_projects` | Projects (was front): site, content, assets, experiments |
| `c_gh` | account-level GitHub repos (the profile README) |
| `d_lecole` | 42 coursework — project master `lecole-42`; members are `lecole-42_*` |

```
./clone.sh                        # what exists here, what does not
./clone.sh cloud-u-desktop cloud-me-notes # clone those two
./clone.sh --group d_lecole       # clone a whole group
./clone.sh --all                  # everything
```

No project code lives here. `repos.json` is the registry and `clone.sh` reads
it and nothing else; the group directories hold committed relative symlinks out
to the clones. A link that dangles is a repo you have not cloned yet — that is
the index working.

`cloud-master` is the same idea narrowed to the cloud project. See
[`a0_docs/README.md`](a0_docs/README.md) for how the two relate, why this is
not submodules, and what each directory is for.

<!-- repos-list:begin -->
## All repos (66 — 49 🌐 public, 17 🔒 private)

Generated from [`repos-github.json`](repos-github.json) by `node gen-repos-list.js`.

| Project | Family | Repo | Visibility |
|---|---|---|---|
| 🗂️ Meta | 🗂️ Meta | [_git-repos-master](https://github.com/diegonmarcos/_git-repos-master) | 🌐 public |
| ☁️ Cloud | 🗄️ Cloud DB | [cloud_db_assets-cdn](https://github.com/diegonmarcos/cloud_db_assets-cdn) | 🌐 public |
| ☁️ Cloud | 🗄️ Cloud DB | [cloud_db_infra-ops-obsv_configs-sync](https://github.com/diegonmarcos/cloud_db_infra-ops-obsv_configs-sync) | 🌐 public |
| ☁️ Cloud | 🗄️ Cloud DB | [cloud_db_LFS](https://github.com/diegonmarcos/cloud_db_LFS) | 🔒 private |
| ☁️ Cloud | ☁️ Cloud core | [cloud](https://github.com/diegonmarcos/cloud) _(hub)_ | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-t-infra](https://github.com/diegonmarcos/cloud-t-infra) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-u-android](https://github.com/diegonmarcos/cloud-u-android) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-u-containers](https://github.com/diegonmarcos/cloud-u-containers) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-u-containers_cgc](https://github.com/diegonmarcos/cloud-u-containers_cgc) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-u-desktop](https://github.com/diegonmarcos/cloud-u-desktop) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-u-linux](https://github.com/diegonmarcos/cloud-u-linux) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-h-webapps](https://github.com/diegonmarcos/cloud-h-webapps) | 🌐 public |
| ☁️ Cloud | ☁️ Cloud core | [cloud-h-webapps-2](https://github.com/diegonmarcos/cloud-h-webapps-2) | 🌐 public |
| ☁️ Cloud | 👤 Cloud me | [cloud-me](https://github.com/diegonmarcos/cloud-me) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me-containers](https://github.com/diegonmarcos/cloud-me-containers) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me-data-pvt](https://github.com/diegonmarcos/cloud-me-data-pvt) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me-my-ai](https://github.com/diegonmarcos/cloud-me-my-ai) _(ai memory)_ | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-a-docs](https://github.com/diegonmarcos/cloud-a-docs) _(backlog)_ | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me-notes](https://github.com/diegonmarcos/cloud-me-notes) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me-others](https://github.com/diegonmarcos/cloud-me-others) | 🌐 public |
| ☁️ Cloud | 👤 Cloud me | [cloud-me-profiles](https://github.com/diegonmarcos/cloud-me-profiles) | 🌐 public |
| ☁️ Cloud | 👤 Cloud me | [cloud-me_cgc](https://github.com/diegonmarcos/cloud-me_cgc) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me_configs](https://github.com/diegonmarcos/cloud-me_configs) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me_data-private](https://github.com/diegonmarcos/cloud-me_data-private) | 🔒 private |
| ☁️ Cloud | 👤 Cloud me | [cloud-me_data-pub](https://github.com/diegonmarcos/cloud-me_data-pub) | 🌐 public |
| ☁️ Cloud | 👤 Cloud me | [cloud-me_vault](https://github.com/diegonmarcos/cloud-me_vault) | 🔒 private |
| 🧩 Projects | 🎨 CG | [CG](https://github.com/diegonmarcos/CG) _(hub)_ | 🌐 public |
| 🧩 Projects | 🎨 CG | [CG-circus](https://github.com/diegonmarcos/CG-circus) | 🌐 public |
| 🧩 Projects | 🎨 CG | [CG-galaxy](https://github.com/diegonmarcos/CG-galaxy) | 🌐 public |
| 🧩 Projects | 🎨 CG | [CG-galaxy-gaia](https://github.com/diegonmarcos/CG-galaxy-gaia) | 🔒 private |
| 🧩 Projects | 🎨 CG | [CG-unity](https://github.com/diegonmarcos/CG-unity) | 🔒 private |
| 🧩 Projects | 🎨 CG | [CG-voxel-rust](https://github.com/diegonmarcos/CG-voxel-rust) | 🌐 public |
| 🧩 Projects | 🔬 DeepSc | [DeepSc](https://github.com/diegonmarcos/DeepSc) _(hub)_ | 🌐 public |
| 🧩 Projects | 🔬 DeepSc | [DeepSc-StarkX](https://github.com/diegonmarcos/DeepSc-StarkX) | 🌐 public |
| 🧩 Projects | 🔬 DeepSc | [DeepSc-X](https://github.com/diegonmarcos/DeepSc-X) | 🌐 public |
| 🧩 Projects | 🦆 DuckPeng | [DuckPeng](https://github.com/diegonmarcos/DuckPeng) _(hub)_ | 🌐 public |
| 🧩 Projects | 🦆 DuckPeng | [DuckPeng-LeafY](https://github.com/diegonmarcos/DuckPeng-LeafY) | 🌐 public |
| 🧩 Projects | 💹 Fin-CM | [Fin-CM](https://github.com/diegonmarcos/Fin-CM) _(hub)_ | 🌐 public |
| 🧩 Projects | 💹 Fin-CM | [Fin-CM-Blmbrg](https://github.com/diegonmarcos/Fin-CM-Blmbrg) | 🌐 public |
| 🧩 Projects | 💹 Fin-CM | [Fin-CM-mqpm](https://github.com/diegonmarcos/Fin-CM-mqpm) | 🌐 public |
| 🧩 Projects | 💹 Fin-CM | [Fin-CM-NexusZ](https://github.com/diegonmarcos/Fin-CM-NexusZ) | 🌐 public |
| 🧩 Projects | 🖥️ Projects | [diegonmarcos](https://github.com/diegonmarcos/diegonmarcos) _(profile)_ | 🌐 public |
| 🧩 Projects | 🖥️ Projects | [diegonmarcos.github.io](https://github.com/diegonmarcos/diegonmarcos.github.io) _(deployer)_ | 🌐 public |
| 🧩 Projects | 🖥️ Projects | [Projects](https://github.com/diegonmarcos/Projects) _(hub)_ | 🌐 public |
| 🧩 Projects | 🖥️ Projects | [Projects-endeavours](https://github.com/diegonmarcos/Projects-endeavours) | 🌐 public |
| 🧩 Projects | 🖥️ Projects | [Projects-labtools](https://github.com/diegonmarcos/Projects-labtools) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42](https://github.com/diegonmarcos/lecole-42) | 🔒 private |
| 🎓 lecole-42 | 🎓 42 | [lecole-42-projects](https://github.com/diegonmarcos/lecole-42-projects) | 🔒 private |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_back-Algo](https://github.com/diegonmarcos/lecole-42_back-Algo) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_back-Graphic](https://github.com/diegonmarcos/lecole-42_back-Graphic) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_back-System](https://github.com/diegonmarcos/lecole-42_back-System) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_cyber-Cyberwarfare](https://github.com/diegonmarcos/lecole-42_cyber-Cyberwarfare) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_dev](https://github.com/diegonmarcos/lecole-42_dev) | 🔒 private |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_ml-Agentic](https://github.com/diegonmarcos/lecole-42_ml-Agentic) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_ml-DataScience](https://github.com/diegonmarcos/lecole-42_ml-DataScience) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_ml-MachineLearning](https://github.com/diegonmarcos/lecole-42_ml-MachineLearning) | 🌐 public |
| 🎓 lecole-42 | 🎓 42 | [lecole-42_ops-Mylibs](https://github.com/diegonmarcos/lecole-42_ops-Mylibs) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_c3-infra-plugin](https://github.com/diegonmarcos/z-archived_c3-infra-plugin) | 🔒 private |
| 📦 Archived | 📦 Archived | [z-archived_front-data](https://github.com/diegonmarcos/z-archived_front-data) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-feeds](https://github.com/diegonmarcos/z-archived_front-feeds) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-individual](https://github.com/diegonmarcos/z-archived_front-individual) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-linktree](https://github.com/diegonmarcos/z-archived_front-linktree) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-media](https://github.com/diegonmarcos/z-archived_front-media) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-others](https://github.com/diegonmarcos/z-archived_front-others) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-projects](https://github.com/diegonmarcos/z-archived_front-projects) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_front-warehouse](https://github.com/diegonmarcos/z-archived_front-warehouse) | 🌐 public |
| 📦 Archived | 📦 Archived | [z-archived_My-ai-memory](https://github.com/diegonmarcos/z-archived_My-ai-memory) | 🔒 private |
<!-- repos-list:end -->
