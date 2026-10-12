# Changelog

[简体中文](CHANGELOG.zh-CN.md)

Releases of **dsh-zcode-ui**. This package is a fork of [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34; the full upstream history up to that version lives in [docs/UPSTREAM-CHANGELOG.md](docs/UPSTREAM-CHANGELOG.md).

## Unreleased

### Added

- `scripts/verify-a11y-and-overflow.mjs` — contrast (WCAG 2.1 AA, both themes), suggestion-card truncation, and collapsed-rail overflow as automated checks. Wired into `gate` and `test:layout`, which now runs 12 browser scripts instead of 11.

### Changed

- **Sidebar text ramp re-derived against the sidebar background.** ZCode's `foreground-subtle` / `foreground-subtlest` are blended against a *white* surface; on the sidebar's `#f0f0f0` they measured only 3.93:1 and 2.32:1. Now light secondary `#777777` → `#5c5c5c` (5.87:1), tertiary `#9f9f9f` → `#686868` (4.89:1), dark tertiary `#4f4f4f` → `#828282` (4.82:1).
- Selected surfaces are neutral (`#efefef` / `#3a3a3a`) instead of ZCode's blue accent, matching the sidebar's own selection language.
- New-conversation suggestion labels wrap to two lines instead of being cut mid-word at 1440px.
- Third-party cost card scaled down to the sidebar type ramp with its white card removed; hidden entirely in the collapsed rail, where its text used to be clipped into fragments.
- Collapsed-rail buttons gained `title` tooltips.
- Settings muted text `#737373` → `#6b6b6b`.
- Every icon now comes from `src/client/zcode-icons.tsx`; no other module imports `lucide-react` directly.
- Log prefixes unified to `[dsh-zcode-ui]`.

### Fixed

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
