# ai-plan-generation

## Purpose

Defines what an AI-generated training plan must contain and how it is requested from and parsed back out of the model, on the active phase-based generation path (`generatePlanFromPhases`). Emphasizes a compact request/response contract that fits multi-week plans within generation time limits, including recommended working weights for weight-loaded exercises.

## Requirements

### Requirement: Recommended weight for weight-based exercises

The AI plan generator SHALL request and produce a recommended working weight, in kilograms, for every weight-loaded exercise in a session's main workout. An exercise is weight-loaded when its catalog `equipment` includes dumbbells, barbell, kettlebell, or machines. The recommendation MUST be grounded in the user's profile (bodyweight and fitness level) and expressed in realistic increments.

#### Scenario: Weighted exercise carries a recommendation

- **WHEN** a generated plan includes a main-workout exercise whose equipment is weight-loaded (e.g. a barbell or dumbbell movement)
- **THEN** the resulting `PlannedExercise.targetWeightKg` is a positive number the user can see in the session's KG column

#### Scenario: Bodyweight and time-based exercises carry no weight

- **WHEN** a generated exercise is bodyweight-only or time-based (duration in seconds, no external load)
- **THEN** no weight is emitted for it and `targetWeightKg` remains undefined, so the UI shows no KG value

### Requirement: Compact weight encoding keeps responses small

The generator's compact exercise schema SHALL carry the recommended weight as a single optional key `w` (kilograms), included only where a weight applies, so that the AI response does not grow materially for bodyweight-heavy plans and stays within generation time limits.

#### Scenario: Weight key present only where relevant

- **WHEN** the AI returns the compact plan JSON
- **THEN** the `w` key appears only on weight-loaded main exercises and is absent from warmup, cooldown, bodyweight, and time-based entries

#### Scenario: Backward-compatible parsing

- **WHEN** a compact exercise object omits the `w` key
- **THEN** the transformer parses it successfully and leaves `targetWeightKg` undefined, exactly as before this change

### Requirement: Weight is mapped into the plan model

The phase-plan transformer SHALL map the compact `w` key to `PlannedExercise.targetWeightKg` for every exercise it converts, without requiring any change to consuming UI.

#### Scenario: Transformer maps w to targetWeightKg

- **WHEN** the transformer converts a compact exercise `{ "id": "ex_press", "s": 3, "r": 10, "w": 40 }`
- **THEN** the produced `PlannedExercise` has `targetWeightKg` equal to `40`
