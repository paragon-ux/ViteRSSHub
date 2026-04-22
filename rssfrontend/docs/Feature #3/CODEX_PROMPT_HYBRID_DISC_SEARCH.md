# CODEX_PROMPT_HYBRID_DISC_SEARCH.md

You are implementing **Feature #3: Hybrid Discovery Search** for this project.

Read these files first and treat them as the source of truth, in this order:

1. `MVP_DECISIONS_HYBRID_DISC_SEARCH.md`
2. `EXEC_PLAN_HYBRID_DISC_SEARCH.md`
3. `FEATURE_HYBRID_DISC_SEARCH.md`
4. `README.md`

If these documents conflict:
- `MVP_DECISIONS_HYBRID_DISC_SEARCH.md` controls implementation scope,
- `EXEC_PLAN_HYBRID_DISC_SEARCH.md` controls build order and done criteria,
- `FEATURE_HYBRID_DISC_SEARCH.md` provides product and architecture context,
- `README.md` provides repo-local orientation.

## Objective

Build the MVP for a **precomputed search engine over curated, feed-capable sources**.

This feature must support:
- a **parent hierarchy** for supported sources,
- a **child item index** beneath that parent hierarchy,
- **lexical retrieval only**,
- **parent-first**, **child-first**, and **hybrid** query modes,
- **parent fallback** when child retrieval is weak,
- **native RSS/Atom support**,
- **one adapter type** for YouTube channel feed resolution,
- **manual refresh** and **scheduled-refresh abstraction**,
- **discovery stub only**.

This feature must **not** implement:
- open-web discovery,
- embeddings,
- semantic ranking,
- generic crawling,
- multiple adapters,
- generic proxy support,
- child hierarchy construction,
- learned intent classification,
- live public-ranking ingestion.

## Product model

This system is **not** open-web search.

It is a **prebuilt search engine over curated, feed-capable sources**.
It searches:
- parent hierarchy nodes
- child items attached beneath those parent nodes

The system builds **only a parent hierarchy**.
Child items are indexed beneath parent hierarchy nodes, but do **not** form an independent hierarchy.

## Critical invariants

These must remain true:

1. The system builds only a parent hierarchy.
2. Child items are attached to parent hierarchy nodes, but do not form an independent hierarchy.
3. Every indexed child item must reference a valid parent source.
4. Every indexed child item must reference a valid parent hierarchy node.
5. Unsupported sources must not be ranked in the main retrieval path.
6. Every feed endpoint must be validated before activation.
7. Parent and child indexes must be rebuildable from registry and hierarchy state.
8. Query-time retrieval must not require crawling.
9. Discovery must remain stubbed in MVP.

## Implementation strategy

Follow the execution plan milestone by milestone.
Do **not** skip ahead.
Do **not** broaden scope.

Preferred implementation style:
- simple deterministic logic
- direct database access
- explicit models
- SQLite as the only structured store
- SQLite FTS5 for lexical retrieval
- fixture-driven tests
- small modules with clear ownership

Avoid:
- abstraction-heavy frameworks
- plugin systems
- speculative future-proofing
- adding features not required for the current milestone

## Expected MVP layers

Implement these layers:

### 1. Registry layer
- load curated seed manifests from `data/seeds/*.json`
- persist source records
- preserve canonical URLs, alternate URLs, and source metadata
- do not require fixed categories or taxonomy

### 2. Resolver layer
- support native RSS/Atom resolution
- support YouTube channel feed mapping
- reject unsupported sources from the main retrieval path

### 3. Parent hierarchy layer
- build deterministic parent nodes for supported sources
- attach feed endpoints to parent nodes
- preserve stable identifiers where applicable
- do not construct a child hierarchy

### 4. Indexing layer
- build parent index using SQLite FTS5
- build child item index using SQLite FTS5
- preserve joins from child item -> parent node -> source

### 5. Query layer
- implement parent-first, child-first, and hybrid modes
- use rules-based intent routing only
- apply fixed heuristic scoring only
- return parent fallback when child confidence is weak

### 6. Refresh layer
- refresh active endpoints
- parse current items
- upsert child items
- mark repeatedly failing endpoints invalid
- record refresh metadata

### 7. Discovery layer
- stub only
- no live search
- no crawling
- no automatic source registration

## Build order

Implement in this exact order:

1. Registry + schema + fixtures
2. Native RSS resolver + parser
3. YouTube adapter resolver
4. Parent hierarchy builder
5. Parent and child indexing
6. Query path with parent fallback
7. Refresh jobs + logging
8. Discovery stub
9. Docs alignment and cleanup

Before starting a milestone:
- confirm dependencies from earlier milestones are in place
- keep scope inside MVP decisions
- add or update tests for the new behavior

## Query behavior

Support exactly these query modes:
- `parent-first`
- `child-first`
- `hybrid`

Intent routing must be:
- rules-based only
- deterministic
- explainable in code

Ranking must use:
- fixed heuristic weights only
- no embeddings
- no semantic ranking
- no ML ranking

Parent fallback rule:
- if top child score is below threshold
- and top parent score is above threshold
- return the parent result as fallback

Child results must always remain joinable back to a parent hierarchy node and source record before final result assembly.

## Seed/bootstrap rules

Use in-repo seed manifests and validated supported mappings only.
Do not implement:
- external ranking ingestion
- live SERP calls
- dynamic source discovery

Source ingestion in MVP is manifest-driven only.
Query-time retrieval must not introduce new sources into the registry.

Sources may include optional metadata such as:
- labels
- tags
- notes
- support hints
- trust hints

Retrieval and indexing must not require category membership.

## Testing requirements

Every milestone must include tests before it is considered done.

Require:
- unit tests
- integration tests
- fixture-based feed tests

Fixtures should include:
- curated source manifest fixture
- valid RSS example
- valid Atom example
- malformed feed example
- YouTube handle-based fixture
- YouTube channel-based fixture
- parent-seeking query examples
- child-seeking query examples
- ambiguous query examples

## Acceptance expectations

By the time this feature is complete, the system should be able to:
- load curated seed manifests,
- resolve sources as native RSS/Atom or YouTube adapter,
- build deterministic parent hierarchies,
- fetch and parse child items,
- store and index parent nodes and child items,
- answer lexical queries,
- return parent fallback,
- refresh feeds,
- keep discovery stubbed,
- pass tests.

## Constraints

Do not:
- add embeddings
- add semantic retrieval
- add generic crawling
- add live discovery
- add multiple adapters
- add generic proxy support
- build a child hierarchy
- change MVP assumptions unless the docs are updated first

If you notice ambiguity:
- choose the simpler implementation
- stay within the MVP decisions
- preserve the parent-hierarchy-only invariant
- keep discovery stubbed

## Deliverable style

When implementing:
- keep modules small and testable
- add tests with each milestone
- keep comments aligned with behavior
- update docs when implementation reality changes
- prefer explicit code over clever abstractions

## Final rule

When in doubt, choose the simplest implementation that satisfies:
- `MVP_DECISIONS_HYBRID_DISC_SEARCH.md`
- `EXEC_PLAN_HYBRID_DISC_SEARCH.md`
- `FEATURE_HYBRID_DISC_SEARCH.md`
- lexical-only retrieval
- parent-hierarchy-only architecture
- no live discovery in MVP