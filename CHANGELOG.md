# Changelog

[简体中文](CHANGELOG.zh-CN.md)

Releases of **dsh-zcode-ui**. This package is a fork of [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34; the full upstream history up to that version lives in [docs/UPSTREAM-CHANGELOG.md](docs/UPSTREAM-CHANGELOG.md).

## 1.12.0 - 2026-10-14

Ports the upstream 1.1.35–1.1.37 fixes and replaces the "disable official + override" architecture with
upstream 1.1.37's insert-only + slot-mirror design. A live-host probe proved the old architecture
silently broke the directory-picker render chain (KNOWN-ISSUES §23.1). Dispositions: `docs/KNOWN-ISSUES.md` §23;
design rationale: `docs/ZCODE-DESIGN.md` §16.

### Architecture

- **Insert-only, no more `disabled: true`**: the official sidebar, settings shell, and official session-title
  provider stay registered. Shared slots are mirrored into own namespaces (`sidebar.codex.*`, `settings.codex.*`)
  via `mirrorSlot` + `withSlotAliases` (`slot-mirror.tsx`); `registerAfterOfficialWave` waits for official
  declarations (3s timeout registers own slots only), so late officials never conflict and disabling the plugin
  restores official rendering untouched. The session-title provider now coexists with the official one through
  `session-title-lifecycle.ts` instead of patch-disabling it.

### Added (ported from upstream)

- **Add-workspace button in the projects section** (#42): tracks the official entry's presence (disabled when
  absent), its `aria-keyshortcuts` follows the official shortcut catalog live, and it invokes the official
  `requestAddWorkspace` flow. Icon set unified to Lucide (`Plus`).
- **Developer-tools switch** (#41): mirrors a row into `settings.general.item` when the host provides
  `configForms.developerTools`; absent on hosts without it. Switch styling keeps the sp-token discipline.
- **Compact top bar for legacy hosts** (#41): hosts without inline tabs but with breadcrumbs now get the same
  34px control-band re-layout.
- Session-tree context menu drops `compact` to match official menu density; session-title lifecycle hardening.

### Added (toolchain)

- **CI**: `.github/workflows/ci.yml` runs the full gate on every push/PR (`pnpm install --frozen-lockfile` →
  Playwright Chromium → `node scripts/gate.mjs`) — the same gate the pre-push hook runs, so local green == CI
  green == release green. `pnpm/action-setup` reads `packageManager` from package.json, single source of truth.
- New live-host script `scripts/verify-workspace-shortcuts-host.mjs` (wired into `gate-host`): asserts the
  search shortcut, the add-workspace flow, and its reset path against a real `dsh web` host. Note: the official
  picker is a **native chooser bridge** (the component always renders null; the chooser is a system dialog), so
  the contract asserts state transitions rather than DOM dialogs.
- `gate-host.mjs` two fixes: force `npm run build` before packing (the package ships the prebuilt `lib/`; packing
  without building tests a stale bundle after src changes), and desktop-CLI stderr noise is no longer misread
  as the version line.
- The search dialog's keyboard listener moved to the capture phase: host window-level handlers could intercept
  Escape in the bubble phase, leaving the dialog un-closeable on real hosts (reproduced live).

### Tests

- New specs: `slot-mirror`, `official-slot-shadow`, `session-title-lifecycle`; rewritten:
  `official-sidebar-activate` (timing matrix + timeout fallback), `session-title-provider` (official loader
  injection, single-slot semantics), `settings-registration` (late-official matrix, mirrored rows).
  Full suite: 53 files / 394 tests green (was 50 / 354).
- Radius ratchet baseline +2: `999px` (pill switch track) and `50%` (thumb) — shape semantics, not scale steps.

## 1.11.0 - 2026-10-14

1.10.0 shipped with six registered follow-ups; this release clears four of them and cashes in two older
registrations. Full disposition table: `docs/KNOWN-ISSUES.md` §22. Design rationale: `docs/ZCODE-DESIGN.md` §15.

### Changed (visual / interaction)

- **Touch session rows get a single action entry**: the quick-archive button steps aside on touch; archiving moves into the ⋯ menu (where it has always lived). "Time + two 44px actions" reserved 156px, leaving the 240px sidebar 84px of content width and a **54px** title element (measured); the single entry reserves 120px and the title element measures **90px** on the same fixture. Moving a destructive action off the persistent, mis-tap-prone slot is a safety improvement in its own right.
- **Tool menu / Git popover backgrounds move to semantic tokens**: previously `background:#fff!important` plus a `body[data-ds-dark-theme] …{background:#2b2b2b}` dark patch — two hand-maintained copies that drift. Now `var(--dsw-specific-menu, var(--dcu-tip-bg))` + `backdrop-filter:var(--dsw-menu-backdrop-filter,none)`: the host menu token (translucent + blur) wins, our opaque overlay color is the fallback; the dark patch is deleted.
- **Overlay tokens promoted to `:root`**: `--dcu-tip-{bg,border,shadow}` were scoped to `.dcu-root` and friends, but tool menus render through a portal into `body`, where scoped `var()` silently fails. Promoted alongside `--dcu-state-*`.

### Added

- **Three-state shells (loading / error / empty)**: `.dcu-state--{loading,error,empty}` — one shell swaps semantic color only, never container geometry (the same information changing state must not reflow). `.dcu-wb-error` folds into the same shell. **The error state no longer paints a 12% destructive background** — semantics come from text color (≥4.5:1) + `role="alert"` + `aria-invalid` borders (the old wash was a block of glaring red in a 240px rail and violated contract rule 4). New `scripts/verify-state-shells.mjs`, wired into the gate layout chain (15 → 16 scripts).
- **Platform coverage extended**: `verify-sidebar-titlebar.mjs` gains Linux plus a `deviceScaleFactor` 1 / 1.25 / 1.5 / 2 matrix (1.25 is the Windows display default and where sub-pixel rounding breaks layouts first), asserting traffic-light clearance, center-point hit testing, footer bounds, and no horizontal overflow under non-integer scaling.

### Fixed (toolchain / test infrastructure)

- **Fixtures inject tokens per theme modality**: `fixtureTokenStyle()` used to flatten both `--dsw-*` sets into one `:root`, so **dark always won** — the light run measured dark tokens, and `--dsw-alias-bg-layer-3` made contrast compute physically impossible results (`#2b2b2b on #ff5c5c = 1.19:1`). Now `fixtureTokenStyle(modality)`, split into `ZCODE_LIGHT` / `ZCODE_DARK` / `ZCODE_STRUCTURAL` (the structural segment must be split out separately, or light fixtures lose all radius/font-size tokens); all six layout scripts inject per modality, with an assertion guarding each caller's shape.
- **Gate's vitest step caps workers**: vitest defaults to one fork per CPU; with parallel sessions driving the machine to load 10+, workers time out en masse — non-zero exit with no parseable failure file (the gate's "undecided" shape). Measured green with `--maxWorkers=4` (50 files / 354 tests); override via `VITEST_MAX_WORKERS`.

### Still open (registered, scheduled separately)

- The parallel `--sp-*` / `--dcu-*` namespaces (8 consumers, differing fallbacks — needs a point-by-point merge).
- No breakpoint system (7 `max-width` values; 639 and 640 live in two files yet govern the same composer region).
- Platform coverage remainder: multi-window / split-view / multi-monitor unverified.

## 1.10.0 - 2026-10-14

An external UI review (grade: B) flagged three systemic problems: light-theme state colors below WCAG AA,
an accessibility net far narrower than the design surface, and docs contradicting the implementation.
Each is fixed below and now guarded by an assertion. Design rationale: `docs/ZCODE-DESIGN.md` §14.

### Fixed

- **Light-theme state colors split into "fill tier" and "text tier"**: Zai's `--dsw-alias-state-*` values were derived for fills, and as small text on the light theme every one of them fell below 4.5:1 —
  the sidebar's "pending" pill text at **2.63:1** (2.36:1 on hover; the only signal on the sidebar that a conversation is waiting on you, yet the hardest text on screen to read), the error banner at **3.34:1**, and the About page states at **2.82 / 4.15 / 4.25:1**. New `--dcu-state-*-text` text tier (light: warn `#8a4b00` / error `#b3261e` / success `#176c31`, all ≥4.82:1 across every consuming background; dark keeps the original values, which already pass).
  The fill tier is untouched — hue semantics stay, third-party progress bars keep converging as before.
- **The confirm button's hover state dropped below AA in both themes** (3.91 / 3.93:1): it always lightened, but the foreground flips with the theme (white on light, dark on dark), so the direction has to flip too. New `--dcu-state-error-fill{,-hover}`, hover direction theme-aware (light `#c52b2b` 5.59:1 / dark `#ff7070` 5.26:1).
- **"Running" was invisible to screen readers**: the spinner was `aria-hidden="true"` with no text alternative. Added the `sessions.running` copy and `role="img"`.
- **The unread dot's `aria-label` never worked**: a bare `<span aria-label>` maps to the `generic` role, and ARIA 1.2 specifies "Name From: prohibited" for generic — the label is ignored. Now `role="img"` + `aria-label`.
- **The tool menu filter's focus ring was invisible**: it was a 1px inset ring at `color-mix(… 20%, transparent)`, measured at 1.61 / 1.91:1 — **mathematically unable to reach 3:1**. Replaced with a solid outline.

### Added

- **`role="tree"` now honors its contract** (`src/client/tree-keyboard.ts`): the sidebar *declared* tree/treeitem but honored none of the contract —
  no arrow keys (100 conversations = 100 Tab presses), every row hard-coded to `tabIndex={0}`, no `aria-level`, and treeitem ownership broken by structural wrappers. Now: arrow keys (up/down to move, left/right to collapse or move to parent, right to enter children) + Home/End + roving tabindex + DOM-derived `aria-level` + structural wrappers normalized to `presentation`.
  `Enter`/`Space` deliberately stay with the rows themselves — React 18 dispatches synthetic events at the React root, so a container-level listener would fire *before* the row handlers and double-fire.
- **Touch target sizes brought up to spec**: session rows 32px → **44px**, inline ⋯/archive buttons 20×20 → **44×44**, group heads 36 → 44px.
  The old coarse branch only made buttons persistently visible, not large enough; 20×20 is below WCAG 2.2 AA 2.5.8's 24×24 minimum.
- Accessibility assertions grown from 5 sidebar text selectors to 7: four state-text roles + the settings search box + non-text contrast for the state dot, light and dark.

### Changed (visual)

- **Focus rings unified on one token** `var(--dsw-focus-ring-color, var(--dcu-focus))`: six sources coexisted, one of them **success green used as a focus ring** (`.dcu-about-external-link`, colliding with "installed") and `--sp-muted` (a text color) used as a ring. Sidebar/row/card rings move from black-or-white state colors to Zai icon-blue (§9.1 explicitly permits hue on the focus ring).
- **Settings search box uses the card-tier text color** `--sp-muted-on-card`: `--sp-muted` was used across two different backgrounds, and `#8f8f8f` on `#2b2b2b` measured 4.38:1. Card tier is `#9a9a9a` at 5.03:1.
- Sidebar section headers (Pinned / Projects / Recent) gain a `:focus-visible` outline (previously only a caret opacity change, and inconsistent with the session rows beside them).

### Documentation corrections

- `docs/ZCODE-DESIGN.md` §2 "converted sidebar solids" had three of four values left over from *before* the fix (dark tertiary `#4f4f4f` measures 2.21:1 — implementing the doc literally would have introduced a new AA failure). Corrected to the real `zcode-theme.ts` values with recomputed ratios, plus the rule "change the source first, then sync this table".
- The `#777777` fallback in the settings page `--sp-*` tokens (3.93:1, already judged failing in §9.2) has been corrected.
- One assertion in `settings-integration.assert.ts` contradicted itself: its message demanded a "clear **blue** focus state" while its pattern matched the black-and-white state token. The message was right; the implementation followed the wrong half. Fixed to the message's intent.

### Registered trade-offs (not bugs)

- On touch, "time + two 44px actions" consumes 156px, leaving 84px for the title on a 240px sidebar. Mitigation direction: keep only ⋯ on touch and move archive into the menu — but that contradicts the §1.7.0 decision "actions and ⋯ persist under coarse", so it is a product call and is only registered here (KNOWN-ISSUES §21).
- The tree keyboard model handles only arrow keys and Home/End; `Enter`/`Space` stay with the rows. Making the controller own them requires untangling React synthetic-event ordering first, and was out of scope.

## 1.9.0 - 2026-10-14

### Changed

- **Session pinning now rides the host model** (audit #13, reversed on new evidence): since 0.2.0-rc.2 the host models pinning as a first-class concept (`workspaces.pinSession/unpinSession` + the `pinnedSessionIds` snapshot — registry-global, most recently pinned first). The upstream 0.2.102 note "removed session pinning" targeted the old locally-maintained second model, not the host's registry-level pins — this release adopts the latter:
  - **A 16px pin in the leading slot** (aligned with ZCode's TaskListItem): always visible when pinned and the slot is idle, and taking the slot over on hover/focus (the unread dot and the spinner yield, ZCode's hidden semantics); touch devices do not take over (matching ZCode's own comment); the button never steals focus (mousedown preventDefault).
  - **A Pin/Unpin row in front of the management group** (order pin → rename → archive → unread, same as ZCode); it only appears when the host offers the pin capability (channel/schedule trees do not show it).
  - **Pinned sessions lead** their account (most recently pinned first); `pinnedFirstSessionIds` is the single implementation shared by the sidebar tree and the keyboard order (previous/next conversation). Unpinning returns the row to its original position (the official UI keeps a local order overlay; this plugin keeps the host as the single order source, see KNOWN-ISSUES §20.2).
  - Older hosts without the pin API simply do not get the feature — nothing is invented.
- **Menu keycap suffixes and aria-keyshortcuts**: a new shared catalog bridge (`shortcut-catalog.ts`) subscribes once and feeds three surfaces — the row menu shows the host's effective keycaps on rename/archive/continue (`MenuItem.shortcut` is natively supported), and the sidebar search/new-session buttons (both wide and compact forms) plus the per-project new-session button carry `aria-keyshortcuts`. Keys always come from the host catalog, so user rebinds propagate automatically.

### Research notes (no code change)

- **Composer-domain keys**: the host's input bar (Lexical keymap) already owns the whole composer domain (Enter submits, Shift+Enter newlines, Ctrl·Cmd+Enter accelerated delivery, IME guards, Escape layering and the stop shortcut), matching ZCode's contract; `ctx.shortcuts.register` has no composer-domain surface, and a plugin building its own would be a second keyboard behaviour. ZCode's composer toolbar actions are covered by the input toolbar menus in DSH. Conclusion: leave as-is (KNOWN-ISSUES §20.4).

### Verification

- +7 tests: 3 row-interaction cases (button state and host API calls / old-host degradation / pinned ordering), 1 menu case (pin item condition and order), 3 order-assembly cases (pinned first / recents / old-host identity); a new catalog-bridge assertion file (9 wiring checks); the old "no pinning" assertions rewritten into the "host API is the single source" policy.
- Full gate: typecheck 0 errors / vitest all green / build clean / assertions 37 passed 0 failed / all 15 layout scripts passed.

## 1.8.0 - 2026-10-14

### Changed

- **Previous/next conversation keyboard commands** (audit #15, closing the ZCode parity pass): the host command system had no adjacent-conversation pair (ZCode has `previousConversation`/`nextConversation`), so this release registers `session.previous` / `session.next` into the host command service — discovery, rebinding and dispatch all ride the official channel:
  - Keys aligned with ZCode: desktop `Cmd/Ctrl+Shift+[` and `Cmd/Ctrl+Shift+]`; on web `primary+shift+[` belongs to the browser's tab switching, so it steps aside to `primary+alt`, the same compensation the official commands use;
  - **Order = the sidebar's visible order** (pinned projects → groups → ungrouped → recent), sharing the sidebar tree's own visibility/ordering helpers; pin and group preferences are read fresh from the local cache at trigger time;
  - **Boundary semantics ported verbatim from ZCode**: dedupe and drop empties, no wrap (the boundary returns blocked rather than looping around), and when the current conversation is not in the list (e.g. sitting on the home view) previous takes the last row and next takes the first;
  - Readiness is awaited via `ctx.inject(['shortcuts'])` (deliberately not a static inject: older hosts without the service must not refuse to load the plugin at all); the catalog is checked first so a future native command of the same id automatically wins.
- Research conclusion (see docs/ZCODE-INTERACTION-PARITY.md §3): DSH has no ZCode-style "command center" — `Cmd+K` in DSH is session search (already bridged into this plugin's own search UI), so it is adopted as-is rather than building a second keyboard universe.

### Verification

- New `tests/session-order.spec.ts` (12 cases): the ZCode adjacency semantics case by case (middle / boundaries / single / empty / not-in-list fallback / dedupe-and-drop) plus full order assembly (pinned / groups / ungrouped / recent / archive filtering / unknown ids ignored).
- New `tests/session-navigation-shortcuts.spec.ts` (7 cases): registration surface (five-platform bindings, regions, modals), resolve semantics (run only on handled, blocked reasons, modal defence), deferring to a native same-id command, tolerance of a missing service, and unload cleanup.
- New `tests/session-navigation-shortcuts.assert.ts`: wiring assertions (fresh snapshots, reuse of `openConversation`, same preference cache as the tree, static-inject prohibition).

## 1.7.0 - 2026-10-14

### Changed

- **Session menu structure aligned with ZCode** (audit #9): regrouped to ZCode's `TaskActionMenuContent` shape — management / paths-and-copy / auxiliary:
  - The management group ends with the derive-and-relocate actions (as ZCode ends its group with "open in split pane"): rename → archive → mark unread → continue in a new session → project (move submenu);
  - The paths-and-copy group opens with "open location" (the same slot ZCode gives "Open in Finder"): open in file manager → copy session ID → copy title → copy path;
  - Delete (destructive) stays alone at the bottom (this product's capability); the separator that used to sit between groups folded into the end of the management group.
- **Touch (`pointer:coarse`): session-row actions are always visible** (audit #11): on hover-less devices the quick archive and the ⋯ menu anchor stay visible (same principle as ZCode's `(hover:none)`: touch users must be able to see the actions); the trailing time shifts left to 60px to make room; suppressed while a pending chip occupies the area (the chip itself is the call to action); the desktop hover/focus reveal semantics are unchanged.

### Evaluated, not migrated

- **Menu singleton (#10) will not be migrated**: the host `Menu` renders nothing when closed (`open && MenuSurface` in its source), and these row menus do no per-row RPC or subscription — the motivation ZCode had (avoiding per-row path probes) simply does not exist here (see KNOWN-ISSUES §18.2).

### Verification

- New `scripts/verify-session-coarse-actions.mjs`: Playwright touch emulation (`hasTouch`) × geometry assertions — both actions persistent, the time shifted to 60px, **the time / ⋯ / archive bounding boxes provably non-overlapping**, the pending-chip gate in effect, and a regression guard for the desktop reveal semantics. Layout chain 14 → 15 scripts (gate hook synced).
- `tests/session-menu-items.spec.ts` upgraded to full-structure assertions (complete id sequences for two option sets); the menu-structure assertion in `settings-integration.assert.ts` updated to match.
- Full gate: typecheck 0 errors / vitest 314 passed / build clean / assertions 35 passed 0 failed / all 15 layout scripts passed.

## 1.6.0 - 2026-10-14

### Changed

- **Status slot merged (ZCode's leading slot)**: the unread dot moves from the trailing area (next to the time) into the leading 16px status slot, sharing it with the running spinner — exactly one indicator at a time, priority `pending chip (trailing) > unread dot > running spinner` (the same order as ZCode TaskListItem's error/unread/loading chain; DSH has no task-failure state, so there is no error rung and none is invented). The dot goes 7px → 6px (ZCode's `h-1.5`) and centres in the leading cell (left:13px).
- **The unread dot is no longer hidden on hover**: now that it lives in the leading slot it no longer overlaps the quick actions, restoring ZCode's "status slot always visible" semantics (the old hiding was a temporary constraint against overlapping the archive button).
- Layout follow-ups: the trailing time no longer yields to the unread dot (the `:has(.dcu-wb-unread)` right/padding corrections are gone); rows without project indent (flat/top) now reserve the 30px leading slot when an unread dot appears, same as for the spinner.

### Verification

- `tests/session-row-interaction.spec.ts` gains two cases: ① unread + running renders only the unread dot (mutually exclusive priority); ② a running-only session draws the spinner in the leading slot.
- Assertions updated: the dot's geometry (leading slot, 13px/6px), the flat/top reservation selector, the hover-hide list narrowed (the dot must not be hidden any more), and the trailing time no longer yielding.
- Full gate: typecheck 0 errors / vitest 314 passed / build clean / assertions 35 passed 0 failed / all 14 layout scripts passed.

## 1.5.0 - 2026-10-13

### Changed

- **Session-row interaction aligned with ZCode's TaskListItem (first batch)**. This begins the wholesale alignment of the *operation UI logic* with the local ZCode 3.15.1 — not icon-copying, but transplanting the interaction model, behaviour contracts and keyboard paths (the study and full gap audit live in the new [docs/ZCODE-INTERACTION-PARITY.md](docs/ZCODE-INTERACTION-PARITY.md)):
  - **Rows are now keyboard-reachable**: `tabIndex=0`, opened with `Enter`/Space, guarded by `event.target === event.currentTarget` so Enter on an inner button never triggers the row — shared across all three trees (tasks / channels / schedules) via `SessionRow`.
  - **Focus is on par with hover** (ZCode's `focusActionsVisible` semantics): `:focus-within` reveals the quick actions and yields the right-hand metadata (time / unread / pending), so keyboard users are no longer shut out of the shortcuts.
  - **Two-step archive confirm**: inline archive no longer fires on a single click; it now matches ZCode — the first press enters a confirm state (an error-coloured "Confirm" button that stays visible), `Escape` cancels, a pointerdown outside the row cancels, leaving with the mouse does *not* cancel, and only the second press archives. Shared implementation in `archive-confirm.ts`.
  - **Row action buttons no longer steal focus**: mousedown/pointerdown `preventDefault + stopPropagation` (same as ZCode's `TaskRowActionButton`).
  - **Context-menu order aligned**: rename → archive → mark unread (previously rename → unread → archive).
- The confirm button uses the host's error pairing (background `--dsw-alias-state-error-primary` / foreground `--dsw-alias-bg-layer-3`, matching DSH's own badges) and the `--dsw-radius-md` token.

### Verification

- New `tests/session-row-interaction.spec.ts`: ① first press enters confirm without executing / Escape cancels / the second press executes exactly once; ② cancellation respects the row boundary (pointerdown inside does not cancel, outside does); ③ keyboard semantics (tabIndex, Enter/Space open, Enter on an inner button does not open the row).
- `tests/channel-archive.integration.spec.ts`'s archive helper upgraded to the two-step flow (the behavioural change carried into its verification).
- 13 new assertions: the shared confirm hook, row focus + Enter guard, the persistent confirm state yielding the time, Escape / outside cancellation, the error-colour pairing, and the menu order.
- Full gate: typecheck 0 errors / vitest 312 passed / build clean / assertions 35 passed 0 failed / all 14 layout scripts passed.

## 1.4.0 - 2026-10-13

### Changed

- **The running spinner is now a strict replica of the local ZCode 3.15.1 original** (replacing the 1.2.1 hand-drawn arc): the icon is `LoaderIcon` (lucide-react 1.17.0 — the original 8-spoke paths, key-for-key identical to the version ZCode pins); the size is `size-4` (16px, viewBox 24, stroke-width 2, round caps/joins); the animation is ZCode's theme literal `spin 1s linear infinite`; the colour is `currentColor` set to the sidebar's subtlest foreground rung `--dcu-sidebar-tertiary` (ZCode uses `text-foreground-subtlest`, whose 40% neutral grey reaches only 2.32:1 on #f0f0f0 — this repo re-derived it against the sidebar ground for AA, see KNOWN-ISSUES §3.1). Re-verified at runtime: 8 paths / 16×16 / 2px stroke / `rgb(104,104,104)` / `1s linear infinite`, item by item.
- **The spin animation is now a shared theme-layer primitive `.dcu-spin`**: the sidebar's running indicator and the settings page's installing indicator share one definition (1s linear infinite), with reduced motion stopping it in place in exactly one spot (the icon holds its angle instead of disappearing). The spin only ever uses transform — it never triggers layout.
- **The settings page's installing icon moved from a static host arc to the ZCode spinner**: it used to be the host's `IconLoadingOutlineMedium` (a static arc that never rotated); it is now the same icon as the sidebar's, and it actually spins.
- **Icon-language unification completed**: the last three host-icon holdouts (About / Connectors / Schedule; 16-viewBox, 1/1.3 stroke) all moved to `zcode-icons` (24-viewBox, 2 stroke), and the old `host-icons.ts` bridge was retired and deleted — "single icon source" is now a fact rather than a claim.
- **The skin envelope now normalises form controls** (extensibility): `button/input/select/textarea` fonts are not inherited (the UA stylesheet sets them explicitly), so the envelope's surface font never reached them — a bare `<button>` inside a skin surface measurably still rendered Arial. A zero-specificity `:where()` rule now normalises them to `font:inherit`: any author style (even a single `button{}`) overrides us, only the UA sheet loses. Verified: a bare button follows the skin's system-ui, while a plugin's own `font-family:Georgia` is preserved as-is.

### Verification

- New `scripts/verify-running-indicator.mjs`: asserts every replica parameter in a real Chromium (8 paths / size-4 / 2px / #686868 / 1s linear infinite / stops in place / centred in its cell) — the machine-enforced version of "no redesigning".
- New `scripts/verify-motion-budget.mjs`: measures the per-frame cost of the four remaining layout-property animations (turn ticks ×120 / tab slider / extensions panel / progress bar) and asserts they stay far below the 120 Hz budget (measured max 0.2–2.1 ms against 8.33 ms), guarding against re-attaching animations to expensive layout trees.
- New assertions: the spin spec is pinned (1s linear infinite + full-turn keyframes + both consumers + the reduced-motion stop), the envelope's form-control normalisation (zero specificity + font:inherit), and that the settings area may no longer reference host icons.
- Full gate: typecheck 0 errors / vitest 308 passed / build clean / assertions 35 passed 0 failed / all 14 layout scripts passed.

## 1.3.0 - 2026-10-13

### Changed

- **Sidebar collapse/expand is now a compositor-layer animation**: the transitioned property moves off `grid-template-columns` onto `transform`/`left` displacement of the content column and the drag handle, with the grid tracks held static during the flight and switched once at each end. The old implementation re-laid-out the whole page every frame, and that cost grows with the conversation — measured by the user as "the sidebar frame rate degrades with the current conversation length". Same machine, same fixture, 60 Hz headless: with 1200 messages the old build ran 26/30 frames per 500 ms with a 20.0 ms average / 37 ms max / 8 frames over 20 ms mid-flight; the new build runs 16.3 ms average / 18 ms max / **zero dropped frames** mid-flight (light content: zero as well). The user's display is 120 Hz (8.33 ms budget), where the old build exceeded the budget on nearly every frame of a long conversation.
- During the flight the content column widens by one shift (a single one-off reflow — unavoidable under push semantics, but it happens once); at the collapse end the track snaps to 56 px at the same width, so there is no second reflow; expand mirrors this with one reflow at its end.
- Track snapshots and corrections of host-written values are all written with style transitions paused — the host's `.frame[data-animating]` and companion plugins (dsh-better-sidebar) can both hang transitions on grid/left, and without the pause a one-off correction would animate into a visible drift.
- Frames that start up already collapsed now animate their first expand correctly (the old collapsed branch never wrote the init marker, so the first expand was mistaken for a cold start and skipped the animation).
- A drag in progress cancels an in-flight sidebar animation (the drag owns the track), so the animation's settle timer can no longer fight the drag's per-frame writes.

### Fixed

- The frame-rate degradation above (root cause: the animated property was a layout property); the missing first-expand animation from a cold-collapsed start; in-flight animations fighting drags.

### Verification

- `scripts/verify-sidebar-transition.mjs` rewritten: asserts static tracks mid-flight, continuous transform intermediate frames that converge, no animation residue after the snapshot, the handle sliding monotonically from the collapsed visual position, instant settle on reversal, one-frame settle under reduced motion, no animation during drag plus cancellation of in-flight animations, and coexistence with dsh-better-sidebar's `#root` rules (padding-right transition preserved, no grid transition on the frame, transform-only on the content column).
- New regression assertion that frame cost is decoupled from content volume (10 vs 1200 messages: zero dropped frames mid-flight, average hugging the vsync baseline) — the old implementation fails it (20.0 ms / 37 ms / 8 frames over 20 ms).
- Full gate: typecheck 0 errors / vitest 311 passed / build clean / assertions 35 passed 0 failed / all 12 layout scripts passed.

## 1.2.1 - 2026-10-13

### Changed

- **The "running" indicator rebuilt**: the old version coloured only the top edge (the rotation was almost invisible) and 0.8s is too slow for a 12px icon. It is now a faint full track plus a bright 270° arc — the whole ring at 22%, with the right/bottom/left edges at full strength, gap at the top. Both the rotation direction and "in progress" read at a glance. Animation 0.8s → 0.6s.
- The stroke stays 2px: Chrome rounds a `1.5px` border down to `1px` (measured at DPR 1 and 2), and 1px is too light on a 12px circle next to 14px session titles. The refinement comes from arc length and track/arc contrast, not stroke weight.
- Still a pure `transform` animation (compositor), so no added frame cost; under `prefers-reduced-motion` the arc **holds still rather than disappearing** — motion zeroed, information kept.

## 1.2.0 - 2026-10-13

### Added

- `--dsw-radius-2xl: 16px` (whitelisted large radius: main composer shell, session status surface, toast, brand plate) and `--dsw-radius-full: 999px` — 16px and pill radii were previously raw literals.
- A fourth rule in the foreign-content contract: **data-visualisation semantic colours are allowed**, limited to the fill itself. Current case: the cost meter's `.cm-peak-segment.cm-peak-high` fill (`rgb(255,152,0)`) — neutralising it would erase "is this peak time or not".
- The contract and design doc move from three rules to four (`foreign-content-contract.ts`, `ZCODE-DESIGN.md` §10.2).
- A template-literal truncation guard in `tests/design-system.assert.ts` that validates the **extracted result** (head *and* tail markers) — checking only the head misses tail truncation.
- `KNOWN-ISSUES.md` §13: design-audit conclusions, kept separate from the code changes. Includes the six light/dark-tearing experiments, a six-item breakage attribution list, two upstream facts that must not be copied as spec, the loading/error blanks, and an independent re-verification record.

### Changed

- **Off-scale radii pulled back onto the scale**: `18px / 10px / 9px / 7px / 3px / 1px / 99px` now go through `var(--dsw-radius-*)`. Six of them really changed pixels (tool menu 18→12, suggestion cards 10→12, About links 7→8, connector frame 10→12, turn ticks 1→2, tab slider 7→6); the other nine had a token value identical to the literal (no visual change). Every one was measured on the live interface.
- **`--dsw-radius-panel` is kept, and set to 12px** — it is *not* a dead token but an **override of a host token**: the host `@deepseek-ai/dsh-client-ui-theme` defines `28px` at `:root`, consumed by Modal, the settings panel, the feedback dialog, floating panels, and `calc(var(--dsw-radius-panel) - 4px)` corners. Deleting it drops those surfaces back to 28px (confirmed via `getComputedStyle`). This is direct evidence that `--dsw-*` is a **shared namespace**, not a private one.
- **`prefers-reduced-motion` extended from "zero the durations" to "hold the still frame"**: duration zeroing does not stop `infinite` animations, so the progress wave and the running spinner kept moving. The wave now holds at 28% (keeping "in progress" readable).
- The main-area tool menu's dark background moves from `#292929` (off-palette grey) to ZCode's menu colour `#2b2b2b`; four dead fallbacks removed (token defined, fallback never reachable).
- `SKIN_VERSION` realigned with `package.json` (v1.1.0 shipped with the internal version string still at 1.0.0).

### Fixed

- **The radius assertion changed from a whitelist to a ratchet**: the old assertion only checked "value ∈ allowed set", so changing `var(--dsw-radius-full)` back to `999px` stayed green — a false assertion. It now registers `file:value → count` and fails on any unregistered literal. Reverse-tested: reverting to `999px` fails immediately.
- `scripts/verify-composer-style.mjs` compared `getBoundingClientRect()` floats with strict equality (measured `28.000003814698`), and the first frame could read a mid-transition value → now uses tolerance comparison.
- `scripts/verify-composer-tools.mjs` expectations updated to match the menu's new appearance (18px→12px, `#292929`→`#2b2b2b`), with the rationale stated in the error message.

### Removed

- **The main-area embed container rule (written, then withdrawn)**: `:root:root [data-slot="main"] iframe{border-radius/border/background}` was proven by pixel comparison to have **no visible effect** — a 44×44 corner crop differs by only 50 pixels between having and not having the radius, and that difference is single-level anti-aliasing (`(254,254,254)` vs `(255,255,255)`), because the parent layer revealed by the cut corner is the same near-white as the panel. The host also writes inline styles on the iframe locking border/background. Conclusion: no effective lever exists at the skin layer; rule, test and assertion were withdrawn together, with responsibility registered to the host / that plugin.



### Added

- `src/client/host-anchor-contract.ts` — every upstream CSS-Module hash-class anchor this plugin depends on (18 of them, across 6 files) is now registered; the six whose preconditions are knowable are checked at runtime and warn loudly if they stop resolving. A renamed upstream class used to mean the interface quietly lost a piece with nothing in the console.
- `installThemeStyle()` — the theme stylesheet is now injected at application level.
- The gate now reports **"undecided"** instead of "passed" when a step exits non-zero but its output contains no recognised failure lines.
- README: a **Scope and permissions** section — six rows listing what this package can reach and what it touches.

- **Display tiers in the type scale.** `--dsw-font-size-title` (20px), `--dsw-font-size-headline` (22px) and `--dsw-font-size-display` (34px), all derived from the base with `calc()`. These three values previously lived as registered exceptions in `docs/ZCODE-DESIGN.md` §3.2; adopting them verbatim means the migration changes nothing visually — it turns "we broke the rule here" into "the rule covers this".
- **Motion tokens by intent.** `feedback` 120ms, `move` 180ms, `enter` 160ms, `exit` 120ms, `press` 90ms. The previous uniform `180ms ease-out` was consistent but not *designed* — appearing, moving and disappearing at one speed reads as "no motion design". None of the new curves overshoot, so ZCode's "avoid springy animations" still holds. Reduced-motion is now a single token override rather than per-element `transition:none` rules.
- `src/client/foreign-content-contract.ts` — a three-rule contract for third-party UI inside the sidebar (no text darker than `secondary`, no opaque card surface, must degrade in the collapsed rail), plus a runtime sentinel that warns loudly when the contract's anchor class names disappear.
- `tests/design-system.assert.ts` — the design system itself is now covered: type scale, motion intent, foreign-content anchors, and the signature details.
- `scripts/verify-a11y-and-overflow.mjs` — contrast (WCAG 2.1 AA, both themes), suggestion-card truncation, and collapsed-rail overflow as automated checks. Wired into `gate` and `test:layout`, which now runs 12 browser scripts instead of 11.

### Changed

- **The theme layer is no longer bound to the sidebar component.** `ZCODE_THEME_STYLE` and `syncZCodeTheme()` used to live on `CodexSidebar`; they are now application-level effects in `index.ts`. The sidebar is one consumer of `:root` motion tokens, not the only one — the conversation-area turn navigator and tab slider depend on them too, and would have silently lost their transitions if the sidebar ever failed to mount.
- README no longer claims to be a "pure presentation layer". The **skin** is presentation-only, but the **package** also carries upstream's dependency installer (runs `pnpm`, can rewrite `node_modules`), session moves, and open-in-file-manager. That is now stated up front rather than left for the reader to infer from the word "skin".
- Token counts corrected: 21 structural tokens, 195 unique names (was 18 / 192).

- **`11px` normalised to `12px`** in four places. `11px` was an orphan between `xs` (10px) and `sm` (12px); adding a tier for it would have legitimised the orphan. This is a deliberate, small visual change.
- Collection group header weight `600` → `400`, matching the sidebar's established convention (its titles and labels are deliberately 400 and assertions enforce that). Grouping is now carried by the disclosure caret, indentation and luminance.
- Connector heading weight `650` → `600` — `650` existed nowhere else in the system.
- Motion assertions in `tests/conversation-visuals.assert.ts` now assert *which intent tier* an element uses instead of hard-coded durations, so tuning a number no longer turns the gate red while changing the intent does.
- Empty states now say what to do next instead of only that there is nothing: `workspace.empty`, `workspace.recentEmpty`, `search.empty`, `settings.noResults`.
- **Sidebar text ramp re-derived against the sidebar background.** ZCode's `foreground-subtle` / `foreground-subtlest` are blended against a *white* surface; on the sidebar's `#f0f0f0` they measured only 3.93:1 and 2.32:1. Now light secondary `#777777` → `#5c5c5c` (5.87:1), tertiary `#9f9f9f` → `#686868` (4.89:1), dark tertiary `#4f4f4f` → `#828282` (4.82:1).
- Selected surfaces are neutral (`#efefef` / `#3a3a3a`) instead of ZCode's blue accent, matching the sidebar's own selection language.
- New-conversation suggestion labels wrap to two lines instead of being cut mid-word at 1440px.
- Third-party cost card scaled down to the sidebar type ramp with its white card removed; hidden entirely in the collapsed rail, where its text used to be clipped into fragments.
- Collapsed-rail buttons gained `title` tooltips.
- Settings muted text `#737373` → `#6b6b6b`.
- Every icon now comes from `src/client/zcode-icons.tsx`; no other module imports `lucide-react` directly.
- Log prefixes unified to `[dsh-zcode-ui]`.

### Fixed

- **Two false-green paths in `scripts/gate.mjs`.** Both the assertion suite and vitest were treated as passing whenever no failure lines could be parsed from the output. A crash (EPERM, OOM, a changed summary format) exits non-zero with no parsable failures, so the gate printed "vitest: all passed" while vitest had never actually run. Both steps now have an explicit *undecided* branch that blocks the gate.

- Un-sanitised screenshots are gone from the entire git history. They had only been deleted from the working tree, so they stayed downloadable by commit SHA — including through commit numbers quoted in the docs, which are now referenced by description instead.

### Removed

- `debug/`, the upstream marketing banner, and an unreferenced screenshot (also purged from history).

## 1.0.0 - 2026-10-12

Fork of dsh-codex-ui@1.1.34. Inherits its sidebar / workspace session tree / settings skeleton and data layer (SlotRegistry + ctx, untouched), and layers the ZCode visual language on top:

- Full Zai Light / Zai Dark palettes written to `--dsw-*` (canvas `#f8f8f8` / `#161616`, values cross-checked pixel-by-pixel against zai-org/ZCode v3.15.1).
- ZCode sidebar geometry: 8px radius, 32px row height, 150ms ease-out transitions, Lucide icons.
- Theme follows the host `data-ds-dark-theme` attribute as the single source of truth (no `prefers-color-scheme` fallback, which caused a sidebar/content split when the host was light but the OS was dark).
- Every `--dsw-*` token consumed in `src/` is covered by the token maps, enforced by the `token-coverage` assertion.
- Standalone session-title sub-plugin (LLM-generated, independently toggleable).
