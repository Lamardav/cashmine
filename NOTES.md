# Notes

## Decisions

**Amounts: `bigint` in the asset's smallest unit.** Every API amount is parsed strictly into a `bigint`
count of 10^-decimals and formatted back to the canonical API form, so nothing is ever a JS `number`.
The live API returns ETH as `12.345678901234591676` (18 decimals), which a float can't hold exactly.
USD values are `amount × usdPrice` kept exact at 10^-12 USD, summed across assets, and rounded
half-up to cents only for display. User input is lenient where it's harmless (`,` as the decimal
separator, `.5`, `1.`, leading zeros), and we always send the canonical string. Input is rejected
when it's ambiguous: signs, exponents, or more decimals than the asset allows. We never round
money silently. *Alternatives:* decimal.js or big.js (fine, but a dependency for what is just
integer arithmetic), or numbers in cents (doesn't work for crypto precision).

**Balance right after a claim: optimistic overlay, reconciled by `asOf`.** The server deducts
`available` at once, but the snapshot is recomputed only every 15 s. Until a snapshot with
`asOf > claim.createdAt` arrives, the app itself moves the claimed amount from *available* to
*being claimed* (marked `*`). After that, the server numbers are used as they are. A snapshot that
doesn't include the claim yet therefore can't make the balance jump back up. A newer snapshot is
never double-counted, and an older response arriving late never replaces a newer one. Failed
claims are not applied, and their amount visibly returns with a "Claim failed: reason, the amount
is back in available" banner. That jump is real and explained, not noise. *Alternatives
considered (see ai-logs):* (a) server numbers only, plus a "claim in progress" banner: honest, but
it's exactly the "my balance didn't change so I claimed again" case; (b) hide the asset's balance
until the next snapshot: never wrong, but up to 15 s of nothing. Max and validation use the
adjusted available, so the user can't over-claim from a stale snapshot either.

**Unknown outcome (timeout / 504 / network): same request again, automatically.** One
`Idempotency-Key` per confirmed claim. It is persisted in localStorage together with the exact
body before the first attempt. 429, 5xx, 504, client timeouts and network errors are retried with
the same key and body (backoff 1→8 s, honouring `retryAfterMs`). The user sees "Checking whether
your claim went through…", and starting a new claim is blocked while one is unresolved. After 5
attempts the claim shows "Status unknown" with a **Check again** button. That button re-sends the
same request, so it can never create a second claim. If the tab is closed mid-request, the request
is re-sent on the next open. Only a definitive answer (400/401/404/409) clears it. This isn't
theoretical: on the live API my first POST returned **504 but the claim had been created**, and the
replay with the same key returned it (`Idempotent-Replayed: true`).

**Other decisions**
- *Total in USD* = available + pending + claiming (everything that's the user's), with "Available
  to claim" shown as its own line. Freshness shows "Updated 12s ago · 15:20:05" from `asOf`, a warning
  after 60 s, and keeps the last known balances with an inline error when a refresh fails.
- Balances poll every 15 s (the snapshot cadence). Pending claims poll every 2 s until they settle,
  then balances are refetched.
- Fee and "you receive" are shown from `claim-options`, and the status screen shows the server's
  returned `fee` and `receiveAmount`, which are the numbers that matter.
- The token is stored in localStorage only. Changing it resets every cached store (balances,
  tracked claims, open submission), because a new token means a new user.
- Architecture: Feature-Sliced Design (`src/shared → entities → features → widgets → pages → app`).
  expo-router routes in `/app` are one-line re-exports of pages. The router root is pinned to
  `./app`, because expo-router otherwise picks `src/app` (the FSD app layer) as the routes folder.
- State: zustand stores per entity and feature, so the claim retry loop keeps running if the user
  leaves the screen.
- Deploy: `npm run deploy` (typecheck + tests + export with base URL `/cashmine` + 404.html SPA
  fallback) publishes to the `gh-pages` branch.

## Working with AI

All in `ai-logs/` (Claude Code session export).

1. **A prompt that didn't get what I wanted.** I answered the deploy question with "use github and
   github actions" and got a full GitHub Actions Pages workflow. I meant the `gh-pages` branch. I
   corrected it ("i mean gh pages, not actions"), and the workflow was replaced with a `gh-pages`
   npm script (commit `ci: deploy to GitHub Pages with gh-pages branch instead of Actions`).
2. **AI output that was wrong or risky.** After moving to FSD, the build "succeeded", but the route
   bundle was 210 bytes and only re-exported `AppProviders`. expo-router silently treats `src/app`
   as the routes folder when it exists, so the FSD app layer had become the router. It was found by
   inspecting the exported bundle and then the Expo CLI source (`getRouterDirectory`), and fixed by
   pinning `root: "./app"`. Two smaller cases: the scaffold copy used `rsync --exclude dist`, which
   also dropped every `node_modules/*/dist` (`Cannot find module …/2g.js`). And the AI's own
   self-review found that a new claim after a rejected one showed the old error message (fix and
   test in `fix(claim-create)…`).
3. **Disagreeing with / rejecting a suggestion.** The AI recommended a plain state-based screen
   stack to save time and avoid the `app/` naming clash with FSD. I chose expo-router anyway for
   real URLs, browser back and deep links to `/claims/:id`, and accepted the setup cost. I also
   rejected Vercel (the AI's default) in favour of GitHub Pages, so the code and the live build
   are in one place.

## Not done / known issues

- No component/UI tests. Unit tests cover amounts, the balance overlay and the idempotent
  submission loop. Next: React Native Testing Library tests for the claim form states.
- The fee is read once per asset on the claim screen. If it changes before submit, the review
  screen can differ from the server's `fee` (the status screen shows the server's numbers). Next:
  re-fetch options on review, and compare against `fee` in the response.
- Claim tracking only covers claims created on this device (or opened from Activity). Claims from
  other devices appear through the server's `claiming` and in Activity.
- The activity list is not live: it loads when opened, with "Reload from top".
- Client time is used only for the "X s ago" label. The overlay compares server timestamps only.
- Not tested on a real phone browser yet beyond a 390 px viewport. Web-only (iOS/Android not targeted).
