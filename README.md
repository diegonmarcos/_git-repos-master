# repo_master

The index of every repository this account owns. <!-- repos-count:begin -->`repos.json` registers 69 of them, grouped (the GitHub snapshot in the table below holds 72)<!-- repos-count:end -->, with a
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

<!-- repos-list:begin -->
## All repos (72 — 53 🌐 public, 19 🔒 private)

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
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Hub | [cloud-me-pvt-___](https://github.com/diegonmarcos/cloud-me-pvt-___) _(hub)_ | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | AI Memory | [cloud-me-pvt-my-ai](https://github.com/diegonmarcos/cloud-me-pvt-my-ai) _(ai memory)_ | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | CGC | [cloud-me-pvt-cgc](https://github.com/diegonmarcos/cloud-me-pvt-cgc) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Configs | [cloud-me-pvt-configs](https://github.com/diegonmarcos/cloud-me-pvt-configs) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Containers | [cloud-me-pvt-containers](https://github.com/diegonmarcos/cloud-me-pvt-containers) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Data | [cloud-me-pvt-data](https://github.com/diegonmarcos/cloud-me-pvt-data) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Notes | [cloud-me-pvt-notes](https://github.com/diegonmarcos/cloud-me-pvt-notes) | 🔒 private |
| 🍃 Leaf.y | Unix | Cloud-Me-Pvt | Vault | [cloud-me-pvt-vault](https://github.com/diegonmarcos/cloud-me-pvt-vault) | 🔒 private |
| 🍃 Leaf.y | CG | CG | Hub | [CG-___](https://github.com/diegonmarcos/CG-___) _(hub)_ | 🌐 public |
| 🍃 Leaf.y | CG | CG | Galaxy | [CG-galaxy](https://github.com/diegonmarcos/CG-galaxy) | 🌐 public |
| 🍃 Leaf.y | CG | CG | Galaxy | [CG-galaxy-gaia](https://github.com/diegonmarcos/CG-galaxy-gaia) | 🔒 private |
| 🍃 Leaf.y | CG | CG | Unity | [CG-unity](https://github.com/diegonmarcos/CG-unity) | 🔒 private |
| 🍃 Leaf.y | CG | CG | Voxel | [CG-voxel-rust](https://github.com/diegonmarcos/CG-voxel-rust) | 🌐 public |
| 🍃 Leaf.y | CG | CG | Zirkus | [CG-circus](https://github.com/diegonmarcos/CG-circus) | 🌐 public |
| 🍃 Leaf.y | Hub | DuckPeng | Hub | [DuckPeng-___](https://github.com/diegonmarcos/DuckPeng-___) _(hub)_ | 🌐 public |
| 💹 Nexus.z | Capital Markets | Blmbrg | Terminal | [Fin-CM-Blmbrg](https://github.com/diegonmarcos/Fin-CM-Blmbrg) | 🌐 public |
| 💹 Nexus.z | Capital Markets | CB | MQPM | [Fin-CM-mqpm](https://github.com/diegonmarcos/Fin-CM-mqpm) | 🌐 public |
| 💹 Nexus.z | Capital Markets | Fin-CM | Hub | [Fin-CM-___](https://github.com/diegonmarcos/Fin-CM-___) _(hub)_ | 🌐 public |
| 🔬 Stark.x | Deep Science | DeepSc | Hub | [DeepSc-___](https://github.com/diegonmarcos/DeepSc-___) _(hub)_ | 🌐 public |
| 🔬 Stark.x | Deep Science | DeepSc-X | Sailytics | [DeepSc-X](https://github.com/diegonmarcos/DeepSc-X) | 🌐 public |
| 🎓 lecole42 | Low Level | 42 | Algo | [lecole-42_back-Algo](https://github.com/diegonmarcos/lecole-42_back-Algo) | 🌐 public |
| 🎓 lecole42 | Low Level | 42 | Graphic | [lecole-42_back-Graphic](https://github.com/diegonmarcos/lecole-42_back-Graphic) | 🌐 public |
| 🎓 lecole42 | Low Level | 42 | Master | [lecole-42-___](https://github.com/diegonmarcos/lecole-42-___) | 🔒 private |
| 🎓 lecole42 | Low Level | 42 | Mylibs | [lecole-42_ops-Mylibs](https://github.com/diegonmarcos/lecole-42_ops-Mylibs) | 🌐 public |
| 🎓 lecole42 | Low Level | 42 | Projects | [lecole-42-projects](https://github.com/diegonmarcos/lecole-42-projects) | 🔒 private |
| 🎓 lecole42 | Low Level | 42 | System | [lecole-42_back-System](https://github.com/diegonmarcos/lecole-42_back-System) | 🌐 public |
| 🎓 lecole42 | Machine Learning | 42 | Agentic | [lecole-42_ml-Agentic](https://github.com/diegonmarcos/lecole-42_ml-Agentic) | 🌐 public |
| 🎓 lecole42 | Machine Learning | 42 | DataScience | [lecole-42_ml-DataScience](https://github.com/diegonmarcos/lecole-42_ml-DataScience) | 🌐 public |
| 🎓 lecole42 | Machine Learning | 42 | MachineLearning | [lecole-42_ml-MachineLearning](https://github.com/diegonmarcos/lecole-42_ml-MachineLearning) | 🌐 public |
| 🎓 lecole42 | Cybersecurity | 42 | Cyberwarfare | [lecole-42_cyber-Cyberwarfare](https://github.com/diegonmarcos/lecole-42_cyber-Cyberwarfare) | 🌐 public |
| 🎓 lecole42 | Dev | 42 | dev | [lecole-42_dev](https://github.com/diegonmarcos/lecole-42_dev) | 🔒 private |
| 🧩 Projects | Front | Projects | Hub | [Projects-___](https://github.com/diegonmarcos/Projects-___) _(hub)_ | 🌐 public |
| 🧩 Projects | Front | Projects | Endeavours | [Projects-endeavours](https://github.com/diegonmarcos/Projects-endeavours) | 🌐 public |
| 🧩 Projects | Front | Projects | Labtools | [Projects-labtools](https://github.com/diegonmarcos/Projects-labtools) | 🌐 public |
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
