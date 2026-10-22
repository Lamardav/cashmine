# CashMine payback (practical task)

**Live:** https://GITHUB_USER.github.io/cashmine/

Expo (React Native + TypeScript) app shipped as a web build for phones (~390 px).
On first open it asks for your API token. The token is kept only in this browser and can be
changed via **Token** in the top right.

## Run locally

```bash
npm install
npm run web          # dev server, open the printed URL
npm test             # unit tests (vitest)
npm run typecheck
npm run deploy       # typecheck + tests + export + publish to the gh-pages branch
```

The API base URL is set in one place: `src/shared/config/index.ts`.

## What works

- **Balances (Home):** per-asset available / pending / being claimed, totals in USD, data freshness
  from `asOf` (stale warning after 60 s), loading, error with retry, and refresh (manual + every 15 s).
- **Claim:** pick an asset and destination, enter an amount or tap Max, with live validation
  (format, decimals, minimum, available, fee). Fee and "you receive" are shown, then a review
  screen, confirm, and status tracking until completed or failed.
- **Safe submission:** one Idempotency-Key per claim. Timeouts, 504, 5xx and 429 are retried with
  the same key, and resumed after a reload. "Status unknown" blocks new claims until it's resolved.
- **Balance after claim:** the claim is applied locally until a newer snapshot includes it (see NOTES.md).
- **Activity:** paginated history of accruals, reversals and claims. Claims open their status page.
- **Tests:** amount parsing, validation, fee, USD totals, balance overlay, idempotent retry loop.

Structure: Feature-Sliced Design in `src/` (shared / entities / features / widgets / pages / app).
expo-router routes in `/app`. Decisions and AI notes: [NOTES.md](NOTES.md). AI logs: [ai-logs/](ai-logs/).
