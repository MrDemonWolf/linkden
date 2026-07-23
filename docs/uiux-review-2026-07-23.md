# UI/UX Review: LinkDen pre-launch re-review (scoped)

**Reviewed:** 2026-07-23 · **Input:** live local build (Next dev :3001, fresh D1, dev login) + source code · **Method:** NN/g heuristic evaluation + guideline review

Scope: the surfaces changed by PRs #46 / #47 / #48 — wallet iOS-style editor, dashboard header + stats, appearance header + preview, connections/builder sheets, block custom colors, setup wizard, public consent banner + footer pills, theme preset labels. Full-site report of record: [uiux-review-2026-07-22.md](uiux-review-2026-07-22.md) (statuses updated there).

## Executive summary

- **Zero severity 3–4 findings on the changed surfaces.** All nine open P2 items from the 2026-07-22 report are verified fixed in the running app (see "Verified fixes" below).
- The wallet editor now matches the iOS-Wallet reference: tabbed bottom bar, pill-reveal Context editors, three-segment palette chips, live preview recolor, dirty chip + save round-trip — all confirmed working in-browser.
- The new contrast guard measurably works: white-on-yellow block colors report "1.2:1 — fails AA (4.5:1 needed)" and the Fix chip corrects to `#000000` (≈17.7:1).
- Two minor issues remain, both pre-existing behaviors surfaced by this pass, not regressions.

**Findings:** 🟥 0 catastrophic · 🟧 0 major · 🟨 2 minor · ⬜ 1 cosmetic

## Findings

### 🟨 Severity 2 — Minor

#### 1. Consent banner keeps its initial theme after the visitor toggles light/dark
- **What:** On the public page, toggling the color mode re-themes the page content instantly, but the cookie banner keeps the colors resolved at first render (a dark `card` bar on a now-light page). Contrast inside the banner remains AA (light text on dark card), so it's readable — but visually inconsistent.
- **Where:** `apps/web/src/app/page.tsx` mounts `<ConsentBanner themeColors={…}>` outside `<PublicPage>`, so `PublicPage`'s `colorMode` state changes never re-resolve the banner's `themeColors`.
- **Guideline:** Consistency and standards — one page, one theme state.
- **Evidence:** [Maintain Consistency and Adhere to Standards](https://www.nngroup.com/articles/consistency-and-standards/) — inconsistent presentation of the same context increases cognitive load.
- **Fix:**
  - [ ] Move the `colorMode` state (or a resolved-theme context) up so the banner re-renders with the active mode, or have the banner subscribe to the `linkden-color-mode` localStorage value `PublicPage` already writes.

#### 2. Wallet Background tab: strip upload renders as a small 4-column-grid cell
- **What:** `PassImageSlots` keeps its `grid-cols-2 sm:grid-cols-4` even when filtered to the single strip slot, so the drop target is ~¼ of the panel width and the "375 × 144" hint wraps awkwardly. Target is still comfortably >44 px, so this is friction, not failure.
- **Where:** `apps/web/src/components/admin/wallet/pass-image-slots.tsx` (grid class) rendered from the Background tab of `wallet-builder-section.tsx`.
- **Guideline:** Match the control's size to its importance — the strip is the tab's primary action.
- **Evidence:** Reviewer judgment + [WCAG 2.5.8 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html) is met; no NN/g citation for the sizing nit, kept as minor.
- **Fix:**
  - [x] When only one slot renders, the wrapper switches to a single full-width column (`grid-cols-1`) — fixed in PR #48 during this review.

### ⬜ Severity 1 — Cosmetic

#### 3. Wallet tab-bar labels are 10 px
- **What:** The five tab labels render at `text-[10px]`. This mirrors iOS's own tab-bar sizing and each target is ≥44 px with an icon, so AA text-size rules don't apply — but on non-retina desktop displays the labels are at the edge of comfortable legibility.
- **Where:** `packages/ui/src/components/tabs.tsx` `variant="bar"` trigger classes.
- **Fix:**
  - [ ] Optional: bump to 11px, or leave as-is (iOS convention).

## Verified fixes (from the 2026-07-22 report, confirmed in the running app)

| # | Item | Verification |
|---|---|---|
| 4 | Custom-color contrast guard | Badge live-updates ("1.2:1 — fails AA"); Fix chip → `#000000` on `#FFEB3B` |
| 12 | Setup error surfacing | Steps 2/3 toast the server message + logs hint (code path; happy path exercised end-to-end) |
| 17 | Three Switch impls | One Base UI Switch everywhere; settings/builder toggles render identically |
| 22 | Wallet delete hover-only | `focus-visible:opacity-100` + ring present |
| 23 | Sheets without focus trap | All three sheets on Base UI Dialog (trap/restore/Escape/scroll-lock); redundant hand-rolled Escape removed |
| 26 | Dashboard blank first paint | Greeting-name skeleton + per-widget gating observed on load |
| 27 | Appearance preview fake links | Empty page correctly falls back to dummies; real blocks render once created |
| 28 | Duplicate h1 per page | Top bar label now a `span` kicker; single `h1` via PageHeader (incl. dashboard, appearance) |
| 31 | Theme toggle pressed state | `aria-pressed` + inset ring on active option, both toggles |

Bonus fixes found during this pass: dashboard `text-blue-400` chrome on the day theme measured ≈2.5:1 (fails AA for text) — swapped to `primary` tokens; consent-banner "Accept Selected" was half admin-token themed; footer wallet/vCard pills were `bg-white/5` and near-invisible on light presets — both fully inline-themed now.

## Adversarial code-review findings (multi-agent, all fixed in-branch)

A 10-agent adversarial review (4 dimensions × refutation verifiers) over the combined diff confirmed 6 findings; all are fixed:

1. **Major — Sheet stayed an active modal when CSS-hidden past its breakpoint.** The `breakpoint` prop only `md:hidden`/`lg:hidden`-hid the panel while the Base UI Dialog stayed open and modal: rotating a phone across the breakpoint left the page scroll-locked, aria-hidden, and pointer-inert behind an invisible dialog (WCAG 2.1.2). → Sheet now closes itself via `matchMedia` when the viewport crosses its breakpoint.
2. **Major — Wallet dirty chip failed AA in light mode.** `text-warning` on `bg-warning/10` measured 4.14:1, and ~3:1 where the translucent panel composites over the dark device frame. → Solid chip background (4.7:1 light / 9:1 dark).
3. **Minor — Backup import bypassed settings sanitization.** `backup.import` raw-upserted arbitrary keys/values, so a crafted backup could plant a non-`#RRGGBB` custom color that the new hex-alpha inline styles turn into invalid CSS. → Import now runs the whitelist + `sanitizeSetting` pipeline; invalid entries skipped and audited.
4. **Minor — Hex-alpha concat had no format guard.** Consent-banner tinted button + footer pills now validate `#RRGGBB` before appending alpha and fall back to untinted theme colors.
5. **Minor — ContextPanel focus fell to `<body>`** on pill-reveal, clear-date, and remove-location. → autofocus on reveal; focus returns to the replacing pill on clear/remove.
6. **Minor — Save chip dropped keyboard focus** (native `disabled` mid-save + unmount on success). → No native disable (handler guards double-submit); focus lands on the labeled editor `<section>` after the chip unmounts.

## Unverified (needs different input to check)

- Real screen-reader behavior (VoiceOver) of the wallet tab bar and keepMounted hidden panels — needs a manual SR pass.
- iOS Safari sheet exit animation + `env(safe-area-inset-bottom)` clearance on a physical device.
- `.pkpass` runtime signing (unchanged by these PRs; still flagged UNVERIFIED in memory).

## What's working well

- The wallet editor's live preview loop (palette tap → instant recolor → dirty chip → save → toast → persisted) is a genuinely tight feedback cycle — visibility of system status done right.
- AA is now enforced twice: the preset lock test (11 presets × 2 modes × 6 pairs) plus the new interactive contrast guard for user-chosen colors.
- The three bottom sheets share one accessible primitive instead of three divergent hand-rolls.

## Quick wins

- [x] Full-width strip drop zone on the Background tab (finding #2) — done in PR #48
- [ ] Banner theme sync on mode toggle (finding #1)
