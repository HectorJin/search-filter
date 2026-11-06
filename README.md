<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Search Filter icon">

# Search Filter

**Hide domains you don't want from search results — CSDN out of the box.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/Manifest-V3-1f6feb)](manifest.json)
[![Browsers](https://img.shields.io/badge/browsers-Chrome%20%7C%20Edge%20%7C%20Quark-2ea44f)](#supported-engines)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

**English** · [简体中文](README.zh-CN.md)

</div>

---

## Why

Search anything technical in Chinese and the first screen is usually wall-to-wall CSDN: copy-pasted posts, truncated code behind a login wall, five ads above the fold. Blocking it at the DNS level kills the whole site, including the occasional article that is actually worth reading. Adding `-site:` to every query is tedious — and on Quark search the syntax backfires: it turns the domain into a keyword and returns *nothing but* CSDN.

This extension works one level up. It looks at each result on the page, works out where that result actually comes from, and hides the ones you blacklisted. Everything else stays untouched.

> Quark search **does not support** `-site:` exclusions. Adding it to a query that returned 2 CSDN results returned 40 instead. That dead end is what led to this extension.

## Features

- **Per-result filtering** — hides the whole result entry, not just the link
- **Domain rules** — one domain per line; `csdn.net` also covers `blog.csdn.net`, `bbs.csdn.net`, and every other subdomain
- **Instant apply** — rules take effect without restarting the browser
- **Live counter** — optional badge showing how many results were filtered on the current page
- **Zero network** — no requests, no telemetry, no remote config
- **Zero dependencies** — ~20 KB of plain ES2020, no build step

## Supported engines

| Engine | Entry point | Result container |
| --- | --- | --- |
| Quark | `quark.cn/s` | `section.sc_structure_template_normal` |
| Baidu | `baidu.com/s` | `div.result` |
| Bing | `bing.com/search` | `li.b_algo` |
| Google | `google.com/search` | `div.g` / `div.MjjYud` |
| Sogou | `sogou.com/web` | `div.vrwrap` |
| 360 | `so.com/s` | `li.res-list` |
| DuckDuckGo | `duckduckgo.com` | `article[data-testid="result"]` |

## Install

Load-unpacked only — this extension is not published to any store.

### Quark

1. Go to `quark://extensions`
2. Toggle **开发者模式** (Developer mode) in the bottom-left corner
3. Click **加载解压缩的插件** (Load unpacked extension) in the top-right
4. Select the folder containing `manifest.json`

### Edge

1. Go to `edge://extensions`
2. Toggle **Developer mode** in the bottom-left corner
3. Click **Load unpacked** and select this folder

### Chrome

Same as Edge, via `chrome://extensions`.

Then reload any search page you already have open.

## Usage

- **Toolbar icon** — see how many results were filtered on this page, toggle filtering on/off
- **Manage blocklist** — add or remove domains, one per line
- Changes apply immediately to open tabs

## How it works

### The problem with `href`

The obvious implementation — scan for `a[href*="csdn.net"]` and hide the closest ancestor — fails on most Chinese engines. Baidu rewrites every result link to `baidu.com/link?url=<opaque token>`, so a domain-based selector matches **zero** elements. Google does the same with `/url?q=`.

The real URL is not in the `href`:

```html
<div class="result c-container" mu="https://blog.csdn.net/qq_73360961/article/details/145865040">
  <h3><a href="http://www.baidu.com/link?url=pMlQXZoJ...">...</a></h3>
</div>
```

It sits on the container as a `mu` attribute.

### Source resolution

For each candidate result the extension collects sources in three passes:

1. **Container attributes** — `mu`, `data-url`, `data-mu` on the result element and up to three ancestors
2. **Real link targets** — parsing `/url?q=`, `/link?url=`, `/ck/a?u=` tunnel parameters before comparing hosts
3. **Visible provenance** — the `cite` / `.c-showurl` / `[class*="source"]` element, which prints the source domain inline

A result is hidden when **any** resolved host matches the blocklist.

### Locating the result entry

Engine-specific containers are tried first. If none match, it falls back to a structural heuristic: climb from the link until an ancestor has at least two siblings with an identical tag-and-class signature.

Every candidate must then pass a sanity check before anything is hidden:

- not `body` / `html`, not an inline-level tag (`a`, `p`, `span`, …)
- has a class name
- visible text between 20 and 2,200 characters
- 1–12 links
- contains at least one title-like link (≥ 6 characters)

Without those gates the heuristic happily hides navigation `<li>`s and AI-summary citations — which is exactly what the first prototype did, taking out 8 menu items and a paragraph alongside the real results.

Scoping matters as much as the checks: scanning runs only inside known result-list containers (`#b_results`, `#content_left`, `#rso`, …), so summary cards, sidebars, and header navigation are never candidates to begin with.

## Privacy

The extension runs only on the search pages listed in `manifest.json`. It reads the DOM to decide what to hide. It does not copy page content into storage, makes no network requests, and has no remote configuration endpoint. The blocklist lives in `chrome.storage.sync` and never leaves your browser profile — except through your own browser sync, if you have it enabled.

## Development

No build step, no dependencies.

```bash
git clone https://github.com/HectorJin/search-filter.git
```

1. Load the folder as an unpacked extension (see [Install](#install))
2. Edit `content.js` / `options.js` / `popup.js`
3. Click the reload button on the extension card in `chrome://extensions`

To regenerate icons:

```bash
pip install pillow
python make_icons.py
```

### Testing notes

Three things will waste your afternoon if you don't know them:

- **Headless browsers do not inject content scripts.** `--headless=new` loads the extension but `content.js` never runs. Test with a visible window.
- **Chrome 137+ removed `--load-extension`.** Edge and Quark still accept it. For Chrome, load unpacked through the UI, or use the CDP `Extensions.loadUnpacked` command.
- **Result rendering is non-deterministic.** Bing and Quark reshuffle result sets between loads, so "hide, then inspect" has to happen inside a single page session or the numbers won't line up.

## Contributing

Bug reports and engine-support PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 HectorJin
