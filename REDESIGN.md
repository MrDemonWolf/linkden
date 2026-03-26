# REDESIGN.md — LinkDen Admin Panel Stitch Prompts

> Each section contains one ready-to-copy Google Stitch prompt. Paste the prompt into Stitch, then replace the block below it with the generated output.
>
> **Design constraints that must never change:**
> - Glassmorphism: frosted glass cards with `backdrop-blur`, semi-transparent backgrounds
> - Dark mode first (deep navy-black base, not pure black)
> - Electric blue primary accent
> - Inter font for UI, monospace font for numeric values
> - Tailwind CSS v4 class names in all output
> - Radix UI primitives (no custom modal/dropdown HTML)

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Global Layout](#2-global-layout)
3. [Components](#3-components)
4. [Pages](#4-pages)
5. [Implementation Checklist](#5-implementation-checklist)

---

## 1. Design Tokens

### 1.1 Full Token Set

**Stitch prompt — copy this:**
```text
Design a complete dark-mode CSS variable token set for a link-in-bio admin panel called LinkDen.

Requirements that must stay:
- Glassmorphism design language (semi-transparent card surfaces with backdrop-blur)
- Deep navy-black background (not pure #000000 — use a dark blue-tinted black)
- Electric blue primary accent color
- oklch color format for all values
- Must include: --background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --accent, --accent-foreground, --destructive, --border, --input, --ring, --card, --card-foreground, --sidebar, --sidebar-foreground, --sidebar-border, --radius

Output as CSS :root and .dark blocks with Tailwind CSS v4 @theme inline syntax.
```

**Paste Stitch output here:**
```css
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 1.2 Typography Scale

**Stitch prompt — copy this:**
```text
Define a typography scale for a dark glassmorphic admin panel (LinkDen).

Requirements that must stay:
- Inter Variable as the primary UI font
- A monospace font (DM Mono or similar) used only for numeric/stat values
- Tailwind CSS v4 class names
- Roles needed: page title, section title, group label (uppercase tracking-widest), body, caption, stat value (large monospace), metric number (small monospace)

Output as a Tailwind CSS v4 @theme block defining font-family tokens, and a reference table mapping each role to its exact Tailwind classes.
```

**Paste Stitch output here:**
```css
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

## 2. Global Layout

### 2.1 Sidebar

**Stitch prompt — copy this:**
```text
Design a dark glassmorphic admin sidebar for LinkDen (a link-in-bio tool).

Requirements that must stay:
- Width: 256px (w-64)
- Glassmorphism: frosted glass panel, semi-transparent background, subtle border-right
- Deep navy-black background tint
- Electric blue active state with a 2px left accent stripe on the active nav item
- Nav groups with uppercase tracking-widest group labels
- Nav items: icon + label, 40px height, rounded-lg, hover: subtle white/5 overlay
- Notification badge on "Forms" nav item — use amber/warning color (NOT red)
- Bottom section: two ghost buttons side by side for "Docs" and "View Live Page"
- Theme toggle (Light / Dark / System) as a segmented control
- User avatar row at the very bottom with dropdown chevron, 44px min height
- Inter font, Tailwind CSS v4 classes

Output as a complete React TSX component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 2.2 Mobile Header

**Stitch prompt — copy this:**
```text
Design a dark glassmorphic mobile top header bar for LinkDen admin panel.

Requirements that must stay:
- Fixed top, full width, height 48px (h-12)
- Glassmorphism: backdrop-blur background, subtle bottom border
- Left: small logo mark + "LinkDen" text
- Center: current page name in small muted text (absolutely positioned so it stays centered regardless of button widths)
- Right: hamburger / X toggle button
- Inter font, Tailwind CSS v4 classes
- Must work at 375px viewport width

Output as a React TSX component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 2.3 Mobile Dropdown Nav

**Stitch prompt — copy this:**
```text
Design a dark glassmorphic mobile navigation dropdown for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass overlay panel below the header bar
- Single-column list (NOT a grid) with nav group section labels
- Group labels: uppercase, tracking-widest, 10px, muted color
- Nav items: icon + label, minimum 44px touch target height, rounded-lg
- Active state: electric blue text + bg-primary/10
- Amber notification badge on the "Forms" item (not red)
- Bottom: divider then a sign-out row
- Inter font, Tailwind CSS v4 classes

Output as a React TSX component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 2.4 Mobile Bottom Nav

**Stitch prompt — copy this:**
```text
Design a dark glassmorphic mobile bottom tab bar for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass bar, fixed bottom, backdrop-blur
- 4 tabs: Dashboard, Builder, Analytics, Forms
- Icons: h-5 w-5 (not smaller)
- Minimum tab height: 48px
- Active tab: electric blue icon + label
- Inactive tab: muted gray icon + label, no border decorations
- No visible borders between individual tabs
- Inter font, Tailwind CSS v4 classes

Output as a React TSX component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

## 3. Components

### 3.1 StatCard

**Stitch prompt — copy this:**
```text
Design a dark glassmorphic stat card component for LinkDen admin dashboard.

Requirements that must stay:
- Glassmorphism: frosted glass card, backdrop-blur, semi-transparent background
- Layout: icon in a colored rounded square (top-left) + label below + large value below that
- Value text: large (text-2xl or text-3xl), monospace font, tabular-nums
- Icon background uses semantic colors: primary/10, emerald/10, amber/10 depending on stat type
- Optional trend badge (up/down arrow + percentage)
- Card hover: very subtle border brightening, transition-colors
- Inter font for label, monospace for value, Tailwind CSS v4 classes

Output as a React TSX component accepting props: icon, label, value, color, trend (optional).
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 3.2 PageHeader

**Stitch prompt — copy this:**
```text
Design a page header component for LinkDen admin panel.

Requirements that must stay:
- Layout: left side has title (+ optional badge pill beside it), description text below
- Right side: optional action slot for buttons
- Title: text-base md:text-lg, font-semibold, tracking-tight
- Description: text-sm, muted foreground
- Badge: small pill, rounded-full, uses semantic colors
- No background — sits above page content, not a card
- Inter font, Tailwind CSS v4 classes

Output as a React TSX component accepting props: title, description, badge (optional), actions (optional slot).
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 3.3 Button Variants

**Stitch prompt — copy this:**
```text
Design a complete button component system for LinkDen admin panel using CVA (class-variance-authority).

Requirements that must stay:
- Glassmorphism aesthetic: default variant uses electric blue, ghost variant is transparent with hover overlay
- Variants needed: default, secondary, destructive, outline, ghost, link
- Sizes needed: sm, default, lg, icon
- All variants must have visible focus rings for accessibility
- Transitions on hover/active states
- Inter font, Tailwind CSS v4 classes
- Uses CVA for variant definitions

Output as a complete React TSX button component with CVA variants and all class definitions filled in.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 3.4 Card

**Stitch prompt — copy this:**
```text
Design a glassmorphic card component for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass surface, backdrop-blur, semi-transparent background, subtle border
- No padding on the Card wrapper itself — padding lives on CardContent (p-4 md:p-5)
- Card hover: border brightens slightly, transition-colors duration-150
- Sub-components: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Deep navy tinted background
- Inter font, Tailwind CSS v4 classes

Output as React TSX sub-components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter) with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 3.5 Nav Item (Active / Inactive)

**Stitch prompt — copy this:**
```text
Design nav item states for a dark glassmorphic sidebar in LinkDen admin panel.

Requirements that must stay:
- Active state: bg-primary/10, electric blue text, 2px left border accent stripe (border-primary), rounded-lg
- Inactive state: transparent background, muted foreground text, hover bg-white/5
- Layout: icon (h-4 w-4) + label text, gap-3, px-3, height 40px, rounded-lg
- Transition: transition-colors duration-150
- No negative margin hacks — the item itself carries its own px-3 padding
- Inter font, Tailwind CSS v4 classes

Output as a React TSX NavItem component accepting props: icon, label, href, isActive.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 3.6 Form Fields

**Stitch prompt — copy this:**
```text
Design a form field system for LinkDen admin panel with dark glassmorphic styling.

Requirements that must stay:
- Glassmorphism: input backgrounds are semi-transparent with subtle border, backdrop-blur on focus
- Label: text-sm font-medium (NOT text-xs — must be readable)
- Input: rounded-lg, border, focus ring uses electric blue (ring-primary)
- Textarea: same as input, min-h-[80px]
- Select trigger: same styling as input
- Error message: text-destructive, text-xs, mt-1
- Helper text: text-muted-foreground, text-xs, mt-1
- All fields must have visible focus states for accessibility
- Inter font, Tailwind CSS v4 classes

Output as React TSX components: Label, Input, Textarea, SelectTrigger, FieldError, FieldHelper.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

## 4. Pages

### 4.1 Dashboard — `/admin`

**Stitch prompt — copy this:**
```text
Design the admin dashboard page for LinkDen, a link-in-bio tool.

Requirements that must stay:
- Glassmorphism: all cards are frosted glass with backdrop-blur
- Top row: 3 stat cards side by side (Views, Clicks, Unread Forms) — values in large monospace font
- Main area: full-width area chart card with period selector (7d / 30d / 90d) as pill tabs INSIDE the card header (not in page header), subtle grid lines, date x-axis labels
- Right side panel: "Top Links" card showing ranked list (1. 2. 3.) with click counts in monospace, "View all" link at bottom
- Layout: chart takes ~65% width, top links panel takes ~35% on desktop; stacks vertically on mobile
- Empty state component if no links exist
- Inter font for UI, monospace for numbers, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.2 Builder — `/admin/builder`

**Stitch prompt — copy this:**
```text
Design the link block builder page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass cards throughout
- Two-column desktop layout: left = draggable block list (~55%), right = sticky phone preview (~45%)
- Each block row: always-visible left drag handle (GripVertical icon in a bordered left strip), block title + type label below it, toggle switch + edit icon + delete icon on the right
- Drag handle column uses a subtle left border, cursor-grab
- Add Block button: full-width dashed border card at the bottom of the list with a + icon
- Block edit opens as a bottom Sheet on mobile, centered Dialog on desktop
- Preview pane header has "Copy link" and "Open live page" icon buttons
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.3 Appearance — `/admin/appearance`

**Stitch prompt — copy this:**
```text
Design the appearance settings page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass cards
- Grouped into exactly 3 cards stacked vertically:
  Card 1 — Profile & Identity: avatar upload field, display name input, bio textarea, verified badge toggle
  Card 2 — Theme & Colors: theme preset tiles in a 3-4 column grid (each tile shows a 2x2 color swatch), color mode toggle (Light/Dark/System), 2x2 color picker grid (Background, Foreground, Primary, Accent) — each picker is a hex input + native color swatch side by side
  Card 3 — Page Layout: banner toggle with image upload, branding toggle, Custom CSS textarea collapsed by default under an "Advanced" collapsible
- Sticky bottom bar appears only when there are unsaved changes: "Unpublished changes" label + Discard + Publish buttons
- Sticky bar sits above mobile bottom nav (bottom-16 on mobile, bottom-0 on desktop offset by sidebar)
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.4 Analytics — `/admin/analytics`

**Stitch prompt — copy this:**
```text
Design the analytics page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass cards
- Period selector as pill tabs (7d / 30d / 90d) inline above the main chart, NOT in the page header
- Full-width area chart with gradient fill (electric blue), subtle grid lines, date x-axis
- Below the chart: 3 equal-height breakdown cards in a grid — Top Links, Referrers, Countries
- Each breakdown card list: rank number on left (1. 2. 3.), name in middle (truncated), count on right in monospace tabular-nums
- No colored dot indicators — rank position conveys order
- Consistent min-height on all 3 breakdown cards so they render at equal height
- Inter font for UI, monospace for counts, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.5 Social — `/admin/social`

**Stitch prompt — copy this:**
```text
Design the social links management page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass card wrapping the list
- Each social network row: platform icon + platform name + URL input field + enabled toggle + delete button
- Connected/active rows: subtle green/emerald indicator dot
- "Add social link" button at the bottom: either a full-width ghost button or a dashed card
- Empty state when no social links are added
- Minimum 44px touch target height per row
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.6 Forms — `/admin/forms`

**Stitch prompt — copy this:**
```text
Design the form submissions inbox page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass panels
- Desktop: two-panel split layout — left list panel (w-72 fixed), right detail panel (flex-1)
- Mobile: full-screen list, tapping an item opens a bottom Sheet
- Unread items: amber left accent bar (2px, absolute left edge), amber dot indicator, very subtle amber-tinted background
- Read items: no accent, no dot, standard background
- Contextual bulk action bar appears above the list when items are selected: "X selected" + "Mark read" + "Delete" button
- Page header has "Mark all as read" button when unread count > 0
- Amber color for unread (NOT red/destructive — these are messages, not errors)
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.7 Wallet — `/admin/wallet`

**Stitch prompt — copy this:**
```text
Design the Apple Wallet pass editor page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass cards
- Two-column desktop layout: left = settings form (~55%), right = sticky live wallet pass preview (~45%)
- Pass preview uses Apple HIG generic pass layout: header strip → primary field + thumbnail → secondary fields → QR code
- Color pickers in the form use hex input + native color swatch side by side
- Preview updates live as form fields change
- Logo upload uses drag-and-drop image upload field (not a URL text input)
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.8 Settings — `/admin/settings`

**Stitch prompt — copy this:**
```text
Design the settings page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass card wrapping the content area
- Desktop: left sidebar with section tabs (vertical list), right content area
- Mobile: section tabs collapse to a Select dropdown (not scrolling tabs)
- Each section is split into sub-sections separated by subtle bottom borders (not full dividers)
- Sub-section pattern: title (text-sm font-semibold) + description (text-xs muted) + form fields below
- Field labels: text-sm font-medium (NOT text-xs — must be readable on mobile)
- Sections: SEO, CAPTCHA, Email, Data, Danger Zone
- Danger zone uses destructive/red styling for its actions
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.9 Profile — `/admin/profile`

**Stitch prompt — copy this:**
```text
Design the profile editor page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: frosted glass card
- Banner image upload at the top (full width, drag-and-drop, uses ImageUploadField not a URL input)
- Avatar upload overlapping the bottom edge of the banner (circular, drag-and-drop)
- Below: display name input, username input, bio textarea, URL input
- Save button at the bottom of the form
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.10 Login — `/admin/login`

**Stitch prompt — copy this:**
```text
Design the admin login page for LinkDen.

Requirements that must stay:
- Glassmorphism: centered frosted glass card on a deep navy-black background with a subtle aurora/gradient backdrop
- Card contains: logo mark + "LinkDen" wordmark, email input, password input, "Sign in" button (full width, primary)
- Subtle "Forgot password?" link below the button
- No registration link — this is a single-user admin panel
- Inter font, Tailwind CSS v4 classes
- Must look polished at 375px mobile width

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

### 4.11 Setup — `/admin/setup`

**Stitch prompt — copy this:**
```text
Design the first-run setup wizard page for LinkDen admin panel.

Requirements that must stay:
- Glassmorphism: centered frosted glass card on a deep navy-black background with aurora backdrop
- Step indicator at the top showing current step (e.g. step 1 of 3) as connected dots or a progress bar
- Each step shows a clear title and its form fields
- Navigation: "Next" primary button (right), "Back" ghost button (left), shown as a row at the bottom of the card
- Final step shows a "Finish setup" button instead of "Next"
- Inter font, Tailwind CSS v4 classes

Output as a React TSX page component with Tailwind class names.
```

**Paste Stitch output here:**
```tsx
/* REPLACE THIS WITH STITCH OUTPUT */
```

---

## 5. Implementation Checklist

### Design Tokens
- [ ] CSS variables updated with new color palette (`apps/web/src/app/globals.css`)
- [ ] Typography tokens updated
- [ ] Border-radius tokens updated

### Global Layout
- [ ] Sidebar updated (`apps/web/src/app/admin/layout.tsx`)
- [ ] Mobile header updated (`apps/web/src/app/admin/layout.tsx`)
- [ ] Mobile dropdown nav updated (`apps/web/src/app/admin/layout.tsx`)
- [ ] Mobile bottom nav updated (`apps/web/src/app/admin/layout.tsx`)

### Components
- [ ] `StatCard` updated (`apps/web/src/components/admin/stat-card.tsx`)
- [ ] `PageHeader` updated (`apps/web/src/components/admin/page-header.tsx`)
- [ ] `Button` variants updated (`packages/ui/src/components/button.tsx`)
- [ ] `Card` updated (`packages/ui/src/components/card.tsx`)
- [ ] `NavItem` updated
- [ ] Form fields updated (`packages/ui/src/components/`)

### Pages
- [ ] `/admin` — Dashboard
- [ ] `/admin/builder` — Builder
- [ ] `/admin/appearance` — Appearance
- [ ] `/admin/analytics` — Analytics
- [ ] `/admin/social` — Social
- [ ] `/admin/forms` — Forms
- [ ] `/admin/wallet` — Wallet
- [ ] `/admin/settings` — Settings
- [ ] `/admin/profile` — Profile
- [ ] `/admin/login` — Login
- [ ] `/admin/setup` — Setup

### QA
- [ ] Desktop layout reviewed at 1440px
- [ ] Tablet layout reviewed at 768px
- [ ] Mobile layout reviewed at 375px
- [ ] Dark mode verified
- [ ] Accessibility: focus rings and contrast ratios checked
