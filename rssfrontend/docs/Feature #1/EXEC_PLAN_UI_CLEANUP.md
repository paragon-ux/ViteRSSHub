# CODEX_PROMPT_UI_CLEANUP_EXECUTION.md

You are working inside an existing frontend project called **RSSHubVite**.

Your task is to implement **UI cleanup / frontend polish + codebase hygiene** as a focused engineering task on the existing app.

This is not a greenfield redesign.
This is not a product rethink.
This is a cleanup pass that improves visual consistency, readability, layout discipline, and maintainability while preserving existing flows.

Reference direction for taste only:
- premium feel similar to **Folo**
- calmer reading hierarchy similar to **Readwise Reader**
- simpler ergonomics similar to **Feeder** :contentReference[oaicite:0]{index=0}

Do not copy those products directly.

---

## Primary objective

Improve the current frontend so it is:
- more consistent,
- less visually noisy,
- easier to scan,
- better spaced,
- and cleaner to maintain.

---

## Constraints

Do not:
- redesign the information architecture,
- rewrite the app shell from scratch,
- add new product features,
- introduce major dependency changes unless clearly necessary,
- change backend contracts unless required for broken UI coupling,
- implement hybrid discovery,
- implement AI features,
- overbuild a design system.

Do:
- work within the existing frontend structure,
- preserve current user flows,
- improve shared UI patterns,
- reduce presentational duplication,
- make layout and spacing more systematic.

---

## Required work phases

### Phase 1 — Audit
Inspect the current frontend and identify the highest-value cleanup opportunities.

Look specifically for:
- inconsistent page widths or paddings,
- inconsistent spacing between sections,
- repeated but differently styled cards,
- repeated but differently styled buttons/inputs,
- weak typographic hierarchy,
- crowded list rows,
- noisy metadata treatment,
- poor empty/loading/error states,
- ad hoc modal/dialog styling,
- duplicated layout wrappers,
- obvious presentational duplication in components.

Deliverable:
- a short written audit summary in comments, notes, or PR summary form.

### Phase 2 — Cleanup plan
Create a short implementation plan before large edits.

The plan should:
1. identify the highest-traffic or most visible screens,
2. identify which shared primitives or wrappers should be normalized,
3. separate “must fix now” from “defer”.

Keep the plan short and practical.

### Phase 3 — Implementation
Apply the cleanup directly in code.

Priority order:
1. app shell and route-level layout consistency,
2. shared interactive primitives,
3. list/card/read surfaces,
4. empty/loading/error states,
5. targeted code cleanup where it improves UI maintainability.

### Phase 4 — Summary
Provide a brief summary of:
- what changed,
- what components/patterns were standardized,
- what was intentionally deferred.

---

## Specific cleanup targets

### 1. Layout consistency
Standardize where possible:
- page max widths,
- page padding,
- section spacing,
- card spacing,
- panel spacing,
- header/action alignment.

Goal:
the app should feel like one coherent interface system.

### 2. Typography and hierarchy
Improve:
- heading scale,
- body vs secondary text contrast,
- metadata styling,
- section label clarity,
- action prominence.

Goal:
important information should stand out without making the UI feel louder.

### 3. Feed/list ergonomics
Improve:
- row/card scanability,
- title/meta separation,
- preview readability,
- hover/focus/selected states,
- action clutter.

Goal:
lists should be easier to skim quickly.

### 4. State surfaces
Normalize:
- empty states,
- loading states,
- error states,
- zero-result states,
- retry affordances.

Goal:
states should look intentional, not incidental.

### 5. Component reuse
Find repeated presentational patterns and consolidate them where repetition is real.

Good candidates:
- page containers,
- section headers,
- result/feed cards,
- action bars,
- form rows,
- dialog shells,
- status messages.

Do not extract abstractions unless they reduce real duplication.

### 6. Styling/token hygiene
Consolidate obvious repeated values for:
- spacing,
- radii,
- border treatments,
- muted foreground styles,
- shadows,
- container treatments.

Do not build a large token system unless the current code clearly needs it.

---

## Code hygiene expectations

Refactor only where it directly supports the cleanup.

Good refactors:
- extract duplicated presentational subcomponents,
- simplify route-level wrappers,
- rename misleading UI component names,
- reduce overly nested presentational markup,
- remove dead styling branches if clearly unused.

Avoid:
- speculative architecture,
- non-UI refactors,
- state-management rewrites,
- major file churn without visible UI benefit.

---

## Acceptance criteria

The task is successful if:
- the frontend looks more consistent,
- the spacing feels more disciplined,
- the hierarchy is easier to scan,
- repeated UI patterns are more standardized,
- list/reader surfaces are calmer and clearer,
- empty/loading/error states look intentional,
- code is cleaner where UI cleanup touched it,
- existing flows still work.

---

## Decision rules

If you have to choose, prioritize:
1. consistency over novelty,
2. readability over density,
3. maintainability over cleverness,
4. incremental improvement over broad redesign.

---

## Output expectations

Work directly in the repo.

As you work:
- inspect the existing UI first,
- decide the highest-value cleanup targets,
- make focused improvements,
- keep changes scoped,
- summarize the key before/after improvements.

Do not stop at abstract suggestions.
Implement the cleanup in code.