# Exercise Alternatives

## Purpose

Users can replace a planned exercise they can't or don't want to do with a similar one that fits their available equipment and injuries. The replacement is chosen from a local, offline heuristic and is persisted into the plan for that specific day and week.

## Requirements

### Requirement: Find similar alternative exercises

The system SHALL provide a local, offline function that, given a planned exercise and the user's context (available equipment and injuries), returns a ranked list of alternative exercises the user can actually perform. No AI/network call SHALL be required.

#### Scenario: Alternatives share the primary muscle
- **WHEN** alternatives are requested for an exercise whose `primaryMuscle` is `chest`
- **THEN** every returned alternative also has `primaryMuscle` `chest`
- **AND** the original exercise itself is excluded from the results

#### Scenario: Alternatives respect the user's equipment
- **WHEN** alternatives are requested and the user's equipment is `['bodyweight_only']`
- **THEN** no returned alternative requires equipment the user does not own

#### Scenario: Alternatives respect injuries
- **WHEN** the user has an injury zone matching a muscle worked by a candidate exercise
- **THEN** that candidate is excluded from the alternatives

#### Scenario: Alternatives are ranked by similarity
- **WHEN** multiple valid alternatives exist
- **THEN** they are ordered so that closer matches (same `category`, same `isCompound`, nearest `difficulty`) rank higher

#### Scenario: No alternatives available
- **WHEN** no exercise satisfies the muscle, equipment, and injury constraints
- **THEN** the function returns an empty list (it does not error)

### Requirement: Swap an exercise during an active session

During an active session, the user SHALL be able to replace a planned main-workout exercise with one of its alternatives via a dedicated "swap" action, distinct from the existing "skip" action.

#### Scenario: Swap action is available per exercise
- **WHEN** the user views a main-workout exercise in the active session
- **THEN** a "swap" control is shown alongside the info and skip controls

#### Scenario: Selecting an alternative replaces the exercise
- **WHEN** the user opens the swap control and selects an alternative
- **THEN** the exercise in the current session is replaced by the selected alternative
- **AND** the session's set-logging UI reflects the new exercise

#### Scenario: Prescription is inherited
- **WHEN** an exercise is swapped
- **THEN** the sets, reps, rest, and any target weight from the original planned exercise are carried over to the alternative, adapting only where the alternative's modality differs (e.g., duration-based vs rep-based)

### Requirement: Persist the swap into the plan

A swap SHALL rewrite the corresponding `PlannedExercise` in the stored `TrainingPlan` for that specific week and day in IndexedDB, so the change persists across app restarts and is reflected when the plan or session is reopened.

#### Scenario: Swap persists for that day and week
- **WHEN** the user swaps an exercise on week N, day M and the session is saved
- **THEN** the `PlannedExercise` at week N, day M in the stored plan references the alternative's `exerciseId` and `exerciseName`

#### Scenario: Other days are unaffected
- **WHEN** an exercise is swapped on week N, day M
- **THEN** occurrences of the original exercise on other days or weeks remain unchanged

#### Scenario: Swap survives reload
- **WHEN** the user reopens the plan after swapping and restarting the app
- **THEN** week N, day M shows the alternative, not the original exercise
