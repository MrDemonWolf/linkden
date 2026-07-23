# UI/UX Review: LinkDen (pre-launch)

**Reviewed:** 2026-07-22 · **Input:** live app (localhost, fresh install walked end-to-end) + full source + computed contrast measurements · **Method:** NN/g heuristic evaluation + guideline review, 3-agent static audit with adversarial verification (58 confirmed findings), 11-preset WCAG contrast script

> Status column: items marked **fixed** were repaired on branch `claude/ui-review-live-launch-45a6c2` during this review. **Backlog** = post-launch.

## Executive summary

- Overall: the 2026-07-10 redesign holds up — semantic token system, AA-passing preset text pairs (measured), 44px targets, skip-link, solid empty states, working end-to-end flows (setup wizard → builder → public page → contact inbox all verified live).
- The single worst problem: **the public vCard "Save My Contact" button 404s** — both public links point to `/api/vcard`, a route that exists on no origin (verified 404 on web and API servers; the only working path is the tRPC query nothing links to).
- Second worst: **a fresh install could not create an account at all** under local/self-hosted deployment — the rate-limiter middleware crashes with undefined `RL_*` bindings, 500-ing signup (also affects any auth/upload route). Fixed during review.
- SEO/OG metadata was entirely dead in production (`generateMetadata` reads snake_case keys the API never returns) — every share/preview fell back to "LinkDen" defaults.
- Theme presets: measured all 11 × light/dark. Body-text pairs pass AA everywhere; the only text failure was `hacker-terminal` light primary (3.21:1 → fixed to 4.89:1). A vitest regression test now locks every preset to AA.

**Findings:** 🟥 2 catastrophic · 🟧 13 major · 🟨 12 minor · ⬜ 5 cosmetic

## Findings

### 🟥 Severity 4 — Catastrophic

#### 1. Public vCard download is a dead link — **fixed**
- **What:** `vcard-block.tsx:86` links `href="/api/vcard"` (relative → Next origin) and `footer-actions.tsx:38` links `${apiBase}/api/vcard` — but **no `/api/vcard` HTTP route exists in either app** (curl-verified 404 on both). Visitors clicking "Save My Contact" download a 404 page named `contact.vcf`.
- **Where:** public page vCard block + footer pill.
- **Guideline:** Broken links / linkrot; Error prevention (heuristic #5).
- **Evidence:** [Fighting Linkrot](https://www.nngroup.com/articles/fighting-linkrot/) — broken links that end in incomprehensible errors are among the most irritating failures on the web.
- **Fix:** ✅ added `GET /api/vcard` to the Hono server (reuses `generateVCardString` + `vcard_enabled` gate), pointed the block at the API origin.

#### 2. Fresh install cannot sign up — rate limiter crashes on missing bindings — **fixed**
- **What:** `@hono-rate-limiter/cloudflare` dereferences `.limit` on `c.env.RL_STRICT` which is `undefined` under local `wrangler dev`/self-host (miniflare doesn't simulate `rate_limits`) → `POST /api/auth/sign-up/email` 500s. Setup wizard shows only "Something went wrong — please try again". Reproduced on two independent dev servers.
- **Where:** `apps/server/src/index.ts` rate-limiter middlewares (auth, magic-link, password reset, upload, tracking).
- **Guideline:** Error prevention; error-message quality (see finding 12 for the message itself).
- **Evidence:** [Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/) — messages must precisely describe the problem; here the underlying failure also blocked the task outright.
- **Fix:** ✅ limiter now no-ops when the binding is absent (production Alchemy always provides bindings).

### 🟧 Severity 3 — Major

#### 3. SEO/OG metadata never leaves defaults — **fixed**
- **What:** `layout.tsx` `generateMetadata` reads `settings.seo_title`, `seo_og_mode`, `profile_name`… but `public.getPage` returns camelCase and omits `seoOgMode`/`seoOgTemplate`/profile fields → every read is `undefined`; title/description fall back to "LinkDen"; the OG-template branch is dead code. (Favicon works because it happens to read camelCase — proving the mismatch.)
- **Where:** `apps/web/src/app/layout.tsx:53-65` + `packages/api/src/routers/public.ts:80-130`.
- **Guideline:** Visibility of system status (admin sets SEO fields, sees them "saved", they never take effect).
- **Evidence:** [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/) — accurate state communication builds trust; a saved-but-inert setting misstates system state.
- **Fix:** ✅ payload extended + metadata reads aligned; OG template branch revived.

#### 4. Custom per-block colors have no contrast guard
- **What:** builder accepts any `customBgColor`/`customTextColor` pair; seeded white-on-yellow renders at ~1.26:1 in both modes (measured). Theme-level custom colors have the same gap.
- **Where:** `link-block.tsx` custom-color path; builder block edit panel.
- **Guideline:** Low-contrast text.
- **Evidence:** [Low-Contrast Text Is Not the Answer](https://www.nngroup.com/articles/low-contrast/); [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) — 4.5:1 minimum for normal text.
- **Fix:** **backlog (design decision)** — recommended: builder-side live contrast ratio readout + warning under the color pickers (don't silently override the user's explicit choice), plus `getReadableTextColor` fallback when only a bg is set.

#### 5. Admin theme tokens leak into the themed public page (error/destructive styling) — **fixed**
- **What:** contact-form errors use `text-destructive` etc. (admin dark-theme tokens) on the user-themed public page — unreadable/wrong-brand on light or custom themes.
- **Where:** `connect-block.tsx:108,135,221,251,514`.
- **Guideline:** Consistency; contrast.
- **Evidence:** [Low-Contrast Text Is Not the Answer](https://www.nngroup.com/articles/low-contrast/).
- **Fix:** ✅ mode-aware error colors.

#### 6. Wallet builder claims ".pkpass coming soon" but the feature shipped — **fixed**
- **What:** `WALLET_ISSUANCE_ENABLED = false` was never flipped when the signed-pass generator landed (`GET /api/wallet-pass` exists); page shows "Preview only" and hides the cert-upload flow.
- **Where:** `apps/web/src/app/admin/wallet/page.tsx:23`.
- **Guideline:** Visibility of system status.
- **Evidence:** [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) — heuristic 1: keep users informed of actual system state.
- **Fix:** ✅ flag flipped, stale copy removed, signing-keys section unhidden.

#### 7. Blocks silently don't render when their feature toggle is off — **fixed (badge)**
- **What:** a Connect block added in the builder never appears publicly while `contact_form_enabled` is off (verified live); the builder gives zero indication. vCard had the inverse bug: the block rendered even with the feature disabled (gate missing in the renderer).
- **Where:** builder rows; `public-page-content.tsx` vcard case.
- **Guideline:** Visibility of system status.
- **Evidence:** [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/) — actions must produce visible outcomes or users can't tell their action had no effect.
- **Fix:** ✅ "Hidden — enable in Settings" badge on affected rows.

#### 8. Global "Save changes" silently drops vCard toggle (split save models) — **fixed**
- **What:** vCard section persists via its own `vcard.updateConfig`; the page-level save bar saves everything else. Reproduced live: toggled vCard → global Save → toast "saved" → toggle silently lost.
- **Where:** `settings/vcard-section.tsx` + `settings/page.tsx`.
- **Guideline:** Consistency; error prevention (silent data loss).
- **Evidence:** [Preventing User Errors: Avoiding Unconscious Slips](https://www.nngroup.com/articles/slips/); [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) (heuristics 4, 5).
- **Fix:** ✅ vCard dirty state now feeds the global bar; global save triggers the section save.

#### 9. Unnamed switches and unlabeled controls across admin — **fixed**
- **What:** builder ToggleSwitch (11 instances), account 2FA/magic-link switches, 5 consent-section switches, multiple `<Label>`s without `htmlFor`, icon-only buttons without names (account ×3, vCard URL delete, wallet field delete).
- **Where:** `block-edit-panel.tsx`, `account/page.tsx`, `consent-section.tsx`, `vcard-section.tsx`, others (audit list).
- **Guideline:** Form label association; name/role/value.
- **Evidence:** [Website Forms Usability: Top 10 Recommendations](https://www.nngroup.com/articles/web-form-design/); [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html).
- **Fix:** ✅ aria-labels + htmlFor/id associations added.

#### 10. Hand-rolled 2FA modal: no dialog semantics, focus trap, or Escape — **fixed**
- **What:** unlike the app's own ConfirmDialog (which does all three), the 2FA enrollment overlay is a bare div.
- **Where:** `account/page.tsx:710`.
- **Guideline:** Modal dialog behavior.
- **Evidence:** [Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) — a modal must actually hold the interaction mode it creates.
- **Fix:** ✅ dialog semantics + trap + Escape, pattern copied from `confirm-dialog.tsx`.

#### 11. Custom CSS editor destroys itself every keystroke — **fixed**
- **What:** mount effect deps `[value]` recreate CodeMirror per keystroke, dropping focus — continuous typing impossible.
- **Where:** `custom-css-section.tsx:122`.
- **Guideline:** User control and freedom.
- **Evidence:** [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
- **Fix:** ✅ deps `[]` (external sync already handled by second effect).

#### 12. Generic error message on setup failure
- **What:** server 500 → "Something went wrong — please try again" (no cause, no recovery path). Message was accurate but useless during finding 2.
- **Where:** setup wizard step 1.
- **Guideline:** Error message quality.
- **Evidence:** [Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/) — say precisely what went wrong.
- **Fix:** **backlog** — surface server-provided message when present; add "if this keeps happening, check server logs" hint for self-hosters.

#### 13. Version drift: three surfaces say v0.1.0, release is 0.4.0 — **fixed**
- **What:** admin sidebar, login footer, docs homepage badge all hardcode stale versions; stale duplicate changelog page stops at 0.3.0.
- **Where:** `admin/layout.tsx:209`, `login/page.tsx:218`, `apps/docs` homepage, `docs/reference/changelog.mdx`.
- **Guideline:** Visibility of system status.
- **Evidence:** [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/).
- **Fix:** ✅ `NEXT_PUBLIC_APP_VERSION` wired from root `version.json`; stale duplicate changelog removed.

#### 14. Settings advertise features that do nothing (MapKit, email provider, contact delivery) — **fixed (honesty pass)**
- **What:** `mapkit_enabled`/`mapkit_token` are read by no consumer (location blocks are plain map links); `email_provider` is ignored (Resend hardcoded); `contact_delivery` written but never consumed.
- **Where:** `settings/mapkit-section.tsx`, email section, builder delivery control.
- **Guideline:** Visibility of system status / user trust.
- **Evidence:** [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/).
- **Fix:** ✅ dead delivery control removed; MapKit section carries an explicit "not yet functional" note; provider choice restricted to Resend. Full wiring = backlog features.

#### 15. Theme-level custom colors ignored in dark mode — **fixed**
- **What:** `getThemeColors` applied `customPrimary/Accent/Background` only when `colorMode === "light"`; `customSecondary` was fetched but never used, while the admin UI offers a secondary picker (public page never projected `--ld-secondary`).
- **Where:** `public-page.tsx:101`, `public-page-content.tsx:206-214`.
- **Guideline:** Consistency; visibility of system status (a saved setting with no effect).
- **Evidence:** [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/).
- **Fix:** ✅ overrides apply in both modes; `--ld-secondary` wired end-to-end.

### 🟨 Severity 2 — Minor

#### 16. `hacker-terminal` light primary text 3.21:1 — **fixed** (→ `#15803D`, 4.89:1 on bg / 5.02:1 on card; regression test added for all 11 presets × 2 modes × 6 pairs)
#### 17. Two different Switch implementations on the same settings page (headlessui zinc vs Base-UI themed) — **backlog**; [Maintain Consistency and Adhere to Standards](https://www.nngroup.com/articles/consistency-and-standards/)
#### 18. Setup wizard step 1 not a `<form>` (Enter doesn't submit); labels not programmatically associated; no autocomplete — **fixed** ([Web Form Usability](https://www.nngroup.com/articles/web-form-design/), [WCAG 1.3.5](https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose.html))
#### 19. Public contact form lacked autocomplete (given-name/family-name/email) — **fixed** (WCAG 1.3.5)
#### 20. Contact form success panel had no `role="status"`/aria-live and green hardcodes washed out on light themes — **fixed**
#### 21. Connections: checkbox nested inside row button (invalid interactive nesting); mobile detail sheet without dialog semantics/Escape; "Mark All Read" unnamed on mobile — **fixed**
#### 22. Focus-invisible controls: wallet per-row delete visible only on hover (no `focus-visible:opacity-100`) — **backlog** (WCAG 2.4.7)
#### 23. Mobile sheets (`mobile-preview-sheet`, builder bottom sheet) lack focus trap/restore — **backlog**
#### 24. Avatar ring `ring-white/30` invisible on light cards — **fixed** (mode-aware)
#### 25. Skip-link and wallet/vCard footer pills used admin tokens on themed page — **fixed**
#### 26. Dashboard first paint is a blank content area (no skeletons) — **backlog**
#### 27. Appearance phone preview shows fake generic links while builder preview shows real content — **backlog** (consistency)

### ⬜ Severity 1 — Cosmetic

#### 28. Two `h1` elements per admin page (topbar title + page header) — prefer one
#### 29. Dead components removed: `form-section.tsx`, `onboarding-tour.tsx`, `ui/dropdown-menu.tsx`, `ui/tooltip.tsx`, public `banner-section.tsx` — **fixed**
#### 30. `extractDomain` copy-pasted ×3; two near-duplicate TopLinksList; wallet preview reimplements luminance math differently from `color-contrast.ts` — **backlog**
#### 31. Theme-toggle buttons expose no pressed state (color-only) — **backlog**
#### 32. `--ld-action`/`--ld-radius` defined in all presets but never consumed — **fixed** (stripped from presets + docs)

## Unverified (needs different input)
- Signed `.pkpass` runtime validity on a real device (needs Apple certs; generator output is spec-shaped but unsigned-at-runtime here).
- Email flows (password reset, magic link) — no Resend API key in the dev environment.
- CAPTCHA behavior — provider not configured locally.
- True screen-reader output (audit is static ARIA analysis; NVDA/VoiceOver pass recommended before 1.0).

## What's working well
- Preset system's measured contrast discipline: all body-text pairs AA-pass across 11 themes × 2 modes (now locked by test).
- `getReadableTextColor` on primary-colored surfaces — highlighted links correctly flip black/white text per theme (verified live in both modes).
- Setup wizard UX: progress %, per-step validation, resume ("Progress saved — start over"), first-name greeting, password confirm + hint.
- Mobile: real bottom tab bar in admin, full-width 44px+ targets on public, no horizontal scroll at 375px.
- Empty states everywhere (dashboard zero-data, analytics, connections) with correct copy; unread badge + split-panel inbox works end-to-end.

## Quick wins
- [x] Flip `WALLET_ISSUANCE_ENABLED` (1 line)
- [x] `custom-css-section` effect deps `[]` (1 line)
- [x] Version string env wiring
- [x] vCard HTTP route + correct origin
- [ ] Contrast-ratio readout under builder color pickers (finding 4)
- [ ] Surface server error text in setup wizard failures (finding 12)
