## 1. Prompt: request compact weight

- [x] 1.1 In `src/ai/prompts/phase-plan-generation.ts`, add `w=target_weight_kg` to the compact key legend (line ~137)
- [x] 1.2 Add `"w"` to at least one main-exercise example in the schema block so the format is unambiguous (e.g. `{"id":"ex_...","s":3,"r":10,"w":40}`)
- [x] 1.3 Add a schema rule: include `w` (kg) ONLY for weight-loaded exercises (equipment includes dumbbells/barbell/kettlebell/machines); OMIT it for bodyweight and time-based exercises and for warmup/cooldown
- [x] 1.4 Add guidance that `w` must be grounded in the user's bodyweight and fitness level, using realistic increments (whole/half kg for dumbbells, ~2.5 kg for barbell)

## 2. Transformer: map weight into the model

- [x] 2.1 In `src/ai/parsers/phase-plan-transformer.ts`, add `w?: number // target_weight_kg` to the `CompactExercise` interface
- [x] 2.2 In `mapCompactExercise`, set `targetWeightKg: ce.w` on the returned `PlannedExercise`

## 3. Verification

- [x] 3.1 Add/extend a Vitest unit test asserting a compact exercise `{id, s, r, w:40}` transforms to a `PlannedExercise` with `targetWeightKg === 40`, and that an exercise without `w` yields `targetWeightKg === undefined`
- [x] 3.2 Run `npm run test:unit` and confirm the transformer test passes
- [x] 3.3 Run `npm run lint` (or `vue-tsc`) to confirm no type errors from the new field
- [ ] 3.4 Manual/optional: generate a plan and confirm the session KG column shows recommended weights for weighted exercises and nothing for bodyweight ones
