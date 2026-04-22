# CODEX_PROMPT_NATIVE_FEED_FINDER.md

You are working inside an existing frontend product called **RSSHubVite**.

Your task is to implement **Feature #2: Native Feed Finder** as an incremental feature inside the current app.

This is not a broad discovery engine.
This is not hybrid discovery.
This is a direct source-acquisition feature that helps a user turn a URL or likely intended known source into a validated feed result.

Read these files first and treat them as the source of truth, in this order:

1. `EXEC_PLAN_NATIVE_FEED_FINDER.md`
2. `FEATURE_NATIVE_FEED_FINDER.md`
3. `README.md`

If these documents conflict:
- `EXEC_PLAN_NATIVE_FEED_FINDER.md` controls build order and done criteria,
- `FEATURE_NATIVE_FEED_FINDER.md` provides product and architecture context,
- `README.md` provides repo-local orientation.


## Product goal

Make feed acquisition feel:
- direct,
- trustworthy,
- understandable,
- fast,
- and clearly bounded.

The ideal user experience is:

1. the user pastes a URL or enters a likely source,
2. the system resolves one or more feed-capable results,
3. the user can preview the result,
4. the user can add/subscribe immediately.

The feature should feel closer to:
- “paste a source, get the feed”

than:
- “search the web and hope something works.”

## Product references

Use these references only for feature framing and UX expectations:
- **GetRSSFeed** for direct URL-to-feed extraction feel
- **RSS Finder** for feed-finding UX patterns
- **RSS.com Find My Feed** as a structured lookup reference
- existing **RSSHubVite** frontend patterns as the product shell to extend :contentReference[oaicite:1]{index=1}

Do not clone any of these literally.

## Critical boundary

This feature must remain separate from **Feature #3: Hybrid Discovery**.

### Feature #2 must do:
- resolve direct feed URLs
- inspect page URLs for native feed autodiscovery
- apply supported deterministic mappings
- use internal source lookup to find likely known sources
- validate final feed results before presenting them strongly

### Feature #2 must not do:
- open-web search
- general-purpose discovery
- broad hybrid retrieval
- feed guessing without validation
- open-ended semantic exploration

## Search and resolution model

The Native Feed Finder uses:

> **deterministic feed resolution with registry-scoped keyword and semantic candidate lookup**

This means:

- deterministic resolution and validation decide final results
- keyword and semantic lookup are allowed only to identify candidate known sources
- semantic lookup may search only inside the supported-source registry
- final feed results must always pass deterministic validation before being shown strongly

### Why semantic lookup exists

Semantic lookup exists because user intent often matches source meaning better than source URL structure.

Its purpose is narrow:

> recover likely intended known sources when lexical matching fails because user query terms do not directly match feed URLs, source names, or aliases.

Semantic lookup must not decide final feed results on its own.

## Input types to support

### 1. Direct feed URL
Examples:
- RSS URL
- Atom URL
- direct XML feed

Expected behavior:
- validate directly
- parse preview
- return immediately if valid

### 2. Normal page URL
Examples:
- homepage
- blog page
- creator page
- publication page
- channel page

Expected behavior:
- inspect for native feed autodiscovery
- inspect supported deterministic mappings
- validate candidate feeds
- return ordered results

### 3. Non-URL source input
Examples:
- creator name
- publication name
- known source title
- likely source phrase

Expected behavior:
- treat as source lookup against the internal supported-source registry
- use exact match, alias match, keyword lookup, and optional semantic lookup
- resolve candidate sources into feed results
- validate before presentation

Do not treat this as open-web search.

## Resolution pipeline

### URL pipeline
For URL input, prefer this order:
1. direct feed validation if it already looks like a feed
2. native HTML autodiscovery
3. alternate link/header inspection
4. supported deterministic mappings
5. validation and preview extraction
6. result return

### Non-URL pipeline
For non-URL input, use:
1. input normalization
2. exact source-name match
3. alias match
4. keyword lookup over supported-source registry
5. optional semantic lookup over supported-source registry
6. candidate source set
7. deterministic feed resolution
8. validation
9. result return

## Allowed search corpus for semantic lookup

Semantic lookup may search only over the internal supported-source registry, including fields such as:
- source name
- aliases
- labels/tags
- descriptions
- platform metadata
- canonical URL/domain text
- stable identifiers only when human-meaningful

It must not search:
- the open web
- arbitrary fetched page content outside the registry
- child feed items as if they were discovery documents
- unsupported-source corpora

## Result requirements

Each result should clearly communicate:
- title
- feed URL
- source URL if available
- support type
- confidence
- discovery/resolution method
- preview items if available
- whether it is the strongest/canonical result

The user should be able to:
- inspect the result
- copy the feed URL
- add/subscribe immediately

## UX expectations

The feature should have clear states:
- idle
- resolving
- success with single result
- success with multiple results
- no result
- error

Important:
- “No native feed found” must be distinct from technical failure
- broad discovery-style queries should be gently redirected in copy, not overpromised
- if the input is too broad, the UI should imply that broader source discovery belongs to Hybrid Discovery

## MVP implementation expectations

For MVP, implement:
- direct feed validation
- native feed autodiscovery
- supported deterministic mappings already available in the stack
- exact and alias source lookup
- normalized keyword lookup
- optional semantic lookup over supported-source registry only
- preview before subscribe
- clear add/subscription flow

Do not implement in MVP:
- open-web semantic search
- open-web keyword search
- hybrid discovery behavior
- automatic proxy generation
- unvalidated feed guessing

## Acceptance criteria

The task is successful if:
- a direct feed URL can be validated and previewed
- a normal page URL can resolve to native feed results when available
- supported deterministic mappings resolve correctly
- non-URL source input can retrieve candidate known sources from the supported registry
- semantic lookup, if used, is registry-scoped only
- all strong results are validated before display
- the user can add/subscribe from the result surface
- the feature integrates cleanly into the existing RSSHubVite frontend
- the feature remains clearly narrower than Hybrid Discovery

## Working style

Work directly in the repo.

As you work:
1. inspect the existing add/discover/feed-related flows,
2. identify where Native Feed Finder should live,
3. implement the feature within the current product surface,
4. keep deterministic validation as the final gate,
5. summarize the final architecture and UI flow.

If tradeoffs are needed, prioritize:
- determinism over recall,
- trust over cleverness,
- resolution clarity over broad search behavior.