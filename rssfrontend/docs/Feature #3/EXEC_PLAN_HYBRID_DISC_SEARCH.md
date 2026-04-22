
# EXEC_PLAN.md

# Feed-Capable Source Search Engine — Execution Plan (v1 MVP)

## 1. Purpose

This document is the implementation plan for the v1 MVP.

It is meant to be concrete enough that an engineer can execute the project milestone by milestone without making product-scope decisions during implementation.

This file should be read together with:
- `FEATURE_HYBRID_DISC_SEARCH.md`
- `MVP_DECISIONS_HYBRID_DISC_SEARCH.md`
- > `EXEC_PLAN_HYBRID_DISC_SEARCH.md`
- `README.md`

If there is a conflict:
1. `MVP_DECISIONS_HYBRID_DISC_SEARCH.md` controls implementation scope,
2. `EXEC_PLAN_HYBRID_DISC_SEARCH.md` controls milestone order and done criteria,
3. `FEATURE_HYBRID_DISC_SEARCH.md` provides architectural context.

---

## 2. Build Strategy

Implement the system in the smallest useful vertical slices.

Do not begin with a highly abstract framework.
Prefer:
- explicit models,
- simple deterministic logic,
- direct database access,
- fixture-driven tests,
- small modules with clear ownership.

Avoid:
- premature generalization,
- plugin-heavy architecture,
- embeddings,
- crawling infrastructure,
- speculative proxy frameworks.

---

## 3. Milestone Order

Build in this exact order:

1. Registry + schema + fixtures
2. Native RSS resolver + parser
3. YouTube adapter resolver
4. Parent hierarchy builder
5. Parent and child indexing
6. Query path with parent fallback
7. Refresh jobs + logging
8. Discovery stub
9. Docs alignment and cleanup

Each milestone should be merged only when its done criteria are met.

---

## 4. Milestone Details

## Milestone 1 — Registry, Schema, and Fixtures

### Goal
Create the persistent model and seed-loading path.

### Primary outputs
- database schema,
- database client,
- domain model types,
- seed loader,
- test seed fixtures.

### Files
- `src/db/schema.ts`
- `src/db/client.ts`
- `src/models/source.ts`
- `src/models/hierarchy.ts`
- `src/models/feed.ts`
- `src/models/item.ts`
- `src/bootstrap/loadSeeds.ts`
- `tests/unit/bootstrap.test.ts`
- `tests/unit/schema.test.ts`

### Key checks
- schema can initialize from zero,
- seed manifests load successfully,
- foreign keys enforce required relationships.

### Exit criteria
- seed load works,
- schema persists all required tables,
- tests pass.

---

## Milestone 2 — Native RSS/Atom Resolver and Feed Parser

### Goal
Support native feed-capable sources end to end.

### Primary outputs
- native resolver,
- feed fetcher,
- feed parser,
- item normalizer,
- feed fixtures.

### Files
- `src/resolver/nativeResolver.ts`
- `src/feeds/fetchFeed.ts`
- `src/feeds/parseFeed.ts`
- `src/feeds/normalizeItem.ts`
- `tests/unit/nativeResolver.test.ts`
- `tests/unit/parseFeed.test.ts`
- `tests/integration/nativeFeedFlow.test.ts`

### Key checks
- RSS and Atom are both parsed,
- invalid feeds fail cleanly,
- normalized items can be stored.

### Exit criteria
- native source resolution works,
- child item parsing works,
- tests pass.

---

## Milestone 3 — YouTube Adapter Resolver

### Goal
Support one adapter-based source type.

### Primary outputs
- YouTube resolver,
- unified support resolver integration,
- YouTube fixtures.

### Files
- `src/resolver/youtubeResolver.ts`
- `src/resolver/supportResolver.ts`
- `tests/unit/youtubeResolver.test.ts`
- `tests/integration/youtubeResolution.test.ts`

### Key checks
- handle URL and channel URL both resolve,
- stable channel ID is preserved,
- feed endpoint is produced deterministically.

### Exit criteria
- YouTube resolution works,
- support resolver can dispatch native vs adapter,
- tests pass.

---

## Milestone 4 — Parent Hierarchy Builder

### Goal
Build only the parent hierarchy for each supported source.

### Primary outputs
- hierarchy builder,
- node factory,
- hierarchy validator.

### Files
- `src/hierarchy/buildParentHierarchy.ts`
- `src/hierarchy/nodeFactory.ts`
- `src/hierarchy/validateHierarchy.ts`
- `tests/unit/hierarchyBuilder.test.ts`
- `tests/integration/hierarchyPersistence.test.ts`

### Key checks
- source root node exists,
- section/route/variant nodes exist where needed,
- endpoints attach to parent nodes,
- rebuild is deterministic.

### Exit criteria
- parent hierarchy persists correctly,
- no child hierarchy is constructed,
- tests pass.

---

## Milestone 5 — Parent and Child Indexing

### Goal
Index parent hierarchy nodes and child items with lexical search.

### Primary outputs
- parent index builder,
- child index builder,
- FTS schema.

### Files
- `src/indexing/buildParentIndex.ts`
- `src/indexing/buildChildIndex.ts`
- `src/indexing/indexSchema.ts`
- `tests/unit/indexing.test.ts`
- `tests/integration/indexQuery.test.ts`

### Key checks
- parent lexical search works,
- child lexical search works,
- joins back to source and parent node are correct.

### Exit criteria
- both indexes are queryable,
- joins are valid,
- tests pass.

---

## Milestone 6 — Query Path with Parent Fallback

### Goal
Implement retrieval and result assembly.

### Primary outputs
- intent router,
- parent search,
- child search,
- ranking,
- result assembler.

### Files
- `src/query/intent.ts`
- `src/query/searchParents.ts`
- `src/query/searchChildren.ts`
- `src/query/queryEngine.ts`
- `src/ranking/scoreParents.ts`
- `src/ranking/scoreChildren.ts`
- `src/ranking/assembleResults.ts`
- `tests/unit/queryIntent.test.ts`
- `tests/unit/ranking.test.ts`
- `tests/integration/queryFlow.test.ts`

### Key checks
- parent-first works,
- child-first works,
- hybrid works,
- fallback works deterministically,
- unsupported sources are excluded.

### Exit criteria
- query engine returns valid results,
- fallback logic behaves correctly,
- tests pass.

---

## Milestone 7 — Refresh Jobs and Logging

### Goal
Refresh sources without rebuilding the full dataset manually.

### Primary outputs
- single-source refresh,
- refresh-all flow,
- simple logging and counters.

### Files
- `src/refresh/runRefresh.ts`
- `src/refresh/refreshSource.ts`
- `src/refresh/refreshAll.ts`
- `src/shared/logger.ts`
- `tests/integration/refreshFlow.test.ts`

### Key checks
- refresh updates timestamps,
- new items are upserted,
- repeated failures mark endpoints invalid.

### Exit criteria
- refresh works for one source and all sources,
- logging/counters exist,
- tests pass.

---

## Milestone 8 — Discovery Stub

### Goal
Create the future discovery boundary without implementing discovery.

### Primary outputs
- discovery interface,
- stub implementation,
- stub test.

### Files
- `src/discovery/discoveryService.ts`
- `tests/unit/discoveryStub.test.ts`

### Key checks
- interface is explicit,
- runtime behavior is clearly non-implemented or stubbed.

### Exit criteria
- discovery boundary exists,
- no live discovery behavior exists,
- tests pass.

---

## Milestone 9 — Docs Alignment and Cleanup

### Goal
Ensure the repository docs match the implemented MVP.

### Primary outputs
- aligned docs,
- clear deferred-items list,
- updated README.

### Files
- `docs/SPEC.md`
- `docs/MVP_DECISIONS.md`
- `docs/EXEC_PLAN.md`
- `README.md`

### Key checks
- terminology is consistent,
- parent hierarchy language is consistent,
- no out-of-scope features are described as implemented.

### Exit criteria
- docs reflect implementation reality,
- deferred work is clearly marked.

---

## 5. File Ownership by Area

### Bootstrap
- seed manifest loading
- source registration bootstrap

### DB
- schema
- migration/init
- database client

### Models
- typed records for source, hierarchy, endpoint, item

### Resolver
- native feed support
- YouTube adapter support
- unified support-resolution flow

### Hierarchy
- parent hierarchy construction only

### Feeds
- feed fetch
- parse
- normalize

### Indexing
- FTS schema
- parent index population
- child index population

### Query
- intent mode selection
- parent search
- child search
- query orchestration

### Ranking
- fixed heuristic scoring
- fallback assembly

### Refresh
- refresh lifecycle
- endpoint invalidation
- refresh run recording

### Discovery
- stub only

---

## 6. Definition of Done by Layer

### Registry layer is done when
- seed manifests can populate source records,
- source metadata persists correctly.
- seed manifests may include optional labels/tags/notes without affecting retrieval requirements

### Resolver layer is done when
- native and YouTube sources resolve into endpoints,
- unsupported sources are rejected.

### Hierarchy layer is done when
- deterministic parent nodes are built and persisted.

### Indexing layer is done when
- parent and child records are both searchable through FTS5.

### Query layer is done when
- parent-first, child-first, and hybrid retrieval all work.

### Refresh layer is done when
- endpoints can be refreshed and invalidated correctly.

### Documentation layer is done when
- docs match actual code and deferred scope.

---

## 7. Required Fixtures

The following fixtures should exist before related milestones are considered complete:

### Seed fixtures
- curated source manifest fixture

### Feed fixtures
- valid RSS example
- valid Atom example
- malformed feed example

### YouTube fixtures
- handle-based HTML fixture
- channel-based HTML fixture

### Query fixtures
- parent-seeking query examples
- child-seeking query examples
- ambiguous query examples

---

## 8. Review Checklist for Each Milestone

Before closing any milestone, verify:
- scope stayed within MVP decisions,
- no embeddings were added,
- no discovery logic was added,
- no generic crawling was added,
- tests were added,
- docs/comments match behavior,
- interfaces remain simple and explicit.

---

## 9. Risks and Controls

### Risk: overgeneralized architecture
Control: implement only native RSS and one adapter.

### Risk: category assumptions creeping back in
Control: keep source metadata optional and non-required.

### Risk: accidental child hierarchy construction
Control: enforce parent-hierarchy-only invariant in tests.

### Risk: ranking over unsupported sources
Control: exclude unsupported sources before result assembly.

### Risk: refresh complexity expanding
Control: keep scheduler integration out of scope.

---

## 10. Final Execution Rule

When in doubt, choose the simpler implementation that satisfies:
- `docs/MVP_DECISIONS.md`
- `tasks.md`
- the parent-hierarchy-only invariant
- lexical-only retrieval
- no discovery in MVP
````

