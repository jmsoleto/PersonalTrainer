## ADDED Requirements

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
