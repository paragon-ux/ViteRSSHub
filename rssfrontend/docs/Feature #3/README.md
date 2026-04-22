
# Feature #3 — Hybrid Discovery / Search

This folder contains the planning stack for **Hybrid Discovery / Search** in the existing **RSSHubVite** ecosystem.

This feature is the broader search and discovery layer.
It is intentionally more expansive than **Feature #2: Native Feed Finder**, but it still operates within a disciplined, feed-capable source model.

---

## What This Feature Is

Feature #3 is a **precomputed search engine over curated, feed-capable sources**.

The MVP builds:
- a **parent hierarchy** for supported sources,
- a **child item index** beneath that hierarchy,
- **lexical retrieval only**,
- **parent fallback** when item-level retrieval is weak.

Supported in MVP:
- native RSS/Atom
- YouTube channel feed mapping
- curated seed-manifest bootstrap
- SQLite + FTS5
- refresh jobs
- discovery stub only

This feature is responsible for the broader retrieval and discovery behavior beyond direct source resolution.

---

## What It Does

This feature searches a curated universe of sources the product can actually serve, rather than the open web.

It organizes supported sources into a **parent hierarchy** and indexes the content items emitted beneath that structure.

This keeps the system:
- predictable,
- efficient,
- easier to reason about,
- aligned with feed-based retrieval.

It is the feature layer that enables:
- broader source search,
- parent hierarchy search,
- child item retrieval beneath those parent hierarchies,
- and fallback behavior when direct source resolution is insufficient.

---

## What It Does Not Do

This MVP is not:
- a full web search engine,
- a live discovery crawler,
- an embeddings-based retrieval system,
- a generic proxy platform,
- a child hierarchy builder.

The system builds **only a parent hierarchy**. Child items are indexed beneath parent nodes, but do not form their own hierarchy.

---

## Relationship to the Other Features

### Feature #1 — UI Cleanup / Frontend Polish
Improves the quality, consistency, and maintainability of the current frontend surface.

### Feature #2 — Native Feed Finder
Resolves URLs or likely intended known sources into validated feed results using deterministic resolution as the final gate.

### Feature #3 — Hybrid Discovery / Search
Handles broader search and discovery behavior across the supported source universe.

This separation should remain strict:

- **Feature #2** = resolve a likely intended source into a validated feed
- **Feature #3** = broader retrieval and discovery across supported sources and indexed child items

---

## Project Docs in This Folder

Spec defines the system, MVP decisions lock scope, exec plan defines implementation order, README explains the folder.

### `FEATURE_HYBRID_DISC_SEARCH.md`
The main architecture and system design document for this feature.

### `MVP_DECISIONS_HYBRID_DISC_SEARCH.md`
The fixed implementation choices for the v1 MVP.

### `EXEC_PLAN_HYBRID_DISC_SEARCH.md`
The milestone-by-milestone implementation plan.

### `README.md`
This overview file describing the feature, its scope, and how to read the folder.

---

## Document Precedence

If there is any conflict between docs in this folder, use this order:

1. `MVP_DECISIONS_HYBRID_DISC_SEARCH.md`
2. `EXEC_PLAN_HYBRID_DISC_SEARCH.md`
3. `FEATURE_HYBRID_DISC_SEARCH.md`

Interpretation:
- `MVP_DECISIONS_HYBRID_DISC_SEARCH.md` defines what is in scope
- `EXEC_PLAN_HYBRID_DISC_SEARCH.md` defines implementation order
- `FEATURE_HYBRID_DISC_SEARCH.md` defines the broader system model

---

## MVP Scope

Included:
- native RSS/Atom support
- YouTube adapter support
- parent-first, child-first, and hybrid query modes
- parent fallback
- manual and scheduled-refresh abstraction

Deferred:
- embeddings
- semantic ranking
- multiple adapters/proxies
- live discovery
- public-ranking ingestion
- learned intent classification

---

## Recommended Read Order

1. `README.md`
2. `FEATURE_HYBRID_DISC_SEARCH.md`
3. `MVP_DECISIONS_HYBRID_DISC_SEARCH.md`
4. `EXEC_PLAN_HYBRID_DISC_SEARCH.md`

---

## Repo Shape Assumption

```text
/src
/data
/tests
/docs
tasks.md
````

This feature assumes implementation happens inside a repo with a structure like the above, with the detailed hybrid discovery docs in this folder informing that implementation.

---

## Suggested Commands

```text
build
test
db:init
bootstrap:seeds
refresh:all
refresh:source
query:debug
```

---

## Definition of Done

The MVP for this feature is complete when it can:

* load curated seed manifests,
* resolve native RSS/Atom and YouTube sources,
* build deterministic parent hierarchies,
* fetch and index child items,
* answer lexical queries,
* return parent fallback,
* refresh feeds,
* keep discovery stubbed,
* pass tests.

---

## One-Sentence Definition

Feature #3 is the broader hybrid discovery and search layer for RSSHubVite: a precomputed search engine over curated, feed-capable sources, built around parent hierarchies, child item indexing, lexical retrieval, and parent fallback.

```
