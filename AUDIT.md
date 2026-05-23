# Family Tree Audit
_2026-05-23_

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | No keyboard navigation, no ARIA on chart |
| 2 | Performance | 3 | Full chart re-creation on every data change; otherwise fine |
| 3 | Theming | 3 | Light mode invisible text fixed; now good |
| 4 | Responsive Design | 2 | Fixed `calc(100vh - 44px)` height; no mobile support |
| 5 | Anti-Patterns | 4 | No AI slop; intentional D3-based chart |
| **Total** | | **14/20** | **Good** |

---

## Bugs Fixed (2026-05-23)

### [P0] Light mode — card text invisible
**File:** `src/theme.css:123`  
`--text-color: #f6f4ef` was the same value as the light background (`--bg`), making all card text invisible. Changed to `#1c1b18` (the light theme's `--text-1`). Dark text on the library's coloured card backgrounds (blue/pink/grey) is readable in both themes.

### [P0] `.f3` container missing `background-color` / `color`
**File:** `src/theme.css`  
The library only sets `background-color` and `color` on `.f3.f3-cont`, not `.f3` alone. Our container only has `className="f3"`. Added explicit property declarations on both theme selectors so the chart area fills with the correct background instead of being transparent.

### [P1] Main card outline invisible in light mode
**File:** `src/theme.css` / library CSS  
The library hardcodes `outline: 4px solid rgba(220, 220, 220, 1)` on `.card-main .card-inner` — near-white on a near-white background. Added a light-mode override using `rgba(28, 27, 24, 0.55)`.

### [P1] Path-to-main outline invisible in light mode
**File:** `src/theme.css` / library CSS  
Same issue: `rgba(255, 255, 255, 1)` (pure white). Overridden to `rgba(28, 27, 24, 0.4)`.

---

## Remaining Issues

### [P1] No keyboard navigation in the chart
The family-chart library renders a D3/SVG tree that is not keyboard-navigable. Users who don't use a mouse cannot navigate the tree. No quick fix without patching the library or wrapping its internal focus management.

### [P2] Chart fully re-creates on any dependency change
**File:** `src/FamilyTree/index.tsx:94`  
`state.settings` is in the render effect's dependency array, so changing any setting while viewing the tree resets zoom position and panned state. Could be split into a separate effect that calls `chart.updateMainId()` without full re-creation.

### [P2] `requestAnimationFrame` zoom timing is fragile
**File:** `src/FamilyTree/index.tsx:114`  
`cardToMiddle` fires after 1 frame (~16ms), but the initial `tree_position: 'fit'` D3 transition may still be in progress. A `setTimeout` of ~350ms (matching the transition duration) would be more reliable.

### [P3] Genderless card colour blends into light background
`lightgray` (`#d3d3d3`) is too close to the light mode background (`#f6f4ef`). Overriding `--genderless-color` in light mode to something with more contrast would help.
