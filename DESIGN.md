# LinkDen — Full Redesign Prompts (Google Stitch)

> Each code block below is **fully self-contained** — just copy-paste one block at a time into Google Stitch. No need to combine anything. Each includes the full design system + that screen's specs.

---

## Progress Tracker

- [ ] Screen 1: Public Link-in-Bio Page (desktop + mobile)
- [ ] Screen 2: Login Page (desktop + mobile)
- [ ] Screen 3: Setup Wizard (desktop + mobile)
- [ ] Screen 4: Dashboard (desktop + mobile)
- [ ] Screen 5: Builder (desktop + mobile)
- [ ] Screen 6: Analytics (desktop + mobile)
- [ ] Screen 7: Forms Inbox (desktop + mobile)
- [ ] Screen 8: Appearance Settings (desktop + mobile)
- [ ] Screen 9: Social Networks (desktop + mobile)
- [ ] Screen 10: Wallet Pass (desktop + mobile)
- [ ] Screen 11: Settings (desktop + mobile)
- [ ] Screen 12: Profile (desktop + mobile)

---

## Screen 1: Public Link-in-Bio Page

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur on admin cards
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES (STRICT):
- ALLOWED on: Public link-in-bio page, phone preview frames, wallet pass preview
- BANNED on: Admin sidebar, admin cards, admin modals, admin forms, settings panels
- When used: backdrop-blur-xl, bg-white/10 (dark) or bg-white/60 (light), subtle white inner border

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: PUBLIC LINK-IN-BIO PAGE
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

This is the visitor-facing page. Glass effects ARE allowed here.

DESKTOP (centered content, max-width 480px on gradient/shader background):
- Background: User-chosen color/gradient OR animated shader banner
- Avatar: 96px circle, centered, subtle white ring, drop shadow
- Display name: 22px bold, centered below avatar
- Bio: 14px, secondary color, centered, max 2 lines
- Social icons row: Horizontal row of circular icon buttons (36px each), subtle glass background pill behind the row
- Link blocks: Full-width rounded cards, 48px tall, centered text, glass background (bg-white/10 backdrop-blur-xl), hover: slight scale + glow
- Spacing: 12px between link blocks, 24px between sections

MOBILE (full viewport width):
- Same layout, avatar scales to 80px
- Link blocks have 16px horizontal margin
- Social icons wrap to second line if more than 6
- Full-bleed background

Show example content: avatar, "Alex Chen" name, short bio, 5 social icons (Twitter, GitHub, LinkedIn, Instagram, YouTube), 4 link blocks (Portfolio, Blog, Newsletter, Contact).
```

---

## Screen 2: Login Page

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. Solid card only.

SPACING:
- Card padding: 24px internal

ANIMATIONS:
- Card entrance: Fade-in + slight scale (95%→100% over 200ms)

---

SCREEN: LOGIN PAGE
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP:
- Layout: Centered card (400px wide) on the subtle gradient background
- Card: Solid background (NOT glass), 12px border-radius, subtle shadow
- Content top-to-bottom:
  - LinkDen logo + "Welcome back" heading (20px semibold)
  - Email input field (full-width)
  - Password input field with show/hide eye toggle
  - "Forgot password?" link (right-aligned, small, muted text)
  - "Sign in" button (full-width, indigo solid, 8px radius)
- Below card: "Don't have an account? Set up LinkDen" link (muted, centered)

MOBILE:
- Card goes full-width with 16px side margins
- Same content stacked vertically
- "Sign in" button remains full-width

Clean, minimal, no distractions.
```

---

## Screen 3: Setup Wizard

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. Solid card only.

SPACING:
- Card padding: 24px internal
- Section gaps: 24px between field groups

ANIMATIONS:
- Step transition: Slide left/right + fade (200ms)
- Card entrance: Fade-in + slight scale

---

SCREEN: SETUP WIZARD (4-step onboarding)
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

No sidebar shown. Centered card layout.

DESKTOP (centered card, 520px wide):
- Stepper at top: 4 circles connected by lines
  - Active step = indigo filled circle
  - Completed = checkmark in circle
  - Upcoming = muted outline circle
- Step 1 — Account: Email, password, confirm password fields
- Step 2 — Profile: Display name input, bio textarea, avatar upload (drag-drop zone with dashed border)
- Step 3 — First Links: Add 1-3 links with URL + title fields, "Add another" ghost button
- Step 4 — Appearance: Grid of 6 theme preset thumbnails (small cards showing color combos), light/dark toggle
- Bottom navigation: "Back" ghost button (left) + "Continue" solid indigo button (right). Final step shows "Launch your page"

MOBILE:
- Full-width card, 16px padding
- Stepper becomes "Step 2 of 4" text with progress bar below
- All fields stack vertically
- Navigation buttons stack: Continue full-width on top, Back below

Show Step 2 (Profile) as the active step in the mockup. Card has solid background, no glass.
```

---

## Screen 4: Dashboard

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
  - Collapses to icon-only (48px) below 1024px
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: DASHBOARD
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

Admin home screen with sidebar navigation visible.

DESKTOP (sidebar + content area):
- Welcome header: "Welcome back, Alex" (20px semibold) with today's date below (14px muted)
- Stats row: 4 StatCards in a 4-column grid
  - Total Views — eye icon, indigo accent, "12,847"
  - Link Clicks — cursor-click icon, emerald accent, "3,291"
  - CTR — percent icon, amber accent, "25.6%"
  - Form Submissions — mail icon, rose accent, "48"
  - Each card: Solid background, icon top-left with colored bg circle, large number (28px bold), label below (12px muted), subtle trend arrow
- Quick actions row: 3 shortcut cards in a row — "Add a Link" (plus icon), "Customize Appearance" (palette icon), "View Analytics" (chart icon) — with icon + label, hover lift effect
- Recent activity card: List of last 5 events with timestamp + description (e.g., "Link clicked: Portfolio — 2 min ago")

MOBILE:
- Stats: 2×2 grid
- Quick actions: Horizontal scroll row (snap scrolling)
- Recent activity: Full-width card below
- Bottom navigation visible

All cards are solid backgrounds, no glass effects.
```

---

## Screen 5: Builder

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES (STRICT):
- Glass ALLOWED on: Phone preview frame and the public page content inside it
- Glass BANNED on: Admin sidebar, block list panel, edit forms, all admin cards
- When used: backdrop-blur-xl, bg-white/10 (dark) or bg-white/60 (light), subtle white inner border

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%
- Drag-and-drop: Ghost preview follows cursor, indigo dashed drop target

---

SCREEN: BUILDER (Link/Block Editor)
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

Phone preview frame uses glass effects. Admin panels do NOT.

DESKTOP — Split layout:
Left panel (60% width) — Block list:
  - "Add Block" button at top (indigo, full-width of panel)
  - Block list: Draggable rows, each showing: drag handle (grip dots) → block type icon → title text → enabled/disabled toggle → edit pencil button → delete trash button
  - Block types available: Link, Header, Text, Embed, Contact Form, vCard
  - One block shown expanded/editing: inline form with URL input, title input, icon picker
  - Show 5-6 example blocks in the list
  - Solid card backgrounds on all list items

Right panel (40% width, sticky):
  - iPhone-style phone frame (rounded rect bezel, dynamic island notch at top)
  - Inside the frame: Live preview of the public page WITH glass effects (bg-white/10 backdrop-blur-xl on link cards)
  - Frame border itself: Subtle glass effect (backdrop-blur-md bg-white/5 border border-white/10)
  - Preview is scrollable within the frame

MOBILE:
- Full-width block list only, no phone preview visible
- Floating circular "Preview" button (bottom-right, above bottom nav, indigo bg)
- When tapped: Full bottom sheet (90vh) showing the phone preview, drag handle to dismiss
- Bottom navigation visible

Show the builder with real content: a header block, 3 link blocks, a social block.
```

---

## Screen 6: Analytics

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: ANALYTICS
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP (sidebar + content):
- Period selector: Pill toggle row top-right — "24h | 7d | 30d | 90d | All time" — active pill has indigo bg
- Stats row: 4 StatCards (same style as below): Views "8,432", Clicks "2,156", CTR "25.6%", Submissions "32"
  - Each card: Solid background, icon top-left with colored bg circle, large number (28px bold), label below (12px muted)
- Charts section: 2-column grid
  - Views over time: Line/area chart with indigo line, gradient fill under the line, x-axis = dates, y-axis = count
  - Clicks over time: Bar chart with emerald bars
- Top links table card: Table with columns — Rank (#), Link Title, Clicks, CTR — show 5 rows of sample data, sortable column headers, "View all" link at bottom
- Referrers card: Horizontal bar chart showing top 5 referrer domains (google.com, twitter.com, linkedin.com, direct, github.com)

MOBILE:
- Period selector: Horizontal scroll pills
- Stats: 2×2 grid
- Charts: Stack vertically, full-width
- Table: Card-per-row layout (each link as its own mini card with stats)

All admin elements use solid backgrounds. "30d" period selected as active state.
```

---

## Screen 7: Forms Inbox

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: FORMS INBOX
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP (sidebar + content):
- Two-panel layout within content area
- Left panel (40%): List of form submissions
  - Each row: Sender name (bold, 14px) + message preview (truncated, muted) + timestamp right-aligned (12px muted)
  - Unread rows: Slightly brighter background tint + bold name
  - Selected row: Indigo 2px left border accent
  - Show 6-8 example submissions
- Right panel (60%): Full message detail
  - Header: Sender name (18px), email (14px muted), timestamp
  - Separator line
  - Message body (14px, normal line height)
  - Action buttons row at bottom: "Reply" (indigo outline, opens mailto), "Delete" (rose ghost), "Mark as unread" (ghost)
- Empty state alternative: Mail illustration + "No messages yet" + "Enable contact form in Settings" link

MOBILE:
- Single panel: List view fills the screen
- Tapping a row → full screen detail view with back arrow in top bar
- Swipe hints: left to delete (rose bg peek), right to mark read (emerald bg peek)
- Bottom navigation visible

Show the 3rd message selected with a real-looking message about a collaboration inquiry. All solid backgrounds.
```

---

## Screen 8: Appearance Settings

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: APPEARANCE SETTINGS
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP (sidebar + content):
- Vertical stack of collapsible section cards:

1. Profile section card:
   - Avatar upload: Drag-drop zone (dashed border) with circular preview of current avatar, "Change" and "Remove" buttons
   - Display name input (full-width)
   - Bio textarea with character count (e.g., "124/300") bottom-right

2. Banner section card:
   - Toggle switch: "Image" vs "Shader"
   - If image: Banner image upload zone (wide rectangle, dashed border)
   - If shader: Animated preview strip showing shader effect + shader selector dropdown

3. Colors section card:
   - 2-column grid of color pickers: Background, Card BG, Text, Accent, Social Icon
   - Each picker: Hex text input (left, monospace) + native color swatch square (right, 32px)

4. Theme presets card:
   - Grid of 6-8 preset thumbnails (small rounded rectangles showing the color scheme preview)
   - Active preset has indigo ring/border
   - Click to apply

5. Custom CSS card:
   - Code editor textarea (monospace font, dark inner background even in light mode)
   - "Apply" button (indigo, right-aligned)

MOBILE:
- All sections stack vertically as full-width cards
- Color pickers: Single column
- Theme presets: 2-column grid of thumbnails
- Each section card is collapsed by default with chevron to expand

Solid card backgrounds throughout. Show the Colors section expanded with some custom colors filled in.
```

---

## Screen 9: Social Networks

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%
- Drag-and-drop: Ghost preview follows cursor, indigo dashed drop target

---

SCREEN: SOCIAL NETWORKS
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP (sidebar + content):
- Single card containing the network list
- Page header: "Social Networks" title + "Drag to reorder" helper text (muted)
- Each row: Drag grip handle → Platform icon (in brand color: Twitter blue, GitHub dark, Instagram gradient, etc.) → Platform name (14px) → URL input field (flex-grow) → Show/hide toggle switch → Delete icon button (muted, hover rose)
- Show 6 example networks: Twitter/X, GitHub, Instagram, LinkedIn, YouTube, Discord
- "Add Network" button at bottom of list (indigo outline, plus icon)
  - When clicked: Dropdown/popover showing a grid of available platform icons (Twitter/X, GitHub, Instagram, LinkedIn, YouTube, TikTok, Discord, Mastodon, Bluesky, Email, Phone, WhatsApp, Telegram, Twitch, Spotify, etc.)
- Save button: Sticky at card bottom, appears when changes are made (indigo solid, full-width of card)

MOBILE:
- Full-width card
- Each row stacks: Icon + platform name on first line, URL input full-width on second line, toggle right-aligned on first line
- "Add Network" → Full bottom sheet with icon grid (4 columns)
- Save button fixed at bottom of screen above bottom nav

All solid backgrounds, no glass.
```

---

## Screen 10: Wallet Pass

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES (STRICT):
- Glass ALLOWED on: Phone preview frame and the wallet pass card inside it
- Glass BANNED on: Admin sidebar, form panels, config cards
- When used: backdrop-blur-xl, bg-white/10 (dark) or bg-white/60 (light), subtle white inner border

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: WALLET PASS
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

Phone preview uses glass effects. Form panels do NOT.

DESKTOP — Split layout:
Left panel (60%) — Configuration form:
  - Header fields card: Label input + Value input (e.g., "Event" / "LinkDen")
  - Primary fields card: Label input + Value input (e.g., "Name" / "Alex Chen")
  - Secondary fields card: Up to 4 field pairs (label + value), "Add field" button. Show 2 filled
  - Colors card: 3 color pickers in a row — Background color, Foreground color, Label color — hex input + swatch each
  - Logo upload: ImageUploadField (square aspect ratio, ~80px preview)
  - QR section: Auto-generated QR code preview (small, centered in a card)
  - Action buttons: "Save" (indigo) + "Download .pkpass" (outline) side by side

Right panel (40%, sticky):
  - iPhone phone frame (rounded rect bezel, dynamic island notch at top)
  - Inside: Apple Wallet-style pass card with glass effect
    - Pass layout: Header row (small label + value) → Primary field (large bold text) + thumbnail/logo → Secondary fields row (small labels + values) → QR code centered at bottom
  - Pass card uses glass styling within the preview frame
  - Show with a dark purple pass background color as example

MOBILE:
- Full-width form only, no preview
- Floating "Preview" button (indigo circle, bottom-right)
- Bottom sheet for preview when tapped
- "Download .pkpass" button prominent and full-width at bottom of form

Show realistic pass content filled in.
```

---

## Screen 11: Settings

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Section gaps: 24px between card groups
- Max content width: 1200px centered

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Staggered slide-up + fade (50ms delay between cards)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: SETTINGS
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP (sidebar + content):
Vertical stack of section cards:

1. SEO card:
   - Page title input (full-width)
   - Meta description textarea (3 rows)
   - OG image upload (ImageUploadField — drag zone with landscape preview)
   - Favicon upload (small square drag zone, 32px preview)

2. Contact Form card:
   - Enable/disable toggle (top-right of card header)
   - Notification email input
   - CAPTCHA provider: Select dropdown (None, Cloudflare Turnstile, hCaptcha)
   - Conditional fields: Site key input + Secret key input (shown when provider selected)

3. Email (SMTP) card:
   - 2-column grid: Host input, Port input, Username input, Password input (masked)
   - Full-width row: From name input, From email input
   - "Send test email" button (outline, right-aligned)

4. vCard card:
   - Enable/disable toggle (top-right)
   - Fields: Full name, Email, Phone, Organization, Title, Website — all in 2-column grid
   - "Download preview" button (outline)

5. Data Management card:
   - "Export data" button (outline, download icon) + description text
   - "Import data" drag-drop file zone
   - Danger zone (separated by red-tinted border):
     - "Delete all data" button (rose/red solid) with warning text
     - Requires confirmation dialog

MOBILE:
- All cards stack full-width
- 2-column grids become single column
- Danger zone card has red left border for visual warning
- Each card collapsible with chevron

Solid backgrounds everywhere. Show the Email card expanded with example SMTP settings filled in.
```

---

## Screen 12: Profile

```
DESIGN SYSTEM — LinkDen (self-hosted link-in-bio app)

BRAND:
- App name: LinkDen
- Personality: Clean, modern, professional — not playful, not corporate
- Typography: Inter (or system sans-serif). Tight letter-spacing on headings, relaxed on body
- Border radius: 12px on cards, 8px on inputs/buttons, full-round on avatars and pills
- Icons: Lucide icon set, 20px default, 1.5px stroke weight

DARK MODE (primary):
- Admin background: Subtle linear gradient — dark navy (#0a0e1a) top-left → slightly lighter navy (#111827) bottom-right. Clean diagonal gradient
- Cards/panels: Solid #1a1f2e with 1px rgba(255,255,255,0.06) border. NO backdrop-blur
- Sidebar: Solid #0f1320 with right border rgba(255,255,255,0.06)
- Text: Primary #f1f5f9, secondary #94a3b8, muted #64748b
- Accent: Indigo-500 (#6366f1) primary, emerald-500 success, amber-500 warning, rose-500 destructive

LIGHT MODE:
- Admin background: Subtle gradient — #f8fafc → #f1f5f9
- Cards/panels: Solid white with 1px #e2e8f0 border
- Sidebar: Solid #ffffff with right border #e2e8f0
- Text: Primary #0f172a, secondary #475569, muted #94a3b8

GLASS/BLUR RULES: Glass effects BANNED on this screen. All solid backgrounds.

SPACING:
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px internal
- Max content width: 600px centered within content area

DESKTOP ADMIN LAYOUT:
- Sidebar: Fixed left, 260px wide, solid #0f1320
  - Logo: "LinkDen" wordmark + icon, 16px font, medium weight
  - Nav items: 14px font, 36px row height, 8px padding, 8px border-radius. NORMAL SIZE — not oversized
  - Nav groups: Main (Dashboard, Builder, Appearance) | Engage (Analytics, Social Networks, Forms) | Extras (Wallet Pass) | Bottom pinned (Settings, Profile with avatar)
  - Active: Indigo-500/10 bg, indigo-500 2px left border, white text
  - Hover: rgba(255,255,255,0.04) bg
- Top bar: Sticky, 56px, page title left, theme toggle + "View Public Page" button right
- Content: Scrollable, max-width 1200px, centered

MOBILE ADMIN LAYOUT:
- Bottom nav: Fixed, 56px, 5 items (Dashboard, Builder, Appearance, Analytics, More)
  - Icons 20px, label 10px below, active = indigo color
- Top bar: 48px, back arrow left, title center, theme toggle right
- Content: Full-width cards, 16px padding, 16px gap

ANIMATIONS:
- Card entrance: Fade-in + slight scale (95%→100% over 200ms)
- Hover: Cards lift 2px + shadow. Buttons darken 10%

---

SCREEN: PROFILE
Generate high-fidelity mockups — desktop (1440×900) and mobile (390×844). Use dark mode as primary.

DESKTOP (sidebar + content):
- Single centered card (max-width 600px, centered in content area)
- Avatar section: Large avatar (80px circle) with hover overlay showing camera/change icon
- Fields below avatar:
  - Display name input (full-width)
  - Email input (full-width) with small "Verified" emerald badge next to label if verified
  - Separator line
  - "Change password" collapsible section (click to expand):
    - Current password input
    - New password input
    - Confirm new password input
  - Separator line
- Action buttons:
  - "Save changes" (indigo solid, right-aligned)
  - "Sign out" (ghost/outline button, muted color, left-aligned or below save with spacing)

MOBILE:
- Full-width card, 16px padding
- Avatar centered at top of card (80px)
- All fields single column, full-width
- "Save changes" full-width button
- "Sign out" full-width button below with extra 24px top margin (muted style)
- Bottom navigation visible

Show the profile filled out with "Alex Chen" name, verified email. Password section collapsed. Solid card background.
```

---

## Glass vs Solid Quick Reference

| Area | Glass/Blur? | Background Style |
|------|------------|-----------------|
| Public page | YES | User gradient/shader |
| Phone previews (Builder, Wallet) | YES | Glass frame border |
| Wallet pass card in preview | YES | Glass card |
| Admin sidebar | NO | Solid #0f1320 |
| Admin cards & content | NO | Solid + subtle gradient bg |
| Admin modals | NO | Solid + backdrop dim only |
| Login / Setup wizard | NO | Solid card + gradient bg |
