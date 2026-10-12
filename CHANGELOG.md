# Changelog

[简体中文](CHANGELOG.zh-CN.md)

Releases of **dsh-zcode-ui**. This package is a fork of [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34; the full upstream history up to that version lives in [docs/UPSTREAM-CHANGELOG.md](docs/UPSTREAM-CHANGELOG.md).

## 1.0.0 - 2026-10-12

Fork of dsh-codex-ui@1.1.34. Inherits its sidebar / workspace session tree / settings skeleton and data layer (SlotRegistry + ctx, untouched), and layers the ZCode visual language on top:

- Full Zai Light / Zai Dark palettes written to `--dsw-*` (canvas `#f8f8f8` / `#161616`, values cross-checked pixel-by-pixel against zai-org/ZCode v3.15.1).
- ZCode sidebar geometry: 8px radius, 32px row height, 150ms ease-out transitions, Lucide icons.
- Theme follows the host `data-ds-dark-theme` attribute as the single source of truth (no `prefers-color-scheme` fallback, which caused a sidebar/content split when the host was light but the OS was dark).
- Every `--dsw-*` token consumed in `src/` is covered by the token maps, enforced by the `token-coverage` assertion.
- Standalone session-title sub-plugin (LLM-generated, independently toggleable).
