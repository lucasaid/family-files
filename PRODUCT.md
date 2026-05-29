# Product

## Register

product

## Users

A small group of family members — typically 2–5 people — who share access to a personal archive of family photos, genealogy records, and historical documents. Sessions are browsing-driven: rediscovering old photos, tagging faces, organizing albums, and exploring the family tree. Some users are older and rely on larger text and straightforward navigation; no one is a power-user by default.

## Product Purpose

Family Files is a private desktop archive for preserving and exploring a family's visual and genealogical history. It exists because consumer photo apps optimize for engagement and algorithms, not for the slow, personal act of understanding where you came from. Success looks like a family member opening the app, spending 20 minutes browsing photos and following threads to the family tree, and closing it feeling like they've spent time with something real.

## Brand Personality

Warm, archival, unhurried.

The emotional register is a family album, not a productivity tool — closer to holding a box of old photographs than to using a file manager. The interface should feel like it was made by someone who cares about this specific family's history, not a SaaS product that could belong to anyone.

## Anti-references

- **Generic admin dashboards**: colorless data-grid aesthetic, dense tables, no warmth or personality. The opposite of what this is.
- **Consumer photo apps (Google Photos, iCloud Photos)**: bubbly, algorithmic, heavily branded by the platform. Optimized for engagement, not reflection.
- **Genealogy SaaS (Ancestry, MyHeritage)**: dated, commercially dense, treats history as a subscription product.

## Design Principles

1. **Material over chrome** — photos, faces, and documents are the content; the UI should recede and let them breathe. Chrome earns its space or disappears.
2. **Follow the thread** — every person leads to photos, photos lead to albums, albums lead back to people. Navigation should reward curiosity, not require planning.
3. **Generous legibility** — nothing depends on tiny type. Labels, metadata, and body text hold up at larger sizes. Older users should feel at home without needing to adjust anything.
4. **Quiet confidence** — warm without being sentimental; archival without being cold. The serif wordmark and warm neutral palette signal care, not nostalgia.
5. **Preserve the feeling of discovery** — do not optimize for efficiency at the cost of serendipity. A session that wanders from photo to person to tree to document is a success.

## Accessibility & Inclusion

- Target: WCAG 2.1 AA
- Older family members are a real part of the audience: UI must function gracefully at larger text sizes, avoid relying on hover-only affordances, and keep navigation shallow and consistent
- Keyboard navigation is required for all core actions (viewing photos, browsing the filmstrip, rating, tagging)
- `prefers-reduced-motion` is already respected; maintain it
