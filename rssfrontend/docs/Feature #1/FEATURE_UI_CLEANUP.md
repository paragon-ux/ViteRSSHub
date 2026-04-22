# FEATURE_UI_CLEANUP.md

# UI Cleanup / Frontend Polish
## Product / Technical Specification v1

## 1. Purpose

This feature is a focused cleanup and polish pass for the existing **RSSHubVite** frontend.

Its purpose is to improve:
- visual consistency,
- layout discipline,
- reading and scanning ergonomics,
- state clarity,
- and maintainability of the frontend code where it affects UI quality.

This feature is not a redesign from scratch.
It is an incremental improvement to the current product surface.

---

## 2. Product Goal

Make RSSHubVite feel:
- cleaner,
- calmer,
- more cohesive,
- less noisy,
- more intentional,
- and more polished.

The target outcome is a frontend that feels more like a well-shaped product and less like a collection of individually built screens.

---

## 3. Product References

Use these references only for direction, not imitation:
- **Folo** for premium product feel and modern reading surface expectations
- **Readwise Reader** for calm hierarchy, reading ergonomics, and cleaner visual pacing
- **Feeder** for simple, mainstream feed-reader usability

These references should influence:
- spacing,
- typography,
- hierarchy,
- density,
- interaction polish,
- and overall coherence.

They should not be copied literally.

---

## 4. Scope

### In scope
- page-level visual cleanup
- layout consistency improvements
- spacing normalization
- typography hierarchy cleanup
- list/card ergonomics improvements
- empty/loading/error state polish
- repeated UI-pattern standardization
- light code cleanup where it directly improves frontend maintainability

### Out of scope
- full redesign
- new backend features
- hybrid discovery
- AI features
- major state-management rewrites
- major information-architecture changes
- speculative design-system expansion

---

## 5. Existing App Assumption

This feature assumes RSSHubVite already has:
- an application shell,
- route-level views,
- feed-related surfaces,
- add/discover flows,
- list and/or item surfaces,
- existing component and styling patterns.

The work should fit into the current app, not replace it.

---

## 6. Core Objectives

### 6.1 Improve visual hierarchy
Important information should stand out clearly without making the interface feel louder.

This includes improving:
- headings,
- section labels,
- action prominence,
- metadata treatment,
- and information grouping.

### 6.2 Improve layout consistency
The app should feel like one coherent system.

This includes standardizing:
- page widths,
- page padding,
- vertical rhythm,
- card spacing,
- panel spacing,
- and header/action alignment.

### 6.3 Improve reading and scanning ergonomics
Feed and item surfaces should be easier to scan and less visually fatiguing.

This includes:
- better title/meta separation,
- calmer supporting metadata,
- clearer row/card structure,
- better focus/hover/selection states,
- and less clutter around primary actions.

### 6.4 Improve repeated pattern consistency
Repeated UI patterns should feel like the same design language.

This includes:
- buttons,
- inputs,
- cards,
- section headers,
- chips/badges,
- dialogs,
- and state surfaces.

### 6.5 Improve code hygiene where it supports UI cleanup
Frontend code should be easier to maintain where UI cleanup depends on it.

This includes:
- reducing obvious duplication,
- extracting small reusable primitives where repetition is real,
- simplifying route-level layout wrappers,
- improving naming where presentational intent is unclear.

---

## 7. Feature Principles

1. **Incremental, not destructive**  
   Improve the app in place.

2. **Consistency over novelty**  
   A calmer, more consistent app is better than a flashy redesign.

3. **Readability over density**  
   Reduce clutter before increasing information density.

4. **Maintainability over cleverness**  
   Prefer simple reusable patterns over one-off visual tricks.

5. **Product feel matters**  
   This is not just CSS cleanup; it is product-surface refinement.

---

## 8. UX Targets

### 8.1 App shell
The app shell should feel stable and intentional.

Look for improvements in:
- top-level layout balance,
- navigation treatment,
- header consistency,
- and route-level visual alignment.

### 8.2 Feed/list surfaces
Lists should be easier to scan.

Improve:
- row/card density,
- metadata hierarchy,
- primary action clarity,
- spacing between repeated items.

### 8.3 Detail/reader surfaces
Reading surfaces should feel calmer and more focused.

Improve:
- text hierarchy,
- content spacing,
- supporting metadata placement,
- and surrounding action clutter.

### 8.4 State surfaces
Empty/loading/error states should look like designed states, not leftovers.

Improve:
- clarity,
- consistency,
- spacing,
- and recovery actions.

### 8.5 Input/add surfaces
Add, search, or input-based surfaces should feel clean and legible.

Improve:
- input hierarchy,
- helper text,
- validation/error clarity,
- and action emphasis.

---

## 9. Styling / Design Hygiene

The cleanup should reduce visual drift by consolidating where useful:
- spacing values,
- radius values,
- border treatments,
- muted foreground styles,
- shadow usage,
- wrapper/container patterns.

This should be done lightly.
Do not build a large design-token system unless the current code clearly requires it.

---

## 10. Codebase Hygiene Requirements

Refactor only where it directly supports the frontend cleanup.

Good refactors:
- extracting duplicated presentational subcomponents,
- creating simple reusable layout wrappers,
- consolidating repeated card structures,
- simplifying nested presentational markup,
- removing obvious dead styling branches.

Avoid:
- speculative architecture,
- unrelated refactors,
- major state rewrites,
- giant component-library work.

---

## 11. Suggested Components / Surfaces to Audit

Audit and improve where relevant:
- app shell
- navigation/sidebar/header
- feed lists
- result cards
- item previews
- add/import/discover panels
- dialogs/modals
- empty states
- loading states
- error states
- route-level page wrappers
- forms and inputs

---

## 12. Success Criteria

This feature is successful if:
- the frontend feels more visually consistent,
- spacing feels more disciplined,
- repeated patterns are more standardized,
- reading/list surfaces are easier to scan,
- empty/loading/error states look intentional,
- code is cleaner where UI cleanup touched it,
- and major existing flows still work.

---

## 13. Non-Goals

This feature does not attempt to:
- redesign the whole product,
- change backend behavior,
- introduce discovery/search features,
- introduce AI functionality,
- replace the product’s information architecture,
- or solve all design debt permanently.

It is a focused polish and hygiene pass.

---

## 14. Acceptance Criteria

The feature is complete when:
- major high-traffic screens have more consistent layout structure,
- repeated UI patterns have been normalized,
- feed/list views are more readable,
- state surfaces are visibly improved,
- styling drift is reduced,
- the codebase is cleaner where the cleanup required refactoring,
- and the updated frontend still preserves the app’s core flows.

---

## 15. One-Sentence Definition

Feature #1 is an incremental UI and code-hygiene cleanup pass over the existing RSSHubVite frontend that improves consistency, readability, and product polish without redesigning the app from scratch.