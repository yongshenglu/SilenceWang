# GitHub Ledger Sync Implementation Plan

**Goal:** Manually save and restore the complete ledger through a private GitHub repository.

**Approved design:** Keep the public Pages site separate from private `yongshenglu/SilenceWang-Data`. Store all records and ordered categories in `ledger.json`. Keep localStorage for offline work and existing JSON/CSV actions. Use a fine-grained token held only in memory for the current page. Confirm local replacement and reject stale remote writes.

**Architecture:** A standalone browser/CommonJS `github-sync.js` owns authenticated GitHub requests, private-repository checks, UTF-8 JSON encoding and SHA-based concurrency checks. `app.js` owns strict ledger validation, confirmation and local persistence. The public build includes the client code but no credentials or ledger.

**Tech Stack:** Native HTML/CSS/JavaScript; Node built-in test runner; Playwright for browser verification.

## Constraints

- Never embed, log, store or commit a GitHub token or real ledger data.
- Fix repository to `yongshenglu/SilenceWang-Data` and use its default branch.
- Only manual sync; errors preserve the browser copy.
- All local testing ports have five digits.
- Test each logical unit before committing. No force push or hard reset.

## Tasks

- [x] Client: write failing tests in `tests/github-sync.test.cjs`; implement `createGitHubLedgerSync({fetch})` with `connect(token)`, `read(validate)`, `write(payload)`, `disconnect()` and `connected`. A successful confirmed read establishes the remote SHA; an existing remote ledger cannot be overwritten before reading. Rejected/cancelled reads must not establish a baseline.
- [x] Verify client with `node --test tests/github-sync.test.cjs`: private repo required; Unicode round trip; first create; existing-file guard; stale SHA; missing remote file after read; failed/ambiguous upload; invalid JSON; expired token; disconnect clears authorization.
- [x] UI: add a GitHub section to `index.html`, scoped responsive styles, and event handlers in `app.js`. Read into a temporary value, validate every record/category, confirm replacement, persist successfully before replacing in-memory state, and refresh all views. Protect against local edits during a read and edits during an upload. Show persistent success/error/local-change status.
- [x] Integration: add browser tests for connect/save/read, cancel, invalid data, local edits during requests and localStorage failure. Run desktop/mobile layout checks on port 19177. Use synthetic test data only.
- [x] Delivery: update README and Pages workflow to test/deploy the new script. Verify the private repo, commit tested changes, push the feature into main without rewriting history, wait for Pages and verify the public script/UI. Real data upload remains a user action in their browser.

## Verification

- 23 Node/browser tests passed on the integrated main tree, including upload snapshot isolation and cancellation/data-loss checks.
- Independent review found no additional blocking issue after the snapshot fix.
- Private data repository verified; only its initial README exists, with no real ledger uploaded.
- Pages workflow `38840001586` succeeded for `8e70d9d1a5fad026ca676a0c415d9296638908ef`.
- Fresh Edge browser verified the public HTML, CSS and both JavaScript files return HTTP 200, sync controls are visible, and no page errors occur.
- Direct Git HTTPS was unavailable. The GitHub API uploaded identical blobs, trees and commits, verified every SHA, then advanced main with `force: false`. Local and remote main were verified identical.
