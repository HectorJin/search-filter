# Contributing

Thanks for taking the time to contribute. This is a small project — a few
hundred lines of plain JavaScript — so the bar for changes is clarity, not
process.

## Before you open an issue

1. **Check the engine list.** Only the engines in the README table are
   supported. Others are welcome as PRs.
2. **Confirm it is not a layout change.** Search engines ship new markup
   constantly. Open DevTools, inspect a result that *should* have been hidden,
   and check whether its container still matches one of the selectors in
   `ITEM_SELECTORS`.
3. **Include the DOM.** A bug report without the outer HTML of one unfiltered
   result is usually impossible to act on.

## Reporting a bug

Please include:

- Browser and version (`chrome://version` or `quark://version`)
- Search engine and query
- Expected vs. actual behaviour
- The `outerHTML` of one result that was **not** hidden but should have been
  (trim it to the container element)
- Any console errors from the results page

## Adding engine support

1. Find the per-result container selector. Load a results page with DevTools,
   pick one result, and walk up to the element that wraps exactly one entry.
2. Add the selector to `ITEM_SELECTORS` in `content.js`.
3. Add the results-list container to `SCOPE_SELECTORS` if it is not already
   covered by a generic one.
4. Verify the fallback still works: temporarily remove your selector and confirm
   the heuristic still hides the right blocks.
5. Check for false positives — AI summary cards, "people also ask" boxes,
   sidebars, and pagination must stay visible.

## Code style

- Plain ES2020, no build step, no dependencies. Keep it that way.
- No `innerHTML` for anything derived from page content.
- Every candidate block must pass the `plausible()` gates before it can be
  hidden. Never bypass them to "just make it work" — that is how the first
  prototype ate the navigation menu.
- Prefer `display: none !important` over `visibility` or `opacity` so layout
  collapses instead of leaving a gap.

## Testing

There is no test suite. Manual verification is the standard:

1. Load the folder as an unpacked extension
2. Search a query that reliably returns the blocked domain
3. Confirm the count badge matches what disappeared
4. Scroll to the bottom to trigger lazy rendering, then check again
5. Toggle the domain off and confirm the results come back

Headless browsers do not inject content scripts, and Chrome 137+ removed
`--load-extension` — test with a visible window in Edge, Chrome, or Quark.

## Pull requests

- One concern per PR
- Describe what you changed and which engine you verified it on
- Update `CHANGELOG.md` under an `Unreleased` heading if the change is
  user-visible

## License

By contributing you agree that your work is released under the
[MIT License](LICENSE).
