# Changelog

[简体中文](CHANGELOG.zh-CN.md)

Releases of **dsh-zcode-ui**. This package is a fork of [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34; the full upstream history up to that version lives in [docs/UPSTREAM-CHANGELOG.md](docs/UPSTREAM-CHANGELOG.md).

## 1.16.1 - 2026-10-19

**Audit remediation: gate duration claims, documentation blind spots, and the version ledger.**

Engineering hygiene only — **no runtime behaviour changed**, so `lib/` does not need rebuilding.

- **Reversed a wrong prescription.** The audit suggested lowering vitest's `--maxWorkers` from 4
  to 2. Re-measured on the same machine: 4 workers 14.98s vs 2 workers 24.89s — **fewer workers
  is simply slower**. The real startup failure is `EPERM` when vitest writes
  `node_modules/.vite-temp` (read-only FS / restricted sandbox), not worker timeouts.
- **`scripts/gate.mjs`**: added `--configLoader runner` to avoid that write entirely, plus a new
  `vitestEnvUnwritable` branch that recognises `EPERM/EACCES/EROFS` and states plainly that this
  is not a load problem and that tuning worker counts will not help.
- **`scripts/baseline.mjs`**: `--reporter=basic` was removed in vitest 4, so the vitest run
  snapshot in `BASELINE.md` **had never once been captured** (it always read "unparsed / exit 1").
  Switched to the default reporter and the same `--configLoader runner`. Also fixed the summary
  pipe that was breaking the Markdown table.
- **New `tests/version-ledger.assert.ts`**: treats git tags as the source of truth and reconciles
  them against package.json history and CHANGELOG sections, with 7 historical exceptions each
  carrying a written reason. On its very first run it caught `1.15.0`, which the audit missed:
  version bumped, CHANGELOG written, tag never created.
- **Documentation**: the "~55s" claim in both READMEs, CONTRIBUTING and KNOWN-ISSUES now points at
  the run snapshot in `docs/BASELINE.md` (measured full gate ≈83s). Added 10 reverse rules that
  forbid hard-coded counts in `gate.mjs` comments and the `pre-push` header, and forbid the
  "missing rolldown binding" misdiagnosis from creeping back.
- **README's "npm install is an equivalent fallback" was false**: `pnpm-workspace.yaml` patches 19
  undeclared dependencies of `@deepseek-ai/dsh-client-ui-primitives` (the package itself declares
  0), and `npm` does not read `packageExtensions`. Reworded to "installing must use pnpm".
- `tests/docs-baseline.assert.ts` now computes its "N reverse rules" count instead of hard-coding 3.
- KNOWN-ISSUES gains §60 with the full record, including the measurements that overturned P1.

---

## 1.16.0 - 2026-10-19

**The "drifting line" in session rows: `visibility:hidden` does not stop painting.**

The root cause was never a positioning error — it was the wrong hiding mechanism.

`visibility:hidden` only makes an element invisible; it still participates in layout and still
exists in the compositor layer. On Electron's compositing path, hidden layers do get painted at
certain repaint moments — this project's own A/B test caught it: an element whose `effective opacity`
computed to `0` still had pixels on screen. That is why swapping `opacity:0` for
`visibility:hidden` never made the line go away.

**Why it appeared intermittently and shifted row by row** — the timestamp width:

| Timestamp | `timeX` | Gap between timestamp and archive icon |
|---|---|---|
| `12小时` | 183 | 7px (squeezed, invisible) |
| `8小时` | 190 | 14px |
| `1天` | 203 | **27px (widest, line stands alone)** |

The archive icon's top bar is a `13.3×3.3` `rect` (lucide archive's first stroke). The wider the
gap, the more visible it becomes; when the gap is small the timestamp crowds it out. Same element,
appearing "sometimes here, sometimes there, drifting per row".

**Fix**: base state changed from `visibility:hidden` to **`display:none`** — fully out of layout and
painting, shown via `display:flex` only on `:hover` / `:focus-within` / menu-open / confirming. The
touch-mode exit rule was tightened into one `:is(:hover,:focus-within)` selector to avoid fighting
the base state.

**A wrong assertion was also corrected**: `settings-integration.assert.ts` required "base state must
use `visibility:hidden`, not just `opacity:0`" — that pinned the broken mechanism as a contract,
which is exactly why the problem persisted. It now requires `display:none`.

Measured (1680×1000, 26 real sessions): before, 1 visible thin line in base state on every row
(width 13.3); after, **0**, appearing only on the hovered row. Before/after screenshots confirm.

Skin content version 1.4.5 → **1.5.0**.

## 1.15.9 - 2026-10-19

**The real cause of the "a rail on each side": two UI plugins installed in one profile.**

Stopped guessing at CSS and compared environments instead. The decisive evidence:

```
web profile     : dsh-zcode-ui
desktop profile : @michengai/dsh-codex-ui + dsh-zcode-ui   ← what your app runs
```

`dsh-zcode-ui` is a fork of `@michengai/dsh-codex-ui`, and both packages register
`id: 'turn-navigator'` into `conversation.session.header.utilities`. The slot registry keys
entries by "package + id", so the same id renders as **two parallel rails**; they scroll and
collapse out of sync, which reads as "one on each side, drifting". The sidebar slots had an
`already declared` fallback all along — this one never did.

**Why the previous five rounds all missed**: my isolated instance runs the `web` profile (only
zcode-ui), so the environment was **always clean** and no scan could ever find the artefact. That
pushed me through a chain of hypotheses (running indicator → collapse ghost → timestamp vs archive
icon slot → official-navigator marking), each fixing something real but unrelated. Diffing the two
profiles hit it in one step.

**Fix** (`turn-rail-dedupe.ts`): when several `.dcu-turn-navigator` elements exist, keep only the
first in document order (the one mounted first is normally the skin the user is actually running)
and mark the rest with `data-dcu-turn-rail-stale`; when only one remains, clear the mark. It does
not depend on the other package's name or class names, so switching skins leaves nothing behind.
The rule uses `.dcu-root [data-dcu-turn-rail-stale]` specificity rather than `!important` — the
structural-debt ratchet caught that, which is the budget doing its job.

A/B verified: with two rails, A=`block` / B=`none`; after removing A, B restores to `block`.
Assertions added for the rule, the mount, and the stale-driven mechanism; baseline resynced.

Skin content version 1.4.4 → **1.4.5**.

## 1.15.8 - 2026-10-19

**Two turn-navigation rails existed at once — the real cause of the "both sides drift".**

Reproduced with an isolated instance plus Playwright screen recording. The host's own turn
navigator (`<nav class="JXrxFq_frame" aria-label="轮次导航">`, 16 `button[data-index]`) was
**never marked by this plugin**, so the mutual-exclusion rule ("hide our rail when the official one
exists") never fired and both rails stayed on screen.

**Why it never got marked — lazy mount timing**:

```
+0ms     host appends <div class="JXrxFq_slot"> (still empty inside)
+19ms    only then fills the <nav> into that slot
```

The old MutationObserver filter was `turnNavigatorMutationRelevant(records)`, and for `addedNodes`
it only tested `node.matches('nav')`. On the frame where the empty slot was inserted,
`querySelector('nav')` was `null`, so the record was discarded as unrelated; when the nav was
actually filled in, **no record triggered another check**. `markOfficialTurnNavigators` never saw it.

**Fix**: schedule on every `childList` change (rAF already coalesces these, so the cost is
negligible) instead of relying on the self-matching-nav test that could never fire; and re-run once
after the `capabilities` probe returns to avoid the async-attribute race.

**Why the previous rounds all missed**: I successively blamed the running indicator, the collapse
ghost, and the time-vs-archive-icon slot conflict. All three were real defects, but none was this
one. Running an isolated instance with screen recording and actually performing "hover the rail →
expand the outline → jump to a fragment" is what exposed it.

Measured (1680×1000, isolated instance): before, `marked=false`, `ownDisplay=block` (two rails);
after, `marked=true`, `ownDisplay=none` — one rail only, all 16 marks at `x=252`, `w=28`, 10px apart,
perfectly aligned.

Unit test: the assertion "inserting an unrelated `<p>` must not schedule" was itself the bad
contract left by that optimisation; it now requires scheduling on any childList change, and
re-introducing the old filter was verified to turn it red.

Skin content version 1.4.3 → **1.4.4**.

## 1.15.7 - 2026-10-18

**The session-row timestamp and the archive icon were fighting over the same slot — the real cause
of the "index bar drift".**

Both `.dcu-wb-session-time` and `.dcu-wb-quick-actions` were `position:absolute; right:8px`, pinned
to the same right edge of the row. The archive icon's top bar is a `13×3.3` `rect` (the first stroke
of lucide's archive icon), landing on top of the timestamp digits — which is what "a short dash
floating left of the time" actually was.

Worse, the timestamp width varies with its text (`1小时` is 42px, `1天` is 29px), so every row had a
different `time.x` — the dash shifted row by row. That is drift, not misalignment. Measured overlap:
20px.

- **The timestamp stays flush right** (`right:8px`, the ZCODE-DESIGN §3.1 contract); instead the
  **archive icon yields**: `quick-actions` moved from `right:8px` to `right:56px`, landing left of
  the timestamp. The timestamp itself is untouched, so `padding-right`, the touch branch and the
  existing 120px reservation all keep their original values.

**Why the previous two rounds missed it**: I assumed it was the running indicator or a collapsed-state
ghost, and changed `visibility` on `quick-actions` and on the collapsing `expanded-shell` (both were
individually correct — `opacity:0` really does fail to be culled in some compositor paths — but
neither touched the actual overlap). Only measuring `overlap = 20px` located the shared-slot
conflict.

Measured: before, `time.x` was `190 / 203 / 203 …` (floating, overlapping `qa.x = 204` by 20px);
after, every row has `time.x = 156` and `overlap = 0`. Three assertions added and verified by
re-introducing the bug.

Skin content version 1.4.2 → **1.4.3**.

## 1.15.6 - 2026-10-18

**The two drag handles on the new-task page overlapped, and their indicator bar tracked the pointer
vertically.**

Two independent mistakes stacked:

- **Wrong scope for the positioning variable.** Both handles used
  `calc(50% + var(--dsh-chat-content-width) / 2 + 16px)`, but the host defines
  `--dsh-chat-content-width` on `.ST7X_W_body` only — not on the `[data-phase=hero]` root. With the
  `var()` unresolvable the whole declaration is dropped, `right` falls back to `auto` and `left`
  stays at `0`, so **both handles land on the container's left edge and overlap completely** — which
  is what "the index bar is in the wrong place / drifts" looked like. They now use
  `--dsh-chat-user-width` (which does exist in that scope) and explicitly reset the opposite
  `left`/`right` so there is no fallback path.
- **The indicator bar followed the pointer.** `::after` used
  `top:calc(var(--dcu-pointer-y,50%) - 50px)`, and `--dcu-pointer-y` was written by `pointermove`
  as "pointer y inside the handle". The handle is a full-height strip, so moving the mouse up and
  down dragged the bar along with it. It is now `top:50% + translateY(-50%)` (pinned to the middle)
  and that write is gone.

**Why the assertion missed it**: the `verify-hero-width.mjs` fixture defined
`--dsh-chat-content-width:var(--dsh-chat-user-width)` on `main`, supplying the very variable the real
host does not define — so the broken path could never be exercised. The fixture now matches the host,
and three assertions were added: the handles must be separated, the content area must be symmetric
about the container centre, and the indicator must not be positioned via `--dcu-pointer-y`. Verified
by re-introducing the bug: the assertion goes red.

Skin content version 1.4.1 → **1.4.2**.

Measured at 1920 / 1440 / 1100 px: handles at `712/1416`, `472/1176`, `302/1006` — symmetric about
the container centre in all three; the indicator's `top` stays constant while the pointer moves
vertically.

## 1.15.5 - 2026-10-18

**Two ghost artefacts caused by transparent layers that were never actually culled.**

Symptoms: icons overlapped in the sidebar's top-left corner; a short horizontal dash
persistently shown to the right of session titles (longer titles push it further left).

How it was diagnosed (reusable): boot an isolated real host and scan every thin element inside
`.dcu-root` at 520 / 700 / 900 / 1280 px wide × unread × hover. **Neither artefact is visible in
a standard environment** — both hid behind `opacity:0` alone, so they surface whenever the
compositor or an accessibility mode fails to cull the transparent layer:

- **Session `quick-actions`**: absolutely positioned at `right:8px`, containing the archive
  icon's `13×3.3` `rect` (lucide archive's top bar) — **that is the dash**. The base state now
  also sets `visibility:hidden`; hover / focus / menu-open / archive-confirming still restore it.
- **Collapsed `expanded-shell`**: stays `display:flex` (occupying 240 px) and hides behind
  `opacity:0` alone. The collapsing transition now sets `visibility` too, driven by the same
  exit token (no hard-coded duration/curve, so the motion-token assertion still passes).

Skin content version 1.4.0 → **1.4.1** (stylesheet output changed; `data-dsh-zcode-skin` tells
you at a glance whether a stale build is still mounted).

Also: `settings-integration.assert.ts` used to pin the confirming-state style to the closing
brace `{opacity:1;pointer-events:auto}` (the CODE-040 "bake the current implementation into a
contract" shape); it now allows extra properties, and a new assertion requires
`visibility:hidden` in the base state so it cannot regress to opacity-only.

> Honest boundary: neither artefact reproduces in a standard environment, so this is a
> **defensive hardening backed by an evidence chain**, not "I watched it disappear". If it is
> still there after a restart, the trigger is outside the matrix tried above — please report
> whether those rows were running, or had just been pinned.

## 1.15.4 - 2026-10-18

**Two composer visuals aligned with ZCode** (user-specified):

- **The bottom-left plus only gets its circular background on hover/keyboard focus.**
  The host's `.yhfFVG_add` uses `--dsw-specific-selector` as a permanent rest background
  (a grey disc that reads as an always-on halo). It is now transparent at rest and restores
  the host semantic token `--dsw-alias-interactive-bg-hover-solid` on `hover` /
  `focus-visible`, with a 120 ms background transition.
- **The “back to bottom” button is centred.** The host's `.icaHSq_toBottomSlot` pins it to
  the right with `flex-end` and reserves a 195 px right padding; we override both
  (`justify-content:center`, `padding-right:0`), so its centre lands on the conversation
  centre (measured 755 px instead of 1058 px).
- New `composer-visuals.ts` (app-level style injection), host anchors `_add` /
  `_toBottomSlot`, four design assertions, and a style-block budget entry.

> CSS properties only: no DOM changes, no click-behaviour changes. Light/dark both use
> host semantic tokens.

### Engineering (folded into this release)

- **CI configuration is ready (one manual step to enable).** `.github/workflows/ci.yml` had
  never been part of any commit while both README and KNOWN-ISSUES said "No CI". It now lives
  in the repository as [`docs/ci/workflow-ci.yml`](docs/ci/workflow-ci.yml): the body is
  "`pnpm install --frozen-lockfile` + `node scripts/gate.mjs`", identical to what the
  `pre-push` hook runs. It did not go straight into `.github/workflows/` because the push
  credential only carries the `repo` scope and GitHub refuses to create workflow files — see
  the README. Copy it over and push to enable.
- **Documented numbers are generated, not transcribed.** `scripts/baseline.mjs` derives every
  static count into `docs/baseline.json`; `tests/docs-baseline.assert.ts` asserts three-way
  agreement (disk / baseline / docs) *and* the hit count of each pattern, so a deleted
  sentence fails the gate instead of silently passing. Volatile counts (test cases,
  pass/skip) now point at the run snapshot in `docs/BASELINE.md`.
- **Structural-debt ratchet.** `tests/structure-budget.assert.mjs` pins the 1135-line file and
  the 48 `!important` occurrences bidirectionally: growth fails, and so does shrinking
  without lowering the budget.
- **Runtime preflight.** `tests/node-engines.assert.mjs` moves the "Node < 22.19 lacks
  `zlib.zstdCompress`" failure (which surfaces as an unrelated `TypeError` in
  `session-migration`) to the first layer of the gate.
- **Skip reasons are now decidable.** `release-pipeline.assert.mjs` asserts that the skipped
  objects are still absent before skipping; filling any of them in turns the gate red.
- **Compatibility declared.** `engines.dsh` and the lower bound of 11 peers moved from
  `>=0.1.6-alpha.2` to `>=0.2.0-rc.2` (the build baseline). The upper bound stays
  `<0.3.0-0`: the author runs the plugin daily on 0.2.1-rc.2, but `devDependencies` are still
  pinned to 0.2.0-rc.2, so 0.2.1 has not entered the build or the gate. Narrowing the upper
  bound would silently disable the plugin for real users via the DSH version gate; widening it
  would claim verification that never happened. This release states the boundary instead.

## 1.15.3 - 2026-10-18

**Long sessions no longer animate the sidebar collapse/expand.** After 1.15.2 plus the
session-kit patch, the user reported mouse responsiveness was clearly better but collapsing
the sidebar still took ~3 s. In the isolated instance the DOM width changes in 281–290 ms,
and headed Chrome at 4K/2x with 44 images shows the first visual change at 344–385 ms.
We could not reproduce 3 s; the remainder is the app's real session scale/host re-render.

### Fixed

- **Node-count guard in `beginSidebarMotion`**: if the sidebar frame has more than
  **8,000** descendants, skip the 180 ms motion and settle immediately. On long sessions
  layout/paint costs an order of magnitude more than the animation; playing it only adds
  wait and dropped frames. Normal sessions (<8,000) keep the animation.
- New constant `SIDEBAR_MOTION_MAX_ELEMENTS`; `verify-sidebar-transition` still passes
  (its fixture is a normal session, so the animated path is preserved).
- session-kit patch extended with a 200 ms heading-element cache (`headingForTopic`);
  one `run` drops from 742 ms/6 to 437 ms/4 in the isolated instance.

> Honest boundary: the app's 3 s is not reproduced. The next decision needs two observations:
> is it "no movement at all for 3 s" or "slow motion for 3 s", and is a **new small
> conversation** also 3 s? Those select different fixes.

## 1.15.2 - 2026-10-18

**Same scene, different phase: opening a long session.** After 1.15.1 the user reported
no improvement. Re-watching the recording showed the dominant cost was the **white-screen
startup / long-session restore**, not hover. A trace showed the foreign-surface sentinel's
incremental scan still running **92 frames / 796 ms** on open: the conversation has 1,466
unregistered foreign elements, 844 of them sharing the `icaHSq_flowItem` prefix, and every
one called `getComputedStyle`.

### Fixed

- **Sample at most 4 elements per foreign prefix** instead of checking every sibling.
  The sentinel only needs evidence that a prefix drifts; exhaustive checking remains in
  `findForeignDrift()` for tests and explicit audits.
- Plugin scan on opening the same long session: **796 ms / 92 frames → 16 ms / 2 frames**;
  click-to-complete-content **1.5 s → 1.06 s** (isolated web instance, same session).
- Regression test: 200 same-prefix elements must trigger at most 6 `getComputedStyle` calls.

> Honest boundary: the session has 490 steps / 23k nodes; host rendering still accounts for
> 0.8–1.1 s in the trace, and the remaining launch time is Electron/host-side. A plugin has
> no authority to virtualize the host transcript. See KNOWN-ISSUES §58.7.

## 1.15.1 - 2026-10-18

**Fixes the fourth report of "the page stutters when the mouse moves over messages".**
The cause was neither the host nor the long DOM itself, but this plugin's foreign-surface
sentinel: it observed every childList on `document.body` and ran `getComputedStyle` over
the whole conversation (20k+ nodes). The host mounts/unmounts a hover action bar on message
hover (one childList), so every hover triggered a 282 ms rAF full scan. Full attribution and
measurements: KNOWN-ISSUES §58.

### Fixed

- **The foreign-surface sentinel now scans incrementally.** Only added subtrees are queued
  (removals do not trigger), walked with an explicit stack, capped at 8 ms per frame and
  deduplicated with a `WeakSet`; the initial scan uses the same queue instead of scanning
  the whole tree synchronously.
- **The baseline is no longer cached as `null`.** On the first frame the plugin can run before
  the sidebar mounts; the old code cached `null` and then cleared the queue on every flush,
  so it never scanned anything.
- **New performance regression test** `tests/foreign-surface-observer.spec.ts` (5 cases):
  no synchronous full scan at init; a hover action bar scans only its 5 added nodes; changes
  outside a surface are ignored; transient nodes removed before the next frame are skipped
  without false warnings; unregistered foreign roots still warn.

### Measured (real long session: 23,154 nodes / 839 flow units / 5,172 CSS rules)

| Metric | Before | After |
| --- | --- | --- |
| Style recalc per hover move | 11.5 ms | **0.50 ms** |
| Task time per hover move | 14 ms | **1.43 ms** |
| `getComputedStyle` during hover | full scan every time | **0 calls** |
| Typing, 15 edits `ScriptDuration` | 0.25 s | **0.045 s** |

> No token or visual changes; skin version stays 1.4.0. Reload the desktop page to pick it up.

## 1.15.0 - 2026-10-18

A round of **design-audit remediation**: four structural faults found by an external
visual audit (single-colour bandwidth, tree hierarchy, group boundaries, scroll edges),
plus six new **relational / whole-corpus** assertions that the existing 21 layout scripts
could not express. A pitfall pre-scan (T1, 49 code cards fully scanned, 11 hits) ran first
and **corrected four of the audit's prescriptions** before any code was touched.

### Fixed (audit P0)

- **Four saturated hues removed from the new-conversation cards.** The suggestion cards
  carried `#27aaff / #a478e8 / #44bd83 / #f48235` — forked from upstream Codex, and the only
  polychromatic source in a strictly monochrome system. They also failed the 3:1 non-text
  contrast floor in light mode (2.37–3.27:1). Now a single icon colour.
  ⚠ Deliberately **not** `var(--dcu-sidebar-icon)`: these cards are portalled into the host
  hero area, outside `.dcu-root`, where that token does not resolve (measured: falls back to
  `rgb(0,0,0)`). Uses the host `--dsw-alias-menu-icon` instead, which is `:root`-scoped.
- **Brand attribution narrowed, not broadened.** `about.description` / `about.feature.sidebar`
  (zh + en) now say *ZCode* style. The six `Codex UI` occurrences are product/dependency names
  from the upstream fork and are left alone — changing those would erase attribution.
- **Hard-coded error colour tokenised.** `#f87171` (2.60:1 on `#f8f8f8`) → `var(--dcu-state-error-text)`
  (6.15:1 light / 5.98:1 dark).
- **Connector iframe palette realigned, not tokenised.** `--muted #777777` (4.22:1, the value
  already deleted elsewhere) → `#686868`. ⚠ The audit's prescription (`var(--dcu-sidebar-tertiary)`)
  would have made this **silently black**: the string is injected into an iframe, and CSS custom
  properties do not cross documents (measured: `rgb(0,0,0)`). Literals kept, with a comment.
- **Two-level tree hierarchy restored.** Session rows `padding-left` 30 → **40px** (audit said 42,
  which is off the 4px spacing scale and would trip the spacing ratchet for no reason), so
  session titles now sit 10px right of project titles instead of exactly on top of them.
  Row-head state slots (pin / spinner / unread dot) moved with it via `--dcu-wb-slot-left` /
  `--dcu-wb-dot-left`, otherwise the slot floats mid-row (measured gap 6 → 18px).
- **Group boundaries visible.** Inter-project whitespace 4 → **12px** (34px intra-row vs 44px
  inter-group). The audit's selector omitted `:has(> .dcu-wb-session)`, which would have applied
  the padding to *empty* projects that have no sessions.
- **Scroll edge acknowledged.** Tree bottom padding 16 → 24px + a footer top shadow
  (light `.10` / dark `.18`). Chose shadow over `mask-image` because masks create a compositing
  layer, contradicting the measured compositing budget in KNOWN-ISSUES §27/§31.

### Fixed (audit P1)

- **Third grey tier no longer collapsed.** Instead of the audit's "reduce demand" prescription,
  the secondary tier was moved away from tertiary: light `#5c5c5c` → **`#595959`** (ΔL\* 4.9 → 6.2),
  dark `#888888` → **`#969696`** (ΔL\* 2.3 → 7.7). Both keep every consumer background ≥4.5:1;
  the audit's own "bandwidth exhausted" conclusion only considered moving *tertiary*.
- **Surface separation unified.** Both themes now separate the sidebar by border first
  (light alpha `.1` → `.18`, dark `.1` → `.16`), instead of light using fill-delta and dark
  using border. ⚠ The audit's dark baseline (`#3f3f40` / 1.72) does not exist in this repo
  (0 grep hits); the measured composite was `#2d2d2d` / 1.31.
- **Cost-card amount no longer outweighs navigation.** 14/500 → 13/400. Whole nav is 14/400;
  this was the only 500 in the sidebar. Kept `primary` colour per contract §1 (it is data).
- **Search panel**: results now limited **per group** instead of a global `slice(0, 12)`
  (which let the sessions group eat the entire budget), match text is highlighted, and a
  keyboard hint row (`↑↓ / ↵ / esc`) is shown.

### Added (audit §07 — assertions that can actually go red)

The existing 21 layout scripts were almost all single-threshold or whitelist-member checks;
every fault above happened *between two values* or *outside a list*. Added:

| ID | Assertion | Where |
| --- | --- | --- |
| A1 | Adjacent grey tiers differ by ≥6 ΔL\*, and every tier ≥4.5:1 on its own background | `conversation-visuals.assert.ts` |
| A2 | `x(sessionTitle) − x(projectTitle) ≥ 8px` | `verify-tree-hierarchy-relations.mjs` |
| A3 | Inter-group gap ≥8px **and** greater than intra-group row gap | same |
| A4 | Tree has `mask-image` **or** footer has `box-shadow` | same |
| A5 | Whole-corpus colour-literal scan (CSS declarations **and** JS assignments) | `design-system.assert.ts` |
| A6 | No parallel colour palette overlapping `--dcu-*` (except the iframe string) | `verify-tree-hierarchy-relations.mjs` |

A3 is **not** the audit's expression: `pitch(project→project) − pitch(session→session)` drifts
with session count (72px at 1 session, 106px at 2) and would be green on the broken code.
A5 is **not** the audit's expression either: scanning only CSS `color:`/`background:` misses the
four card colours (JS object properties) entirely — 0 hits — while flagging 15 legitimate
`var(--tok, #hex)` fallbacks.

Each new assertion was reverse-tested: reverting the fix makes it red.

### Verified against a live host (first time since 1.13)

`npm run gate:host` had been unable to run at all: its version allow-list stopped at `0.2.0-rc.2`
while the desktop App ships `0.2.1-rc.2`. Getting it green surfaced **three stale test scripts and one
pre-existing repo defect** — no product code needed changing. Details in KNOWN-ISSUES §53.

- **Node**: the repo's `engines` wants `^22.19.0 || >=24`; the default on this machine is 22.12.0,
  which lacks `zlib.zstdCompress` (added in 22.15). No install was needed — `22.22.2-6` was already
  present under `~/.workbuddy/binaries/node/versions/`. With it, vitest goes 17/17 and the fast gate
  is fully green.
- **Host allow-list** now includes `0.2.1-rc.2`. `devDependencies` still pin `0.2.0-rc.2` — that is the
  *compile* baseline, which may legitimately differ from the *runtime* host.
- **First-run overlay** (0.2.1 renamed the buttons) left a full-screen `role=presentation` mask that
  swallowed every click. Scripts now close it by its `aria-label=关闭` and **assert the mask is gone**.
- **Ad-trigger menu** assertion hard-coded `outer - 10` for a 5px padding that later became the 4px
  spacing token; now derived from the real computed padding (CODE-040 again).
- **Settings entry has two branches** since 0.2.1 (host account menu vs plugin-owned trigger); three
  scripts only knew the latter. They now use the product's own contract and the **real user path**
  (account menu → Settings) — driving it via contract events alone made the focus-restoration assertion
  fail, because the plugin's `focus()` is then overridden by the host.
- **Turn-navigator assertion** had no precondition: the script never sent a message, so an empty
  session has no turns to navigate. Now probes for turns and records an explicit skip.
- **Pre-existing defect fixed**: `conversation-header.ts` had an **escaped backtick** inside the style
  template string. Syntax-legal (`tsc` green), but every extraction script's non-greedy regex stops
  there, silently truncating the stylesheet to 314 chars. The guard in `design-system.assert.ts` now
  targets escaped backticks specifically, plus auto-reports unregistered template literals.

### Red-team review: three self-certifying guards were not actually working

An independent red-team pass (separate agent, read-only + injection experiments) judged the
"all done and verified" claim **unsupported (≈6.5/10)**. Every finding reproduced; all fixed.

- **A guard that claimed to scan beyond its allow-list didn't exist.** §26 defined
  `NON_STYLE_TEMPLATES` and a comment promising "any unregistered template string is reported",
  but the scan itself was never written — injecting a new style string left everything green.
  Now actually implemented, and extended to cover **anonymous inline** `<style>{…}` strings
  (`InputHistoryDock.tsx:14`), which no `const X =` regex can reach. A second bug in the same scan:
  it didn't allow the optional type annotation (`const X: string = …`), i.e. exactly the only
  form that could escape.
- **Colour scan (A5) had too narrow a range** — `border:1px solid #ff0000`,
  `box-shadow:0 0 0 1px #ff0000`, `color:rgb(255,0,0)`, `color:hsl(…)` all passed. Range widened,
  but *deliberately not over-widened*: `rgba()/hsla()` and `color-mix(…#hex…)` stay allowed
  (they express translucency, not colour tiers); `box-shadow` allows rgba but not hex.
- **"No whole-file exemptions" was contradicted by three `'*'` entries.** Narrowed to the two token
  truth sources only; `ConnectorsSection` now uses a *structural* exemption that permits only
  `--name:value` custom properties inside the three iframe template strings — writing
  `color:#123456` on an element in that file is still caught (reverse-tested).
- **P1-1 worsened the icon tier and no assertion watched it.** `--dcu-sidebar-icon` is **not a
  fourth text tier** — it is consumed only by SVGs and falls under WCAG's 3:1 non-text rule
  (measured 6.86 / 7.17). Added an explicit ≥3:1 assertion and documented the side effect
  (secondary↔icon ΔL* dropped 4.20→2.95 light, 10.29→4.91 dark) with a remedy if it ever matters.
- **`allocateSearchQuota` broke its own `limit` contract**: `floor × groups > limit` overflowed
  (limit=6/floor=3/3 groups → 9 rows). Not reachable with the current 12/3 constants, but that is
  coincidence at the call site, not a contract. Now hard-capped, with 7 boundary assertions.
- Also fixed: design truth table in `docs/ZCODE-DESIGN.md` out of sync with P1-1 (a doc that
  explicitly says one number must not have two sources); zero-consumption `--dcu-selected-tertiary`
  removed; `--dcu-tip-hover` consumed but never defined; two comment figures corrected.

**Lesson recorded in KNOWN-ISSUES §54.7**: a comment that says "this will report X" must be paired
with a check that the code actually exists. Three of mine weren't — hallucinated completion at the
*guard* layer, which is worse than at the feature layer because nobody notices.

### Second-pass review: guards rewritten from enumerations to structural checks

A second independent review found that the previous round fixed *the examples it was handed*,
not *the class of problem*: it produced six more escaping binding forms and eight more escaping
colour forms, plus two holes introduced by the fixes themselves. The root cause was the same one
the original audit criticised — **coverage decided by an allow-list**.

- **§26 template-string guard, rewritten.** It no longer tries to match binding syntax at all.
  A backtick has exactly one source in JS (a template literal), so the scanner now walks
  **every backtick** (skipping escaped ones and those inside comments) and decides "is this CSS?"
  from the **content**. Registered names no longer gate *whether* a block is checked — only
  whether it gets reported as unregistered. The allow-list became a
  "file → expected number of style blocks" budget, which immediately exposed that the old table
  covered **15 of 22** blocks and missed files whose style strings have no named variable at all.
- **§27 colour guard, rewritten.** It no longer enumerates property names. It now collects
  **every colour token** — hex, `rgb/hsl/hwb/lab/lch/oklab/oklch/color()`, and all 148 named
  colours — regardless of which property it sits on, **including custom-property definitions**
  (`--brand:#ff0000` was previously invisible because `\bcolor` doesn't match after `-`).
  `color-mix()` is classified by context: 100% component = solid (kept), two colours mixed = new
  hue (kept), one neutral side below 100% = a neutral overlay (dropped). Translucent `rgba()/hsla()`
  with alpha < 1 stays allowed, including percentage and slash syntax.
- **`channel-brand.tsx`'s 20 brand colours** (Telegram / WeChat / QQ / Slack / Feishu trademark
  colours) are now **explicitly registered with a reason** rather than being invisible to the scan.
  Brand colours are not part of this design system and must not be changed — but "scanned and
  exempted" is different from "never scanned", and only the former is honest.

Every reverse example from the review was re-run and now fails the guard as intended, including
`const X:string=`, `let`, `var`, ternaries, destructuring, `String.raw`, the blacklist-hijack via
`expandKey`, `border-top`, `linear-gradient`, `column-rule`, `rebeccapurple`, `oklch()`,
`rgba(255,0,0,100%)`, `rgba(255 0 0 / 1)` and `color-mix(#ff0000 100%, transparent)`.

### Third pass: self-audit before re-review found two crippling blind spots

- **`looksLikeCss` excluded newlines, so multi-line CSS — i.e. nearly all real stylesheets —
  was never recognised.** `.a,\n.b {\n color: red;\n}` returned false. Fixing this also
  corrected the whole registry: `CodexWorkspaceBrowser` went from 15 "blocks" to **4**
  (the old count was an artefact of the newline blind spot), and exposed `virtual-skip.ts`
  (2 blocks) which had **never been registered**.
- **The truncation check ran *after* the "is this CSS?" gate**, so the very blocks it exists to
  catch — a stylesheet truncated by an escaped backtick, which no longer parses as complete CSS —
  were skipped. Reordered to check first, count second.
- Also: escape detection looked at a single preceding character (so `\\` mis-flagged the closing
  backtick) — now counts consecutive backslashes; and registered style-block counts are compared
  for **strict equality** (previously a file dropping to zero blocks went unreported).

### Cross-engine

WebKit 26.6 and Chromium produce **identical** measurements on the same fixture (indent 10px,
group gap 12px, row pitch 34px, and all three grey tiers byte-identical in both themes).
Real-device touch remains unverified (no device available).

### Screenshots

All five README screenshots **re-captured** for 1.15.0 against a live host in an isolated profile.

### Added (guard)

- **Style template-literal truncation guard.** Comments inside `const stylesheet = \`…\`` that
  contain a backtick silently truncate the string, because every extraction script uses a
  non-greedy regex. This bit three files during this round and each time surfaced as an
  unrelated assertion failing (black text, missing focus rings, unhidden cost card).
  `design-system.assert.ts` §26 now scans for it.

## 1.14.0 - 2026-10-16

A round of **ZCode design-system reverse engineering + foundational architecture layers**.
Unlike 1.12/1.13 ("align with existing tokens"), this round adds layers the plugin simply
did not have: a spacing scale, `document-hidden` motion pause, and a generic template-literal
guard. A pitfall scan ran before the work (T1, 95 cards fully scanned, 24 hits) and a deep
scan after the first version (T2, 10 hits). Skin version 1.3.0 → **1.4.0**.

### Added (architecture layers)

- **Spacing scale**: five tokens with real consumers (`--dcu-space-1/2/3/4/6` = 4/8/12/16/24px),
  per ZCode `DESIGN.md` §Spacing (4px base). A first pass pre-seeded 2px/20px steps plus
  8 size tokens (`--dcu-size-icon-*` / `--dcu-size-control-*`); a closing self-check found
  **zero consumers** for all ten and they were deleted — see §28.10. Pre-seeding unused slots
  makes later readers assume they carry conventions. The plugin previously
  had no such layer: geometry was written as literals, which grew 39 one-off values
  (5/7/9/14/18/22px), with two or three synonyms for the same intent in one view.
- **`document-hidden` motion pause** (`src/client/document-hidden-motion-pause.ts`):
  ports ZCode's memory protection — all transitions/animations stop while the page is hidden,
  so DocumentTimeline stops retaining removed subtrees. Long conversations with background
  streaming are exactly where that leak compounds. Registered as an **app-level** effect.

### Fixed

- **Sidebar footer clipping (real bug)**: `dsh-cost-meter` defaults to its `compact` peak
  branch (`.cm-peak-strip` + `.cm-peak-chip`), but the foreign-content contract only listed
  anchors for the `classic` branch — so the default path was never covered: `.dcu-foot`
  overflowed by 13px, `.cm-peak-strip` by 29px, and trailing text was hard-clipped.
  Added anchors for all three branches and gave the chip shrink + ellipsis (contract rule 3).
  Measured: `.dcu-foot` 13px→0px, `.cm-peak-strip` 29px→0px.
- **Semantic colours used on peak-strip text (contract violation)**: the foreign plugin applied
  `#ff9800` / `#34a853` / `var(--state-business-primary)` to **text** across three states,
  while contract rule 4 permits semantic colours for **fills only**. Converged to the sidebar
  scale so it follows the theme (previously identical green in both themes, contrast unverified).
  Note: specificity must be raised — `.dcu-root .dcu-foot .cm-peak-chip` (3 classes) is required
  to beat `\.cm-peak-strip.weekend .cm-peak-chip` (3 classes); otherwise the override silently loses.
- **Assertion defects (regex scanned full text including comments)**: the spacing ratchet counted
  "originally gap:22px" inside a comment as a real declaration; the anchor check flagged a
  `.cm-peak-high` mention in a comment as an unregistered override. Both now strip comments first.

### Tests

- §25 **spacing ratchet**: off-scale spacing must be explicitly registered (keyed by the
  **full value**, not a bare number — otherwise `margin:-3px 0 0` degrades to an unreadable
  `margin:3px`), with three documented exception classes: alignment / optical / geometry-coupled.
- §13c **generic template-literal guard**: covers **every client file** instead of relying on
  remembering which file was edited. This trap had been hit seven times in total.
- `verify-sidebar-transition.mjs` **performance regression guard**: the move must not be written
  as an inheriting CSS variable on `frame` (see §27).
- `conversation-header.assert.ts`: **intent-based assertion** replaces a literal (CODE-040).

## 1.13.0 - 2026-10-14

A design-language alignment pass using ZCode's `DESIGN.md` as the single source of truth:
breakpoints brought under one registry, every radius literal tokenized, settings-page tokens
delegated to host semantic tokens, and menu/overlay density converged to the charter. Four
groups of previously unguarded knowledge became assertions. Skin version 1.2.0 → **1.3.0**.
Every change was **reverse-tested** (reverting it must turn an assertion red) and reviewed
in an isolated live host.

### Fixed

- **`test:layout` was missing one gate script (real defect)**: 1.11.0 wired
  `verify-state-shells.mjs` into `scripts/gate.mjs`'s LAYOUT array but not into the
  `test:layout` script — running `npm run test:layout` locally showed all green while that
  check **never executed**. Both entry points now list 16 scripts, and assertion §23 pins
  the two lists equal so it cannot drift again.
- **639/640 were two adjacent breakpoints governing the same composer region**: `CodexSidebar`
  narrowed the composer shadow at 639px while `InputHistoryDock` hid the history hint at 640px,
  leaving a 1px window where the shadow was already tightened but the hint still showed.
  Unified to 640px.

### Changed (visual)

- **Menu and overlay density aligned to charter §Menus** (previously off-spec, and an older
  audit had mistaken the off-spec value for the contract): shell `xl(12px)→lg(8px)`,
  item `lg(8px)→md(6px)`, shell padding `5px→p-1(4px)`, item padding `4px 9px→4px 8px`,
  item gap `0→2px` (`gap-0.5`). Truth source: ZCode
  `packages/ui/src/components/ui/dropdown-menu.tsx`. The **suggestion menu (`@` / `/`) follows
  the same rules** — the charter states it "does not inherit the main-input exception", so its
  previous 12px was a violation.
- **Radius literals down to zero**: all 35 in-scale literals (2/4/6/8px) migrated to
  `var(--dsw-radius-*)` with no visual change (token value equals literal). The ratchet
  baseline is now empty, upgrading its meaning from "must not regress" to "no in-scale
  literals allowed". Only three non-scale shape values remain: `0`, `50%`, and the pill `999px`.
- **Settings-page `--sp-*` tokens delegated to host semantic tokens**: six roles matched host
  tokens exactly (verified by comparing computed values in a real Chromium) and now reference
  `--dsw-alias-bg-base` / `settings-card-fill` / `border-l2` / `label-primary` /
  `interactive-bg-hover` / `--dcu-sidebar-selected` — zero visual change, and the settings page
  now follows the host palette. `--sp-muted` / `--sp-muted-on-card` keep literals: the static
  scale **inverts** between light and dark (static-500 is `#8f8f8f` in light but `#5c5c5c` in
  dark), so referencing it by step number would produce the opposite value.

### Added (guards)

Design rules only take effect once they are assertions. This batch turned four pieces of
knowledge that existed **only in source comments** into assertions:

- **§20 breakpoint registry + ratchet**: every viewport breakpoint must declare its purpose;
  unregistered ones fail, and adjacent 1px pairs fail outright (that shape means one region
  got split in two). Not a CSS token because **media queries cannot use `var()`**, and the
  layout fixtures extract template strings by regex — interpolation would make them read the
  variable name.
- **§21 settings-page token ratchet**: the six roles must reference host tokens (copies drift
  silently when the host palette changes).
- **§22 search dialog keyboard and ARIA contract**: `Escape` to close, arrow-key roaming,
  `role="dialog"` + `aria-modal` + accessible name + autofocus, and the requirement that the
  keydown listener be registered in the **capture phase** — a bubble-phase listener is
  pre-empted by the host's window-level handler, which on a real machine once left users
  unable to close the dialog.
- **§23 layout entry-point list equality** (see above).
- **§24 skin version guard**: `SKIN_VERSION` had no assertion at all and KNOWN-ISSUES §13
  records one release that missed the internal version bump. It now pins "valid format" plus
  "wired into both consumers (CSS comment and `data-dsh-zcode-skin`)" while deliberately
  **not** pinning the number.

### Docs

- **Corrected baseline drift**: `KNOWN-ISSUES` and both READMEs still said
  "35 pass / 0 fail (38 scripts)" while the measured state is **37 pass / 3 skipped / 0 fail
  (40 scripts)**; the vitest figure was stuck at "47 files / 311 tests" versus **53 files /
  394 tests**; layout scripts were listed as 11/12 versus 16. All figures now match a real
  run, and KNOWN-ISSUES states that **counts must come from an actual run, not arithmetic**.
- Eight assertions across three files that pinned the radius as the literal `8px` now pin the
  **design intent** (`8px` or `var(--dsw-radius-lg)`) — pinning the literal fights the ratchet.

### Tests

- Assertions: 40 scripts — 37 pass / 3 intentionally skipped / 0 fail.
- vitest: 54 files / 399 tests pass. Added `skin-install.spec.ts` (5 cases) covering skin install/restore semantics.
- Real-browser layout: **16/16 pass** (including `verify-state-shells`, which had never run
  under `test:layout`).
- Isolated live-host review: `data-dsh-zcode-skin` = `1.3.0` (confirming the new build is
  loaded), sidebar light `#f0f0f0` / dark `#161616`, zero console errors; menu measured at
  shell `8px` + padding `4px` + item gap `2px` + item `6px`, matching the ZCode truth source.

### Fixed (performance)

- **Sidebar toggle stuttered on long conversations** (user report): the old implementation
  animated `width: calc(100% + shift)` on the conversation column, forcing a **full text
  reflow every frame**; the grid track was also pinned to an "animation base" geometry, so
  the settle step reflowed once more. Measured: at 3000 messages the animation collapsed to
  4 frames, at 8000 messages to **1 frame** (i.e. no animation at all), with a 465ms first
  frame. Fixed by switching the track to the target geometry up front (constant width,
  zero settle reflow), moving the start offset into an explicit `@keyframes` `from`,
  using `shift/2` (the conversation band is centred, so it only travels half the distance),
  scheduling the animation start one frame later (so the reflow is paid first), and
  **adaptively skipping the animation** when the reflow already exceeds its duration
  ("fast and still" beats "freeze then barely slide"). Measured at 8000 messages:
  first frame 465→101.5ms, animation 1→11 smooth frames, band centre monotonic with no jump.
  Full reproduction and derivation: `docs/KNOWN-ISSUES.md` §26.

### Tests

- `verify-sidebar-transition.mjs`: message counts widened from `[10, 1200]` to
  `[10, 1200, 3000, 8000]` — the old range happened to sit exactly where the old
  implementation still looked fine, which is why this bug survived. Added a
  **visual band-centre continuity** assertion (the only measure that distinguishes the old
  and new track architectures), and split "flight frames / first frame / startup frame"
  into separately bounded categories to avoid both false reds and false greens.

### Fixed (performance)

- **Sidebar toggle still felt slow on long conversations** (second user report): the move
  distance was written as the CSS variable `--dcu-sidebar-shift` and consumed by a
  `@keyframes` `var()`. That variable is an **unregistered inheriting custom property**,
  and `frame` is also an ancestor of the conversation area (measured 12,632 descendants in
  the real host) — a single write invalidated styles for **every descendant**.
  Measured: writing to `frame` cost 44.2ms, while writing to a sidebar-only child cost
  4.0ms — **cost scales with descendant count**, which is exactly why longer conversations
  got slower. On top of that, `var()` inside `@keyframes` prevents the animation from being
  handed to the compositor.
  Fixed by having the move carried by the content column's own **inline `transform`**
  (a non-inheriting property, invalidating only that element: 0.3ms), and switching the CSS
  back from `@keyframes` to `transition`.
  Real host at 8000 messages (16.7k nodes): style recalc 445.5ms → 346.9ms (-98.6ms / 22%);
  synthetic fixture at 6000 messages: 172.6ms → 90.4ms (-48%).
  **Honest limit**: the remaining 346.9ms is mostly the host's own unavoidable reflow
  (277.6ms even with all plugin CSS disabled); the plugin cannot remove it — that needs
  virtual scrolling on the host side. Full attribution and the list of levers that were
  measured and found ineffective: `docs/KNOWN-ISSUES.md` §27.

### Tests

- `verify-sidebar-transition.mjs`: added a **performance regression guard** asserting the
  animation must not write the move as a CSS variable on `frame`, and must use the content
  column's inline `transform` (reverse-tested to catch the old implementation).
- `conversation-visuals.assert.ts`: added a **template-literal truncation guard**
  (balanced backticks, balanced braces, closed comments, ends with a rule). This pitfall
  had been hit three times: a backtick inside a CSS template-literal comment silently
  truncates the template, breaking `tsdown` and making the host report `failed to import`,
  while the assertion suite stayed **green** (it only ever saw the truncated prefix).

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
