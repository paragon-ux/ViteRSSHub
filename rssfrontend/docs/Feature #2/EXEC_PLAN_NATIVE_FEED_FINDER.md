# CODEX_PROMPT_NATIVE_FEED_FINDER_EXECUTION.md

You are working inside an existing frontend project called **RSSHubVite**.

Your task is to implement **Feature #2: Native Feed Finder** as a focused engineering task on the existing app.

This is not a redesign from scratch.
This is not hybrid discovery.
This is a bounded source-resolution feature.

---

## Primary objective

Build a feature that lets a user:
- enter a direct feed URL, page URL, or likely known source input,
- resolve one or more candidate feed results,
- validate those results deterministically,
- preview them,
- and add/subscribe from the existing frontend.

---

## Critical architectural rule

Final feed results must come from:
- deterministic resolution
- plus validation

Keyword and semantic search may be used only to retrieve candidate known sources from the supported-source registry.

They must not directly determine final feed results.

---

## Constraints

Do not:
- implement open-web search,
- implement hybrid discovery,
- implement arbitrary crawling,
- implement semantic search over the web,
- return unvalidated feed guesses,
- blur Feature #2 into Feature #3.

Do:
- reuse the existing app shell and flows,
- isolate resolution logic behind clear interfaces,
- keep UI states explicit,
- preserve current app patterns where reasonable.

---

## Required work phases

### Phase 1 — Audit existing frontend and flows
Inspect the current RSSHubVite codebase and identify:
- current add/subscription flow,
- current discover/import/search entry points,
- existing feed validation or resolution logic,
- existing result card patterns,
- where the Native Feed Finder should live in the UI.

Deliverable:
- short implementation summary of the chosen insertion point and reuse plan.

### Phase 2 — Define the feature flow
Implement a clear flow with these states:
- idle
- resolving
- success: single result
- success: multiple results
- no result
- error

Users must be able to:
- paste or type input
- submit
- inspect resolved results
- copy feed URL
- add/subscribe
- retry or edit input

### Phase 3 — Implement resolution logic
Support these paths:

#### A. Direct feed URL
- validate directly
- fetch preview if valid
- return strong result

#### B. Page URL
- inspect for feed autodiscovery
- inspect supported deterministic mappings
- validate resulting feed candidates
- return ordered results

#### C. Non-URL input
Treat as source lookup over the supported-source registry only.

Required lookup order:
1. exact source match
2. alias match
3. keyword lookup
4. optional semantic lookup over supported-source registry
5. candidate source set
6. deterministic feed resolution
7. validation
8. ordered result return

### Phase 4 — Integrate result UI
Implement result surfaces that show:
- title
- feed URL
- source URL if available
- support type
- confidence
- resolution method
- preview items when available
- add/subscription action

### Phase 5 — Finalize UX boundaries
Make sure the UI distinguishes:
- no native feed found
- technical error
- broad/discovery-style input outside this feature’s scope

If the input feels too broad for Native Feed Finder, the copy should avoid pretending this feature is a full discovery engine.

---

## Search / lookup rules

### Allowed
- exact match on supported-source registry
- alias match on supported-source registry
- keyword lookup on supported-source registry
- semantic lookup on supported-source registry only
- deterministic resolution from returned candidates
- validation before strong presentation

### Not allowed
- open-web keyword search
- open-web semantic search
- feed guessing without validation
- ranking arbitrary URLs by similarity alone
- hybrid discovery behavior

---

## Allowed semantic-search corpus

If semantic lookup is implemented, it may search only over supported-source registry fields such as:
- source name
- aliases
- labels/tags
- descriptions
- platform metadata
- canonical URL/domain text
- stable identifiers only if human-meaningful

Do not let semantic lookup read:
- arbitrary fetched site content
- feed item content as discovery text
- unsupported-source data
- open-web indexes

---

## Suggested implementation boundaries

Keep logic separated into clear units such as:
- input normalization
- input classification
- direct feed validation
- autodiscovery resolution
- deterministic mapping resolution
- source-registry lookup
- semantic candidate retrieval if enabled
- candidate validation
- result normalization
- preview extraction
- subscription/add action wiring

Do not collapse all of this into one large component.

---

## UI requirements

Implement or reuse components for:
- finder input surface
- result list
- result card
- preview surface
- empty state
- error state
- loading state

The UI should make clear:
- what was resolved,
- how confident the system is,
- and what the user is adding.

---

## Code hygiene expectations

Refactor only where it improves maintainability of this feature.

Good refactors:
- extract resolution service boundaries,
- normalize result shapes,
- reuse or clean up existing add-flow components,
- remove duplicated resolver UI logic if present.

Avoid:
- broad unrelated frontend cleanup,
- speculative search architecture,
- premature abstraction for future hybrid discovery.

---

## Acceptance criteria

The task is successful if:
- direct feed URLs can be validated and previewed
- normal page URLs can resolve native feed candidates when available
- supported deterministic mappings work
- non-URL source input can retrieve candidate known sources from the supported registry
- semantic lookup, if implemented, is registry-scoped only
- all strong results are validated before display
- the user can add/subscribe from the result UI
- “no result” and “error” are distinct
- broader discovery behavior is not implemented here
- the feature fits cleanly into the existing RSSHubVite frontend

---

## Decision rules

If tradeoffs are needed, prioritize:
1. deterministic validation over retrieval cleverness,
2. trust over recall,
3. source resolution over broad discovery,
4. clear UX states over feature breadth,
5. incremental integration over large rewrites.

---

## Output expectations

Work directly in the repo.

As you work:
- inspect the current frontend first,
- choose the smallest clean insertion point,
- implement the feature flow,
- keep registry-scoped lookup and deterministic validation clearly separated,
- summarize what changed and what was intentionally deferred.