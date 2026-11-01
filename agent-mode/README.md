# Agent mode (reference implementation, not a merge request)

This directory is a working prototype of a "Claude in Chrome"-style Safari workflow, published only so the
design can be read and cherry-picked in small pieces. It is **not** meant to be merged as one unit.

What it adds on top of the current skill:

- `bin/safari-use`: one CLI (Node, no dependencies) that opens a separate Safari window for the agent, manages
  its tabs by window id, and wraps every page call.
- `lib/runtime.js`: page runtime injected per command: accessibility-style tree with stable `ref_N` ids
  (`read`, `find`), click/type/fill/key/scroll by ref, console and fetch/XHR capture, plus the visual layer
  (glow, "active" pill with Stop, animated cursor, tab-title marker) that `feat/indicator-stop-and-cursor`
  proposes in a much smaller form.
- `scripts/mouse.swift`: optional trusted click through CGEvent (needs Accessibility).
- `SKILL.md`: usage and the safety rules (password/card/code fields are refused; Stop is honored).

Possible follow-up PRs, smallest first: (1) the indicator Stop/cursor change, (2) ref-based read/find,
(3) dedicated agent window and tab management, (4) experimental native Tab Group creation.

Verified manually on macOS 27 / Safari with a local fixture page (`tests/fixture.html`). Not covered by
automated tests; the page runtime was also exercised in Chromium. Native Tab Group creation relies on menu
automation, depends on the menu language (English and Russian handled) and is experimental.
