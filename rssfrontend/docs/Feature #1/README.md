# Feature #1 — UI Cleanup / Frontend Polish

This folder contains the planning and implementation prompts for **UI cleanup / frontend polish + codebase hygiene** for the existing **RSSHubVite** frontend.

This feature is an incremental cleanup pass over the current product surface.
It is not a redesign from scratch, and it is not a new product feature in itself.

---

## What This Feature Is

Feature #1 is a focused refinement of the current frontend experience.

Its purpose is to make RSSHubVite feel:
- cleaner,
- calmer,
- more visually consistent,
- easier to scan,
- more intentional,
- and easier to maintain.

This feature improves the quality of the existing interface so later features can be layered onto a stronger product surface.

---

## What It Does

This feature improves:
- layout consistency,
- spacing and visual rhythm,
- typography hierarchy,
- feed/list scanning ergonomics,
- empty/loading/error state quality,
- repeated UI-pattern consistency,
- and frontend code hygiene where it directly supports UI quality.

It is the feature layer that makes the app feel more like a cohesive product and less like a collection of individually built screens.

---

## What It Does Not Do

This feature does not:
- redesign the product from scratch,
- change backend behavior,
- implement discovery/search functionality,
- introduce AI features,
- replace the app’s information architecture,
- or build a large design system.

It is a focused polish and maintainability pass.

---

## Relationship to the Other Features

### Feature #1 — UI Cleanup / Frontend Polish
Improves the quality, consistency, and maintainability of the frontend surface.

### Feature #2 — Native Feed Finder
Adds a direct source-acquisition flow that resolves URLs or likely intended known sources into validated feed results.

### Feature #3 — Hybrid Discovery / Search
Adds the broader search and discovery layer across supported feed-capable sources.

This separation should remain clear:

- **Feature #1** = improve the frontend surface
- **Feature #2** = resolve sources into validated feeds
- **Feature #3** = broader search and discovery

---

## Product Direction

The intended direction is influenced by:
- **Folo** for premium product feel,
- **Readwise Reader** for calmer hierarchy and reading ergonomics,
- **Feeder** for simpler mainstream feed-reader usability. :contentReference[oaicite:0]{index=0}

These references should guide:
- spacing,
- hierarchy,
- restraint,
- density,
- and polish.

They should not be copied literally.

---

## Project Docs in This Folder

The feature spec defines the cleanup target, and the prompts define how Codex should execute it.

### `FEATURE_UI_CLEANUP.md`
The main product/spec-level definition of the UI cleanup feature.

### `CODEX_PROMPT_UI_CLEANUP.md`
The product-direction / vision prompt for Codex.

### `EXEC_PLAN_UI_CLEANUP.md`
The implementation-focused Codex prompt for executing the cleanup in the repo.

### `README.md`
This overview file describing the feature, its scope, and how to read the folder.

---

## Document Precedence

If there is any conflict between docs in this folder, use this order:

1. `FEATURE_UI_CLEANUP.md`
2. `EXEC_PLAN_UI_CLEANUP.md`
3. `CODEX_PROMPT_UI_CLEANUP.md`

Interpretation:
- `FEATURE_UI_CLEANUP.md` defines the feature boundary and success criteria
- `EXEC_PLAN_UI_CLEANUP.md` defines implementation behavior
- `CODEX_PROMPT_UI_CLEANUP.md` defines design direction and product feel

---

## Recommended Read Order

1. `README.md`
2. `FEATURE_UI_CLEANUP.md`
3. `CODEX_PROMPT_UI_CLEANUP.md`
4. `EXEC_PLAN_UI_CLEANUP.md`

---

## Scope Orientation

This feature should focus on:
- app shell consistency,
- route-level layout cleanup,
- feed/list readability,
- state-surface polish,
- repeated component consistency,
- and targeted maintainability cleanup.

It should not expand into:
- discovery feature work,
- backend feature work,
- unrelated refactors,
- or speculative redesign.

---

## Definition of Done

This feature is complete when:
- the frontend feels more visually consistent,
- spacing and hierarchy are more disciplined,
- repeated UI patterns are more standardized,
- reading/list surfaces are easier to scan,
- empty/loading/error states look intentional,
- code is cleaner where UI cleanup touched it,
- and major existing flows still work.

---

## One-Sentence Definition

Feature #1 is an incremental UI and code-hygiene cleanup pass over the existing RSSHubVite frontend that improves consistency, readability, and product polish without redesigning the app from scratch.