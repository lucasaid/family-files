---
name: Family Files
description: A private desktop archive for a family's visual and genealogical history
colors:
  # Light theme (canonical warm palette; all tokens have dark-theme alternates via CSS custom properties in src/theme.css)
  surface: "#f6f4ef"
  surface-panel: "#edebe4"
  surface-elevated: "#e4e1da"
  surface-active: "#d8d5ce"
  text-primary: "#1c1b18"
  text-secondary: "#4e4d49"
  text-muted: "#79786f"
  text-dim: "#9e9d94"
  text-heading: "#1a3562"
  accent: "#1d4db0"
  amber: "#a06010"
  green: "#2a7848"
  error: "#c0392b"
  border: "#d5d2cb"
  border-muted: "#ccc9c2"
typography:
  display:
    fontFamily: '"Georgia", "Times New Roman", serif'
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.01em"
  headline:
    fontFamily: '"Georgia", "Times New Roman", serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.01em"
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.1em"
  micro:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "9px"
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  xl: "8px"
  pill: "10px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "36px"
components:
  button-primary:
    backgroundColor: "#dce5f5"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
  button-save:
    backgroundColor: "#d4edda"
    textColor: "#1a5e35"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  button-ghost-hover:
    textColor: "{colors.accent}"
  input-default:
    backgroundColor: "#ffffff"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  chip-keyword:
    backgroundColor: "#dce5f5"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "1px 7px"
---

# Design System: Family Files

## 1. Overview

**Creative North Star: "The Curated Memory Box"**

Family Files is a private archive, not a product. The interface recedes so that photographs, faces, and documents take the foreground. Every design decision that asks "should this be more prominent?" is answered by asking whether the prominence serves a person, a photo, or a story — not the application itself.

The aesthetic is warm ash and faded steel: parchment-toned surfaces that feel like paper rather than screen, a steel-blue accent as rare and deliberate as a library stamp, and a serif typeface that appears only where history warrants it. There are two typographic voices. Georgia carries the archival register — person names, page headings, the wordmark. system-ui carries everything functional — navigation labels, metadata fields, buttons — and disappears on use. The two voices never mix within a single component.

Depth is expressed through tonal surface stepping, not shadow. Six named surface values step from `surface` to `surface-active`; the eye reads the elevation without needing a drop shadow to announce it. Shadows are reserved for one context only: the modal that floats above the application. That restraint makes the modal feel genuinely elevated when it appears.

**Key Characteristics:**
- Content-first: nothing in the chrome competes with the photograph
- Two-voice typography: Georgia for the archival register, system-ui for the functional register
- Faded steel accent on 10% or less of any screen; rarity is the signal
- Warm ash neutrals across six tonal steps; no surface is pure white or pure black
- Tactile and honest controls: visible borders, clear affordances, legible at larger text sizes
- Tonal elevation; shadows appear only for modal overlays

## 2. Colors: The Warm Ash and Faded Steel Palette

The palette is built around warm ash neutrals and a single restrained accent. Two semantic accents support it: amber for faces and ratings (personal warmth), sage green for saved states (trust and confirmation).

### Primary
- **Faded Steel** (`#1d4db0` / dark: `#9bb8f5`): The accent. Used only on active nav links, primary interactive affordances, and focus rings. Its rarity is the point.

### Secondary
- **Archival Amber** (`#a06010` / dark: `#f0b060`): Warm amber for face-related actions — face tags, star ratings, and the face-tag editor mode indicator. Signals personal association and warmth, never urgency.

### Tertiary
- **Sage Green** (`#2a7848` / dark: `#7ecfa0`): Used exclusively for save/confirmed states (save button, saving indicator). Reinforces that a write succeeded without alarming.

### Neutral
- **Warm Parchment** (`#f6f4ef`): The primary background surface. Slightly warm — never cool, never white. The entire archive rests on this.
- **Ash Panel** (`#edebe4`): Sidebars, metadata panels, the filmstrip background. One tonal step down from the main surface.
- **Ash Elevated** (`#e4e1da`): Elevated containers, active state backgrounds, filmstrip viewer.
- **Ash Active** (`#d8d5ce`): Pressed states and the deepest tonal step before reaching border values.
- **Deep Ink** (`#1c1b18`): Primary body text. A warm near-black — never `#000`.
- **Aged Slate** (`#4e4d49`): Secondary text; long-form descriptions.
- **Faded Slate** (`#79786f`): Muted text; metadata read-only values; inactive nav links; label text at 12px and above.
- **Parchment Dim** (`#9e9d94`): Placeholder text, secondary counters. Minimum contrast floor: never use for information-bearing text at 11px or below.
- **Navy Heading** (`#1a3562`): Page and section headings in the Georgia voice. Deep navy that anchors serif type against warm surfaces.
- **Error Red** (`#c0392b`): Destructive state and validation errors only.

### Named Rules

**The Rarity Rule.** The accent (Faded Steel) is used on 10% or less of any given screen: one active nav link, primary interactive affordances, focus rings. Everywhere else is neutral. Its presence is a signal, not decoration. If you see accent blue on more than two elements at once, one of them is wrong.

**The No-Pure-Extremes Rule.** No `#000` or `#fff`. Every surface is tinted toward the warm-ash hue at minimum chroma. Pure black and pure white have no place in an archive that was made by human hands. The viewer background is `#000000` in the current implementation; migrate to `oklch(4% 0.005 85)` as time allows.

**The Contrast Contract.** `--text-4` (`#9e9d94` light / `#444444` dark) fails WCAG AA at 9-10px. Use `--text-3` (`#79786f` / `#666666`) as the minimum for any information-bearing micro-label. Placeholder text and decorative separators may use `--text-4`; field labels, metadata headers, and section labels may not.

## 3. Typography

**Display Font:** Georgia (with "Times New Roman", serif fallback)
**Body / UI Font:** system-ui (-apple-system, sans-serif)
**Mono Font:** ui-monospace, monospace (keyboard shortcuts only)

**Character:** Georgia carries the weight of something personal and made with care; system-ui disappears into the task. The pairing is not about elegance — it is about the archive speaking with a different voice than the application.

### Hierarchy

- **Display** (Georgia, 400, 28px, lh 1.2, ls +0.01em): Person name `h1` on PersonDetail. The largest type in the system; appears once per screen at most.
- **Headline** (Georgia, 400, 20px, lh 1.3, ls +0.01em): Page section headings ("Archive", "Albums", "People"). Signals the subject of the current view, not the application.
- **Wordmark** (Georgia, 400, 15px, ls +0.04em): "Family Files" in the nav bar. Slightly wider tracking for legibility at small size; always `--text-heading` (navy).
- **Title** (system-ui, 600, 14px, lh 1.4): Settings section labels, modal headers. The heaviest weight in the system; used sparingly for UI structure, never content.
- **Body** (system-ui, 400, 13px, lh 1.5): Description text, document content, metadata values in read mode. Cap prose at 65-75ch.
- **Label** (system-ui, 600, 10px, uppercase, ls +0.1em): Section sub-labels, stat counts ("12 photos", "3 albums"). Bold and tight tracking compensate for small size.
- **Micro** (system-ui, 500, 9-10px, uppercase, ls +0.08em): Metadata field labels ("Date taken", "Caption", "Rating"). Always uppercase with tracking. Minimum color: `--text-3`.

### Named Rules

**The Two-Voice Rule.** Georgia is the archival voice; it appears only when the subject has historical weight: a person's name, a page heading, the wordmark, an album name inside a photo card. system-ui is the functional voice; it appears everywhere the application is speaking. Never mix them within a single component. A button is always system-ui. A person's name is always Georgia.

**The Small-Type Contract.** Any text at 10px or below must be uppercase with at least +0.08em letter-spacing to remain legible. At that size, use `--text-3` or above. Dimmer colors (`--text-4`, `--text-5`) may carry decorative separators — not labels.

## 4. Elevation

The system is flat by default. Depth is expressed through tonal surface stepping across six named values (`surface`, `surface-panel`, `surface-elevated`, `surface-active`), not through shadows. This produces readable hierarchy without chrome that competes with photographs.

Shadow appears in exactly one context: the settings modal overlay, which uses `0 8px 32px rgba(0,0,0,0.3)` to anchor it visibly above the application surface. Any new modal or floating element may inherit this value.

### Shadow Vocabulary
- **Modal** (`0 8px 32px rgba(0,0,0,0.3)`): The floating settings panel. Conveys that this surface is above everything else.

### Named Rules

**The Flat-By-Default Rule.** Surfaces at rest cast no shadow. Layering is expressed tonally: `surface` then `surface-panel` then `surface-elevated` then `surface-active`. Adding a shadow to a non-modal element is an exception that must earn its place.

## 5. Components

Philosophy: tactile and honest. Controls look like controls — visible borders, clear affordances, legible at larger text sizes. The system is designed to be navigable by someone unfamiliar with the app without coaching. Nothing is ghost-only as the primary affordance.

### Buttons

- **Shape:** Gently squared edges (3px / `rounded.sm`); never pill, never sharp.
- **Primary:** Blue-tinted fill (`#dce5f5` background, `#1d4db0` text, `#9bb8f5` border). Padding 4px 12px. Hover: background shifts to `#1d4db0`, text to `#f6f4ef`. 0.15s ease-out.
- **Save:** Green-tinted fill (`#d4edda` background, `#1a5e35` text, `#7ecfa0` border). Appears only on explicit save/confirm actions; never as a generic primary action.
- **Cancel:** Neutral fill (`#e8e5de` background, `#ccc9c2` border, `#666` text). Clearly secondary; no accent color.
- **Ghost:** No background, transparent border. Color: `--text-muted`. Hover: transitions to `--accent` (0.15s ease-out). Used for navigation and utility actions where the label is sufficient.
- **Ghost-outline:** No background, 1px `--border-muted` border. Hover: both color and border shift to `--accent`. Used for secondary actions that need a visible boundary.
- **Focus:** 2px solid `var(--accent)` outline, 2px offset. Applied via `:focus-visible` globally; never override `outline: none` on buttons.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`.

### Chips

- **Keyword chips:** Pill shape (`10px` / `rounded.pill`), blue-tinted fill (`#dce5f5`), `#1d4db0` text, 1px `#9bb8f5` border. Padding 1px 7px. 11px text. Remove button (×) inside chip needs `aria-label="Remove keyword [name]"`.
- **Person chips (RelativeChip):** `6px` radius (`rounded.lg`), `surface-elevated` background, `--border-muted` border. Linked persons use accent text; unlinked persons use `--text-secondary`.

### Cards / Containers

- **Corner Style:** 2px radius (`rounded.xs`) on photo/album thumbnails — evokes printed photographs.
- **Background:** `--bg-card` (`#fafaf6` light / `#111111` dark).
- **Shadow Strategy:** None. Containers are differentiated by tonal surface value, not shadow.
- **Photo/Album cell:** Square aspect ratio. Full-bleed cover image. `linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.2), transparent)` overlay for text legibility. Georgia serif name over the gradient. Hover: thumbnail scales to 1.05 (0.25s ease-out), gradient opacity increases.

### Inputs / Fields

- **Style:** 1px stroke border (`--input-border`), opaque background (`--input-bg`), 3px radius.
- **Focus:** 2px `var(--accent)` outline, 2px offset. Never override `outline: none`.
- **Placeholder:** `--text-dim` color. Disappears on input.
- **Field label:** 9-10px micro text, uppercase, +0.08em tracking. Minimum color: `--text-3`.
- **Error:** `--color-error` text for the error message. `role="alert"` on the error container.

### Navigation

- Fixed 44px-height top bar. Georgia wordmark left; system-ui nav links center; controls (theme toggle, settings) right.
- **Nav links:** 11px, 500 weight, uppercase, +0.1em tracking. Height fills the nav bar (44px); bottom border used as active indicator.
- **Active state:** `--accent` text color, 2px solid `--accent` bottom border, box-sizing: border-box to prevent height shift.
- **Inactive state:** `--text-3` text. Hover: transition to accent (0.15s ease-out).

### Filmstrip

The photo filmstrip is a signature component. Horizontal scrolling strip of 56×44px thumbnail images below the main viewer.

- Thumbnails: 2px radius, 2px border (`transparent` inactive, `--accent` active).
- Background: `--bg-filmstrip` (deepest neutral, matches viewer for seamlessness).
- Active thumbnail auto-scrolls into view (`scrollIntoView` smooth, inline center).
- Each thumbnail must be keyboard-focusable (`tabIndex={0}`, `role="button"`, `onKeyDown` Enter/Space).

### MetadataPanel

The 260px fixed-width right panel on the Photos route.

- **Header:** File name in `--text-1`, 12px bold. Edit/Done toggle button right-aligned.
- **Body:** Scrollable, `10px 12px` padding, `14px` gap between field groups.
- **Field groups:** Label above value, 3px gap. Label: micro style (`9px`, uppercase, `--text-4`). Value: 12px `--text-2`.
- **Toggle buttons (Show Faces, Face Tag Editor):** Full-width, 6px vertical padding, state-colored (amber for faces, primary for tag editor).

## 6. Do's and Don'ts

### Do:

- **Do** use Georgia only for person names, page `h1` headings, album names in photo cards, and the "Family Files" wordmark. It signals "this is about a person or a collection." Every other text element uses system-ui.
- **Do** use the accent (Faded Steel, `#1d4db0`) on 10% or less of any screen. One active nav link, primary interactive affordances, focus rings. Its appearance must feel like a signal.
- **Do** use `--text-3` (`#79786f` light) or above for any information-bearing label at 10px or below. `--text-4` and below fail WCAG AA contrast at small sizes.
- **Do** add `aria-label` to every button whose accessible name is a glyph: the back arrow (←), the settings gear (⚙), the theme toggle (☀/☾), modal close (×), keyword remove (×). The label must describe the action, not the glyph.
- **Do** make every interactive element keyboard-reachable: `tabIndex={0}`, `role="button"` (or a semantic button element), and `onKeyDown` handling for Enter and Space. This includes filmstrip thumbnails and star rating controls.
- **Do** let the photograph dominate the Photos view. Minimize surrounding chrome. The sidebar is 260px; the viewer takes everything else.
- **Do** use tonal surface stepping for perceived depth. `surface-panel` for sidebars, `surface-elevated` for floating containers, `surface-active` for pressed states.
- **Do** add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and a focus trap to any modal overlay.

### Don't:

- **Don't** produce a generic admin dashboard: colorless surfaces, data-grid density, no warmth, no serif type. This is a family archive. Refer to Ancestry or a generic CRUD tool as the anti-reference when reviewing new screens.
- **Don't** use consumer photo app patterns (Google Photos, iCloud): equal-grid layouts of algorithm-sorted thumbnails, platform branding, engagement-driven chrome. The archive is hand-curated; the UI should reflect that.
- **Don't** use genealogy SaaS patterns (Ancestry, MyHeritage): dated dense forms, commercial-first hierarchy, subscription-flavored affordances.
- **Don't** use a `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, alerts, or callouts. Rewrite with a full border, a tinted background, or a leading indicator.
- **Don't** use `background-clip: text` with a gradient for decorative text color. Use a single solid `--text-heading` or `--accent` value and adjust weight or size for emphasis.
- **Don't** mix Georgia and system-ui within a single component. A button is always system-ui. A person's name is always Georgia. The two voices are kept strictly separate.
- **Don't** override `outline: none` on focusable elements. The global `:focus-visible` rule is the accessibility contract. Removing it breaks keyboard navigation for every user who relies on it.
- **Don't** use `--text-4` (`#9e9d94` light / `#444444` dark) for metadata field labels or any information-carrying micro-label. It fails WCAG AA at 9-10px. Minimum: `--text-3`.
- **Don't** create nested cards. One surface level per visual unit. If you feel the need for a card inside a card, the outer wrapper is probably unnecessary.
- **Don't** animate layout properties (width, height, padding, top, left). Animate only `transform` and `opacity`.
