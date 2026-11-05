## Purpose

Give users ready-made day and week sessions, grouped by muscle group and by exercise category, that they can preview and copy into their own library as a starting point instead of building from a blank page.

## ADDED Requirements

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
