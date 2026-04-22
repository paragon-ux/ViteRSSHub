# FEATURE_FEED_CAPABLE_SOURCE_SEARCH_ENGINE.md

## Design Specification v1.2

## 1. Purpose

Build a precomputed search system over **feed-capable sources**. A feed-capable source is any website or public endpoint that can be represented as a structured, refreshable content feed, whether through native RSS/Atom, a validated proxy, or a trusted feed adapter.

The system should:
- organize disordered RSS-like content into a searchable **parent hierarchy**,
- rank only sources the product can actually serve,
- support both source-level and item-level retrieval,
- avoid repeated query-time crawling or SERP dependence,
- use discovery only when the existing source universe fails coverage.

This design is optimized for:
- predictable cost,
- controllable source quality,
- query-time speed,
- clean implementation in a repo-driven agent workflow.

---

## 2. Core Idea

Traditional search ranks the open web, including many sites the product cannot serve through RSS or equivalent feed mechanisms. This wastes ranking effort on unsupported sources.

Instead, this system builds a **supported source universe** in batch:

1. bootstrap parent sources from curated source manifests and approved source additions,
2. determine whether each source is natively feed-capable, proxy-capable, adapter-capable, or unsupported,
3. build a **parent hierarchy** for each supported source,
4. index both the parent hierarchy and the items emitted beneath it,
5. answer user queries by searching the supported universe directly.

The result is a **prebuilt, source-structured search engine** over feed-capable sites.

This system does **not** require a fixed category taxonomy. Sources may include optional labels, tags, and metadata, but indexing and retrieval must not depend on category membership.

---

## 3. Goals

### 3.1 Functional goals

- Search both parent sources and child items.
- Return exact child matches when confidence is high.
- Fall back to parent sources when child matches are weak.
- Refresh sources in scheduled batch jobs.
- Support native feeds and validated proxy/adapted feeds.
- Route queries by intent to the most relevant part of the parent hierarchy.

### 3.2 Non-functional goals

- No mandatory SERP request at query time.
- No per-query crawling after batch build.
- Deterministic indexing pipeline.
- Clear source eligibility rules.
- Easy extension by source type and adapter type.
- Observable ranking and refresh behavior.

### 3.3 Non-goals

- Full open-web search replacement.
- Arbitrary crawling of unsupported websites.
- Real-time discovery of every new source on the web.
- Inferring unknown child route patterns without validation.
- Building an independent hierarchy of child content.

---

## 4. Definitions

### 4.1 Parent source

A top-level source entity users may want to search or subscribe to.

Examples:
- a YouTube channel,
- a Substack publication,
- a news site section,
- a blog homepage,
- a podcast feed origin.

### 4.2 Parent hierarchy

The structured, sitemap-like organization of a source derived from validated feed-capable parent routes.

It may include:
- canonical source URL,
- alternate URLs,
- feed-backed parent routes,
- section-level routes,
- route variants,
- stable identifiers required for feed resolution.

The parent hierarchy is the only hierarchy the system builds.

### 4.3 Child item

A concrete content unit emitted beneath a node in the parent hierarchy.

Examples:
- article,
- video,
- episode,
- post,
- release note.

Child items are indexed for retrieval, but they do not form a separate hierarchy.

### 4.4 Feed-capable source

A source that can be retrieved through one of:
- native RSS/Atom,
- validated proxy feed,
- trusted adapter route,
- other approved structured feed surface.

### 4.5 Support type

One of:
- `native`
- `proxy`
- `adapter`
- `unsupported`

### 4.6 Source metadata

Optional descriptive fields associated with a source to support indexing, ranking, and filtering.

Examples:
- labels,
- tags,
- language,
- region,
- publisher type,
- trust tier,
- editorial notes.

Source metadata may improve retrieval, but the system must not require any specific taxonomy in order to function.

---

## 5. Product Principles

1. **Rank only what can be served.**  
   Unsupported sites should not consume ranking budget.

2. **Build structure in batch, retrieve at query time.**  
   Query-time work should be search, not crawling.

3. **Build only parent hierarchy.**  
   The hierarchy belongs to sources and their feed-capable routes, not to emitted content items.

4. **Index items beneath parent hierarchy.**  
   Content items are attached to parent nodes and retrieved from there.

5. **Use parent fallback deliberately.**  
   Sometimes the correct answer is the correct source, not a single child item.

6. **Treat proxies and adapters as first-class citizens.**  
   A proxy-backed or adapter-backed feed is part of the supported universe if trusted and stable.

7. **Discovery is an escape hatch, not the foundation.**

8. **Do not depend on fixed categories.**  
   The source universe is curated and extensible, but not organized around a required taxonomy.

---

## 6. High-Level Architecture

```text
Source Manifest Bootstrap
    -> Source Registry
    -> Support Resolver
    -> Parent Hierarchy Builder
    -> Parent Index
    -> Child Item Index
    -> Query Router
    -> Ranker
    -> Result Assembler
````

### 6.1 Components

#### A. Source Manifest Bootstrap

Seeds the system with candidate parent sources.

Inputs:

* curated source manifests,
* editorial additions,
* prior approved discoveries,
* trusted external source lists.

Outputs:

* candidate parent sources.

#### B. Source Registry

Stores canonical parent source records.

Each record includes:

* source ID,
* display name,
* canonical URL,
* alternate URLs,
* support type,
* trust level,
* refresh metadata,
* hierarchy metadata,
* optional source metadata.

#### C. Support Resolver

Determines whether a source is:

* native feed-capable,
* proxy-capable,
* adapter-capable,
* unsupported.

It also resolves:

* canonical feed endpoints,
* alternate identifiers,
* source-specific route rules,
* proxy/adapter mappings.

#### D. Parent Hierarchy Builder

Builds the source-level hierarchy for supported sources.

Tasks:

* normalize canonical and alternate URLs,
* derive validated feed-capable parent routes,
* organize section-level source structure,
* map stable identifiers to feed routes,
* preserve source-specific route logic.

This component does **not** build a hierarchy of child content.

#### E. Parent Index

Indexes source-level representations.

Used for:

* source selection,
* broad topical queries,
* fallback when child evidence is weak.

#### F. Child Item Index

Indexes content items emitted beneath nodes in the parent hierarchy.

Used for:

* exact content retrieval,
* freshness-sensitive queries,
* ranking within parent context.

Child items are attached to the parent hierarchy, but they are not organized into a separate hierarchy.

#### G. Query Router

Determines search strategy based on intent.

Possible modes:

* parent-first,
* child-first,
* hybrid,
* freshness-biased,
* optional metadata-constrained.

#### H. Ranker

Ranks results only within the supported universe.

#### I. Result Assembler

Returns:

* best child item,
* best parent source,
* grouped parent-plus-child results,
* fallback source suggestions.

---

## 7. Data Model

### 7.1 SourceRecord

```ts
type SupportType = "native" | "proxy" | "adapter" | "unsupported";

interface SourceRecord {
  sourceId: string;
  name: string;
  canonicalUrl: string;
  alternateUrls: string[];
  supportType: SupportType;
  supportConfidence: number;
  trustScore: number;
  authorityScore: number;
  labels?: string[];
  tags?: string[];
  language?: string;
  region?: string;
  metadata?: Record<string, string | string[] | number | boolean | null>;
  hierarchyVersion: string;
  lastRefreshedAt: string;
  status: "active" | "stale" | "disabled";
}
```

### 7.2 ParentHierarchyNode

```ts
interface ParentHierarchyNode {
  nodeId: string;
  sourceId: string;
  parentNodeId?: string;
  label: string;
  canonicalRoute: string;
  alternateRoutes: string[];
  stableIdentifier?: string;
  feedEndpointIds: string[];
  nodeType: "source" | "section" | "route" | "variant";
  status: "active" | "stale" | "invalid";
}
```

### 7.3 FeedEndpoint

```ts
interface FeedEndpoint {
  endpointId: string;
  sourceId: string;
  parentNodeId: string;
  type: "rss" | "atom" | "proxy" | "adapter";
  url: string;
  routePattern?: string;
  stableIdentifier?: string;
  lastFetchedAt?: string;
  status: "active" | "stale" | "invalid";
}
```

### 7.4 ChildItem

```ts
interface ChildItem {
  itemId: string;
  sourceId: string;
  parentNodeId: string;
  endpointId: string;
  title: string;
  url: string;
  publishedAt?: string;
  summary?: string;
  contentText?: string;
  author?: string;
  tags?: string[];
  lexicalFields: string[];
  embeddingsRef?: string;
}
```

### 7.5 QueryIntent

```ts
interface QueryIntent {
  mode: "parent-first" | "child-first" | "hybrid";
  metadataFilters?: Record<string, string[]>;
  freshnessBias: "low" | "medium" | "high";
  sourceSeeking: boolean;
  exactItemSeeking: boolean;
}
```

### 7.6 SourceSeedManifest

```ts
interface SourceSeedManifest {
  manifestId: string;
  version: string;
  generatedAt?: string;
  sources: CandidateSource[];
}

interface CandidateSource {
  name: string;
  url: string;
  labels?: string[];
  tags?: string[];
  language?: string;
  region?: string;
  trustTier?: "low" | "medium" | "high";
  notes?: string;
  metadata?: Record<string, string | string[] | number | boolean | null>;
}
```

---

## 8. Seed Manifest Schema

Seed manifests are the bootstrap input for the supported source universe.

### 8.1 Requirements

A manifest:

* must contain one or more candidate sources,
* must provide a source name and URL for each source,
* may include optional labels, tags, and source metadata,
* must not require category membership.

### 8.2 Example

```json
{
  "manifestId": "default-sources",
  "version": "1",
  "sources": [
    {
      "name": "SAIB YouTube",
      "url": "https://www.youtube.com/@saibmusic",
      "labels": ["music", "beats"],
      "language": "en",
      "trustTier": "high"
    },
    {
      "name": "Example Research Blog",
      "url": "https://example.org/blog",
      "tags": ["ml", "research"]
    }
  ]
}
```

### 8.3 Validation

A candidate source is invalid if:

* `name` is missing,
* `url` is missing,
* `url` is not parseable,
* the manifest contains duplicate canonical source URLs after normalization.

---

## 9. Indexing Strategy

### 9.1 Parent index contents

Index the following per parent node:

* source name,
* description if available,
* canonical URL,
* alternate identifiers,
* route labels,
* section labels,
* domain signals,
* labels/tags/metadata if present,
* authority and trust metadata.

Purpose:

* identify relevant sources,
* support broad intent,
* allow source fallback.

### 9.2 Child item index contents

Index the following per child item:

* title,
* summary,
* normalized text,
* tags,
* source ID,
* parent node ID,
* endpoint ID,
* timestamp,
* lexical fields,
* embeddings reference if used.

Purpose:

* exact retrieval,
* freshness-sensitive retrieval,
* ranking within parent context.

### 9.3 Join behavior

Every child item must point to:

* exactly one parent source,
* exactly one parent hierarchy node,
* exactly one originating feed endpoint.

This allows:

* grouped results,
* parent-constrained reranking,
* source-aware fallback.

---

## 10. Ranking Model

Ranking should happen only after unsupported sources are excluded.

### 10.1 Eligibility gate

```text
if supportType == unsupported:
    exclude
if supportConfidence < threshold:
    exclude or demote
if source status != active:
    exclude or soft demote
```

### 10.2 Parent score

```text
parent_score =
    query_source_relevance
    * trust_weight
    * authority_weight
    * support_weight
```

### 10.3 Child score

```text
child_score =
    lexical_relevance
    + freshness_weight
    + parent_prior
```

### 10.4 Final selection logic

* If top child confidence is high, return child-first result.
* If child confidence is weak but parent confidence is high, return parent source.
* If both are strong, return grouped result.
* If no supported result is sufficient, mark for discovery fallback.

---

## 11. Query Flow

```text
User query
  -> Intent classifier
  -> Eligible source universe filter
  -> Parent search and/or child search
  -> Parent-child join
  -> Confidence evaluation
  -> Result assembly
  -> Optional discovery fallback trigger
```

### 11.1 Parent-first mode

Use when:

* user seeks a source,
* query is broad,
* query implies “best place for this topic.”

### 11.2 Child-first mode

Use when:

* user seeks a specific recent item,
* query includes precise content terms,
* freshness is highly important.

### 11.3 Hybrid mode

Use when:

* query may refer to either a source or a specific item,
* source disambiguation is useful.

---

## 12. Batch Build and Refresh

### 12.1 Bootstrap batch

Runs periodically to:

* ingest source manifests,
* resolve support type,
* register or update source records,
* build or rebuild parent hierarchies.

### 12.2 Feed refresh batch

Runs periodically to:

* fetch feeds,
* parse child items,
* update indexes,
* invalidate broken endpoints,
* refresh freshness metadata.

### 12.3 Parent hierarchy rebuild triggers

Rebuild parent hierarchy when:

* support type changes,
* alternate URL changes,
* feed route changes,
* proxy mapping changes,
* repeated fetch errors occur,
* source version changes.

---

## 13. Discovery Escape Hatch

Discovery is allowed only when query coverage is poor.

Trigger conditions:

* no eligible source above threshold,
* no child match above threshold,
* repeated user queries miss the known source universe,
* retrieval confidence remains below a configured threshold.

Discovery outputs must not enter the main source universe automatically. They must go through:

* support resolution,
* validation,
* indexing approval.

---

## 14. Example: YouTube Source Mapping

A YouTube source may have:

* canonical presentation URL,
* alternate channel URL,
* feed endpoint derived from stable channel ID,
* parent hierarchy nodes for sections or route variants.

Example mapping:

```text
canonicalUrl:
  https://www.youtube.com/@saibmusic/videos

alternateUrl:
  https://www.youtube.com/channel/UC66ZJMxR_fv8QXc8YZydCUA

feedEndpoint:
  https://www.youtube.com/feeds/videos.xml?channel_id=UC66ZJMxR_fv8QXc8YZydCUA
```

The feed endpoint should be tied to the stable identifier, not assumed from the presentation path.

---

## 15. Invariants

1. The system builds only a parent hierarchy.
2. Child items are attached to parent hierarchy nodes, but do not form an independent hierarchy.
3. Every indexed child item must reference a valid parent source.
4. Every indexed child item must reference a valid parent hierarchy node.
5. Unsupported sources must not be ranked in the main retrieval path.
6. Every feed endpoint must be validated before activation.
7. Parent and child indexes must be rebuildable from registry and hierarchy state.
8. Query-time retrieval must not require crawling.
9. Discovery results must not bypass validation.
10. Proxy-backed and adapter-backed sources must be explicitly labeled.
11. Canonical and alternate URLs must both be preserved where available.
12. A source can have many endpoints, and endpoints may attach to different parent nodes, but each endpoint belongs to one source.
13. Result assembly must always be able to explain whether a result is parent-first, child-first, or fallback.

---

## 16. Failure Modes

### 16.1 Unsupported-source leakage

Problem: unsupported sites appear in ranking.
Fix: enforce eligibility gate before ranking.

### 16.2 Proxy drift

Problem: proxy or adapter route no longer matches source.
Fix: endpoint health checks and endpoint invalidation.

### 16.3 Parent-child misbinding

Problem: child item linked to wrong source or wrong parent node.
Fix: strict source and node ownership rules and validation tests.

### 16.4 Parent hierarchy staleness

Problem: source structure changes but index does not.
Fix: hierarchy versioning and rebuild triggers.

### 16.5 Overclaiming coverage

Problem: system acts like open-web search.
Fix: explicit discovery fallback and coverage reporting.

---

## 17. MVP Scope

Build first version with:

* a curated source universe loaded from seed manifests,
* 100 to 500 sources,
* native RSS/Atom support,
* one adapter type,
* parent hierarchy builder,
* parent index,
* child item index,
* hybrid query routing,
* eligibility gating,
* parent fallback,
* scheduled refresh,
* minimal admin review for discovered sources.

Do not include in MVP:

* arbitrary web crawling,
* many proxy types,
* personalized ranking,
* multi-tenant editorial policies,
* complex online learning,
* child-content hierarchy construction.

---

## 18. Suggested Repo Structure

```text
/src
  /bootstrap
  /registry
  /resolver
  /hierarchy
  /indexing
  /ranking
  /query
  /refresh
  /discovery
  /shared

/tests
  /unit
  /integration
  /fixtures

/docs
  SPEC.md
  ADRs/
```

---

## 19. Implementation Plan

### Phase 1

* define source registry schema,
* define support resolver interface,
* implement bootstrap ingest,
* implement native RSS parser,
* implement parent hierarchy builder,
* build parent index,
* build child item index.

### Phase 2

* implement query intent classifier,
* implement parent-first and child-first retrieval,
* implement parent fallback,
* add ranking thresholds,
* add endpoint validation.

### Phase 3

* add proxy/adapter support,
* add discovery fallback,
* add hierarchy rebuild triggers,
* add metrics and observability.

---

## 20. Interfaces

### 20.1 Support resolver

```ts
interface SupportResolver {
  resolve(source: CandidateSource): Promise<ResolvedSource>;
}
```

### 20.2 Parent hierarchy builder

```ts
interface ParentHierarchyBuilder {
  build(source: ResolvedSource): Promise<ParentHierarchyNode[]>;
}
```

### 20.3 Index writer

```ts
interface IndexWriter<T> {
  upsert(records: T[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
}
```

### 20.4 Query engine

```ts
interface QueryEngine {
  search(query: string, intent?: QueryIntent): Promise<SearchResultSet>;
}
```

---

## 21. Acceptance Criteria

### Registry

* can register canonical and alternate URLs,
* can persist support type and confidence,
* can version hierarchy state,
* can store optional source metadata without requiring categories.

### Resolver

* can classify a source as native, proxy, adapter, or unsupported,
* can return validated feed endpoints,
* can reject invalid endpoints.

### Parent hierarchy

* can build one source with multiple parent nodes,
* can associate feed endpoints with parent nodes,
* can rebuild deterministically.

### Child item indexing

* can associate all child items with one source and one parent node,
* can index items without building a child hierarchy.

### Querying

* can search parent hierarchy nodes,
* can search child items,
* can return parent fallback when child evidence is weak,
* can exclude unsupported sources.

### Refresh

* can update child items without rebuilding the entire source universe,
* can invalidate broken endpoints,
* can mark stale sources.

---

## 22. Metrics

Track:

* supported source count,
* unsupported source rejection count,
* parent hit rate,
* child hit rate,
* fallback rate,
* discovery trigger rate,
* proxy success rate,
* endpoint failure rate,
* hierarchy rebuild rate,
* median query latency,
* median refresh latency.

---

## 23. Open Questions

1. What is the minimum trust bar for proxy-backed and adapter-backed sources?
2. Should support confidence be a hard gate only, or also a ranking feature?
3. Should discovery candidates require human approval before activation?
4. What freshness decay curve should be used by default?
5. Should some labels or metadata fields influence parent-first vs child-first routing?
6. How much text should be stored from each child item?

---

## 24. One-Sentence System Definition

This system is a prebuilt search engine over feed-capable sources, organized into parent hierarchies with child items indexed beneath them, ranked only within sources the product can actually serve, with discovery used only when the existing source universe fails coverage.

```

