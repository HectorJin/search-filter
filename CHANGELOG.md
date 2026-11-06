# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-06

First public release.

### Added

- Per-result filtering for Quark, Baidu, Bing, Google, Sogou, 360, and DuckDuckGo
- Three-pass source resolution: container `mu` / `data-url` attributes, tunnel
  URL parsing (`/url?q=`, `/link?url=`, `/ck/a?u=`), and visible `cite` provenance
- Engine-specific result containers with a structural fallback heuristic
- Sanity gates on every candidate block (tag type, class presence, text length,
  link count, title-link requirement) to prevent hiding summaries and navigation
- Options page with domain list, presets, and live validation
- Toolbar popup with per-page count and a master toggle
- Optional on-page counter badge
- Bilingual documentation (English / 简体中文)

### Known limitations

- Only runs on result pages, not site-internal search
- If an engine ships a completely new result container and drops direct links,
  filtering degrades to tunnel-URL parsing only
- Quark search does not support `-site:` exclusions — this extension exists
  because of that gap, not as a supplement to it

[1.0.0]: https://github.com/HectorJin/search-filter/releases/tag/v1.0.0
