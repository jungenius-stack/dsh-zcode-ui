# Changelog

[简体中文](CHANGELOG.zh-CN.md)

Releases of **dsh-zcode-ui**. This package is a fork of [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34; the full upstream history up to that version lives in [docs/UPSTREAM-CHANGELOG.md](docs/UPSTREAM-CHANGELOG.md).

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
