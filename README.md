# repo_master

The index of every repository this account owns — 27 of them, grouped, with a
`clone.sh` that pulls down whichever ones you want on this machine. The 28th is
this repo; it is the index, so it has no entry pointing at itself.

| group | what |
|---|---|
| `2_vault` | secrets (sops/age) — sorts first, everything else needs it |
| `a_cloud` | the cloud project: infra, services, data, devices, tooling |
| `b_front` | the front-end: site, content, assets, experiments |
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

| | Repo | Family | Visibility |
|---|---|---|---|
| ☁️ | [cloud](https://github.com/diegonmarcos/cloud) _(hub)_ | Cloud core | 🌐 public |
| ☁️ | [cloud-u-android](https://github.com/diegonmarcos/cloud-u-android) | Cloud core | 🌐 public |
| ☁️ | [cloud-u-containers](https://github.com/diegonmarcos/cloud-u-containers) | Cloud core | 🌐 public |
| ☁️ | [cloud-u-containers_cgc](https://github.com/diegonmarcos/cloud-u-containers_cgc) | Cloud core | 🌐 public |
| ☁️ | [cloud-u-linux](https://github.com/diegonmarcos/cloud-u-linux) | Cloud core | 🌐 public |
| ☁️ | [cloud-u-desktop](https://github.com/diegonmarcos/cloud-u-desktop) | Cloud core | 🌐 public |
| ☁️ | [cloud-t-infra](https://github.com/diegonmarcos/cloud-t-infra) | Cloud core | 🌐 public |
| ☁️ | [cloud-webapps](https://github.com/diegonmarcos/cloud-webapps) | Cloud core | 🌐 public |
| ☁️ | [cloud-webapps-2](https://github.com/diegonmarcos/cloud-webapps-2) | Cloud core | 🌐 public |
| 👤 | [cloud-me](https://github.com/diegonmarcos/cloud-me) | Cloud me | 🔒 private |
| 👤 | [cloud-me-my-ai](https://github.com/diegonmarcos/cloud-me-my-ai) _(backlog)_ | Cloud me | 🔒 private |
| 👤 | [cloud-me-data-pvt](https://github.com/diegonmarcos/cloud-me-data-pvt) | Cloud me | 🔒 private |
| 👤 | [cloud-me_data-private](https://github.com/diegonmarcos/cloud-me_data-private) | Cloud me | 🔒 private |
| 👤 | [cloud-me_data-pub](https://github.com/diegonmarcos/cloud-me_data-pub) | Cloud me | 🌐 public |
| 👤 | [cloud-me-containers](https://github.com/diegonmarcos/cloud-me-containers) | Cloud me | 🔒 private |
| 👤 | [cloud-me_configs](https://github.com/diegonmarcos/cloud-me_configs) | Cloud me | 🔒 private |
| 👤 | [cloud-me_vault](https://github.com/diegonmarcos/cloud-me_vault) | Cloud me | 🔒 private |
| 👤 | [cloud-me_cgc](https://github.com/diegonmarcos/cloud-me_cgc) | Cloud me | 🔒 private |
| 👤 | [cloud-me-notes](https://github.com/diegonmarcos/cloud-me-notes) | Cloud me | 🔒 private |
| 👤 | [cloud-me-profiles](https://github.com/diegonmarcos/cloud-me-profiles) | Cloud me | 🌐 public |
| 👤 | [cloud-me-others](https://github.com/diegonmarcos/cloud-me-others) | Cloud me | 🌐 public |
| 🗄️ | [cloud_db_assets-cdn](https://github.com/diegonmarcos/cloud_db_assets-cdn) | Cloud DB | 🌐 public |
| 🗄️ | [cloud_db_LFS](https://github.com/diegonmarcos/cloud_db_LFS) | Cloud DB | 🔒 private |
| 🗄️ | [cloud_db_infra-ops-obsv_configs-sync](https://github.com/diegonmarcos/cloud_db_infra-ops-obsv_configs-sync) | Cloud DB | 🌐 public |
| 💹 | [Fin-CM](https://github.com/diegonmarcos/Fin-CM) _(hub)_ | Fin-CM | 🌐 public |
| 💹 | [Fin-CM-NexusZ](https://github.com/diegonmarcos/Fin-CM-NexusZ) | Fin-CM | 🌐 public |
| 💹 | [Fin-CM-mqpm](https://github.com/diegonmarcos/Fin-CM-mqpm) | Fin-CM | 🌐 public |
| 💹 | [Fin-CM-Blmbrg](https://github.com/diegonmarcos/Fin-CM-Blmbrg) | Fin-CM | 🌐 public |
| 🔬 | [DeepSc](https://github.com/diegonmarcos/DeepSc) _(hub)_ | DeepSc | 🌐 public |
| 🔬 | [DeepSc-StarkX](https://github.com/diegonmarcos/DeepSc-StarkX) | DeepSc | 🌐 public |
| 🔬 | [DeepSc-X](https://github.com/diegonmarcos/DeepSc-X) | DeepSc | 🌐 public |
| 🦆 | [DuckPeng](https://github.com/diegonmarcos/DuckPeng) _(hub)_ | DuckPeng | 🌐 public |
| 🦆 | [DuckPeng-LeafY](https://github.com/diegonmarcos/DuckPeng-LeafY) | DuckPeng | 🌐 public |
| 🎨 | [CG](https://github.com/diegonmarcos/CG) _(hub)_ | CG | 🌐 public |
| 🎨 | [CG-circus](https://github.com/diegonmarcos/CG-circus) | CG | 🌐 public |
| 🎨 | [CG-galaxy](https://github.com/diegonmarcos/CG-galaxy) | CG | 🌐 public |
| 🎨 | [CG-galaxy-gaia](https://github.com/diegonmarcos/CG-galaxy-gaia) | CG | 🔒 private |
| 🎨 | [CG-unity](https://github.com/diegonmarcos/CG-unity) | CG | 🔒 private |
| 🎨 | [CG-voxel-rust](https://github.com/diegonmarcos/CG-voxel-rust) | CG | 🌐 public |
| 🖥️ | [diegonmarcos.github.io](https://github.com/diegonmarcos/diegonmarcos.github.io) _(deployer)_ | Front | 🌐 public |
| 🖥️ | [diegonmarcos](https://github.com/diegonmarcos/diegonmarcos) _(profile)_ | Front | 🌐 public |
| 🖥️ | [front](https://github.com/diegonmarcos/front) _(hub)_ | Front | 🌐 public |
| 🖥️ | [front-endeavours](https://github.com/diegonmarcos/front-endeavours) | Front | 🌐 public |
| 🖥️ | [front-labtools](https://github.com/diegonmarcos/front-labtools) | Front | 🌐 public |
| 🗂️ | [git-repos-master](https://github.com/diegonmarcos/git-repos-master) | Meta | 🌐 public |
| 🎓 | [lecole-42](https://github.com/diegonmarcos/lecole-42) | 42 | 🔒 private |
| 🎓 | [lecole-42-projects](https://github.com/diegonmarcos/lecole-42-projects) | 42 | 🔒 private |
| 🎓 | [lecole-42_dev](https://github.com/diegonmarcos/lecole-42_dev) | 42 | 🔒 private |
| 🎓 | [lecole-42_back-Algo](https://github.com/diegonmarcos/lecole-42_back-Algo) | 42 | 🌐 public |
| 🎓 | [lecole-42_back-Graphic](https://github.com/diegonmarcos/lecole-42_back-Graphic) | 42 | 🌐 public |
| 🎓 | [lecole-42_back-System](https://github.com/diegonmarcos/lecole-42_back-System) | 42 | 🌐 public |
| 🎓 | [lecole-42_cyber-Cyberwarfare](https://github.com/diegonmarcos/lecole-42_cyber-Cyberwarfare) | 42 | 🌐 public |
| 🎓 | [lecole-42_ml-Agentic](https://github.com/diegonmarcos/lecole-42_ml-Agentic) | 42 | 🌐 public |
| 🎓 | [lecole-42_ml-DataScience](https://github.com/diegonmarcos/lecole-42_ml-DataScience) | 42 | 🌐 public |
| 🎓 | [lecole-42_ml-MachineLearning](https://github.com/diegonmarcos/lecole-42_ml-MachineLearning) | 42 | 🌐 public |
| 🎓 | [lecole-42_ops-Mylibs](https://github.com/diegonmarcos/lecole-42_ops-Mylibs) | 42 | 🌐 public |
| 📦 | [z-archived_front-linktree](https://github.com/diegonmarcos/z-archived_front-linktree) | Archived | 🌐 public |
| 📦 | [z-archived_front-projects](https://github.com/diegonmarcos/z-archived_front-projects) | Archived | 🌐 public |
| 📦 | [z-archived_front-media](https://github.com/diegonmarcos/z-archived_front-media) | Archived | 🌐 public |
| 📦 | [z-archived_front-others](https://github.com/diegonmarcos/z-archived_front-others) | Archived | 🌐 public |
| 📦 | [z-archived_front-feeds](https://github.com/diegonmarcos/z-archived_front-feeds) | Archived | 🌐 public |
| 📦 | [z-archived_front-warehouse](https://github.com/diegonmarcos/z-archived_front-warehouse) | Archived | 🌐 public |
| 📦 | [z-archived_front-individual](https://github.com/diegonmarcos/z-archived_front-individual) | Archived | 🌐 public |
| 📦 | [z-archived_front-data](https://github.com/diegonmarcos/z-archived_front-data) | Archived | 🌐 public |
| 📦 | [z-archived_c3-infra-plugin](https://github.com/diegonmarcos/z-archived_c3-infra-plugin) | Archived | 🔒 private |
| 📦 | [z-archived_My-ai-memory](https://github.com/diegonmarcos/z-archived_My-ai-memory) | Archived | 🔒 private |
<!-- repos-list:end -->
