## Why

The app is already wired end-to-end to display a recommended weight per exercise (`PlannedExercise.targetWeightKg` exists and `SessionPage.vue` renders a "KG" column and pre-fills it), but the active plan generator never produces one. The current path — `generatePlanFromPhases` using the compact phase prompt — has no weight key in its schema, so `targetWeightKg` is always `undefined` and users get no starting-weight guidance for loaded exercises. We want the trainer (Claude) to recommend a working weight for weight-based exercises **without materially increasing the response size**, since larger responses risk timeouts / truncation during generation.

## What Changes

- Add an optional compact key `w` (recommended weight in kg) to the phase generator's compact exercise schema, alongside the existing `s`/`r`/`sec`/`es` keys.
- Instruct Claude to populate `w` **only** for weight-loaded exercises (those whose catalog `equipment` includes dumbbells, barbell, kettlebell, or machines) and to omit it entirely for bodyweight and time-based exercises, keeping the response sparse.
- Map the new `w` key to `targetWeightKg` in the phase-plan transformer so the existing UI picks it up with no UI changes.
- Keep the recommendation grounded in the user's profile (bodyweight, fitness level) and realistic increments; leave progression across weeks to Claude's discretion within the existing per-week main block (no extra schema).
- No change to the identifier of the response contract beyond the additive `w` key; existing plans without `w` continue to parse (backward compatible).

## Capabilities

### New Capabilities
- `ai-plan-generation`: Defines what the AI-generated training plan must contain and how it is requested/parsed, including the new requirement that weight-based exercises carry a recommended working weight while keeping the response compact.

### Modified Capabilities
<!-- No existing spec for AI plan generation yet; this establishes it. -->

## Impact

- **Files:** `src/ai/prompts/phase-plan-generation.ts` (schema + rules), `src/ai/parsers/phase-plan-transformer.ts` (`CompactExercise.w` → `targetWeightKg`).
- **No UI changes:** `SessionPage.vue` already reads and displays `targetWeightKg`.
- **No type changes:** `PlannedExercise.targetWeightKg?` already exists.
- **Response size:** grows only by one small numeric key per weight-loaded exercise; bodyweight/time exercises and warmup/cooldown stay unchanged. Prompt tokens grow by a few instruction lines (cached with the rest of the prompt structure).
- **Backward compatible:** transformer treats `w` as optional; older/absent values leave `targetWeightKg` undefined as today.
- **Out of scope:** the unused legacy `plan-generation.ts` path and the recalculation prompt.
