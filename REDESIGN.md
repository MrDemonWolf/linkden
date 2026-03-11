# LinkDen — Redesign Specification

> **Goal:** Make the admin panel and public profile page look multiple times cleaner, more spacious, and dramatically more mobile-friendly — without breaking the established glassmorphism design language or existing functionality.

---

## Table of Contents

1. [Design Vision](#1-design-vision)
2. [Competitive Context](#2-competitive-context)
3. [Design System Foundations](#3-design-system-foundations)
4. [Admin Shell](#4-admin-shell)
5. [Dashboard Page](#5-dashboard-page)
6. [Analytics Page](#6-analytics-page)
7. [Builder Page](#7-builder-page)
8. [Appearance Page](#8-appearance-page)
9. [Forms Page](#9-forms-page)
10. [Settings Page](#10-settings-page)
11. [Public Profile Page](#11-public-profile-page)
12. [Mobile Experience Overhaul](#12-mobile-experience-overhaul)
13. [Implementation Priority](#13-implementation-priority)
14. [Appendix: Component Inventory](#14-appendix-component-inventory)

---

## 1. Design Vision

### 1.1 Aesthetic Direction: "Precision Glass"

LinkDen's existing glassmorphism is a strong foundation. The problem isn't the direction — it's the execution:
- Glass surfaces are slightly too opaque, killing depth
- Spacing is inconsistent, making the UI feel improvised
- Typography is timid — headings don't assert enough hierarchy
- Mobile feels like a shrunken desktop, not a purpose-built experience

The redesign amplifies what works. The new identity: **Precision Glass** — polished obsidian panels, surgical spacing, confident typography, and restraint that makes every element feel intentional.

Think: Linear + Vercel dashboard meets a premium audio software UI. Dark, focused, trustworthy.

### 1.2 Font System

| Role | Font | Class |
|------|------|-------|
| Page titles | Inter Variable | `font-semibold tracking-tight` |
| Stat values | **DM Mono** (new addition) | `font-mono font-semibold tabular-nums` |
| Section labels | Inter Variable | `font-semibold uppercase tracking-widest text-[10px]` |
| Body / inputs | Inter Variable | `font-normal` |
| Monospace code | DM Mono | `font-mono text-sm` |

**Add to project:** `@fontsource-variable/dm-mono` — apply only to numeric stat displays (visitor counts, click counts, analytics numbers). The contrast between a proportional UI font and monospaced numerals creates a premium data-dashboard feel without changing the entire typography system.

### 1.3 Color Intensification

The current oklch palette is modern but slightly timid. Intensify key tokens:

```css
/* Intensified dark mode */
.dark {
  --background: oklch(0.10 0.03 265);    /* deeper navy-black (was 0.13) */
  --card: oklch(0.17 0.02 270 / 65%);   /* slightly more translucent (was 0.2 / 70%) */
  --border: oklch(1 0 0 / 8%);          /* thinner, subtler (was /10%) */
  --primary: oklch(0.72 0.18 235);      /* more electric blue (was 0.75 0.14 220) */
  --muted-foreground: oklch(0.48 0.01 270); /* slightly lighter for readability */
}
```

This pushes the dark mode into "polished obsidian" territory — deeper blacks, crisper glass edges, more vivid primary accent.

### 1.4 Motion Principles

**One entrance per page, not per component:**
- Current: every section has staggered `getAnimationProps(index)` entrance
- New: a single page-level `animate-in fade-in-0 slide-in-from-bottom-2 duration-300` on the main content wrapper
- Result: less animation code, more elegant feel, no "popcorn" effect of elements appearing sequentially

**Micro-interactions:**
- Card hover: `hover:border-white/15 dark:hover:border-white/12 transition-colors duration-150`
- Button hover: existing transitions are fine
- Nav item hover: `transition-all duration-150` (already exists, keep)
- List item selection: no animation — instant color change feels snappier

---

## 2. Competitive Context

### 2.1 Linktree (Market Leader)

**What they do well:**
- Extremely clean admin: wide whitespace, one clear action per screen
- Stats shown as large, bold numbers above subtle sparklines
- Builder is a simple vertical list with drag handles that are big enough to grab on mobile
- Mobile admin is near-identical to desktop (no layout shift)

**What we can do better:**
- Linktree's dark mode is nearly non-existent
- Their analytics are rudimentary (we already have more)
- Their customization options are locked behind paywall; ours are all free

**Key takeaway:** Less chrome around data. Let numbers breathe with generous whitespace.

### 2.2 Beacons.ai (Premium Creator Tool)

**What they do well:**
- Large, editorial typography — section titles are assertive, not shy
- "Monetization" mindset: every screen shows the value the user is getting
- Profile preview is always visible on desktop — never hidden
- Color system is bold: they commit to high-contrast accents

**Key takeaway:** Make the preview pane more prominent and always accessible. Show value metrics confidently.

### 2.3 Later Link in Bio

**What they do well:**
- Clean period selector (pill tabs, not full-width button strip)
- Analytics grid uses consistent card height, making visual scanning easy
- Mobile: dedicated app-like experience with large touch targets

**Key takeaway:** Consistent card heights in analytics grid prevents visual jitter when data loads.

### 2.4 Key Cross-Competitor Insights

1. **All premium link-in-bio tools show the profile preview prominently** — never hide it
2. **Numbers are displayed large and boldly** — analytics are the value proposition, treat them like it
3. **Drag handles on builder are always obvious** — not subtle icons, visible affordances
4. **Mobile uses the same card grid as desktop** — just fewer columns, not a different layout system
5. **Empty states are warm and encouraging**, not cold error text

---

## 3. Design System Foundations

These global fixes deliver maximum visual cleanup per line changed. Apply before touching individual pages.

### 3.1 Typography Scale

| Role | Tailwind Classes | Used for |
|------|-----------------|----------|
| Page title | `text-base md:text-lg font-semibold tracking-tight` | PageHeader h1 |
| Section title | `text-sm font-semibold` | Card titles, sidebar section headings |
| Group label | `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60` | Nav labels, field group headers |
| Body | `text-sm leading-relaxed` | Descriptions, input values, list text |
| Caption | `text-xs text-muted-foreground` | Sub-labels, timestamps, footnotes |
| Stat value | `text-2xl md:text-3xl font-mono font-semibold tabular-nums` | StatCard numbers |
| Metric number | `text-sm font-mono tabular-nums` | Analytics counts, click numbers |

**Problem today:** Section headers inconsistently use `text-xs font-semibold uppercase`, `text-sm font-medium`, and `text-xs font-medium text-muted-foreground` across pages. The `section-header.tsx` component is not universally adopted.

**Fix:** Update `section-header.tsx` to always emit `text-[10px] font-semibold uppercase tracking-widest`. Audit every page and replace one-off heading classes with `<SectionHeader>`.

---

### 3.2 Spacing Scale

Use only these gap/spacing values across the entire admin:

| Token | Pixels | Use |
|-------|--------|-----|
| `gap-1.5` | 6px | Inline icon + label pairs |
| `gap-2` | 8px | Tight rows (badge rows, button groups) |
| `gap-3` | 12px | Nav items, form field pairs within a row |
| `gap-4` | 16px | Card grid columns, major inline spacing |
| `gap-6` | 24px | Vertical section stacking |
| `space-y-1` | 4px | Items within a nav group |
| `space-y-4` | 16px | Items within a content list |
| `space-y-6` | 24px | Major page sections (Card to Card) |
| `p-4 md:p-5` | 16–20px | Card inner padding (all cards, consistent) |

**Problem today:** `gap-3`, `gap-4`, `gap-6` all used for card grids interchangeably. Pick `gap-4` for all card grids and never deviate.

---

### 3.3 Semantic Color System

Apply this mapping consistently for icon backgrounds, dot indicators, and badge variants:

| Semantic | Icon BG | Icon Color | Use |
|----------|---------|-----------|-----|
| **Primary / Action** | `bg-primary/10` | `text-primary` | Active state, primary stat, current nav |
| **Success / Live** | `bg-emerald-500/10` | `text-emerald-500` | Connected social, published, active |
| **Warning / Attention** | `bg-amber-500/10` | `text-amber-500` | Unread messages, incomplete config, pending |
| **Destructive** | `bg-destructive/10` | `text-destructive` | Delete, error, failed |
| **Info / Analytics** | `bg-blue-500/10` | `text-blue-500` | Click counts, referrers, data points |
| **Neutral** | `bg-muted/60` | `text-muted-foreground` | Disabled, secondary, total counts |

**Problem today:** Forms unread count badge is `bg-destructive` (red). Unread messages are not errors — change to `bg-amber-500` (warning). The analytics page uses `bg-green-500`, `bg-blue-500`, and `bg-emerald-500` without a documented pattern.

---

### 3.4 Card Anatomy Standard

All `<Card>` components must follow this pattern:

```tsx
// ✅ Correct
<Card className="overflow-hidden">
  <CardContent className="p-4 md:p-5">
    <SectionHeader label="Section Name" />
    {/* content */}
  </CardContent>
</Card>

// ❌ Wrong — padding on wrapper
<Card className="p-4">
  <div className="text-sm font-medium">Section Name</div>
  {/* content */}
</Card>
```

**Fix:** Remove all `p-*` classes from `<Card>` wrappers. Ensure `<CardContent>` uses `p-4 md:p-5`. Update `card.tsx` primitive if its default padding conflicts.

---

### 3.5 Universal Interactive List Item

Every clickable/hoverable list item must use this exact pattern:

```tsx
<div className={cn(
  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 cursor-pointer select-none",
  isSelected || isActive
    ? "bg-primary/10 text-primary"
    : "hover:bg-white/5 dark:hover:bg-white/5 text-foreground"
)}>
```

Never use `-mx-2 px-2` negative margin compensation hacks. Parent cards use `p-0`; list items carry their own `px-3` padding.

---

## 4. Admin Shell

### 4.1 Sidebar — Desktop

**Current problems:**
- External links (Docs, View Live) are buried as plain `<a>` list items
- Unread badge uses destructive red (wrong semantic)
- User trigger has small hit area (`py-2`)
- Logo area height inconsistent with breathing room

**Redesigned structure:**

```
┌────────────────────────────┐
│  [LD]  LinkDen      [🔔]  │  ← py-6 (spacious)
├────────────────────────────┤
│  ● Dashboard               │  ← active: bg-primary/10 rounded-lg, 3px left accent
│    Builder                 │  ← hover: bg-white/5
│    Analytics               │
│    Forms          [3]      │  ← badge: bg-amber-500 (warning, not error)
│                            │
│  CUSTOMIZE                 │  ← text-[10px] uppercase tracking-widest
│    Appearance              │
│    Social                  │
│    Wallet                  │
│                            │
│    Settings                │
├────────────────────────────┤
│  [↗ Docs]  [↗ Live Page]  │  ← grid-cols-2 ghost buttons
├────────────────────────────┤
│  [🌙 ☀ ⬛]               │  ← segmented theme toggle (keep)
├────────────────────────────┤
│  [Avatar]  Name        [⌄]│  ← py-2.5 for bigger hit area
└────────────────────────────┘
```

**Changes:**
- Active nav item: add `border-l-2 border-primary ml-[-1px]` left accent stripe
- Forms unread badge: `bg-amber-500` instead of `bg-destructive`
- External links: `<div className="grid grid-cols-2 gap-1 px-2 pb-2"><Button variant="ghost" size="sm">` for each
- User dropdown trigger: `py-2.5` (from current `py-2`)
- Logo row: `py-6` (from current `py-5`)

> **Google Stitch Prompt:** `Dark glassmorphic admin sidebar 256px wide, deep navy background, frosted glass panels, electric blue accent, segmented theme toggle at bottom, user avatar dropdown footer, Inter font, ultra-minimal horizontal dividers`

---

### 4.2 Mobile Header

**Current problems:**
- Always shows "LinkDen" with no indication of current page
- Hamburger icon is the only affordance for navigation beyond bottom bar

**Redesigned:**

```tsx
<div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center px-4 ...">
  {/* Logo left */}
  <div className="flex items-center gap-2 shrink-0">
    <div className="LD mark" />
    <span className="text-xs font-semibold">LinkDen</span>
  </div>

  {/* Current page — centered absolute */}
  <span className="absolute inset-x-0 text-center text-xs font-medium text-muted-foreground pointer-events-none">
    {currentPageLabel}  {/* e.g. "Dashboard", "Builder" */}
  </span>

  {/* Menu toggle right */}
  <button className="ml-auto" aria-label="...">
    {mobileMenuOpen ? <X /> : <Menu />}
  </button>
</div>
```

**Derive `currentPageLabel`** from `pathname` using the `NAV_GROUPS` + `SETTINGS_ITEM` arrays.

---

### 4.3 Mobile Dropdown Menu

**Current:** `grid grid-cols-2 gap-0.5` — functional but compact, hard to tap accurately

**Redesigned:** Single-column list with group dividers, 44px min touch targets:

```tsx
<nav className="flex flex-col px-2 py-2 gap-0.5" aria-label="Navigation">
  {NAV_GROUPS.map(group => (
    <div key={group.label ?? "main"}>
      {group.label && (
        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {group.label}
        </p>
      )}
      {group.items.map(item => (
        <Link className="flex items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-sm font-medium transition-colors ..."
          ...>
          <Icon className="h-4 w-4 shrink-0" />
          {item.label}
          {item.label === "Forms" && unreadCount > 0 && <Badge />}
        </Link>
      ))}
    </div>
  ))}
  {/* Settings item */}
  <div className="border-t border-white/10 mt-1 pt-1">
    {renderNavItem(SETTINGS_ITEM)}
  </div>
</nav>
```

> **Google Stitch Prompt:** `Mobile app navigation dropdown overlay, frosted glass panel, single-column nav list with section group labels, 44px touch targets, amber notification badge, sign-out row at bottom, iOS-style blur backdrop`

---

### 4.4 Mobile Bottom Nav

**Current problems:**
- Only 4 items — Analytics and Forms are missing
- Active state uses `border-t-2 border-primary` (heavy, border-top pattern feels dated)
- Icons `h-4 w-4` are slightly small for touch interfaces

**Redesigned:**

- Items: Dashboard, Builder, **Analytics**, **Forms** (replace Social + Settings with more-used pages)
- Active state: `text-primary` + no border, just icon + label color change
- Icon: `h-5 w-5` (bump up from h-4)
- Hit area: `min-h-[48px]` (iOS HIG: 44pt minimum, 48px is safer)

```tsx
className={cn(
  "flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] text-[10px] font-medium transition-colors",
  isActive ? "text-primary" : "text-muted-foreground/70"
)}
```

> **Google Stitch Prompt:** `iOS-style bottom tab bar, frosted glass background, 4 tabs with icon and label, active tab in electric blue, inactive in muted gray, no visible borders between tabs, ultra-minimal`

---

## 5. Dashboard Page

**Current problems:** Stat cards use `gap-3` (too tight); chart has no axis labels; top links list has no rank numbers or CTA; empty state missing.

### Redesigned layout:

```
[PageHeader: Dashboard]

[Views]  [Clicks]  [Unread Forms]    ← gap-4, text-3xl DM Mono values

[──────── Views Over Time ──────────]  [Top Links      ]
[  Period: [7d] [30d] [90d]         ]  [               ]
[                                   ]  [1.  Title  234 ]
[  █████████ area chart             ]  [2.  Title  189 ]
[                                   ]  [3.  Title   45 ]
[  X-axis: dates  Y-axis: count     ]  [               ]
[───────────────────────────────────]  [View all →     ]
```

**Changes:**
- Stat card values: add `font-mono` class to value display
- Chart card: move period selector inside chart card header (remove from PageHeader actions)
- Chart: add `CartesianGrid strokeDasharray="3 3"` with very subtle opacity (`stroke-muted-foreground/10`)
- Chart axes: `XAxis dataKey="date" tick={{ fontSize: 11 }}` + `YAxis tick={{ fontSize: 11 }}`
- Top links: add 1-based rank number on left (`text-xs text-muted-foreground w-4`), click count right-aligned in `font-mono`, "View all →" link to analytics at bottom
- Empty state: use `<EmptyState>` component when `topLinks.length === 0`

> **Google Stitch Prompt:** `Admin dashboard with 3 stat cards showing large monospaced numbers, an area chart with subtle grid lines and date axis below, a compact "top links" leaderboard panel to the right, dark glassmorphic cards, electric blue data fills`

---

## 6. Analytics Page

**Current problems:** Period selector in PageHeader feels disconnected; list items use negative margin hack; dot colors have no semantic meaning; card heights vary with data.

### Changes:

**Period selector → inline pill tabs above chart:**

```tsx
<div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit mb-4">
  {["7d", "30d", "90d"].map(p => (
    <button key={p} onClick={() => setPeriod(p)}
      className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-all",
        period === p
          ? "bg-white dark:bg-white/15 shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}>
      {p}
    </button>
  ))}
</div>
```

**Bottom 3-column grid — standardize:**

```tsx
// Each list item (no negative margins)
<div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
  <div className="flex items-center gap-2 min-w-0">
    {/* indicator removed — rely on position/rank */}
    <span className="text-xs text-muted-foreground w-5 shrink-0">{index + 1}.</span>
    <span className="text-sm truncate">{name}</span>
  </div>
  <span className="text-sm font-mono tabular-nums text-muted-foreground shrink-0 ml-4">{count}</span>
</div>
```

Fix card height: add `min-h-[200px]` to each analytics breakdown card so they render uniformly.

> **Google Stitch Prompt:** `Analytics dashboard dark mode, period selector as segmented pill control, full-width area chart with gradient fill, three equal-height stat breakdown cards below showing top links / referrers / countries, rank numbers and monospace counts, electric blue accent`

---

## 7. Builder Page

**Current problems:** Drag handles are invisible until hover; block edit is a centered modal (jarring on mobile); "Add Block" button placement unclear; preview pane has no quick-access actions.

### Changes:

**Block card — improved affordances:**

```tsx
// Block row structure
<Card className="group flex items-center gap-0 overflow-hidden">
  {/* Drag handle — always visible */}
  <div className="flex h-full w-8 shrink-0 items-center justify-center border-r border-border/50 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors">
    <GripVertical className="h-4 w-4" />
  </div>
  <CardContent className="flex flex-1 items-center gap-3 p-3">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{block.title || blockType.label}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{blockType.label}</p>
    </div>
    <Switch checked={block.enabled} />
    <IconButton icon={Pencil} size="sm" onClick={onEdit} />
    <IconButton icon={Trash2} size="sm" variant="ghost-destructive" onClick={onDelete} />
  </CardContent>
</Card>
```

**Add Block button:** Full-width dashed card at bottom of list:
```tsx
<button className="w-full rounded-xl border-2 border-dashed border-border/60 p-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2">
  <Plus className="h-4 w-4" /> Add Block
</button>
```

**Block edit modal → Sheet on mobile:**
```tsx
// Mobile: bottom sheet
<Sheet open={editOpen && isMobile} onOpenChange={setEditOpen}>
  <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
    <BlockEditForm ... />
  </SheetContent>
</Sheet>

// Desktop: centered dialog
<Dialog open={editOpen && !isMobile} onOpenChange={setEditOpen}>
  <DialogContent className="max-w-lg">
    <BlockEditForm ... />
  </DialogContent>
</Dialog>
```

**Preview pane header:**
```tsx
<div className="flex items-center justify-between mb-3 px-1">
  <SectionHeader label="Preview" />
  <div className="flex gap-1">
    <IconButton icon={Copy} size="sm" title="Copy link" />
    <IconButton icon={ExternalLink} size="sm" title="Open live page" href="/" />
  </div>
</div>
```

> **Google Stitch Prompt:** `Link-in-bio block builder admin, vertical list of draggable blocks with visible left grip handles, each block card shows title and type label, toggle switch and edit/delete icons on right, full-width dashed add-block button at bottom, sticky phone preview on right, dark glassmorphic design`

---

## 8. Appearance Page

**Current problems:** 6 sections stacked vertically creates an overwhelming scroll; Custom CSS section intimidates non-technical users; color pickers aren't in a 2×2 grid; publish/discard button in PageHeader is easy to miss.

### Grouped into 3 cards:

```
Card 1 — Profile & Identity
  Avatar upload
  Display name + bio
  Verified badge toggle

Card 2 — Theme & Colors
  Theme presets: visual grid (grid-cols-3 md:grid-cols-4 of preview tiles)
  Color mode toggle (Light / Dark / System)
  Color pickers: 2×2 grid
    [Background] [Foreground]
    [Primary]    [Accent]

Card 3 — Page Layout
  Banner (toggle → preset swatches or image upload)
  Branding (powered-by toggle + link text)
  Custom CSS [collapsed by default — CollapsibleSection, labeled "Advanced"]
```

**Theme preset tiles:**
```tsx
<div className="grid grid-cols-3 md:grid-cols-4 gap-2">
  {THEME_PRESETS.map(preset => (
    <button key={preset.id}
      className={cn("rounded-lg p-2 border-2 transition-all",
        selected === preset.id ? "border-primary" : "border-border/50 hover:border-border"
      )}
    >
      {/* Mini color swatch grid showing the preset colors */}
      <div className="grid grid-cols-2 gap-0.5 rounded overflow-hidden h-8">
        <div className="rounded-sm" style={{ background: preset.colors.background }} />
        <div className="rounded-sm" style={{ background: preset.colors.primary }} />
        <div className="rounded-sm" style={{ background: preset.colors.foreground }} />
        <div className="rounded-sm" style={{ background: preset.colors.accent }} />
      </div>
      <p className="text-[10px] mt-1.5 font-medium truncate">{preset.name}</p>
    </button>
  ))}
</div>
```

**Sticky bottom publish bar (replaces PageHeader dirty indicator):**
```tsx
{isDirty && (
  <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-56 z-30
                  border-t border-border/50 bg-background/80 backdrop-blur-xl
                  px-4 py-3 flex items-center justify-between shadow-lg">
    <span className="text-sm text-muted-foreground">Unpublished changes</span>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={discard}>Discard</Button>
      <Button size="sm" onClick={publish}>Publish</Button>
    </div>
  </div>
)}
```

> **Google Stitch Prompt:** `Appearance settings panel for a link-in-bio tool, three grouped settings cards stacked vertically, first card has avatar upload and bio fields, second card has visual theme preset tiles in a 4-column color swatch grid plus 2x2 color pickers, third card has banner and advanced options, sticky publish bar at bottom, dark glassmorphic UI`

---

## 9. Forms Page

**Current problems:** Unread treatment is just a dot (easy to miss); bulk delete UI placement is awkward; mobile full-screen sheet for detail blocks list view.

### Changes:

**Unread visual treatment:**
```tsx
<div className={cn(
  "relative flex items-start gap-3 px-4 py-3 border-b border-border/40 cursor-pointer transition-colors hover:bg-muted/30",
  isUnread && "bg-amber-500/5"
)}>
  {/* Left accent bar */}
  <div className={cn(
    "absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all",
    isUnread ? "bg-amber-500" : "bg-transparent"
  )} />
  {/* Amber dot */}
  <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0 transition-colors",
    isUnread ? "bg-amber-500" : "bg-transparent"
  )} />
  ...
```

**Contextual bulk action bar (appears when items selected):**
```tsx
{selectedIds.size > 0 && (
  <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border-b border-primary/20 rounded-t-lg">
    <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
    <Button variant="ghost" size="sm" onClick={markSelectedRead}>Mark read</Button>
    <Button variant="ghost-destructive" size="sm" className="ml-auto" onClick={deleteSelected}>
      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
    </Button>
  </div>
)}
```

**Desktop split pane sizing:** List `w-72` fixed, detail `flex-1`.

**PageHeader actions:** Add "Mark all as read" button (appears when unreadCount > 0).

> **Google Stitch Prompt:** `Form submissions inbox UI, two-panel split layout, left panel 288px wide list with amber left-accent bars for unread items, right panel shows full message detail, contextual bulk action bar appears when rows selected, dark glass cards, amber and primary blue accent colors`

---

## 10. Settings Page

**Current problems:** 5 section tabs overflow on narrow mobile; long scroll within each section; field labels are `text-xs` (hard to read on mobile).

### Changes:

**Mobile tab → Select dropdown:**
```tsx
{/* Mobile only */}
<div className="md:hidden mb-4">
  <Select value={activeSection} onValueChange={setActiveSection}>
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {SECTIONS.map(s => (
        <SelectItem key={s.id} value={s.id}>{s.icon && <s.icon />}{s.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
{/* Desktop sidebar (keep existing) */}
<nav className="hidden md:block ..." />
```

**Section separator pattern:**
```tsx
// Wrap each sub-section within a settings card:
<div className="mb-6 pb-6 border-b border-border/40 last:border-0 last:mb-0 last:pb-0">
  <h3 className="text-sm font-semibold mb-1">{subsectionTitle}</h3>
  <p className="text-xs text-muted-foreground mb-4">{subsectionDesc}</p>
  <FieldGroup ...>
    {/* fields */}
  </FieldGroup>
</div>
```

**Field labels:** Increase from `text-xs` → `text-sm font-medium` for all `<Label>` components in settings forms.

> **Google Stitch Prompt:** `Settings page with left sidebar section tabs on desktop collapsing to a select dropdown on mobile, each section shows a vertical stack of form subsections separated by subtle dividers, 5 tabs: SEO, CAPTCHA, Email, Data, Migration, dark glass card container, clean spacious form layout`

---

## 11. Public Profile Page

**Current problems:** Link blocks have no hover affordance; social icons too small for touch; no loading skeleton; avatar ring may clash with background.

### Changes:

**Link block — enhanced hover:**
```tsx
<a className="group relative flex items-center gap-3 rounded-xl px-4 py-3.5
              border border-border/30 transition-all duration-200
              hover:scale-[1.01] hover:shadow-md hover:border-border/60
              bg-card/80 backdrop-blur-sm">
  {block.icon && (
    <img src={block.icon} className="h-8 w-8 rounded-md object-cover shrink-0" />
  )}
  <span className="flex-1 text-sm font-medium">{block.title}</span>
  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
</a>
```

**Social icons — flex wrap:**
```tsx
<div className="flex flex-wrap justify-center gap-3">
  {networks.map(n => (
    <Tooltip key={n.id} content={n.label}>
      <a href={n.url} target="_blank"
         className="flex h-10 w-10 items-center justify-center rounded-full
                    bg-muted/50 hover:bg-muted transition-colors
                    text-muted-foreground hover:text-foreground">
        <n.icon className="h-4.5 w-4.5" />
      </a>
    </Tooltip>
  ))}
</div>
```

**Loading skeleton:**
```tsx
// While data loads, show:
<div className="flex flex-col items-center gap-4 animate-pulse">
  <div className="h-20 w-20 rounded-full bg-muted" />        {/* avatar */}
  <div className="h-5 w-36 rounded-full bg-muted" />         {/* name */}
  <div className="space-y-1.5 w-full max-w-xs">
    <div className="h-4 w-48 rounded-full bg-muted mx-auto" />
    <div className="h-4 w-32 rounded-full bg-muted mx-auto" />
  </div>
  {[0,1,2].map(i => (
    <div key={i} className="h-12 w-full max-w-sm rounded-xl bg-muted" />
  ))}
</div>
```

**Avatar ring:** Change from `ring-[color]` to `ring-2 ring-white/20 ring-offset-2 ring-offset-background` so it always contrasts regardless of user's chosen background color.

> **Google Stitch Prompt:** `Mobile link-in-bio public profile page, centered layout, circular avatar with subtle ring, display name and bio below, vertical stack of rounded link cards with arrow icon on hover, row of circular social icon buttons, glassmorphic background with subtle aurora gradient, dark mode`

---

## 12. Mobile Experience Overhaul

### 12.1 Touch Target Audit

Every interactive element must be ≥ 44×44px (iOS HIG standard).

| Element | Current | Required Fix |
|---------|---------|-------------|
| Bottom nav items | `min-h-[44px]` ✅ | Bump to `min-h-[48px]` |
| Block edit/delete buttons | `h-8 w-8` ❌ | → `h-9 w-9` minimum |
| Color swatch pickers | `h-8 w-8` ❌ | → `h-10 w-10` |
| Social network toggle rows | varies ❌ | Wrap in `min-h-[44px]` |
| Settings tab buttons | `py-1.5` ❌ | → `py-2.5` |
| Mobile nav items (dropdown) | `py-2.5` | → `py-3` (44px with text) |

### 12.2 Bottom Sheet Standard

All modals on mobile use:

```tsx
<SheetContent
  side="bottom"
  className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
  style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
>
  {/* Drag handle */}
  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
  {/* Content */}
</SheetContent>
```

Apply to: block edit (mobile), appearance preview, forms detail, builder preview.

### 12.3 Input Modes (improve mobile keyboard)

| Input Type | Add attribute |
|-----------|--------------|
| URL fields (social networks) | `inputMode="url" autoCapitalize="none"` |
| Email fields | `inputMode="email" autoCapitalize="none"` |
| Color hex fields | `autoCapitalize="none" spellCheck={false}` |
| Search fields | `inputMode="search"` |
| Numeric fields | `inputMode="numeric"` |

### 12.4 Scroll Behavior

- Main content area: `scroll-smooth`
- Settings page: scroll to top of content when switching sections on mobile (`window.scrollTo({ top: 0, behavior: 'smooth' })`)
- Forms list: `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on selected item

### 12.5 Page Entrance Animation

**Replace** per-component staggered `useEntranceAnimation` with a single page-level entrance on the content wrapper:

```tsx
// In each page component, wrap the main return:
<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
  {/* all content */}
</div>
```

Remove `useEntranceAnimation` hook usage from all pages. One entrance per route transition. Cleaner and faster.

> **Google Stitch Prompt:** `Mobile admin panel responsive design, showing iPhone mockup with bottom tab nav, touch-friendly 48px height list items, bottom sheet modal for editing with drag handle and rounded top corners, dark glassmorphic surfaces`

---

## 13. Implementation Priority

### Tier 1 — High Impact, Quick Wins (do these first)

| # | Change | File | Impact |
|---|--------|------|--------|
| 1 | Typography scale audit + SectionHeader standardization | All page files | ⭐⭐⭐⭐⭐ |
| 2 | Spacing normalization to gap-4 for card grids | All pages | ⭐⭐⭐⭐⭐ |
| 3 | Forms badge: `bg-destructive` → `bg-amber-500` | `layout.tsx` | ⭐⭐⭐ |
| 4 | Stat values: add `font-mono` class | `stat-card.tsx` | ⭐⭐⭐⭐ |
| 5 | Card padding: all `<Card>` → `p-0`, `<CardContent>` → `p-4 md:p-5` | All pages | ⭐⭐⭐⭐ |
| 6 | Mobile dropdown: `grid-cols-2` → single-column with group labels | `layout.tsx` | ⭐⭐⭐⭐ |
| 7 | Bottom nav: `h-4` icons → `h-5`, `min-h-[44px]` → `min-h-[48px]` | `layout.tsx` | ⭐⭐⭐ |
| 8 | Analytics period selector: PageHeader → inline pill tabs | `analytics/page.tsx` | ⭐⭐⭐⭐ |
| 9 | Analytics list items: remove negative margin hack | `analytics/page.tsx` | ⭐⭐⭐ |
| 10 | Page entrance: replace stagger with single wrapper animate-in | All pages | ⭐⭐⭐⭐ |

### Tier 2 — Medium Impact, Medium Effort

| # | Change | File | Impact |
|---|--------|------|--------|
| 11 | Block drag handle: always visible, left border | `builder/block-row.tsx` | ⭐⭐⭐⭐ |
| 12 | Block type label: show below title | `builder/block-row.tsx` | ⭐⭐⭐ |
| 13 | "Add Block" dashed full-width card | `builder/page.tsx` | ⭐⭐⭐⭐ |
| 14 | Block edit: Sheet on mobile, Dialog on desktop | `builder/block-edit-panel.tsx` | ⭐⭐⭐⭐ |
| 15 | Appearance: 3-card grouping | `appearance/page.tsx` | ⭐⭐⭐⭐⭐ |
| 16 | Appearance: sticky bottom publish bar | `appearance/page.tsx` | ⭐⭐⭐⭐ |
| 17 | Appearance: theme presets → visual swatch tiles | `appearance/theme-presets-section.tsx` | ⭐⭐⭐⭐⭐ |
| 18 | Appearance: color pickers → 2×2 grid | `appearance/colors-section.tsx` | ⭐⭐⭐ |
| 19 | Appearance: Custom CSS → collapsible by default | `appearance/custom-css-section.tsx` | ⭐⭐⭐ |
| 20 | Forms: amber left-accent bar for unread | `forms/contact-list-item.tsx` | ⭐⭐⭐⭐ |
| 21 | Forms: contextual bulk action bar | `forms/page.tsx` | ⭐⭐⭐ |
| 22 | Settings: mobile Select dropdown for sections | `settings/page.tsx` | ⭐⭐⭐⭐ |
| 23 | Settings: field labels text-xs → text-sm font-medium | Settings subsections | ⭐⭐⭐ |
| 24 | Mobile header: current page name centered | `layout.tsx` | ⭐⭐⭐ |
| 25 | Dashboard: move period selector into chart card | `admin/page.tsx` | ⭐⭐⭐ |
| 26 | Dashboard: Top Links rank numbers + CTA | `admin/page.tsx` | ⭐⭐⭐ |

### Tier 3 — Highest Impact, Most Effort

| # | Change | File | Impact |
|---|--------|------|--------|
| 27 | Public: loading skeleton | `public/public-page-content.tsx` | ⭐⭐⭐⭐ |
| 28 | Public: link block hover scale + arrow | `public/link-block.tsx` | ⭐⭐⭐⭐ |
| 29 | Public: social icons flex-wrap + `h-10 w-10` | `public/social-icons-block.tsx` | ⭐⭐⭐ |
| 30 | Public: avatar ring → `ring-offset-background` | `public/avatar.tsx` | ⭐⭐⭐ |
| 31 | Dark mode token intensification (CSS vars) | `apps/web/src/index.css` | ⭐⭐⭐⭐⭐ |
| 32 | Add DM Mono font for numerics | `index.css` + `stat-card.tsx` | ⭐⭐⭐⭐ |
| 33 | Preview pane: Copy link + Open Live buttons | `shared-preview.tsx` | ⭐⭐⭐ |
| 34 | Sidebar: active item left accent stripe | `layout.tsx` | ⭐⭐⭐ |
| 35 | Bottom nav: swap to Dashboard/Builder/Analytics/Forms | `layout.tsx` | ⭐⭐⭐⭐ |

---

## 14. Appendix: Component Inventory

### Reuse (don't recreate)

| Component | Path | Notes |
|-----------|------|-------|
| `EmptyState` | `components/admin/empty-state.tsx` | Use on Dashboard top links, Analytics panels |
| `FieldGroup` | `components/admin/settings/field-group.tsx` | Use for all 2-col form layouts |
| `CollapsibleSection` | `components/admin/builder/collapsible-section.tsx` | Repurpose for Custom CSS "Advanced" group |
| `MobilePreviewSheet` | `components/admin/mobile-preview-sheet.tsx` | Use for all preview-on-mobile flows |
| `ImageUploadField` | `components/admin/image-upload-field.tsx` | Never use plain URL text inputs for images |
| `SectionHeader` | `components/admin/section-header.tsx` | Adopt universally for all card section titles |
| `StatCard` | `components/admin/stat-card.tsx` | Add `font-mono` to value, amber semantic for unread |

### Create (new components)

| Component | Purpose |
|-----------|---------|
| `PeriodSelector` | Pill-tab strip for 7d/30d/90d — used in Dashboard AND Analytics |
| `ColorPickerField` | Combined hex Input + swatch, currently duplicated in several places |
| `PageSkeleton` | Full-page loading skeleton for public profile page |
| `FormSection` | Settings sub-section wrapper with bottom border separator |

---

*Last updated: 2026-03-11 | Based on: Linktree, Beacons.ai, Later competitive analysis + frontend-design direction*
