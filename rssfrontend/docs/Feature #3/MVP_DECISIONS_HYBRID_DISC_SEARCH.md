# MVP_DECISIONS.md

# Feed-Capable Source Search Engine — MVP Decisions

## 1. Purpose

This document locks the implementation decisions for the v1 MVP.

It exists to remove ambiguity from `FEATURE_HYBRID_DISC_SEARCH.md` and `EXEC_PLAN_HYBRID_DISC_SEARCH.md`.
If a choice is listed here, it is fixed for MVP and should not be revisited during implementation unless the document is explicitly updated.

---

## 2. Core MVP Definition

The MVP is a precomputed search engine over curated, feed-capable sources.

It supports:
- native RSS/Atom sources,
- one adapter type for YouTube channel feed resolution,
- a parent hierarchy for each supported source,
- a child item index beneath that parent hierarchy,
- lexical retrieval only,
- parent fallback when child-level retrieval is weak.

It does not support:
- open-web discovery,
- embeddings,
- semantic ranking,
- generic proxy support,
- multiple adapters,
- learned ranking,
- a child hierarchy,
- live public-ranking ingestion.

---

## 3. Bootstrap Decisions

### 3.1 Source universe
The source universe is curated and supplied by in-repo seed manifests.

Bootstrap must not depend on:
- external ranking APIs,
- live SERP calls,
- fixed taxonomies,
- dynamic discovery.

### 3.2 Seed location
Seed manifests are loaded from:

```text
data/seeds/*.json
````

### 3.3 Seed ownership

Seed manifests are the source of truth for initial source registration in MVP.

### 3.4 Taxonomy

No fixed category taxonomy is required for MVP.

Sources may include optional metadata such as:

* labels,
* tags,
* notes,
* support hints,
* trust hints.

Indexing and retrieval must not require category membership.

---

## 4. Storage Decisions

### 4.1 Primary storage

Use SQLite as the only structured storage backend for MVP.

### 4.2 Search/index storage

Use SQLite FTS5 for lexical indexing.

### 4.3 Schema authority

The SQLite schema defined in the repo is the authoritative schema for MVP.
No ORM-specific abstraction should be allowed to obscure the actual persisted model.

---

## 5. Retrieval Decisions

### 5.1 Retrieval mode

Use lexical retrieval only in MVP.

### 5.2 Embeddings

Embeddings are explicitly out of scope.

### 5.3 Parent/child retrieval

Search must operate over:

* parent hierarchy nodes,
* child items.

Child items are indexed beneath parent hierarchy nodes, but do not form a separate hierarchy.

### 5.4 Query modes

Implement only:

* parent-first,
* child-first,
* hybrid.

### 5.5 Intent routing

Intent routing must be rules-based only.

No learned classifier is allowed in MVP.

### 5.6 Parent fallback

If child retrieval confidence is weak and parent retrieval confidence is strong, the system must return the parent result as fallback.

---

## 6. Feed Support Decisions

### 6.1 Native feed support

Support native RSS and Atom.

### 6.2 Adapter support

Support exactly one adapter in MVP:

* YouTube channel feed mapping

### 6.3 Proxy support

Generic proxy support is deferred.

Interfaces may be created so proxy support can be added later, but no live proxy implementation should be built in MVP.

### 6.4 Unsupported sources

Unsupported sources must not be indexed into the main retrieval path.

---

## 7. Ranking Decisions

### 7.1 Ranking model

Use fixed heuristic weights only.

### 7.2 ML ranking

ML ranking is out of scope.

### 7.3 Scoring inputs

Allowed scoring inputs for MVP:

* lexical relevance,
* source support type,
* trust metadata if present,
* authority metadata if present,
* freshness metadata if present,
* parent prior.

### 7.4 Thresholds

Use explicit fixed thresholds for:

* child confidence,
* parent confidence,
* fallback activation.

---

## 8. Refresh Decisions

### 8.1 Refresh mode

Support:

* manual CLI-triggered refresh,
* one scheduled refresh abstraction.

### 8.2 Scheduler integration

No production scheduler integration is required in MVP.

### 8.3 Refresh behavior

Refresh must:

* fetch active endpoints,
* parse current feed items,
* upsert child items,
* update refresh metadata,
* mark repeatedly failing endpoints invalid.

---

## 9. Discovery Decisions

### 9.1 Discovery scope

Discovery is not implemented in MVP.

### 9.2 Discovery interface

A stub interface may exist for future work.

### 9.3 Discovery behavior

The stub must not perform:

* live search,
* live crawling,
* automatic source registration.

---

## 10. Logging and Metrics Decisions

### 10.1 Observability scope

Implement simple local logging and counters only.

### 10.2 External platforms

No external metrics or observability platform is required in MVP.

### 10.3 Required counters

At minimum, track:

* refresh runs,
* refresh failures,
* invalid endpoints,
* indexed child item count,
* source count,
* query count,
* fallback count.

---

## 11. Data Model Decisions

### 11.1 Hierarchy model

The system builds only a parent hierarchy.

### 11.2 Child model

Child items are attached to parent hierarchy nodes.

### 11.3 Child hierarchy

A child hierarchy must not be built.

### 11.4 Source metadata

The source model must support optional metadata fields without requiring categories.

### 11.5 Canonical and alternate URLs

The model must preserve:

* canonical URLs,
* alternate URLs,
* stable identifiers where applicable.

---

## 12. Testing Decisions

### 12.1 Test types required

Require:

* unit tests,
* integration tests,
* fixture-based feed tests.

### 12.2 MVP standard

Each milestone in `tasks.md` must include tests before it is considered done.

### 12.3 Fixture usage

Feed parsing and resolver logic must be tested against fixture inputs, not only synthetic data.

---

## 13. Deferred Decisions

The following are explicitly deferred beyond MVP:

* embeddings,
* semantic ranking,
* generic proxies,
* multiple adapters,
* live discovery,
* live ranking-source ingestion,
* learned intent classification,
* personalized ranking,
* distributed storage,
* external observability integration.

These should not be implemented unless a later document changes scope.

---

## 14. Final MVP Lock

The MVP is complete when it can:

* load curated seed manifests,
* resolve sources as native RSS/Atom or YouTube adapter,
* build deterministic parent hierarchies,
* fetch and parse child items,
* store and index parent nodes and child items,
* answer lexical queries,
* return parent fallback,
* refresh feeds,
* keep discovery stubbed,
* pass tests.

````

