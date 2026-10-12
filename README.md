<p align="center">
  <img src="assets/screenshots/conversation-light.png" alt="DSH ZCode UI — light theme" width="100%">
  <img src="assets/screenshots/conversation-dark.png" alt="DSH ZCode UI — dark theme" width="100%">
</p>

<div align="center">

# DSH ZCode UI

**A ZCode-style visual skin for DeepSeek Harness (DSH) Web — sidebar, workspace session tree, global search, turn navigation**

[简体中文](README.zh-CN.md) · [Changelog](CHANGELOG.md) · [Apache-2.0](LICENSE)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/jungenius-stack/dsh-zcode-ui)
[![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> [!IMPORTANT]
> **This is a personal, community-maintained project. It carries no official endorsement.**
> It is **not** a DeepSeek AI product, and it is **not** an official plugin of any kind — it is maintained by one individual (`jungenius-stack`) in their own time.
> It is a fork of the open-source project [MichengAI/dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui) (Apache-2.0), and its design values are taken from [zai-org/ZCode](https://github.com/zai-org/ZCode) (Apache-2.0).
> "DeepSeek", "DeepSeek Harness" and "ZCode" are the property of their respective owners; the names are used here only to describe compatibility and design provenance.

DSH ZCode UI repaints the DSH Web interface in ZCode's (Zhipu / Zai) visual language: the sidebar, the workspace session tree, the header search, and the composer all adopt ZCode geometry, palette, and iconography — in both light and dark themes.

Nothing else changes. The plugin is a **pure presentation layer**: it does not touch conversations, workspaces, settings, or any data path. Everything still flows through DSH's own `SlotRegistry` slots and `ctx` public services.

## What you get

| Area | What the skin does |
| --- | --- |
| **Layout** | ZCode sidebar geometry — 8px radii, 32px rows, `px-2 / py-3 / gap-1` spacing, 150–200ms `ease-out` motion, seven-step type scale |
| **Colour** | Full Zai Light / Zai Dark palettes written into DSH's `--dsw-*` token layer; official regions (title bar, session list, buttons, menus, composer shell) recolour as one piece |
| **Icons** | Lucide (the same icon library ZCode uses) for sidebar navigation and row actions |
| **Theme** | Follows the host's own light/dark preference via `body[data-ds-dark-theme]`; light canvas `#f8f8f8`, dark canvas `#161616` |
| **Sidebar behaviour** | Pin / group / drag-reorder projects and conversations, unread and running indicators, header search over sessions + settings + quick actions, rename / archive / fork / copy / delete, turn navigation in long conversations, Up/Down recall of previous input |

## How it differs from upstream

This fork keeps upstream's interaction scaffolding and data layer, and adds:

- **The ZCode skin itself** — 174 `--dsw-*` tokens per theme (light and dark) plus 18 structural tokens, 192 unique token names in total. Every token consumed anywhere in `src/` is covered by the maps; the `token-coverage` assertion fails the build if that ever stops being true.
- **Theme single-source-of-truth** — the host attribute is the only signal. No `prefers-color-scheme` fallback, which used to split the sidebar and the content area when the host was light but the OS was dark.
- **Fixes found by looking at the real interface**, not by reading code: session hover card trimmed to the title only, send button rendered in the real primary colour (`--dcu-primary` is now defined at `:root` so the composer — which lives outside `.dcu-root` — can resolve it), a "back to conversation" entry when a global panel is open, self-drawn sidebar separator lines removed, marquee title clipping, footer separation, and shorter empty-state cards.
- **A verification stack that actually runs on this machine** — see [Verification](#verification). Upstream's browser-based layout scripts had never been executed here before (the Chromium binary was missing), which is how five stale assertions stayed hidden.

## Requirements

- A working **DeepSeek Harness Web** installation with `dsh` on your `PATH`. Examples below use the `web` profile; substitute your own profile name.
- **Host compatibility.** Peer dependencies declare the `@deepseek-ai/dsh-client-*` range `>=0.1.6-alpha.2 <0.3.0-0`; development is pinned to `0.2.0-rc.2`. The heavy gate (`pnpm gate:host`) packs the plugin, installs it into an isolated `DSH_HOME`, and exercises the real `dsh` binary found on the machine — override it with `DCU_DSH_BIN`.
- **Node.js `^22.19.0 || >=24.0.0`** if you build from source.
- ⚠️ On macOS, do **not** put DSH's bundled Node 24 first on `PATH` when building or testing: it cannot load the `rolldown` native binding (`code signature ... different Team IDs`) and `vitest` / `tsdown` will fail. Any other Node 22.22.x works.

## Install

The package is **not published to the npm registry**. Install it straight from GitHub instead —
`dsh plugin` forwards its arguments to `pnpm`, which resolves `github:<owner>/<repo>` natively:

```text
dsh plugin --profile web add github:jungenius-stack/dsh-zcode-ui
```

`lib/` is committed and the package defines no `prepare` script, so nothing is compiled during install.

### Ask an agent to install it (recommended)

Paste this into any agent that can run terminal commands on your computer:

```text
Install the DSH plugin dsh-zcode-ui into my local web profile by running:
dsh plugin --profile web add github:jungenius-stack/dsh-zcode-ui
Then run dsh --profile web --dump-config, confirm the configuration includes zcode-ui, and explain how to reload DSH and start using the skin.
```

### Install manually

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add github:jungenius-stack/dsh-zcode-ui
dsh --profile web --dump-config
```

Restart DSH Web and hard-refresh the browser (usually `Ctrl+Shift+R`). The new sidebar is the sign that the skin is live. Disabling or uninstalling the plugin restores the official interface.

### Install from a local clone (unreleased changes)

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
git clone https://github.com/jungenius-stack/dsh-zcode-ui.git
Set-Location .\dsh-zcode-ui
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .
dsh --profile web --dump-config
```

`lib/` is committed, so a clone is usable without building — but rebuild after any change to `src/`. If your pnpm and Node versions disagree, `npm install` followed by `npm run build` is an equivalent fallback.

## Usage

Once DSH Web is reloaded, the left navigation is rendered by this plugin.

| Goal | Action |
| --- | --- |
| Start a conversation | **New task**, or the **+** / **New conversation** action on a workspace |
| Find something | Type in the header search field; pick a session, a settings page, or a quick action |
| Collapse the sidebar | The header panel button; the expand control stays on the collapsed rail |
| Return from a global panel | With a panel open, **Back to conversation** appears directly under the panel entry |
| Pin a project | Drag it into **Pinned**, or use **Pin project** in its menu |
| Manage a conversation | Its menu: rename, pin, mark unread, archive, fork, copy, delete |
| Reuse earlier input | Press Up/Down in an empty composer to recall input from this workspace |
| Jump between turns | The turn marks to the left of the current conversation |

## FAQ

**Nothing changed after installing.**
Check that the profile you installed into is the one actually running DSH Web, then restart DSH Web and hard-refresh the browser (`Ctrl+Shift+R`). `dsh --profile web --dump-config` should list `zcode-ui`. If that profile's `cordis.patch.yml` still carries `disabled: true` for `ui-sidebar` or `ui-settings-general`, delete those rows and reload.

**Does it touch my conversations, workspaces, or files?**
No. It is presentation-only: it recolours the interface through DSH's `--dsw-*` token layer and renders the sidebar through official slots and public services. It never writes conversation records, and removing a project from the sidebar does not delete its folder.

**Can I use it next to other DSH plugins?**
Yes. It coexists with the other plugins in your profile. Note that four interface issues reported from real use turned out to belong to the cost-meter and context-pilot plugins rather than this one — they are documented in [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md).

**Why are three assertions skipped?**
They validate the upstream monorepo's release contracts (`packages/`, `.github/workflows/`), which do not exist in this single-package fork. The files are kept with an explicit `SKIP` block instead of being deleted — see [Known limitations](#known-limitations).

**Is this an official plugin?**
No. It is a personal project with no endorsement from anyone (see the notice at the top).

## Verification

Four layers, all runnable locally. `npm run gate` chains them (~55s) and the `pre-push` hook runs it automatically:

| Layer | Command | What it covers |
| --- | --- | --- |
| Types | `npm run typecheck` | `tsc --noEmit` over `src` and `tests` |
| Unit / integration | `npm run test:unit` | 47 files, 311 tests |
| Contract assertions | `node tests/run-assertions.mjs` | 37 scripts — 34 pass, 3 intentionally skipped |
| Real-browser layout | `npm run test:layout` | 11 Chromium scripts measuring real geometry and interaction |

`npm run gate:host` is the heavy tier: it packs the plugin, installs it into an isolated `DSH_HOME`, starts a real `dsh web`, and runs three live-host scripts (about 1–2 minutes). Use it when you touch slots, injection, or the install flow.

The layout scripts need Playwright's Chromium once: `./node_modules/.bin/playwright install chromium`.

## Known limitations

Recorded honestly in [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) — the file is the source of truth, and everything below is expanded there:

- **Three assertions are skipped on purpose.** They validate the upstream monorepo's release contracts (`packages/`, `.github/workflows/`), which do not exist in this single-package fork. The files are kept with an explicit `SKIP` block rather than deleted, so "test missing" and "problem solved" stay distinguishable.
- **Four of the seven interface issues reported from real use are not this plugin's.** They were traced to the cost-meter and context-pilot plugins (duplicate cost display, cramped status bar) and to a host-built-in control; they are documented, not silently ignored.
- **Two upstream open issues ([#40](https://github.com/MichengAI/dsh-codex-ui/issues/40), [#41](https://github.com/MichengAI/dsh-codex-ui/issues/41)) were probed and did not reproduce** at four window sizes on macOS. Non-macOS platforms, real display scaling, and full-screen/split-screen remain untested.
- **No CI.** The gate runs locally and on push via the `pre-push` hook. The local `node_modules` is hand-patched to work around a `tsdown` dependency gap; a clean `npm install` may need that reapplied.

## References and acknowledgements

This plugin would not exist without these projects:

| Project | Role here |
| --- | --- |
| [MichengAI/dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui) (Apache-2.0) | Fork parent — the sidebar, workspace session tree, search, turn navigation, settings skeleton, test tooling, and data-layer approach all come from here. This fork is `1.1.34` of it, plus the ZCode skin and the fixes listed above. |
| [zai-org/ZCode](https://github.com/zai-org/ZCode) (Apache-2.0) | Design source — palette, geometry, icon choices, and motion values were extracted from it (cross-checked against v3.15.1). |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | The host application this plugin plugs into. |
| [Lucide](https://lucide.dev/) | Icon set used for the sidebar. |

In-repo archives worth reading:

- [`docs/ZCODE-DESIGN.md`](docs/ZCODE-DESIGN.md) — the design specification extracted from ZCode.
- [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) — known issues, skipped assertions, environment leftovers, release checklist.
- [`docs/UPSTREAM-CHANGELOG.md`](docs/UPSTREAM-CHANGELOG.md) — the upstream changelog up to the fork point.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to build, verify, and submit changes.

## Development

```bash
pnpm install --frozen-lockfile
pnpm build          # tsc --noEmit && tsdown  → lib/
pnpm gate           # typecheck + assertions + vitest + 11 browser scripts
pnpm gate:host      # isolated real-host compatibility tier
```

Every script is a plain `package.json` entry, so `npm run build` / `npm run gate` behave identically.

After changing `src`, rebuild before installing or committing. New features should reuse existing DSH slots and public services; do not depend on private host DOM or write conversation records.

## License

[Apache License 2.0](LICENSE), the same licence as the upstream scaffolding and the ZCode design source. Upstream copyright and attribution notices are retained.
