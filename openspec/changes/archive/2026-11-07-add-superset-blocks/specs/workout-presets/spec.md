## ADDED Requirements

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
