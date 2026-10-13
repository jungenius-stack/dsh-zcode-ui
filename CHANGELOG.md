# Changelog

[简体中文](CHANGELOG.zh-CN.md)

Releases of **dsh-zcode-ui**. This package is a fork of [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34; the full upstream history up to that version lives in [docs/UPSTREAM-CHANGELOG.md](docs/UPSTREAM-CHANGELOG.md).

## 1.1.0 - 2026-10-13

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
