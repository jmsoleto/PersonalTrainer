## Context

Plan generation runs through `generatePlanFromPhases` (`src/ai/phase-generator.ts`), which builds a prompt from `phase-plan-generation.ts` and parses the reply with `phase-plan-transformer.ts`. To fit large multi-week plans in one response and avoid timeouts, the prompt uses a **compact schema** with single-letter keys: `id`, `s` (sets), `r` (reps), `sec` (duration_sec), `es` (each_side). There is no weight key, so `PlannedExercise.targetWeightKg` — which already exists in the type and is already rendered by `SessionPage.vue` (KG column, pre-filled input) — is never populated on the active path.

The exercise catalog sent to Claude is "slimmed" (`slimExercise` strips only description/instructions/media) but **retains `equipment` and `category`**, so Claude already has, per exercise, enough information to decide whether it is weight-loaded — no extra prompt payload needed. That catalog block is cached (`cache_control: ephemeral`), so instruction additions there are effectively free after the first call.

## Goals / Non-Goals

**Goals:**
- Weight-loaded main exercises come back with a recommended kg value the user sees in-session.
- Response size grows only in proportion to the number of weight-loaded exercises — negligible for bodyweight-heavy plans.
- Zero UI and zero type changes; fully backward compatible parsing.

**Non-Goals:**
- Touching the unused legacy `plan-generation.ts` or the recalculation prompt.
- A dedicated per-week weight-progression schema (loads may vary because the main block is already per-week, but we add no separate structure for it).
- Auto-adjusting weights from past session feedback (future work).

## Decisions

- **Add one optional compact key `w` = target weight in kg.** Chosen over a verbose `targetWeightKg` (as the legacy prompt used) because single-letter keys are the whole point of this schema and minimize tokens. `w` is unambiguous next to the existing `s`/`r`/`sec`/`es`.
- **Emit `w` only for weight-loaded exercises, omit otherwise.** This is the core token-control lever: bodyweight and time-based exercises (the bulk of warmups/cooldowns and many main moves) stay byte-for-byte identical. Claude decides eligibility from the catalog `equipment` it already sees.
- **Leave week-to-week progression to Claude, no new schema.** The `weeks` main block already re-lists exercises per week, so if Claude wants progressive overload it simply emits a slightly different `w` per week; if not, it repeats it. Either way the schema is unchanged and the transformer maps per-occurrence. This honors the "don't grow the response much" constraint while not forbidding progression. (Alternative considered: force a single first-week-only weight and carry it forward in the transformer — rejected as more complex and error-prone for marginal savings.)
- **Transformer maps `w` → `targetWeightKg` in `mapCompactExercise`.** One line; applies uniformly to warmup/cooldown/main (harmless, since those won't carry `w`).
- **Units: kilograms, matching the rest of the app.** Recommend realistic increments (whole/half kg for dumbbells, ~2.5 kg steps for barbell) via a short prompt rule; no server-side rounding.

## Risks / Trade-offs

- **[Claude puts `w` on bodyweight moves or invents implausible loads]** → Prompt rule scopes `w` to weight-loaded equipment and ties the number to the user's bodyweight/level; the transformer trusts the value (no validation) but a bad value only mis-suggests a starting weight the user overrides in-session. Low blast radius.
- **[Response still grows for very strength-heavy plans]** → Growth is one small integer per loaded exercise; even a fully-loaded plan adds a handful of tokens per exercise, far below what caused prior truncation. Acceptable and monitorable.
- **[Inconsistent weights across weeks confuse users]** → Acceptable: the value is an editable starting suggestion, and per-week variation reflects intended progression.

## Migration Plan

1. Update `phase-plan-generation.ts`: add `w` to the schema key legend + example, and add a rule scoping when to include it.
2. Update `phase-plan-transformer.ts`: add `w?: number` to `CompactExercise` and map it to `targetWeightKg`.
3. Verify with a generated plan (or a unit test on the transformer) that a `w`-bearing exercise yields `targetWeightKg` and the KG column renders.
4. Rollback is trivial: revert the two files; absent `w` parses exactly as today.
