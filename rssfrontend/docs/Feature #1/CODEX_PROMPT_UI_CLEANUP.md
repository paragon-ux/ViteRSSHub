# CODEX_PROMPT_UI_CLEANUP.md

You are working inside an existing frontend project called **RSSHubVite**.

Your task is to implement **Feature #1: UI cleanup / frontend polish + codebase hygiene** as an incremental improvement to the current app, not as a redesign from scratch.

Read these files first and treat them as the source of truth, in this order:

1. `EXEC_PLAN_UI_CLEANUP.md`
2. `FEATURE_NATIVE_UI_CLEANUP.md`
3. `README.md`

If these documents conflict:
- `EXEC_PLAN_UI_CLEANUP.md` controls build order and done criteria,
- `FEATURE_NATIVE_UI_CLEANUP.md` provides product and architecture context,
- `README.md` provides repo-local orientation.

## Product goal

Make the frontend feel:
- cleaner,
- calmer,
- more structured,
- more premium,
- easier to scan,
- less blocky,
- and more consistent across routes and components.

This is a polish and architecture-cleanup task for an existing feed product UI.

The target direction is:
- **Folo** for premium AI-forward product feel,
- **Readwise Reader** for calmer reading surfaces and hierarchy,
- **Feeder** for simplicity and mainstream feed-reader ergonomics.

Do not clone those products literally.
Use them only as reference for:
- visual restraint,
- layout rhythm,
- hierarchy,
- spacing,
- interaction clarity,
- and overall product feel.

## Important constraints

Do not:
- redesign the product from scratch,
- break existing core flows,
- introduce unnecessary frameworks,
- over-abstract the component tree,
- add unrelated new features,
- change backend contracts unless necessary for UI cleanup,
- implement hybrid discovery here,
- implement AI features here.

This task is about:
1. cleaning up the existing frontend UI,
2. improving consistency,
3. reducing visual noise,
4. improving code organization where it supports UI maintainability.

## Main objectives

### 1. Improve visual hierarchy
Audit and improve:
- page headers,
- section spacing,
- typography scale,
- card density,
- alignment,
- visual grouping,
- empty states,
- action prominence,
- secondary text treatment.

The result should feel less cluttered and less mechanically boxy.

### 2. Improve layout consistency
Standardize:
- page container widths,
- horizontal padding,
- vertical rhythm,
- card spacing,
- list spacing,
- modal spacing,
- panel spacing,
- header/action placement.

The app should feel like one coherent system, not a collection of disconnected screens.

### 3. Improve feed-reader ergonomics
Where relevant, make reading and scanning easier:
- better item list density,
- clearer title/meta separation,
- calmer supporting metadata,
- more readable preview surfaces,
- better hover/focus/selection states,
- less noisy competing actions.

### 4. Improve component consistency
Normalize repeated UI patterns such as:
- buttons,
- inputs,
- cards,
- section headers,
- badges,
- chips,
- tabs,
- dialogs,
- empty states,
- loading states,
- error states.

Prefer reuse over duplicated ad hoc styling.

### 5. Improve design-token hygiene
Where possible, consolidate:
- spacing values,
- radius values,
- shadows,
- border colors,
- muted text styles,
- layout wrappers,
- state styles.

Do not create a huge design system.
Create only enough shared structure to reduce inconsistency and styling drift.

### 6. Improve codebase hygiene where it supports UI cleanup
Refactor only where it helps maintainability of the frontend.

Examples:
- remove obviously duplicated presentational patterns,
- extract reusable UI primitives where repetition is real,
- simplify messy component composition,
- clean route-level layout wrappers,
- reduce one-off styling logic,
- improve naming where current names are misleading.

Do not do speculative architecture work.

## Existing-app assumption

Assume RSSHubVite already has:
- an application shell,
- routes/pages,
- feed-related views,
- add/discover flows,
- item lists and/or reader surfaces.

Your job is to improve those surfaces in-place.

## Deliverables

### A. UI audit summary
Before making large changes, inspect the frontend and identify:
- the most inconsistent layouts,
- the noisiest screens,
- repeated styling patterns,
- duplicated component structures,
- weak empty/loading/error states,
- areas with poor spacing or hierarchy.

### B. Focused cleanup plan
Create a short implementation plan that prioritizes:
1. highest-traffic or most visible screens first,
2. shared primitives next,
3. route-level cleanup after that.

### C. Implemented cleanup
Apply the improvements directly in code.

### D. Brief change summary
At the end, summarize:
- what UI patterns were standardized,
- what files/components changed,
- what was intentionally deferred.

## Preferred implementation style

Prefer:
- small reusable primitives,
- simple layout wrappers,
- explicit class/style reuse,
- readable component structure,
- minimal but meaningful refactors.

Avoid:
- giant monolithic theme rewrites,
- unnecessary state-management rewrites,
- large speculative component libraries,
- introducing a new visual language unrelated to the current app.

## Quality bar

The result should visibly improve:
- readability,
- scanability,
- consistency,
- calmness,
- and perceived quality.

It should feel more polished without feeling heavier.

## Likely areas to inspect

Check for cleanup opportunities in:
- app shell / top-level layout
- navigation / sidebar / header
- feed list views
- result cards
- subscription/add flows
- empty states
- loading states
- error states
- modal/dialog surfaces
- detail or reader views
- forms and search/add inputs

## Acceptance criteria

The task is successful if:
- the frontend feels more visually consistent,
- spacing and hierarchy are more disciplined,
- repeated UI patterns are standardized,
- reading/list surfaces are easier to scan,
- empty/loading/error states look intentional,
- code organization is cleaner where UI cleanup required it,
- no major existing flow is broken.

## Output format

Work directly in the repo.

As you work:
1. identify the main UI consistency problems,
2. make a focused cleanup plan,
3. implement the cleanup,
4. explain the main before/after improvements.

If tradeoffs are needed, prioritize:
- consistency over novelty,
- readability over density,
- maintainability over cleverness.
```
