---
name: expert-web-designer
description: Design and implement professional SaaS and product user interfaces, including dashboards, admin panels, settings pages, data tables, forms, landing pages, and modern web app experiences. Use when creating a new product UI, improving or redesigning an existing interface, establishing responsive layouts and visual hierarchy, selecting appropriate product interaction patterns, or turning requirements into polished frontend code for business software.
---

# Expert Web Designer

Design quiet, polished, work-focused product interfaces that help users scan information and complete repeated tasks efficiently.

## Establish Context

1. Inspect the existing application, design system, framework, components, assets, and conventions before proposing changes.
2. Identify the primary users, their highest-frequency tasks, the information they compare, and the decisions the screen supports.
3. Preserve established product patterns unless changing them solves a concrete usability or consistency problem.
4. Make reasonable assumptions when requirements are incomplete and state only assumptions that materially affect the result.

## Structure The Experience

1. Build the actual working product screen first. Do not substitute a marketing page when the request is for an application.
2. Organize navigation around stable product areas and user workflows.
3. Prioritize scanability, comparison, and repeated action for operational interfaces.
4. Keep page sections unframed. Use cards only for repeated items, modals, summaries that require a boundary, or genuinely framed tools.
5. Avoid cards nested inside cards, decorative dashboard tiles, oversized headings in compact panels, and excessive whitespace that reduces useful density.

## Choose Product Patterns

- Use tables for comparable records and include expected controls such as search, filtering, sorting, pagination, selection, bulk actions, empty states, loading states, and error states when relevant.
- Use forms with persistent labels, logical grouping, clear validation, helpful defaults, and an obvious primary action. Preserve user input after recoverable errors.
- Use tabs for sibling views, segmented controls for compact mode choices, toggles for immediate binary settings, and checkboxes for independently selectable options.
- Use icons for familiar tool actions and pair unfamiliar icons with tooltips. Prefer the repository's existing icon library.
- Keep destructive actions visually distinct, confirm consequential operations, and provide recovery where practical.
- Make permissions, disabled states, progress, saved state, and system feedback explicit.

## Build Visual Hierarchy

1. Start with typography, spacing, alignment, and content grouping before decoration.
2. Use a restrained neutral foundation with semantic accent colors. Avoid one-hue interfaces and ornamental gradients.
3. Reserve large display type for genuine hero contexts. Use compact, tightly structured headings in dashboards, tables, sidebars, and settings.
4. Use borders, dividers, background shifts, and elevation sparingly to express hierarchy rather than decorate.
5. Keep corner radii at 8px or less unless the existing design system specifies otherwise.
6. Use realistic product copy and data so layout decisions reflect actual content lengths and states.

## Design Responsively

1. Define stable dimensions and responsive constraints for sidebars, toolbars, grids, tables, controls, and repeated items.
2. Preserve task priority on small screens: collapse secondary navigation, move low-priority data into detail views, and keep primary actions reachable.
3. Let text wrap cleanly and ensure long labels, values, and validation messages cannot overlap adjacent UI.
4. Do not scale typography directly with viewport width.
5. Support keyboard navigation, visible focus, semantic HTML, sufficient contrast, and reduced-motion preferences.

## Implement In The Existing Stack

1. Reuse local components, tokens, utilities, data patterns, and state-management conventions.
2. Add abstractions only when they remove meaningful duplication or match an established pattern.
3. Implement complete interactive states rather than a static visual mockup.
4. Use real assets that reveal the product or subject when imagery is appropriate. Avoid generic atmospheric imagery.
5. Keep changes scoped to the requested workflow and avoid unrelated refactors.

## Verify The Result

1. Run the relevant formatter, type checks, and tests.
2. Inspect the interface at representative desktop and mobile widths.
3. Exercise primary actions, keyboard navigation, validation, loading, empty, error, and overflow states as applicable.
4. Check for clipped text, layout shifts, accidental horizontal scrolling, overlapping controls, inconsistent spacing, and weak contrast.
5. Use browser screenshots or visual inspection tools when available, and fix visible defects before finishing.

## Quality Bar

Deliver an interface that feels specific to the product domain, not a generic template. Favor clarity and operational efficiency over novelty. Every visible element should support navigation, comprehension, status, or action.
