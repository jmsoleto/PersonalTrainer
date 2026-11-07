# workout-presets Specification

## Purpose
Give users ready-made day and week sessions, grouped by muscle group and by exercise category, that they can preview and copy into their own library as a starting point instead of building from a blank page.

## Requirements

### Requirement: Built-in day presets

The system SHALL ship a read-only catalog of day presets that use the same structure as user day templates. The catalog SHALL include at least these presets.
By muscle group: "Pecho y tríceps", "Espalda y bíceps", "Pierna", "Hombros", "Core exprés" and "Cuerpo completo".
By category: "Cardio HIIT", "Pliometría", "Movilidad y flexibilidad" and "Equilibrio".
Each preset SHALL declare its grouping (muscle group or category), its target muscle groups, an estimated duration and the equipment it requires. Presets SHALL NOT prescribe a weight.

#### Scenario: Browsing presets by grouping
- **WHEN** the user opens the presets browser
- **THEN** day presets are listed in two groups, "Por grupo muscular" and "Por categoría", each with name, estimated duration and target muscles

#### Scenario: Preview a preset
- **WHEN** the user opens the "Pierna" preset
- **THEN** its warm-up, main workout and stretching are shown with sets, reps or time and rest, and no weights

### Requirement: Built-in week presets

The system SHALL ship read-only week presets built only from the built-in day presets. The catalog SHALL include at least "Full body 3 días", "Split 4 días" and "Acondicionamiento 4 días".

#### Scenario: Preview a week preset
- **WHEN** the user opens "Full body 3 días"
- **THEN** the seven weekdays are shown, with "Cuerpo completo" on three non-consecutive days and the remaining days as rest or active rest

### Requirement: Presets are read-only and copied on use

Presets SHALL NOT be editable or deletable. The user SHALL be able to duplicate a day preset into their library as a new day template. The user SHALL be able to duplicate a week preset as a new week template; this SHALL also create day templates for every day preset it uses. After duplication, the user's copies SHALL be independent of the preset.

#### Scenario: Duplicate a day preset
- **WHEN** the user taps "Duplicar y editar" on "Core exprés"
- **THEN** a new day template "Core exprés" owned by the user appears in their library and opens in the editor

#### Scenario: Duplicate a week preset
- **WHEN** the user duplicates "Split 4 días"
- **THEN** the user's library gains a week template "Split 4 días" whose slots reference newly created copies of the day presets it uses

#### Scenario: Presets cannot be edited
- **WHEN** the user views any preset
- **THEN** no edit or delete action is available, only preview and duplicate

### Requirement: Equipment notice

When a preset requires equipment that the current user has not marked as available in their profile, the presets browser SHALL show which equipment is missing. Duplicating SHALL still be allowed.

#### Scenario: User without dumbbells
- **WHEN** a user without dumbbells views "Espalda y bíceps"
- **THEN** the preset shows a notice that it requires dumbbells, and duplicating it is still possible

### Requirement: Presets only reference catalog exercises

Every exercise referenced by a day preset SHALL exist in the exercise catalog. Warm-up exercises SHALL belong to the `warmup` category. Cool-down exercises SHALL belong to the `cooldown` or `flexibility` category. Every day preset referenced by a week preset SHALL exist. This SHALL be checked by an automated test so a catalog change cannot silently break a preset.

#### Scenario: Catalog integrity check
- **WHEN** the automated test suite runs
- **THEN** it fails if any preset references an unknown exercise id, uses a non-warm-up exercise in a warm-up, uses a non-stretching exercise in a cool-down, or references an unknown day preset

### Requirement: Pyramid day presets

The built-in catalog SHALL include two day presets in the category group that use pyramid blocks in their main workout:
- **"Fuerza en pirámide"**: barbell exercises in triangle, ascending and descending pyramids.
- **"Pirámide con mancuernas"**: dumbbell exercises in pyramids, plus at least one bodyweight reps pyramid and one time pyramid.

Like every preset, they SHALL NOT prescribe a weight, so their pyramids vary only reps or time. They SHALL NOT include drop sets, which require a weight. Duplicating them SHALL keep the variant and the generation parameters, so the user only has to add weights.

#### Scenario: Preview of a pyramid preset
- **WHEN** the user opens "Fuerza en pirámide" in the presets browser
- **THEN** each pyramid exercise shows its variant and its per-set reps, for example "Triángulo · 12/10/8/10/12", with no weights

#### Scenario: Equipment notice for the barbell preset
- **WHEN** a user without a barbell views "Fuerza en pirámide"
- **THEN** the preset shows that it requires a barbell

#### Scenario: Adding weights after duplicating
- **WHEN** the user duplicates "Fuerza en pirámide" and enters weight 40 → 55 kg for the ascending press
- **THEN** the sets are regenerated with those weights and the preset's reps

### Requirement: Superset day presets

The built-in catalog SHALL include two day presets in the category group that use superset blocks in their main workout:
- **"Torso en superseries"**: barbell work. Superset A pairs bench press and bent-over row, 4 rounds of 10 reps. Superset B pairs overhead press and pull-ups, 3 rounds of 8 reps. It ends with a straight barbell curl, 3 × 12.
- **"Superseries con mancuernas"**: dumbbell work. Superset A pairs bench press and one-arm row, 3 × 12. Superset B pairs lunges and Romanian deadlift, 3 × 10. Superset C pairs biceps curl and overhead triceps extension, 3 × 12.

Every superset SHALL use a 0 s transition and a rest between rounds. Like every preset, they SHALL NOT prescribe a weight, and they SHALL have a warm-up and a cool-down. Duplicating them SHALL keep the supersets, so the user only has to add weights.

#### Scenario: Preview of a superset preset
- **WHEN** the user opens "Torso en superseries" in the presets browser
- **THEN** each superset is shown as one group labelled with its letter, listing A1 and A2 with their reps and the number of rounds

#### Scenario: Equipment notice
- **WHEN** a user without a pull-up bar views "Torso en superseries"
- **THEN** the preset shows that it requires a pull-up bar

#### Scenario: Duplicating keeps supersets
- **WHEN** the user duplicates "Superseries con mancuernas"
- **THEN** the new day has three supersets with the same exercises, rounds and rests
