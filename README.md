# repo_master

The index of every repository this account owns. <!-- repos-count:begin -->`repos.json` registers 71 of them, grouped (the GitHub snapshot in the table below holds 74)<!-- repos-count:end -->, with a
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
./clone.sh cloudy-u-desktop cloud-me-notes # clone those two
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

<!-- projects-list:begin -->
## Projects (26)

Generated from [`repos-github.json`](repos-github.json) by `node gen-repos-list.js`. A field or school (CG, 42) is context, not a project.

| Project | Field | Developer | Family | Repos | Count |
|---|---|---|---|---|---|
| Repos | Index | 🗂️ _Meta | Master | [_git-repos-master](https://github.com/diegonmarcos/_git-repos-master) | 1 |
| Cloudy | Unix | 🍃 Leaf.y | Hub, Android, C3, DB, Desktop, Docs, Linux, Webapps | [cloudy-___](https://github.com/diegonmarcos/cloudy-___), [cloudy-u-android](https://github.com/diegonmarcos/cloudy-u-android), [cloudy-t-infra](https://github.com/diegonmarcos/cloudy-t-infra), [cloudy-u-containers](https://github.com/diegonmarcos/cloudy-u-containers), [cloudy-u-containers_cgc](https://github.com/diegonmarcos/cloudy-u-containers_cgc), [cloudy_db_assets-cdn](https://github.com/diegonmarcos/cloudy_db_assets-cdn), [cloudy_db_infra-ops-obsv_configs-sync](https://github.com/diegonmarcos/cloudy_db_infra-ops-obsv_configs-sync), [cloudy_db_LFS](https://github.com/diegonmarcos/cloudy_db_LFS), [cloudy-u-desktop](https://github.com/diegonmarcos/cloudy-u-desktop), [cloudy-a-docs](https://github.com/diegonmarcos/cloudy-a-docs), [cloudy-u-linux](https://github.com/diegonmarcos/cloudy-u-linux), [cloudy-h-webapps](https://github.com/diegonmarcos/cloudy-h-webapps), [cloudy-h-webapps-2](https://github.com/diegonmarcos/cloudy-h-webapps-2) | 13 |
| Cloud-Me | Unix | 🍃 Leaf.y | Hub | [cloud-me-___](https://github.com/diegonmarcos/cloud-me-___) | 1 |
| Cloud-Me-Pub | Unix | 🍃 Leaf.y | Hub, Profiles, Shared | [cloud-me-pub-___](https://github.com/diegonmarcos/cloud-me-pub-___), [cloud-me-pub-profiles-___](https://github.com/diegonmarcos/cloud-me-pub-profiles-___), [cloud-me-pub-profiles-_lnktree](https://github.com/diegonmarcos/cloud-me-pub-profiles-_lnktree), [cloud-me-pub-profiles-leaf.y](https://github.com/diegonmarcos/cloud-me-pub-profiles-leaf.y), [cloud-me-pub-profiles-nexus.z](https://github.com/diegonmarcos/cloud-me-pub-profiles-nexus.z), [cloud-me-pub-profiles-prf-prs](https://github.com/diegonmarcos/cloud-me-pub-profiles-prf-prs), [cloud-me-pub-profiles-stark.x](https://github.com/diegonmarcos/cloud-me-pub-profiles-stark.x), [cloud-me-pub-shared](https://github.com/diegonmarcos/cloud-me-pub-shared) | 8 |
| Cloud-Me-Pvt | Unix | 🍃 Leaf.y | Hub, AI Memory, CGC, Configs, Containers, Data, Notes, Vault | [cloud-me-pvt-___](https://github.com/diegonmarcos/cloud-me-pvt-___), [cloud-me-pvt-my-ai](https://github.com/diegonmarcos/cloud-me-pvt-my-ai), [cloud-me-pvt-cgc](https://github.com/diegonmarcos/cloud-me-pvt-cgc), [cloud-me-pvt-configs](https://github.com/diegonmarcos/cloud-me-pvt-configs), [cloud-me-pvt-containers](https://github.com/diegonmarcos/cloud-me-pvt-containers), [cloud-me-pvt-data](https://github.com/diegonmarcos/cloud-me-pvt-data), [cloud-me-pvt-notes](https://github.com/diegonmarcos/cloud-me-pvt-notes), [cloud-me-pvt-vault](https://github.com/diegonmarcos/cloud-me-pvt-vault) | 8 |
| Galaxy | CG | 🍃 Leaf.y | Threlte, Unity, Voxel-rust | [CG-galaxy](https://github.com/diegonmarcos/CG-galaxy), [CG-galaxy-gaia](https://github.com/diegonmarcos/CG-galaxy-gaia), [CG-unity](https://github.com/diegonmarcos/CG-unity), [CG-voxel-rust](https://github.com/diegonmarcos/CG-voxel-rust) | 4 |
| Zirkus | CG | 🍃 Leaf.y | Games, Carto, Music, Others | [CG-circus](https://github.com/diegonmarcos/CG-circus) | 1 |
| Corporate | Finance | 💹 Nexus.z | Corporate | [Fin-Corporate](https://github.com/diegonmarcos/Fin-Corporate) | 1 |
| Blmbrg | Capital Markets | 💹 Nexus.z | Terminal | [Fin-CM-Blmbrg](https://github.com/diegonmarcos/Fin-CM-Blmbrg) | 1 |
| CB | Capital Markets | 💹 Nexus.z | MQPM | [Fin-CM-mqpm](https://github.com/diegonmarcos/Fin-CM-mqpm) | 1 |
| DeepSc-X | Deep Science | 🔬 Stark.x | Sailytics | [DeepSc-X](https://github.com/diegonmarcos/DeepSc-X) | 1 |
| CAD-Simulators | Deep Science | 🔬 Stark.x | Sailytics | [CAD-Simulators](https://github.com/diegonmarcos/CAD-Simulators) | 1 |
| 42-algo | Low Level | 🎓 lecole42 (school 42) | Back | [lecole-42_back-Algo](https://github.com/diegonmarcos/lecole-42_back-Algo) | 1 |
| 42-graphic | Low Level | 🎓 lecole42 (school 42) | Back | [lecole-42_back-Graphic](https://github.com/diegonmarcos/lecole-42_back-Graphic) | 1 |
| 42-mylibs | Low Level | 🎓 lecole42 (school 42) | Ops | [lecole-42_ops-Mylibs](https://github.com/diegonmarcos/lecole-42_ops-Mylibs) | 1 |
| 42-projects | Low Level | 🎓 lecole42 (school 42) | Curriculum | [lecole-42-projects](https://github.com/diegonmarcos/lecole-42-projects) | 1 |
| 42-system | Low Level | 🎓 lecole42 (school 42) | Back | [lecole-42_back-System](https://github.com/diegonmarcos/lecole-42_back-System) | 1 |
| 42-agentic | Machine Learning | 🎓 lecole42 (school 42) | ML | [lecole-42_ml-Agentic](https://github.com/diegonmarcos/lecole-42_ml-Agentic) | 1 |
| 42-datascience | Machine Learning | 🎓 lecole42 (school 42) | ML | [lecole-42_ml-DataScience](https://github.com/diegonmarcos/lecole-42_ml-DataScience) | 1 |
| 42-machinelearning | Machine Learning | 🎓 lecole42 (school 42) | ML | [lecole-42_ml-MachineLearning](https://github.com/diegonmarcos/lecole-42_ml-MachineLearning) | 1 |
| 42-cyberwarfare | Cybersecurity | 🎓 lecole42 (school 42) | Cyber | [lecole-42_cyber-Cyberwarfare](https://github.com/diegonmarcos/lecole-42_cyber-Cyberwarfare) | 1 |
| 42-dev | Dev | 🎓 lecole42 (school 42) | Dev | [lecole-42_dev](https://github.com/diegonmarcos/lecole-42_dev) | 1 |
| Endeavours | Front | 🧩 Projects | Endeavours | [Projects-endeavours](https://github.com/diegonmarcos/Projects-endeavours) | 1 |
| Labtools | Front | 🧩 Projects | Labtools | [Projects-labtools](https://github.com/diegonmarcos/Projects-labtools) | 1 |
| Profile | diegonmarcos | 🐙 Gh | README | [diegonmarcos](https://github.com/diegonmarcos/diegonmarcos) | 1 |
| Pages | diegonmarcos.github.io | 🐙 Gh | Deployer | [diegonmarcos.github.io](https://github.com/diegonmarcos/diegonmarcos.github.io) | 1 |
<!-- projects-list:end -->

<!-- repos-list:begin -->
## All repos (74 — 57 🌐 public, 17 🔒 private)

Generated from [`repos-github.json`](repos-github.json) by `node gen-repos-list.js`.

| Developer | Field | Project | Family | Repo | Visibility |
|---|---|---|---|---|---|
| 🗂️ _Meta | Index | Repos | Master | [_git-repos-master](https://github.com/diegonmarcos/_git-repos-master) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | Hub | [cloudy-___](https://github.com/diegonmarcos/cloudy-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | Android | [cloudy-u-android](https://github.com/diegonmarcos/cloudy-u-android) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | C3 | [cloudy-t-infra](https://github.com/diegonmarcos/cloudy-t-infra) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | C3 | [cloudy-u-containers](https://github.com/diegonmarcos/cloudy-u-containers) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | C3 | [cloudy-u-containers_cgc](https://github.com/diegonmarcos/cloudy-u-containers_cgc) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | DB | [cloudy_db_assets-cdn](https://github.com/diegonmarcos/cloudy_db_assets-cdn) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | DB | [cloudy_db_infra-ops-obsv_configs-sync](https://github.com/diegonmarcos/cloudy_db_infra-ops-obsv_configs-sync) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | DB | [cloudy_db_LFS](https://github.com/diegonmarcos/cloudy_db_LFS) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloudy | Desktop | [cloudy-u-desktop](https://github.com/diegonmarcos/cloudy-u-desktop) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | Docs | [cloudy-a-docs](https://github.com/diegonmarcos/cloudy-a-docs) _(backlog)_ | 🔒 private |
| 🍃 Leaf.y | Unix | Cloudy | Linux | [cloudy-u-linux](https://github.com/diegonmarcos/cloudy-u-linux) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | Webapps | [cloudy-h-webapps](https://github.com/diegonmarcos/cloudy-h-webapps) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloudy | Webapps | [cloudy-h-webapps-2](https://github.com/diegonmarcos/cloudy-h-webapps-2) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me | Hub | [cloud-me-___](https://github.com/diegonmarcos/cloud-me-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Hub | [cloud-me-pub-___](https://github.com/diegonmarcos/cloud-me-pub-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Profiles | [cloud-me-pub-profiles-___](https://github.com/diegonmarcos/cloud-me-pub-profiles-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Profiles | [cloud-me-pub-profiles-_lnktree](https://github.com/diegonmarcos/cloud-me-pub-profiles-_lnktree) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Profiles | [cloud-me-pub-profiles-leaf.y](https://github.com/diegonmarcos/cloud-me-pub-profiles-leaf.y) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Profiles | [cloud-me-pub-profiles-nexus.z](https://github.com/diegonmarcos/cloud-me-pub-profiles-nexus.z) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Profiles | [cloud-me-pub-profiles-prf-prs](https://github.com/diegonmarcos/cloud-me-pub-profiles-prf-prs) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Profiles | [cloud-me-pub-profiles-stark.x](https://github.com/diegonmarcos/cloud-me-pub-profiles-stark.x) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pub | Shared | [cloud-me-pub-shared](https://github.com/diegonmarcos/cloud-me-pub-shared) | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Hub | [cloud-me-pvt-___](https://github.com/diegonmarcos/cloud-me-pvt-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | AI Memory | [cloud-me-pvt-my-ai](https://github.com/diegonmarcos/cloud-me-pvt-my-ai) _(ai memory)_ | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | CGC | [cloud-me-pvt-cgc](https://github.com/diegonmarcos/cloud-me-pvt-cgc) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Configs | [cloud-me-pvt-configs](https://github.com/diegonmarcos/cloud-me-pvt-configs) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Containers | [cloud-me-pvt-containers](https://github.com/diegonmarcos/cloud-me-pvt-containers) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Data | [cloud-me-pvt-data](https://github.com/diegonmarcos/cloud-me-pvt-data) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Notes | [cloud-me-pvt-notes](https://github.com/diegonmarcos/cloud-me-pvt-notes) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Vault | [cloud-me-pvt-vault](https://github.com/diegonmarcos/cloud-me-pvt-vault) | 🔒 private |
| 🍃 Leaf.y | CG | — | Hub | [CG-___](https://github.com/diegonmarcos/CG-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | CG | Galaxy | Threlte | [CG-galaxy](https://github.com/diegonmarcos/CG-galaxy) | 🌐 public |
| 🍃 Leaf.y | CG | Galaxy | Threlte | [CG-galaxy-gaia](https://github.com/diegonmarcos/CG-galaxy-gaia) | 🔒 private |
| 🍃 Leaf.y | CG | Galaxy | Unity | [CG-unity](https://github.com/diegonmarcos/CG-unity) | 🔒 private |
| 🍃 Leaf.y | CG | Galaxy | Voxel-rust | [CG-voxel-rust](https://github.com/diegonmarcos/CG-voxel-rust) | 🌐 public |
| 🍃 Leaf.y | CG | Zirkus | Games, Carto, Music, Others | [CG-circus](https://github.com/diegonmarcos/CG-circus) | 🌐 public |
| 🍃 Leaf.y | Hub | — | Hub | [DuckPeng-___](https://github.com/diegonmarcos/DuckPeng-___) _(hub)_ | 🌐 public |
| 💹 Nexus.z | Finance | Corporate | Corporate | [Fin-Corporate](https://github.com/diegonmarcos/Fin-Corporate) | 🌐 public |
| 💹 Nexus.z | Capital Markets | Blmbrg | Terminal | [Fin-CM-Blmbrg](https://github.com/diegonmarcos/Fin-CM-Blmbrg) | 🌐 public |
| 💹 Nexus.z | Capital Markets | CB | MQPM | [Fin-CM-mqpm](https://github.com/diegonmarcos/Fin-CM-mqpm) | 🌐 public |
| 💹 Nexus.z | Finance | — | Hub | [Fin-___](https://github.com/diegonmarcos/Fin-___) _(hub)_ | 🌐 public |
| 🔬 Stark.x | Deep Science | — | Hub | [DeepSc-___](https://github.com/diegonmarcos/DeepSc-___) _(hub)_ | 🌐 public |
| 🔬 Stark.x | Deep Science | DeepSc-X | Sailytics | [DeepSc-X](https://github.com/diegonmarcos/DeepSc-X) | 🌐 public |
| 🔬 Stark.x | Deep Science | CAD-Simulators | Sailytics | [CAD-Simulators](https://github.com/diegonmarcos/CAD-Simulators) | 🌐 public |
| 🎓 lecole42 | Low Level | 42-algo | Back | [lecole-42_back-Algo](https://github.com/diegonmarcos/lecole-42_back-Algo) | 🌐 public |
| 🎓 lecole42 | Low Level | 42-graphic | Back | [lecole-42_back-Graphic](https://github.com/diegonmarcos/lecole-42_back-Graphic) | 🌐 public |
| 🎓 lecole42 | Low Level | — | Master | [lecole-42-___](https://github.com/diegonmarcos/lecole-42-___) | 🌐 public |
| 🎓 lecole42 | Low Level | 42-mylibs | Ops | [lecole-42_ops-Mylibs](https://github.com/diegonmarcos/lecole-42_ops-Mylibs) | 🌐 public |
| 🎓 lecole42 | Low Level | 42-projects | Curriculum | [lecole-42-projects](https://github.com/diegonmarcos/lecole-42-projects) | 🔒 private |
| 🎓 lecole42 | Low Level | 42-system | Back | [lecole-42_back-System](https://github.com/diegonmarcos/lecole-42_back-System) | 🌐 public |
| 🎓 lecole42 | Machine Learning | 42-agentic | ML | [lecole-42_ml-Agentic](https://github.com/diegonmarcos/lecole-42_ml-Agentic) | 🌐 public |
| 🎓 lecole42 | Machine Learning | 42-datascience | ML | [lecole-42_ml-DataScience](https://github.com/diegonmarcos/lecole-42_ml-DataScience) | 🌐 public |
| 🎓 lecole42 | Machine Learning | 42-machinelearning | ML | [lecole-42_ml-MachineLearning](https://github.com/diegonmarcos/lecole-42_ml-MachineLearning) | 🌐 public |
| 🎓 lecole42 | Cybersecurity | 42-cyberwarfare | Cyber | [lecole-42_cyber-Cyberwarfare](https://github.com/diegonmarcos/lecole-42_cyber-Cyberwarfare) | 🌐 public |
| 🎓 lecole42 | Dev | 42-dev | Dev | [lecole-42_dev](https://github.com/diegonmarcos/lecole-42_dev) | 🔒 private |
| 🧩 Projects | Front | — | Hub | [Projects-___](https://github.com/diegonmarcos/Projects-___) _(hub)_ | 🌐 public |
| 🧩 Projects | Front | Endeavours | Endeavours | [Projects-endeavours](https://github.com/diegonmarcos/Projects-endeavours) | 🌐 public |
| 🧩 Projects | Front | Labtools | Labtools | [Projects-labtools](https://github.com/diegonmarcos/Projects-labtools) | 🌐 public |
| 🐙 Gh | diegonmarcos | Profile | README | [diegonmarcos](https://github.com/diegonmarcos/diegonmarcos) _(profile)_ | 🌐 public |
| 🐙 Gh | diegonmarcos.github.io | Pages | Deployer | [diegonmarcos.github.io](https://github.com/diegonmarcos/diegonmarcos.github.io) _(deployer)_ | 🌐 public |

---

### 📦 Z-archived (13)

| Repo | Visibility |
|---|---|
| [z-archived_c3-infra-plugin](https://github.com/diegonmarcos/z-archived_c3-infra-plugin) | 🔒 private |
| [z-archived_cloud-me-pub-data](https://github.com/diegonmarcos/z-archived_cloud-me-pub-data) | 🌐 public |
| [z-archived_cloud-me-pvt-data-private](https://github.com/diegonmarcos/z-archived_cloud-me-pvt-data-private) | 🔒 private |
| [z-archived_cloud-me-pvt-legacy](https://github.com/diegonmarcos/z-archived_cloud-me-pvt-legacy) | 🔒 private |
| [z-archived_front-data](https://github.com/diegonmarcos/z-archived_front-data) | 🌐 public |
| [z-archived_front-feeds](https://github.com/diegonmarcos/z-archived_front-feeds) | 🌐 public |
| [z-archived_front-individual](https://github.com/diegonmarcos/z-archived_front-individual) | 🌐 public |
| [z-archived_front-linktree](https://github.com/diegonmarcos/z-archived_front-linktree) | 🌐 public |
| [z-archived_front-media](https://github.com/diegonmarcos/z-archived_front-media) | 🌐 public |
| [z-archived_front-others](https://github.com/diegonmarcos/z-archived_front-others) | 🌐 public |
| [z-archived_front-projects](https://github.com/diegonmarcos/z-archived_front-projects) | 🌐 public |
| [z-archived_front-warehouse](https://github.com/diegonmarcos/z-archived_front-warehouse) | 🌐 public |
| [z-archived_My-ai-memory](https://github.com/diegonmarcos/z-archived_My-ai-memory) | 🔒 private |
<!-- repos-list:end -->
