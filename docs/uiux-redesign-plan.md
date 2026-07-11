
# LinkDen UI/UX Redesign Plan

## Executive summary

- **Overall state:** The dark "Midnight Studio" brand (cerulean `#00ACED` / cornflower `#6B8BF5` over Black Pearl `#091533`) is strong and worth elevating, but the surrounding system is half-built: the **light theme is functionally broken** (near-black text on a baked-in navy admin aurora; login/reset cards render light-on-white), several **theme tokens are undefined** (`--destructive-foreground`, `--color-destructive-foreground`), and the shared `packages/ui` primitives reference a `--ld-*` token layer that **doesn't exist in the admin mount context**.
- **Worst problem (tie, both severity 4, both light-mode):** `.admin-glass-bg` paints an unconditional navy gradient with the light text palette on top (`~1.1:1` on the greeting/top-bar), and the login card is theme-aware while all its text is hardcoded for dark (`~1.0:1` "Welcome back" on a white card). A user who clicks the always-visible "Light" toggle bricks the entire admin shell and can't log back in.
- **Mobile is task-blocking:** the 933-line `BlockEditPanel` is `hidden lg:flex`, so **editing or deleting any block is impossible on phone/tablet** (severity 4) — the core job of a link-in-bio admin.
- **Pervasive contrast + touch-target debt:** ~20 findings are AA contrast failures (hardcoded Tailwind `-400`/`-500` status colors, white-on-bright-primary link labels, sub-AA badges), and every form control is 12px (iOS auto-zoom) at <44px targets.
- **Counts by severity:** **5 × sev-4**, **32 × sev-3**, **47 × sev-2**, **11 × sev-1** (95 total). ~30% are duplicates of a handful of root causes (undefined destructive-foreground, light `--primary` too bright, 12px inputs, glass-card opacity, duplicate Connections/Forms inbox), so fixing the token layer in Phase A collapses a large share of the list.

---

## Phase A — Design system: tokens & primitives (the foundation)

All edits in `apps/web/src/index.css` unless noted. Every value below is chosen to clear the stated ratio; verify with a contrast checker after applying.

### A1. Fix light-mode `--primary` (unblocks Publish CTA, default badge, all primary links) — sev 2–3, contrast
Current `--primary: oklch(0.55 0.17 220)` (≈`#1f83b8`) gives white-on-primary **4.03:1** and primary-as-text **3.92:1** — both fail AA.
- **Set `:root --primary: oklch(0.47 0.16 233)`** (deep cerulean, on-brand). Targets: white-on-primary **≈5.4:1**, primary-as-text-on-`--background` **≈4.6:1**. Fixes findings: Publish buttons (`builder/page.tsx:311,375`), default badge, `link` button variant, GitHub/inline links (`data-section.tsx:73`), selected-accent labels.
- Keep `:root --ring: oklch(0.55 0.16 233)` for a visible focus ring one step lighter than the new primary.
- **Dark `--primary: #00ACED` unchanged** (already 6.96:1 as text / 7:1 with navy fg).
- Do **not** apply `/80` opacity to primary-colored reference text (`custom-css-section.tsx`).

### A2. Add the missing destructive-foreground token (unblocks badge + 2 delete-icon findings) — sev 3–4, contrast
`text-destructive-foreground` is referenced (`social-tab.tsx:306`) but defined nowhere; the destructive **badge** hardcodes `text-white` → **2.01:1** on dark salmon `#ff9aa8`.
- Add `:root { --destructive-foreground: oklch(0.985 0 0); }` (near-white; on light `--destructive` `#df2225` = **4.79:1** ✓).
- Add `.dark { --destructive-foreground: #091533; }` (navy on `#ff9aa8` = **8.95:1** ✓).
- Add to `@theme inline`: `--color-destructive-foreground: var(--destructive-foreground);`
- `badge.tsx:14`: `destructive: "border-transparent bg-destructive text-destructive-foreground"`.
- The delete-icon buttons (`social-tab.tsx:306`) then inherit the correct color automatically.

### A3. Darken light `--destructive` for tinted destructive buttons — sev 2, contrast
Tinted `destructive` button (`button.tsx:22`, `bg-destructive/10 text-destructive`) = **3.49–3.71:1** in light.
- **Set `:root --destructive: oklch(0.51 0.20 27)`** (≈`#c81e22`). Targets: as text on the `/10` tint **≈4.6:1**, white-on-solid **≈5.9:1**. Dark `--destructive: #ff9aa8` unchanged.

### A4. Add `--success` / `--warning` token pairs (kills ~4 hardcoded-color findings) — sev 3, contrast
Badges and status text hardcode `emerald-500`/`amber-500` (+white) → **2.0–2.5:1**; light-mode `text-amber-500`/`text-emerald-500` status = **2.0–2.4:1**.
- Add tokens:
  - `:root { --success: oklch(0.52 0.13 160); --success-foreground: oklch(0.985 0 0); --warning: oklch(0.55 0.13 70); --warning-foreground: oklch(0.985 0 0); }` (≈emerald-700 / amber-700; white-on = **5.0–5.5:1** ✓, as-text-on-white = **≥4.6:1** ✓).
  - `.dark { --success: #6be0a8; --success-foreground: #091533; --warning: #fbbf24; --warning-foreground: #091533; }` (reuses the existing dark chart palette; both clear AA on `#091533`).
- Map all four in `@theme inline` (`--color-success`, `--color-success-foreground`, `--color-warning`, `--color-warning-foreground`).
- `badge.tsx:12–13`: `success: "bg-success text-success-foreground"`, `warning: "bg-warning text-warning-foreground"`.
- Replace hardcoded status colors with `text-success` / `text-warning` at: `settings/page.tsx:552`, `appearance/page.tsx:304`, `wallet/page.tsx:99-100`, `signing-keys-section.tsx:49,193`, `builder/page.tsx:300` (draft badge), `builder-constants.ts:125-132` (TYPE_BADGE_BG — keep the `bg-{color}-500/10` tints but move text to `-700 dark:-400`), `block-row.tsx:91,120`, `stat-card.tsx:61` (use `text-warning`/`text-success`, dropping the `red-500`/`red-400` mismatch).

### A5. Fix glass-card + input + switch affordance (kills ~5 findings) — sev 2–3, non-text contrast (1.4.11)
Dark card is `rgba(255,255,255,0.03)` fill + `white/10` border → card edge **≈1.2:1**; light `--border` `oklch(0.85 0 0 / 30%)` → **1.08:1**; switch off-state **≈1.03–1.09:1**.
- `.dark { --card: rgba(255,255,255,0.05); --border: rgba(255,255,255,0.14); --muted: rgba(255,255,255,0.07); }` (card/border edges reach ~3:1 over the aurora).
- `:root { --border: oklch(0.80 0 0); }` (solid, ~3:1 on white; drop the 30% alpha).
- `card.tsx:15`: replace `border-white/15 dark:border-white/10` with **`border-border`** + add `shadow-[0_1px_3px_rgb(0_0_0/0.06)] dark:shadow-[0_2px_8px_rgb(0_0_0/0.4)]` for real elevation.
- **Switch off-state** (`switch.tsx:35,42`): off-track `bg-zinc-400 dark:bg-white/25` + opaque `border border-zinc-500/60`, thumb `bg-white ring-1 ring-black/10`. Target ≥3:1 thumb-vs-track and track-vs-surface in both themes.

### A6. Standardize focus rings across every interactive primitive — sev 2, consistency (2.4.11)
Rings vary 1px/1.5px/2px, `--ring` vs `--ld-primary`, and Badge has dead `focus:` styles.
- One canonical utility on all interactive controls: **`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`**.
- Apply to: `button.tsx:9` (raise from `ring-1 ring-ring/50`), `input.tsx:12`, and every custom `<button>` picker in `admin/settings/*` and `admin/appearance/*` (email-section, seo-section, theme-presets-section, banner-section, colors-section, social-icon-shape-section, template-preset-picker, branding-section) which currently have **no** focus-visible ring.
- **Delete** the `focus:outline-none focus:ring-2 …` from `badge.tsx:6` (non-interactive div).

### A7. Rewrite `packages/ui` primitives off the phantom `--ld-*` layer — sev 4, consistency
`dialog.tsx`, `tabs.tsx`, `avatar.tsx`, `separator.tsx`, `button.tsx`, `switch.tsx`, `checkbox.tsx` style themselves with `var(--ld-card/foreground/muted/border/primary)` — **undefined in the admin mount** (only projected onto the public page subtree). Result: transparent dialogs (`linkstack-import-wizard`, `social-tab`, `login`), tab active-state collapse, lost avatar circle.
- Rewrite these primitives to the **Tailwind semantic tokens** already exposed via `@theme inline`: `bg-card text-card-foreground`, `bg-muted text-muted-foreground`, `border-border`, `bg-primary text-primary-foreground`, `ring-ring ring-offset-background`. The tabs "pills" variant is the reference — it already uses semantic tokens.
- This also resolves the **two divergent Button implementations** (A8).

### A8. Consolidate Button + variant names — sev 2, consistency
`packages/ui/button.tsx` (`--ld-*` tokens, `danger`/`gradient` variants, `sm/md/lg`) vs `apps/web/ui/button.tsx` (Tailwind tokens, `destructive`/`link`, `default/xs/sm/lg/icon`).
- Standardize on the **`apps/web` Tailwind-token Button**; redirect `packages/ui` consumers to it or align its variant names (rename `danger`→`destructive`) and token source. Kill the mismatched default look.

### A9. `--dim` guard — sev 1
`--dim: #4e6287` = 2.93:1 on `#091533`. Keep for dividers/decoration only; if ever used for text, lighten to `#6b7ea6` (≥4.5:1).

---

## Phase B — Public link-in-bio page

**Contrast (do first):**
- [ ] **[sev 3, contrast]** `link-block.tsx:108` — replace hardcoded `style.color = "#ffffff"` with `getContrastColor(themeColors.primary)` (white-on-bright-primary is **1.37–2.58:1**). Extract the duplicated `getContrastColor` helper (currently copied in vcard/connect/avatar blocks) into a shared util and import in all four.
- [ ] **[sev 2, contrast]** `connect-block.tsx:106,133,205,469,515` — error text/asterisk `text-red-400` (**≈2.9:1** on white form) → `text-destructive` (theme-aware) and bump error text to ≥14px; error border `#f87171` → `border-destructive`.
- [ ] **[sev 2, consistency]** `consent-banner.tsx` — pass resolved `themeColors`/`colorMode` in and style with inline theme values instead of the hardcoded `.dark` tokens (`bg-background/95`, `text-muted-foreground`, `text-primary`); same fix for the full-page spinner `page.tsx:42`. A light-preset page currently gets a navy cookie bar.
- [ ] **[sev 1, contrast]** `page.tsx:150,123` — drop the `/50` opacity on the welcome "Already set up?" line (**2.4:1** → full `text-muted-foreground` ≈5.9:1); raise to ≥12px.

**Markup / a11y:**
- [ ] **[sev 3, valid-markup]** Fix nested `<li>` — `public-page-content.tsx:322-328` wraps each block in `<li>`, and every block component (`link/vcard/connect×2/header/embed/location`) **also** returns a root `<li>`. Pick one level: keep the single wrapper `<li>` in `public-page-content.tsx` and change the six block roots to `<a>`/`<div>`, moving `getAnimationProps(index).style` onto the surviving list item. This also repairs the broken `nth-child` stagger.
- [ ] **[sev 2, a11y]** `public-page-content.tsx:279-290` — remove `aria-hidden="true"` from the verified SVG (keep `role="img"` + `aria-label`), else it's never announced.
- [ ] **[sev 2, a11y]** `consent-banner.tsx:144-146,182-185` — non-modal banner should be `role="region" aria-label="Cookie consent"`, not `role="dialog"` (no focus trap/aria-modal present); ensure consent controls are early in tab order.

**Feature correctness:**
- [ ] **[sev 3, consistency]** Social-icon row renders in admin preview (`DUMMY_SOCIAL_NETWORKS`, `preview-renderer.tsx:280`) but **never on the live page**. Add active social networks to `public.getPage` (a PUBLIC procedure — `social.list` is protected), resolve each slug against the icon catalog for name/hex/svgPath, and thread through `public-page.tsx:183-204` into `PublicPageContent`'s `socialNetworks` prop.
- [ ] **[sev 3, error-visibility]** `connect-block.tsx` — on submit, show all field errors regardless of blur: lift `touched` to the parent (or add a `submitAttempted` prop so errors render on `touched || submitAttempted`) and move focus to the first invalid field in `handleSubmit`. Currently an untouched-empty form is a silent dead-end.

**Visual affordance:**
- [ ] **[sev 2, visual]** Hero card / link glass surfaces rely on 4–8% white fill + blur with nothing behind to blur (`public-page-content.tsx:220-224`, `link-block.tsx:120-128`) — derive fill/border/shadow from `themeColors.card/border` so cards read as tappable over a flat background.
- [ ] **[sev 2, mobile/recognition]** `location-block.tsx:49-59` — give the linked variant a persistent affordance (underline or chevron/button chrome) distinct from the static address, and pad the anchor to ≥44px.
- [ ] **[sev 2, state]** `connect-block.tsx:182-198` — the native `<select>` option popup is unreadable on dark presets; set explicit solid `background`/`color` on `<select>` and `<option>`, or swap to a themed Radix Select.
- [ ] **[sev 1]** `avatar.tsx:62,89` — set ring-offset from `themeColors.bg` inline, not `ring-offset-background` (dark sliver on light presets).
- [ ] **[sev 1]** `public-page.tsx:140-157` — offset the focused skip link so it doesn't overlap the Admin badge (both pinned `left-4/top-4 z-50`).
- [ ] **[sev 1, AAA]** Optional: darken light-mode `--muted-foreground` (`oklch(0.516)`) toward `oklch(0.44)` so 15px bio / footer copy clears **7:1** AAA (currently ~5.6:1 AA).

---

## Phase C — Admin shell + dashboard

- [ ] **[sev 4, contrast]** **Brand the light admin shell** (`index.css:138`). Scope the navy aurora to dark and add a light "day" aurora (keeps the cerulean/cornflower identity, per the mandate):
  ```css
  .admin-glass-bg {
    background:
      radial-gradient(1200px 600px at 10% -10%, #e4ecfb 0%, transparent 50%),
      radial-gradient(ellipse at 80% 20%, color-mix(in srgb, #6B8BF5 10%, transparent), transparent 55%),
      radial-gradient(ellipse at 20% 90%, color-mix(in srgb, #00ACED 8%, transparent), transparent 55%),
      linear-gradient(160deg, #f6f8fd 0%, #eef2fb 100%);
    background-attachment: fixed;
  }
  .dark .admin-glass-bg { /* existing navy gradient, moved verbatim */ }
  ```
  This alone fixes the `~1.1:1` greeting/top-bar/sidebar-nav failures once the light foreground sits on a light surface.
- [ ] **[sev 3, IA]** Duplicate contact inbox — see **X1** (cross-cutting). Point the dashboard "New Contacts" card (`page.tsx:238`) at `/admin/connections`.
- [ ] **[sev 3, mobile]** Callout banner crushes at 375px (`admin/page.tsx:280-311`) — make the row `flex-col items-start gap-3 sm:flex-row sm:items-center`, buttons `w-full sm:w-auto`, and add `min-w-0` to the `<p>`.
- [ ] **[sev 3, touch]** `period-selector.tsx:30` + header/callout `size="sm"` buttons are 24–28px — add `min-h-[44px]` on mobile (see Mobile plan).
- [ ] **[sev 2, state]** No error branch on any dashboard/analytics query (`page.tsx:90-97`, `analytics/page.tsx:34-39`) — a failed fetch reads as "No data". Add an `isError` branch (inline message + Retry calling `refetch`) to each card.
- [ ] **[sev 2, heuristic]** `page.tsx:299-309` "Share" copies silently — `await` the write and `toast.success("Link copied")` / `toast.error` on reject (Sonner is already mounted).
- [ ] **[sev 2, consistency]** Use the shared `StatCard` on the dashboard (`page.tsx:316-389`) instead of bespoke gradient cards; unify metric labels ("Views"/"Clicks") across Dashboard and Analytics; extend `StatCard` with an optional accent/gradient prop if the wash is wanted.
- [ ] **[sev 2, mobile]** Chart x-axis crowds at 90d/all (`page.tsx:451-456,543-548`, `views-clicks-chart.tsx:114`) — set `interval="preserveStartEnd"` / `minTickGap={24}`, tick fontSize 11–12.
- [ ] **[sev 2, state]** Skeleton bar heights use `Math.random()` in render (`page.tsx:416,521`, `views-clicks-chart.tsx:82`) — replace with a fixed array or `useMemo([])`.
- [ ] **[sev 2, IA]** Add Connections (with unread badge) to `BOTTOM_NAV_ITEMS` (`layout.tsx:59-64`) or surface a global unread dot on the hamburger — badge is invisible on mobile today.
- [ ] **[sev 1, mobile]** `analytics/page.tsx:70` — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` to match the dashboard (2-up cramps 2xl numbers at 375px).
- [ ] **[sev 1, consistency]** Fix chart color literals (`page.tsx:46-48,58-60`): Views `var(--primary)`, Clicks `var(--data-up, #6be0a8)`; correct the `#0FACED`→`#00ACED` fallback typo.
- [ ] **[sev 1, a11y]** Mobile nav dropdown (`layout.tsx:357-385`) — move focus in on open, restore to toggle on close, mark background inert, document-level Escape, add `aria-controls`.

---

## Phase D — Admin builder

- [ ] **[sev 4, mobile]** **Make block editing work on mobile.** `BlockEditPanel` is rendered once inside `hidden lg:flex` (`builder/page.tsx:507-534`). Drive it from the same `editingBlock` state but render responsively: keep the inline right column at `lg+`, and below `lg` render `<BlockEditPanel>` inside a full-screen Sheet/Dialog (reuse the `MobilePreviewSheet` bottom-sheet pattern), opened when `activeTab === "blocks" && editingBlock`, closing clears `editingBlock`/`editingOverrides`. The mobile Pencil (`block-row.tsx:127`) and tap-to-edit are already wired.
- [ ] **[sev 3, mobile]** `block-row.tsx:144` — delete button is `hidden sm:flex opacity-0 group-hover:opacity-100`: no delete on phone, hover-only on touch tablets. Show it always on coarse pointers / small breakpoints; expose edit+delete in the new mobile edit sheet above.
- [ ] **[sev 3, heuristic]** Block delete is immediate/irreversible (`block-row.tsx:138-148` → `page.tsx:186-194`). Add an Undo action to the "Block deleted" Sonner toast (`toast.success(..., { action: { label: "Undo", onClick } })`) — lowest-effort restore. (Note: repo has **no** AlertDialog primitive; only `packages/ui/dialog.tsx`.)
- [ ] **[sev 3, consistency]** Two identical preview FABs stack on mobile (`builder/page.tsx:553-561` z-40 + `mobile-preview-sheet.tsx:38-49` z-30). Remove the FAB from `MobilePreviewSheet` (make it a pure controlled overlay); the builder keeps its page-level FAB. (Appearance page already has a header "Preview" button, so it isn't broken.)
- [ ] **[sev 3, contrast]** Draft amber (`builder/page.tsx:300` badge, `block-row.tsx:91` dot) and block-type badges/eye icon (`builder-constants.ts:125-132`, `block-row.tsx:98-105,117-122`) are **1.5–2.3:1** in light — resolved by the A4 `--warning`/`--success` tokens + `text-{color}-700 dark:text-{color}-400` on the type badges (badge **text** needs `-700`, the eye **icon** only `-600`).
- [ ] **[sev 3, visual]** Hardcoded `border-white/8..15` make inputs/cards/dividers invisible in light mode across `block-edit-panel.tsx:28,212,33`, `block-row.tsx:50,58`, `collapsible-section.tsx:22-25`, `builder/page.tsx:475`, `mobile-preview-sheet.tsx:64` — replace with **`border-border`** (or `border-input` for fields). Base value must not be white-alpha.
- [ ] **[sev 3, IA]** Two social-editing UIs — see **X1**.
- [ ] **[sev 3, state]** Header status is block-only and leaks onto Profile/Social tabs (`page.tsx:293-304` via `page-header.tsx:37`) reading "All changes are live" while `profileDirty`/`socialDirty` are true. Make the PageHeader description/badge tab-aware (drive from `hasAnyChanges`, already computed at `page.tsx:109`) — see **X2** for the save-model unification.
- [ ] **[sev 3, state]** Blocks list has no error branch (`page.tsx:402-428`) — a failed `blocks.list` reads as "No blocks yet". Add an `isError` branch with Retry, mirroring `social/page.tsx:477-493`.
- [ ] **[sev 2, contrast]** Publish CTAs (`page.tsx:311,375`) fixed by A1 light-`--primary`. (The icon FAB and the two `bg-foreground` Save buttons already pass — don't touch.)
- [ ] **[sev 2, IA]** Delivery-mode control (`block-edit-panel.tsx:805-819`) writes the site-wide `contact_delivery` setting instantly from inside one block's panel — move it to the global Features settings (see Phase E), or clearly label it site-wide.
- [ ] **[sev 2, heuristic]** Advanced Config JSON (`block-edit-panel.tsx:177-183,910-921`) silently `catch → {}` on invalid input, resetting all structured fields — validate, show inline error, disable Save on parse failure.
- [ ] **[sev 2, consistency]** `NetworkRow` renders a bare `<li>` its callers wrap wrongly (`network-row.tsx:48`; `social-tab.tsx:292`, `social/page.tsx:521`), and `animationDelay` (`network-row.tsx:30`) is dead — have it render a neutral element (or accept `as`), let callers own the `<li>`, and wire or drop `animationDelay`.
- [ ] **[sev 1, heuristic]** Show delete at reduced-but-visible opacity by default (`block-row.tsx:138-148`), strengthen on hover/focus.
- [ ] **[sev 1, consistency]** Keep one Publish control (`page.tsx:305-331` header vs `363-380` banner), not both.

---

## Phase E — Admin forms (settings / appearance / wallet / account)

- [ ] **[sev 3, contrast]** Amber/emerald status colors across settings/appearance/wallet — resolved by A4 tokens (`settings/page.tsx:552`, `appearance/page.tsx:304`, `wallet/page.tsx:99-100`, `signing-keys-section.tsx:49,193`).
- [ ] **[sev 3, IA]** Rename the misnamed "Features" tab → **"Data"** / "Backup & Migration" (it only holds export/import/version/LinkStack import, `settings/page.tsx:575,704-732`). Create a real **Features** tab and mount `VCardSection`, `ContactFormSection`, `MapKitSection` (all orphaned dead code today — vCard/contact-form/MapKit have **no** reachable toggle despite backend support). **Delete** the duplicate `wallet-section.tsx` (wallet lives at `/admin/wallet`).
- [ ] **[sev 3, consistency]** Unify the save/dirty model — see **X2**.
- [ ] **[sev 2, state]** Validation errors are toast-only; `Input`'s `aria-invalid` styling is never used (`account/page.tsx:106-108,145-152`, `input.tsx:12`). Add inline field-anchored errors with `aria-invalid`/`aria-describedby`, validate on blur/submit, reserve toasts for server errors.
- [ ] **[sev 2, heuristic]** Danger-zone reset (`account/page.tsx:598-628,809-818`) — move the type-CONFIRM input above/into the dialog, use one consistent confirmation ceremony for both destructive actions, reset the confirm text on close.
- [ ] **[sev 2, state]** `color-field.tsx:25-38` — validate/normalize hex on blur (`#RGB`→`#RRGGBB`, add `#`, uppercase), inline error on invalid, feed only a valid 7-char value to the native swatch (fall back to placeholder default, not `#000000`).
- [ ] **[sev 2, heuristic]** Wallet builder is a functional dead-end ("`.pkpass` not yet wired up", `wallet/page.tsx:171-182`) — gate behind a clear "Preview only / coming soon" state and hide cert upload until issuance works; remove the duplicate orphaned wallet `SigningKeysSection`.
- [ ] **[sev 2, IA/state]** Custom colors apply in light preview only (`appearance/page.tsx:224-235`) — either add light+dark color inputs or clearly label the pickers as light-mode-only and reflect that in the preview.
- [ ] **[sev 2, visual]** Dark glass cards/status banners near-invisible — resolved by A5 (`--card`/`--border` bump); also give info/status banners a stronger tint than `white/[0.03]`.
- [ ] **[sev 2, consistency]** Consolidate the four section-heading treatments (SectionCard blue-icon `h2` / Card+CardTitle / uppercase `<p>` / tiny `<h3>`) onto **one** section-header component; use the `--primary` token, not hardcoded `blue-500`, for the icon accent.
- [ ] **[sev 2, consistency]** Selected-state accent: replace hardcoded `blue-500/blue-400` (`email-section.tsx:58-59`, `seo-section.tsx:102-146`) with the `--primary` token everywhere (Banner/branding/template-picker already use it); the `blue-400` label was **2.27:1** in light.
- [ ] **[sev 2, contrast]** Primary inline links/labels (`data-section.tsx:73`, `custom-css-section.tsx:182-226`) fixed by A1.
- [ ] **[sev 2, mobile]** Wallet color row `grid-cols-3` cramps at 375px (`wallet-builder-section.tsx:253-277`) — `grid-cols-1 sm:grid-cols-3` (or stack swatch under a full-width hex field).
- [ ] **[sev 2, state]** Custom picker/toggle buttons — add the standard focus-visible ring (A6) and either implement roving-tabindex + arrow keys for the `role=radiogroup`/`tablist` groups or drop the ARIA roles.

---

## Phase F — Auth, onboarding & inbox

- [ ] **[sev 4, contrast]** **Login card** (`login/page.tsx`) — the `.login-glass-card` is theme-aware but every text/input color is hardcoded for dark (`text-white` h1 **≈1.0:1**, `slate-400` **2.54:1**, `slate-100` input on `bg-white/[0.04]` **1.09:1** in light). Convert to tokens: `text-foreground` headings, `text-muted-foreground` body/labels, and **drop** the `bg-white/[0.04] text-slate-100 placeholder:text-slate-500 border-white/[0.08]` overrides so the token-based `Input` governs. Apply to **all** occurrences (:161-573), matching the already-correct setup page.
- [ ] **[sev 3, consistency]** **Reset-password** (`reset-password/page.tsx`) — rebuild on `.login-glass-card` (drop `bg-[#1a1f2e]`, the indigo `rgba(99,102,241,0.3)` boxShadow, `bg-[#0f1318]` inputs), replace the "LD" text monogram with `WolfLogo` + `branding.loginLogoUrl` fallback (add a `public.getSetupStatus` query), so it stops being the only off-brand, always-dark auth surface.
- [ ] **[sev 3, contrast]** Setup/login inline errors use hardcoded `red-400` on theme-aware surfaces (`setup/page.tsx:238,245-249`; `login/page.tsx:303,386`) = **2.47–2.74:1** in light — use `text-destructive` + a destructive tint like `reset-password/page.tsx:129`. For the tinted `FormError` box, drop the tint or use a darker destructive so it clears 4.5:1 on the composite.
- [ ] **[sev 3, contrast]** `slate-500` secondary text/links in dark login (`login/page.tsx:493,524,546-573`) = **3.5–3.8:1** — raise to `slate-400` (**6.56:1**) or `text-muted-foreground`/`text-primary`. (Leave the input leading icons — they pass 3:1.)
- [ ] **[sev 3, IA]** One inbox, three names — see **X1**.
- [ ] **[sev 3, mobile/touch]** 14px row checkboxes (`connection-list-item.tsx:61`, `contact-list-item.tsx:59`, `connections/page.tsx:215`) fail even the 24px AA floor; `size="xs"` filter/Mark-All buttons are 24px — give checkboxes a ≥44px padded hit area and the filter/action buttons `h-11` (or expanded hit area) on mobile.
- [ ] **[sev 2, heuristic]** Reply `<button>` nested in `<a>` (`connection-detail.tsx:231-236`, `contact-detail.tsx:230-235`) — render one control: style the `<a>` with `buttonVariants(...)` or use the Button's `asChild`/polymorphic render.
- [ ] **[sev 2, heuristic]** Reset link with missing token shows the full form, error only on submit (`reset-password/page.tsx:21-39`) — detect the missing token on mount and render a dedicated "invalid/expired link" state with a request-new-link action.
- [ ] **[sev 2, contrast]** Destructive Delete label **3.71:1** in light (`button.tsx:21-22`; `connection-detail.tsx:237`, `forms/page.tsx:251`) — fixed by A3, or use a solid destructive fill with `text-destructive-foreground` for the primary delete.
- [ ] **[sev 2, contrast]** Unread "New" badge (default variant, navy-on-cyan) **3.58:1** in dark (`connection-detail.tsx:108-113`) — fixed once the default badge foreground/contrast is addressed via A1/A2; or switch unread to `outline` + a `--primary` dot.
- [ ] **[sev 2, state]** Setup bio silently truncates a >160-char paste (`setup/page.tsx:487`), making the red counter/disabled-Continue guards dead code — either accept over-limit input and surface the existing guards, or show a "trimmed to 160 characters" notice.
- [ ] **[sev 2, heuristic]** Setup admin password has no confirm field or strength cue (`setup/page.tsx:374-396`) while the lower-stakes reset does — add a Confirm Password field + min-length hint, validate match before creating the one irreplaceable account.
- [ ] **[sev 2, visual]** Inbox microtext down to 9–10px (`contact-list-item.tsx:76,83`, `connection-list-item.tsx:78,87`) — set a 12px floor for body/meta, 10–11px only for true chips, bump the row name to `text-sm`.
- [ ] **[sev 2, consistency]** Unread color/label (blue+"New" vs amber+"Unread") — unified in **X1**.
- [ ] **[sev 1, heuristic]** Add `required` to the login password input (`login/page.tsx:431`) for parity with email, and `autoFocus` the first empty field on login/setup/reset.

---

## Mobile plan (375px is the target width)

1. **Global input font-size (kills iOS zoom on every form).** `input.tsx:12` — change `text-xs md:text-xs` → **`text-base md:text-sm`** (16px phones, 14px `md+`). This cascades to all auth, builder, settings, and connect fields. Also bump the setup bio textarea (`setup/page.tsx:490`) and connect-form controls (`connect-block.tsx:71-72,187`) to `text-base` on mobile — 14px still zooms.
2. **Tap targets ≥44px on touch.** Add `min-h-[44px]` (and `min-w-[44px]` for icon-only) on mobile to: `button.tsx` `sm`/`xs`/`icon-*` sizes (`min-h-[44px] md:min-h-0`), `period-selector.tsx:30`, dashboard/callout action buttons, consent-banner buttons (`consent-banner.tsx:162-176,271-300`), inbox filter/checkbox controls, builder row eye/pencil (`block-row.tsx:117-137`), the 20px social remove (`social-tab.tsx:303`), and the ~24px preview toggles. Switch (`switch.tsx`) needs a ≥24px hit area (pad the target even if the track stays 20px) to clear WCAG 2.5.8.
3. **Builder split-panel on phone/tablet.** Implement the responsive Sheet for `BlockEditPanel` (Phase D) — the single highest-impact mobile fix.
4. **Responsive rows.** Dashboard callout row → column-to-row (C); wallet color row → `grid-cols-1 sm:grid-cols-3` (E); analytics stat grid → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (C).
5. **Mobile navigation surfaces the unread badge** (C) and the block delete/edit affordances (D).

---

## Cross-cutting consistency fixes

- **X1 — Collapse the duplicate contact inbox (one route, one name, one component).** `/admin/connections` and `/admin/forms` render the **same `forms.list` data** with divergent titles ("Connections"/"Forms"), icons (Handshake/Mail), accent colors (blue/amber), and badge words ("New"/"Unread"); the dashboard card says "New Contacts" and deep-links the **orphan** `/admin/forms`. Canonicalize on **Connections**: port the Forms page's per-form-block filter pills into `connections/page.tsx`, redirect `/admin/forms → /admin/connections`, point the dashboard card (`admin/page.tsx:238`) at Connections, and unify accent (`--primary`), badge word ("Unread"), icon, and empty-state copy. (Resolves the Phase-C, -F, and 3 unread-consistency findings at once.)
- **X2 — One dirty-state / save model.** Settings, Appearance, Wallet, and the Account **profile** section each present unsaved state differently (amber badge + sticky pill / text subtitle + fixed bar / header-only / per-row), and split "Save" vs "Publish" verbs with no behavioral difference (all write `site_settings`). Adopt **one** dirty badge + **one** persistent Save/Discard bar (pick the Settings sticky-pill), standardize on **"Save changes"** everywhere, and make the builder header status tab-aware. Leave the Account page's genuinely per-row operations (email verify, password, 2FA, danger-zone) immediate.
- **X3 — Single social-editing UI.** Pick the builder `SocialTab` **or** the orphan `/admin/social` page (not both); fold the survivor's extras (URL-validation Dialog + per-row remove from the tab; category filter + combobox + grouping from the standalone) together and either delete the orphan or add it to `NAV_GROUPS`/`BOTTOM_NAV_ITEMS`.
- **X4 — One StatCard, one focus ring, one section header, one Button** (folded into A6/A8, C, E) — retire the bespoke variants.

---

## Quick wins (<1h each, highest impact first)

1. **Add `--destructive-foreground` + map it** (A2) and flip `badge.tsx:14` to `text-destructive-foreground` — fixes the 2.01:1 badge and both delete-icon findings. ~15 min.
2. **Scope `.admin-glass-bg` to `.dark` + add the light aurora** (C, A1-adjacent) — un-bricks the entire light admin shell. ~20 min.
3. **Convert login card colors to tokens** (F) — un-bricks login in light mode. ~30 min.
4. **Darken light `--primary` to `oklch(0.47 0.16 233)`** (A1) — clears Publish CTAs, default badge, and every primary link/label in one token change. ~10 min + spot-check.
5. **Global input `text-base md:text-sm`** (`input.tsx:12`) — stops iOS zoom across every form. ~5 min.
6. **Add success/warning tokens + swap hardcoded emerald/amber** (A4) — clears ~6 light-mode status-contrast findings. ~40 min.
7. **"Share" toast** (`admin/page.tsx:299-309`) — `toast.success("Link copied")`. ~5 min.
8. **Undo action on block-delete toast** (`block-row.tsx`/`page.tsx:186-194`) — restores user control with no dialog. ~15 min.
9. **Point dashboard "New Contacts" at `/admin/connections`** (`admin/page.tsx:238`) + redirect the orphan route. ~15 min.
10. **Remove `aria-hidden` from the verified badge** (`public-page-content.tsx:279`) and **fix the `#0FACED`→`#00ACED` chart typo**. ~10 min.

---

**Execution note:** Phase A must land first — A1 (light primary), A2 (destructive-foreground), A4 (success/warning), and A5 (card/border/switch) each resolve multiple downstream Phase B–F line items, so doing them token-first avoids re-touching dozens of component files. Files with the exact edits are named inline above; the two source-of-truth files are `apps/web/src/index.css` (tokens) and `apps/web/src/components/ui/{badge,button,input,switch,card}.tsx` (primitives).