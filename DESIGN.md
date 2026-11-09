# LinkDen design system

The current system is documented in the docs app at **[/docs/design-system](/docs/design-system)**. This file is the repository entry point; the app source owns the actual values and behavior.

- [Foundations](apps/docs/content/docs/design-system/foundations.mdx): tokens, type, spacing, controls, radii, and motion.
- [Shared components](apps/docs/content/docs/design-system/components.mdx): primitives, form sections, navigation, feedback, and confirmations.
- [Layout and interaction patterns](apps/docs/content/docs/design-system/patterns.mdx): editing, saving, previews, Wallet, and public layouts.

## Source ownership

| Source | Owns |
| --- | --- |
| `apps/web/src/index.css` | Semantic tokens, admin/public scope overrides, sizing, reduced motion |
| `apps/web/src/app/admin/layout.tsx` | Montserrat/Roboto admin font variables |
| `apps/web/src/public-fonts.css` and `apps/web/public/fonts/` | Local Sora/DM Sans fonts shared by Next and static output |
| `apps/web/src/components/ui/` | Base UI/Tailwind web primitives |
| `packages/ui/src/` | Shared Checkbox, Switch, Avatar, Tabs, class merging, theme and banner catalogues |
| `apps/web/src/components/admin/` | Shell, pages, forms, navigation, and previews |
| `apps/web/src/components/public/` | Public renderer shared by preview, live page, and static output |
| `packages/validators/src/` | Accepted settings, limits, block configuration, and pass rules |

Reuse these sources. Do not add a parallel token file, component library, renderer, or design-system route in the product app.

## Current visual direction

- Admin uses neutral surfaces and restrained blue actions. Dark ground/card/inset colors are `#101012`, `#18181B`, and `#242427`; primary is `#60A5FA`. Light values live beside them in `.admin-scope`.
- Public pages keep their selected theme and saved color overrides. `.public-scope` restores public typography, radii, and control fallbacks within the editor preview. Public theme controls do not recolor the admin.
- Admin headings use Montserrat; body text uses Roboto. Public headings/body use Sora/DM Sans. Numeric text uses Geist Mono. The Wallet pass card uses the system/SF font stack.
- Standard desktop fine-pointer controls are 36px, compact controls 32px, and narrow/coarse-pointer controls at least 44px. Inputs and selects use 16px text on touch layouts. Use the shared components instead of per-page height overrides.
- `--input-border` identifies form controls; `--input` is fill only. Preserve visible keyboard focus and label/error associations. Color alone does not replace state text.
- Admin cards are matte, bordered surfaces. Keep decorative entrance animations off admin pages, charts, and forms. Real pending indicators and functional transitions remain; honor reduced motion in both CSS and JavaScript.

## Layout contracts

- `AdminShell` owns one main landmark, navigation, a 64px top bar, shared footer, and the preview slot. `PageShell` supplies 16px vertical rhythm, increasing to 24px from `sm`; `PageHeader` supplies the page heading and actions.
- Sidebar items and path-based sub-tabs have 4px gaps. `NAV_ITEMS` is the common destination source. Branding/version/development metadata belongs in `AdminFooter`, not the account menu.
- `CardHeader` and `CardContent` own aligned gutters. `CardTitle` renders a native `h2`, or `h3` for a subsection; do not nest it inside another heading. `FieldGroup columns={2}` splits at its own 480px container width.
- Settings pages share `useSettingsForm`, `useUnsavedChanges`, and one `StickySaveBar`. Save changes authoring data; verified publication status requires a publication receipt.
- Editing pages call `usePreviewSlot`; the shell renders the same registration in its desktop rail and mobile sheet. `PagePreview` uses the real `PublicPage`. Its plain document viewport renders at 390px, fits the available width, and caps scrolling at 570px. Keep the toolbar unscaled and omit phone chrome.
- Settings → Wallet previews the pass card itself. Shared pass limits and content resolution stay in `packages/validators/src/wallet.ts`. The preview does not prove signing or installation; downloads remain authenticated admin actions.
- Public `page_layout=split` gives a sticky 320px profile column and one full-width block stack from a 896px container width. `stacked` puts profile above blocks. Narrow pages always stack. Sections use vertical lists, including saved legacy grid/carousel settings.
- Public images default to contain; explicit cover crops to fill. The same renderer and theme projection serve Next, inline preview, and static output.
- Login/reset-password stay compact with ordinary site branding. Dedicated login-logo/background controls are removed, with legacy records preserved for backups. Keep the TOTP/backup-code step and local-only development-login safeguards.

## Change and verify

Update source first, then the relevant docs page. Reuse validators for accepted values and limits. Check light/dark, desktop/touch, focus and error states, actual public output, and reduced motion for affected surfaces. A screenshot or local preview is not proof of publication, pass signing, or a live integration.
