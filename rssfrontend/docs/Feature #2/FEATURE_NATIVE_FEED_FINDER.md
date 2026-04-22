# FEATURE_NATIVE_FEED_FINDER.md

# Native Feed Finder
## Product / Technical Specification v1

## 1. Purpose

The Native Feed Finder is a source-acquisition feature inside the existing RSSHubVite frontend.

Its purpose is to let a user enter:
- a website URL,
- a source page URL,
- a creator/profile URL,
- or a search-like source query,

and resolve that input into one or more valid feed-capable results.

This feature is focused on **native feed finding first**:
- native RSS,
- native Atom,
- known structured feed surfaces,
- validated source-specific mappings where already supported.

It is not a full hybrid discovery engine.
It is the direct feed-finding layer that helps users convert a known source or URL into a usable feed result.

---

## 2. Product Goal

Make feed acquisition feel simple and trustworthy.

The user should be able to:
1. paste a URL or enter a source query,
2. see likely feed-capable results,
3. understand which result is canonical,
4. preview what the feed represents,
5. subscribe or add it immediately.

This should feel closer to:
- “paste a URL, get the feed”
than
- “search the whole web and guess what might work.”

---

## 3. Scope

### In scope
- feed lookup from direct URL input
- feed lookup from known source page input
- native feed detection
- known source-specific mapping where already supported
- result preview
- add / subscribe action
- frontend flow inside RSSHubVite
- clear success / failure states

### Out of scope
- open-web discovery
- broad search-engine integration
- embeddings or semantic ranking
- large-scale hybrid search
- generic crawling infrastructure
- multi-step recommendation flows
- automatic proxy generation for unsupported sites

---

## 4. Core User Stories

### 4.1 Direct URL lookup
As a user, I paste a website or page URL and get back the valid feed(s) associated with it.

### 4.2 Creator/source page lookup
As a user, I paste a creator page, publication page, or channel page and get the feed mapped from that source.

### 4.3 Query-like lookup
As a user, I enter a source name or source-like query and get feed-capable matches only if the system already supports or recognizes them through known inputs.

### 4.4 Pre-subscription preview
As a user, I can inspect the title, URL, support type, and recent items before adding the feed.

### 4.5 Clear failure explanation
As a user, if no native feed is found, I get a clear explanation instead of an ambiguous empty result.

---

## 5. Product Principles

1. **Directness first**  
   The shortest path from source input to usable feed should win.

2. **Native before adapted**  
   Prefer native RSS/Atom or validated native feed surfaces before any non-native mapping.

3. **Known mappings only**  
   If source-specific mapping is supported, it must be deterministic and explicit.

4. **No fake certainty**  
   If a result is uncertain, label it clearly.

5. **Preview before subscribe**  
   A user should understand what they are adding.

6. **Fit inside existing frontend**  
   This should feel like a natural RSSHubVite feature, not a separate product.

---

## 6. Integration Assumption

This feature is being added to an existing RSSHubVite frontend.

That means the spec assumes:
- there is already a working application shell,
- there is already some concept of feed results or subscriptions,
- new work should fit into existing route/layout/state patterns where possible,
- implementation should avoid unnecessary redesign of unrelated app surfaces.

The feature should be built as an incremental extension of the current frontend.

---

## 7. Functional Overview

The Native Feed Finder consists of four layers:

1. **Input layer**
   - accepts URL or source-like query
2. **Resolution layer**
   - detects whether input is directly resolvable
   - attempts native feed lookup
   - applies known source-specific mappings if supported
3. **Result layer**
   - normalizes candidate feed results
   - classifies confidence and support type
4. **Action layer**
   - preview
   - subscribe/add
   - copy feed URL
   - inspect source

---

## 8. Search and Resolution Model

The Native Feed Finder is **not** a broad discovery engine.
Its purpose is to resolve a likely intended source into one or more validated feed results.

For this feature, search should be defined as:

> **deterministic feed resolution with registry-scoped keyword and semantic candidate lookup**

This means:
- final results must always come from deterministic feed resolution and validation,
- keyword and semantic retrieval are allowed only to identify likely known source candidates,
- the feature must not behave like open-web search,
- the feature must not perform hybrid discovery.

### 8.1 Primary mechanism

The primary mechanism is **deterministic resolution**.

If the input is a:
- direct feed URL,
- normal website URL,
- creator page,
- publication page,
- channel page,
- known source page,

the system should attempt deterministic resolution first.

This includes:
- direct feed validation,
- HTML feed autodiscovery,
- alternate-link inspection,
- known supported platform mappings,
- source-specific stable identifier resolution.

### 8.2 Non-URL input handling

If the input is not a URL, the system should treat it as a **source lookup request**, not as a general web search.

The non-URL pipeline should be:

1. normalize the query for source-oriented lookup,
3. attempt exact source-name match,
4. attempt alias match,
5. attempt normalized keyword lookup,
6. optionally attempt semantic lookup over the internal supported-source registry,
7. resolve returned source candidates into feed candidates,
8. validate feed candidates before display.

This means that non-URL search is allowed, but only over a constrained universe of known or supported sources.

### 8.3 Keyword lookup

Keyword lookup is allowed for Feature #2, but only as a **candidate retrieval layer**.

It should:
- search over known source names,
- aliases,
- labels,
- domains,
- supported metadata fields.

It should not:
- perform open-web keyword search,
- return results that cannot be resolved into feeds,
- act as a substitute for hybrid discovery.

### 8.4 Semantic lookup

Semantic lookup is included because user intent often matches source meaning better than source URL structure, but all final feed results must still come from deterministic resolution and validation.

Its purpose in Feature #2 is narrow:

> semantic lookup exists to recover likely intended known sources when lexical matching fails because user query terms do not directly match feed URLs, source names, or aliases.

Semantic search is allowed in Feature #2 only as an **optional, registry-scoped assist layer** for non-URL input.

Its role is to improve candidate retrieval when exact, alias, or keyword matching is weak.

It may be used only over the internal supported-source registry, including fields such as:
- source name,
- aliases,
- labels or tags,
- descriptions,
- platform metadata,
- canonical URL host/domain text and other human-meaningful URL text,
- stable identifiers only when they are human-meaningful.

It must not:
- search the open web,
- search arbitrary stored content outside the supported-source registry,
- directly determine final results without validation,
- replace deterministic feed resolution,
- expand Feature #2 into hybrid discovery.

In other words:

> semantic search may help identify the intended source, but it may not decide the final feed result on its own.

### 8.5 Validation gate

Regardless of how a candidate source is found, every returned result must still pass deterministic validation.

The validation gate may include:
- direct feed fetchability,
- RSS/Atom/XML validation,
- autodiscovery confirmation,
- known-mapping confirmation,
- preview-item parse success where applicable.

No candidate should be presented as a strong or final result unless it survives this validation step.

### 8.6 Ranking model for this feature

Ranking in Feature #2 should be lightweight and resolution-oriented.

Allowed ranking factors:
- exactness of source match,
- alias match quality,
- keyword match quality,
- semantic candidate similarity within the registry, if semantic lookup is enabled,
- feed validation strength,
- canonicality confidence,
- support type confidence.

The most important rule is:

> feed validity outranks retrieval cleverness.

A semantically plausible result that cannot be deterministically validated should not outrank a validated result.

### 8.7 Search boundary with Feature #3

Feature #2 and Feature #3 must remain distinct.

#### Feature #2: Native Feed Finder
- resolves URLs or likely intended supported-source candidates into validated feed results,
- uses deterministic resolution as the final gate,
- may use keyword and semantic lookup only inside a constrained source registry,
- does not perform broad discovery.

#### Feature #3: Hybrid Discovery
- handles broader source discovery,
- may search beyond direct known-source resolution,
- may combine multiple retrieval strategies,
- may support richer query intent and expansion behavior.

Broad natural-language requests such as:
- “best feeds for ai safety”
- “rainforest lofi producer”
- “indie game dev blogs”

should only be satisfied in Feature #2 if the intended source is already present in the supported-source registry and can be surfaced through exact, keyword, or semantic candidate lookup before deterministic validation. Otherwise, those requests should fall through to Feature #3 or return a clear “not found in supported sources” state.

### 8.8 Recommended pipeline

```text
input
-> classify as URL or non-URL

if URL:
   direct feed validation
   -> autodiscovery
   -> known supported mappings
   -> validation
   -> results

if non-URL:
   normalize query
   -> exact source lookup
   -> alias lookup
   -> keyword registry lookup
   -> semantic registry lookup
   -> candidate source set
   -> deterministic feed resolution
   -> validation
   -> results

### 8.9 MVP recommendation

For MVP, implement:

-> deterministic URL resolution,
-> direct feed validation,
-> HTML feed autodiscovery,
-> known supported mappings,
-> exact and alias source lookup,
-> normalized keyword lookup,
-> optional semantic lookup over the internal supported-source registry only, preferably behind a feature flag.

Do not implement for MVP:

-> open-web semantic search,
-> open-web keyword search,
-> hybrid discovery behavior,
-> unvalidated feed guessing.

---

## 9. Resolution Pipeline

## 9.1 Input normalization
Normalize:
- whitespace
- scheme
- host casing
- trailing slashes
- obvious invalid formats

Classify input as:
- direct feed URL
- regular URL
- probable source query

## 9.2 Direct feed validation
If the input appears to already be a feed:
- validate fetchability
- validate XML/feed structure
- parse title and recent items
- return as direct result

## 9.3 Native feed discovery
If the input is a normal URL:
- inspect HTML for feed autodiscovery tags
- inspect alternate/feed link headers if available
- collect candidate native feeds
- normalize and deduplicate candidates

## 9.4 Known source-specific mapping
If no native feed is found, or if the source matches a supported platform:
- apply deterministic resolver logic for known sources
- preserve stable identifiers where relevant
- generate feed result only if mapping is validated

Examples:
- YouTube channel/handle mapping
- future platform-specific mappings, if added later

## 9.5 Candidate scoring and normalization
For each candidate:
- classify support type
- assign confidence
- identify canonical result if possible
- attach preview metadata

## 9.6 Result return
Return:
- one best result, or
- multiple ordered results if ambiguity is legitimate

---

## 10. Result Model

Each result should include:

- result ID
- display title
- feed URL
- source URL
- support type
- confidence label
- discovery method
- recent item preview
- canonical / alternate status
- add/subscription affordance

Suggested shape:

```ts
interface FeedFinderResult {
  resultId: string;
  title: string;
  feedUrl: string;
  sourceUrl?: string;
  supportType: "native" | "mapped" | "adapter";
  confidence: "high" | "medium" | "low";
  discoveryMethod:
    | "direct-feed"
    | "autodiscovery"
    | "known-mapping";
  isCanonical: boolean;
  previewItems?: PreviewItem[];
  warnings?: string[];
}
````

---

## 11. UX Surface

## 11.1 Entry points

The feature should be reachable from at least one primary place in the app:

* add feed flow
* discover/add source flow
* top-level input in an acquisition panel

Optional secondary entry points:

* empty state CTA
* import/add modal
* command-style quick add

## 11.2 Main screen states

### Idle

* input field
* helper copy
* optional examples

### Resolving

* clear loading state
* no blocking ambiguity
* deterministic progress language

### Success: single result

* canonical feed shown prominently
* preview items visible
* add/subscription button

### Success: multiple results

* canonical or strongest candidate highlighted
* alternatives listed below
* reason for alternatives visible if possible

### No result

* explain that no native feed was found
* suggest supported input types
* offer copyable normalized URL if useful
* If the input is too broad or discovery-oriented, explain that the Native Feed Finder resolves known or likely intended sources and that broader source discovery belongs to Hybrid Discovery.

### Error

* show fetch/validation failure
* distinguish from “no feed found”

---

## 12. UX Copy Principles

The UI should avoid sounding overly technical by default.

Prefer:

* “Feed found”
* “No native feed found”
* “Preview”
* “Add source”

Avoid:

* “Parser failure”
* “Autodiscovery inspection failed”
* “Unresolvable artifact”

Technical detail can exist in expandable debug or advanced view.

---

## 13. Confidence Model

Confidence is not about content quality.
It is about feed resolution reliability.

### High

* direct feed URL validated
* native autodiscovery link confirmed
* deterministic known mapping confirmed

### Medium

* multiple plausible candidates
* source structure suggests valid feed but canonicality is unclear

### Low

* weak or partial match
* should rarely be returned in MVP unless explicitly useful

Low-confidence results should generally be suppressed in MVP unless no better result exists.

---

## 14. MVP Support Policy

For MVP, support only:

* direct feed validation
* HTML feed autodiscovery
* native RSS/Atom feed parsing
* YouTube channel/handle mapping if already supported in the app stack

Do not implement in MVP:

* generic search-engine lookup
* arbitrary fallback crawling
* automatic adapter generation
* broad source-query retrieval over the web

---

## 15. Frontend Requirements

## 15.1 New components

Suggested components:

* `FeedFinderInput`
* `FeedFinderResults`
* `FeedFinderResultCard`
* `FeedFinderPreview`
* `FeedFinderEmptyState`

## 15.2 State requirements

The frontend must handle:

* idle
* validating
* resolving
* success
* empty
* error

## 15.3 Interaction requirements

Users must be able to:

* paste input
* submit
* inspect result
* copy feed URL
* add/subscribe
* retry with edited input

---

## 16. Backend / Service Requirements

Even if initially implemented inside the same app stack, the logic should be isolated behind a resolution interface.

Suggested interface:

```ts
interface FeedFinderService {
  resolve(input: string): Promise<FeedFinderResponse>;
}
```

Where:

```ts
interface FeedFinderResponse {
  query: string;
  normalizedInput: string;
  inputType: "feed-url" | "url" | "source-query";
  results: FeedFinderResult[];
  status: "success" | "empty" | "error";
  message?: string;
}
```

The implementation should separate:

* input normalization,
* native detection,
* known mapping resolution,
* preview extraction,
* result normalization.

---

## 17. Data / Persistence Decisions

For v1, resolved results do not need full long-term persistence unless tied to subscription creation.

Minimum persistence expectations:

* subscription/add action writes the chosen feed into the existing app model
* optional temporary history may be added later
* finder resolution itself does not require a large permanent result store in MVP

---

## 18. Failure Modes

### 18.1 False positive feed

A URL looks like a feed but is invalid or unrelated.

Mitigation:

* validate structure before returning high confidence

### 18.2 Multiple feeds with unclear canonicality

A page exposes more than one feed.

Mitigation:

* show multiple results
* mark strongest candidate
* preserve user choice

### 18.3 Source page with no native feed

User expects a feed but none exists.

Mitigation:

* explicit “no native feed found” state
* avoid pretending discovery is broader than it is

### 18.4 Mapping drift

Known platform mapping no longer works.

Mitigation:

* keep mapping logic isolated
* validate generated feed before returning it

### 18.5 Overbroad query expectation

User enters a broad keyword expecting full web search.

Mitigation:

* keep query-like support narrow in MVP
* explain supported input types

---

## 19. Metrics

Track at minimum:

* total feed finder submissions
* input type counts
* success rate
* empty-result rate
* error rate
* add/subscription conversion rate
* direct-feed vs autodiscovery vs mapping result rate

---

## 20. Non-Goals for This Feature

This feature does not attempt to:

* replace hybrid discovery
* rank the open web
* solve broad search
* generate feeds for unsupported sites
* provide AI summaries
* reorganize the reader timeline

Those belong to separate features.

---

## 21. Acceptance Criteria

The feature is complete when:

* a user can paste a direct feed URL and validate it,
* a user can paste a normal page URL and resolve native feed candidates if present,
* a user can resolve supported known mappings,
* result cards clearly show title, feed URL, support type, and preview,
* the user can add/subscribe from the result surface,
* no-result and error states are distinct and understandable,
* the feature integrates cleanly into the existing RSSHubVite frontend.

---

## 22. One-Sentence Definition

The Native Feed Finder is a direct source-acquisition feature that resolves URLs or likely intended known sources into validated feed results, using deterministic feed resolution with registry-scoped keyword and semantic candidate lookup inside the existing RSSHubVite frontend.

```


