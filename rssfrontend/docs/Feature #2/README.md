# Feature #2 — Native Feed Finder

This folder contains the spec and implementation prompts for the **Native Feed Finder** feature in the existing **RSSHubVite** frontend.

This feature is a direct source-acquisition flow.
It helps a user convert a URL or likely intended known source into a validated feed result.

It is deliberately narrower than Hybrid Discovery.

---

## What This Feature Is

Feature #2 is a **deterministic feed-resolution feature**.

Its purpose is to let a user:
- paste a feed URL,
- paste a normal page URL,
- or enter a likely intended known source,

and get back one or more validated feed-capable results that can be previewed and added immediately.

This feature is not meant to behave like a broad discovery engine.
Its job is to resolve likely intended sources into trustworthy feed results.

---

## What It Does

This feature supports:
- direct feed URL validation,
- page-level native feed autodiscovery,
- known deterministic source mappings,
- candidate source lookup over an internal supported-source registry,
- preview before subscribe,
- and direct add/subscription flow.

Its search behavior is intentionally narrow:

- deterministic feed resolution is the source of truth,
- keyword lookup is used only to retrieve candidate known sources,
- semantic lookup is allowed only inside the internal supported-source registry,
- all strong results must still pass deterministic validation before presentation.

In short:

**search helps identify the source; resolution and validation decide the feed.**

---

## What It Does Not Do

This feature does not:
- perform open-web search,
- perform hybrid discovery,
- guess feed results without validation,
- run open-ended semantic exploration,
- or replace the broader discovery/search system.

If user input is too broad or discovery-oriented, that belongs to **Feature #3**.

---

## Relationship to the Other Features

### Feature #1 — UI Cleanup / Frontend Polish
Improves the quality, consistency, and maintainability of the frontend surface.

### Feature #2 — Native Feed Finder
Resolves URLs or likely intended known sources into validated feed results using deterministic resolution as the final gate.

### Feature #3 — Hybrid Discovery / Search
Handles broader search and discovery behavior across supported feed-capable sources.

This separation should remain strict:

- **Feature #2** = resolve a likely intended source into a validated feed
- **Feature #3** = broader retrieval and discovery across the supported source universe

---

## Search Boundary

The Native Feed Finder uses:

> **deterministic feed resolution with registry-scoped keyword and semantic candidate lookup**

That means:
- URL inputs are resolved directly where possible,
- non-URL inputs are treated as source lookup against the supported-source registry,
- semantic lookup may help recover likely intended known sources when lexical matching fails,
- but final results must still come from deterministic resolution and validation.

Semantic lookup is included because user intent often matches source meaning better than source URL structure, but it must not decide final feed results on its own.

---

## Product Direction

This feature is informed by feed-finding and feed-acquisition references such as:
- **GetRSSFeed** for direct URL-to-feed extraction feel,
- **RSS Finder** for feed-finding UX patterns,
- **RSS.com Find My Feed** for structured lookup expectations. :contentReference[oaicite:1]{index=1}

These references should guide:
- clarity,
- trust,
- input simplicity,
- preview before subscribe,
- and directness of the add flow.

They should not be copied literally.

---

## Project Docs in This Folder

The feature spec defines the behavior and boundaries, and the prompts define how Codex should execute it.

### `FEATURE_NATIVE_FEED_FINDER.md`
The main product/spec-level definition of the Native Feed Finder.

### `CODEX_PROMPT_NATIVE_FEED_FINDER.md`
The product-direction / vision prompt for Codex.

### `EXEC_PLAN_NATIVE_FEED_FINDER.md`
The implementation-focused Codex prompt for building the feature in the repo.

### `README.md`
This overview file describing the feature, its scope, and how to read the folder.

---

## Document Precedence

If there is any conflict between docs in this folder, use this order:

1. `FEATURE_NATIVE_FEED_FINDER.md`
2. `EXEC_PLAN_NATIVE_FEED_FINDER.md`
3. `CODEX_PROMPT_NATIVE_FEED_FINDER.md`

Interpretation:
- `FEATURE_NATIVE_FEED_FINDER.md` defines the feature boundary and system behavior
- `EXEC_PLAN_NATIVE_FEED_FINDER.md` defines implementation behavior
- `CODEX_PROMPT_NATIVE_FEED_FINDER.md` defines product direction and UX intent

---

## Recommended Read Order

1. `README.md`
2. `FEATURE_NATIVE_FEED_FINDER.md`
3. `CODEX_PROMPT_NATIVE_FEED_FINDER.md`
4. `EXEC_PLAN_NATIVE_FEED_FINDER.md`

---

## Scope Orientation

This feature should focus on:
- direct feed URL validation,
- native feed autodiscovery from normal page URLs,
- supported deterministic mappings,
- source lookup over a constrained internal registry,
- preview and add flow,
- and clear no-result/error states.

It should not expand into:
- open-web discovery,
- hybrid search behavior,
- arbitrary crawling,
- or broad semantic retrieval.

---

## Definition of Done

This feature is complete when:
- direct feed URLs can be validated and previewed,
- normal page URLs can resolve native feed results when available,
- supported deterministic mappings work,
- non-URL source input can retrieve candidate known sources from the supported registry,
- semantic lookup, if implemented, remains registry-scoped only,
- all strong results are validated before display,
- the user can add/subscribe from the result surface,
- and the feature remains clearly narrower than Hybrid Discovery.

---

## One-Sentence Definition

Feature #2 is a direct source-acquisition feature that resolves URLs or likely intended known sources into validated feed results inside the existing RSSHubVite frontend.