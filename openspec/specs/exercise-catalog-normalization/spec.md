# Exercise Catalog Normalization

## Purpose

The exercise catalog (`src/data/exercises.json`) stores equipment, muscle, category, and difficulty values using the canonical English enum vocabulary defined in `src/types/enums.ts`, with no duplicate/synonym values, so that equipment and muscle filters — and any code keyed on these values — work correctly.

## Requirements

### Requirement: Canonical enum vocabulary in the catalog

The exercise catalog (`src/data/exercises.json`) SHALL store `equipment`, `muscleGroups`, `primaryMuscle`, `category`, and `difficulty` using only the canonical English enum values defined in `src/types/enums.ts` (`Equipment`, `MuscleGroup`, `ExerciseCategory`, `ExerciseDifficulty`). No Spanish-language values SHALL remain in these fields.

#### Scenario: Equipment values match the Equipment enum
- **WHEN** any exercise's `equipment` array is read
- **THEN** every value is a member of the `Equipment` enum (e.g., `dumbbells`, `barbell`, `bench`, `resistance_bands`, `pull_up_bar`, `kettlebell`, `yoga_mat`)
- **AND** no value is a Spanish synonym such as `mancuernas`, `banco`, `banda_elástica`, or `barra_dominadas`

#### Scenario: Muscle, category, and difficulty values match their enums
- **WHEN** any exercise's `primaryMuscle`, `muscleGroups`, `category`, or `difficulty` is read
- **THEN** each value is a member of the corresponding enum (`MuscleGroup`, `ExerciseCategory`, `ExerciseDifficulty`)
- **AND** no Spanish value such as `pecho`, `cuádriceps`, `fuerza`, or `principiante` remains

### Requirement: No duplicate equipment vocabulary

The catalog SHALL represent each physical piece of equipment with exactly one canonical value, collapsing the pre-existing synonym pairs.

#### Scenario: Synonym pairs are collapsed
- **WHEN** the distinct set of `equipment` values across the catalog is computed
- **THEN** `bench` appears but `banco` does not
- **AND** `resistance_bands` appears but `banda_elástica` does not
- **AND** `pull_up_bar` appears but `barra_dominadas` does not

### Requirement: Equipment filter returns equipment-based exercises

Because the catalog vocabulary now matches the user profile vocabulary, `filterByEquipment()` SHALL include equipment-based exercises whose required equipment the user owns, not only bodyweight exercises.

#### Scenario: User with equipment sees equipment exercises
- **WHEN** `filterByEquipment` is called with a user's equipment list that includes `dumbbells`
- **THEN** exercises whose `equipment` requires only `dumbbells` (or a subset of the user's equipment) are included in the result

#### Scenario: Bodyweight-only user unaffected
- **WHEN** `filterByEquipment` is called with `['bodyweight_only']`
- **THEN** exercises with an empty `equipment` array are still included

### Requirement: Exercise library filters remain functional

`ExerciseLibraryPage.vue` SHALL use the canonical English vocabulary for its muscle, category, and difficulty filters, label maps, and styling logic, so that filtering the library continues to return matching exercises.

#### Scenario: Filtering by a muscle group returns results
- **WHEN** the user selects a muscle filter (e.g., "Pecho") in the exercise library
- **THEN** the page filters the catalog using the canonical value (`chest`) and displays the matching exercises

#### Scenario: Difficulty styling resolves
- **WHEN** an exercise with difficulty `beginner` is rendered in the library
- **THEN** its difficulty badge styling resolves correctly from the canonical value
