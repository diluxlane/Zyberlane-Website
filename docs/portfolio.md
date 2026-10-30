> Historical phase record. Current agency positioning, service ownership, ten-route sitemap and portfolio navigation supersede conflicting older copy/counts here. See [agency-repositioning.md](agency-repositioning.md). Technical safeguards remain applicable.

# Portfolio categories

The homepage's Selected Work rails and the All Work dialog use the same static
project cards and `assets/portfolio.js`. There is no separate portfolio page or
portfolio API. No client/CMS data is needed to render this catalog.

Add a project using the existing `.project-card` markup, a unique `data-slug`,
and exactly one `data-project-category`:

| Value | Meaning |
| --- | --- |
| `client-projects` | Real work for actual clients |
| `concept-projects` | Independent/self-initiated Zyberlane projects |
| `design-studies` | Recreations or implementation studies |

Place the card before the category's `.work-end` invitation in `index.html`.
The controller also groups cards by their metadata, so a card added to another
track is moved to its assigned category. Do not duplicate a card for the dialog:
it clones the catalog when opened. Keep the card's descriptive `.category` text
(such as “Studio Website · Content Management”) separate from this classification.

The existing Divine Tattoo project is client work. The existing Dilux Lane
video-editing portfolio is a Design Study, based on the owner's explanation that
it recreates another creator's portfolio design. Its original text and link are
retained. There are currently no Concept Projects; show the empty state rather
than inventing entries. Unknown metadata never defaults to client work; those
cards remain available in All Work with a classification-pending explanation.

Each homepage rail has the same scroll-driven controller, previous/next buttons,
keyboard controls and native horizontal overflow under reduced motion. An empty
category has its invitation card and disabled movement controls.

The top View All Work opens all three groups in order. Each category invitation
opens only that group. Every group is rendered immediately with an initial batch
so later categories do not depend on expanding earlier ones. View More appends
only that group's next batch, retaining the dialog's scroll position. A one-column
grid starts with three cards; wider grids start with two complete rows. Resizing
preserves previously revealed cards and rounds up to complete rows. A button is
hidden when there are no more projects. Only new cards receive the existing entry
animation; reduced motion skips it.

The original inline portfolio controller was moved to a same-origin script. Its
obsolete inline-script hash was removed from both hosting CSPs; all other hashes
and permissions remain unchanged.

## Browser verification

From the repository root, run `node tests/portfolio.cjs` with Playwright and its
Chromium browser installed. `PORTFOLIO_BROWSER` can select an existing executable.
The test serves the local site and checks both the real catalog and an isolated
larger catalog injected only into test responses. Fixtures are never written to
the site's project data. External fonts, CDN SDK and CMS requests are excluded.
