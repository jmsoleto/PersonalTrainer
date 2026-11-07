## Purpose

Let users pair two exercises in a superset in their day templates, done back to back round after round. The pairing, rounds and rests must reach the active plan and the session unchanged.

## ADDED Requirements

### Requirement: Superset structure

A superset block SHALL contain exactly two exercises, shown as A1 and A2. The letter SHALL follow the order of the supersets in the day's main workout: the first superset is A, the second B, and so on. Straight and pyramid blocks between them SHALL NOT take a letter. Each exercise SHALL keep its own mode (reps or time), reps or seconds, and optional weight, and all sets of one exercise SHALL share the same prescription. The two exercises SHALL be different, and neither SHALL appear elsewhere in the same main workout.

#### Scenario: Two exercises with their own prescription
- **WHEN** the user builds a superset of "Flexión Estándar" for 15 reps and "Plancha" for 30 s
- **THEN** the block is saved with A1 in reps mode at 15 reps and A2 in time mode at 30 s

#### Scenario: Letters follow the order of the supersets
- **WHEN** a main workout has a superset, then a straight block, then another superset
- **THEN** the supersets are labelled A and B, and the straight block has no letter

#### Scenario: A third exercise is refused
- **WHEN** a stored superset block has three exercises
- **THEN** the day is reported as invalid and cannot be activated

#### Scenario: Same exercise twice
- **WHEN** the user tries to use "Press de Banca con Barra" as A2 when it is already A1 or in another block of the main workout
- **THEN** the exercise cannot be chosen, and a stored day with that repetition is reported as invalid

### Requirement: Shared rounds

Both exercises of a superset SHALL have the same number of sets, called rounds, between 1 and 10. Changing the number of rounds SHALL change it for both exercises. A stored superset whose exercises have different numbers of sets SHALL be reported as invalid.

#### Scenario: Changing rounds
- **WHEN** the user changes a superset from 3 to 4 rounds
- **THEN** A1 and A2 each have 4 sets with their own prescription

#### Scenario: Uneven rounds are invalid
- **WHEN** a stored superset has 3 sets of A1 and 4 sets of A2
- **THEN** the day is reported as invalid

### Requirement: Transition and round rest

A superset SHALL have two rests:
- The **transition** from A1 to A2. It SHALL default to 0 s and SHALL be editable.
- The **rest between rounds**, taken after A2. It SHALL default to 90 s and SHALL be editable.

The duration estimate of the day SHALL count the transition and the round rest once per round.

#### Scenario: Default rests
- **WHEN** the user creates a superset
- **THEN** the transition is 0 s and the rest between rounds is 90 s

#### Scenario: Duration estimate
- **WHEN** a superset has 3 rounds of A1 10 reps and A2 10 reps, transition 0 s and round rest 90 s
- **THEN** the estimate counts 3 × (10 reps + 10 reps + 90 s)

### Requirement: Supersets only in the main workout

The editor SHALL offer supersets only in the main workout. A stored day with a superset in the warm-up or cool-down SHALL be reported as invalid. A superset SHALL NOT contain pyramids, and a superset block SHALL NOT carry a pyramid configuration.

#### Scenario: Warm-up offers no supersets
- **WHEN** the user edits a warm-up block
- **THEN** the superset kind is not offered

#### Scenario: Superset in the cool-down is invalid
- **WHEN** a stored day has a superset in the cool-down
- **THEN** the day is reported as invalid

### Requirement: Creating and converting supersets

- Switching a straight block to superset SHALL keep its exercise and values as A1 and SHALL open the exercise picker to choose A2. A2 SHALL start with the same number of rounds as A1, the same default prescription as a newly added main-workout exercise (10 reps, or 30 s for cardio, flexibility and balance exercises) and no weight. If the user cancels the picker, the block SHALL stay straight and unchanged.
- Switching a pyramid block to superset SHALL first convert it to straight, with the same warning as switching a pyramid to straight.
- "Separar superserie" SHALL turn the superset into two straight blocks, A1 then A2, in its place, keeping each exercise's values. The transition SHALL become the rest of the first block's sets.
- Removing A1 or A2 SHALL leave the other exercise as a straight block with its values.
- The user SHALL be able to swap A1 and A2. The transition and the round rest SHALL stay with their positions.

#### Scenario: Straight to superset
- **WHEN** the user switches "Press de Banca con Barra" 4 × 10 at 40 kg to superset and picks "Remo con Barra en Inclinación"
- **THEN** the block is a superset of 4 rounds with A1 press 10 reps at 40 kg and A2 row 10 reps with no weight

#### Scenario: Cancelling the picker
- **WHEN** the user switches a straight block to superset and closes the picker without choosing
- **THEN** the block is still straight with its previous values

#### Scenario: Separating a superset
- **WHEN** the user separates a superset of press and row with 3 rounds
- **THEN** the day has a straight press block followed by a straight row block, each with 3 sets and its previous values

#### Scenario: Removing one exercise
- **WHEN** the user removes A2 from a superset
- **THEN** A1 remains as a straight block with its values

### Requirement: Supersets in the active plan

Activating a plan template that contains supersets SHALL produce sessions in which both exercises appear consecutively, in A1, A2 order, each marked with its superset letter and position. Each exercise SHALL keep its own prescription and rest. Plans generated by AI or imported from a file SHALL be unaffected.

#### Scenario: Activating a superset
- **WHEN** the user activates a plan whose day has superset A of press and row for 4 rounds
- **THEN** that session lists the press as A1 and the row as A2, consecutively, each with 4 sets

#### Scenario: Plans without supersets
- **WHEN** the user activates an AI-generated plan
- **THEN** no session exercise is marked as part of a superset

### Requirement: Supersets in a session

When session exercises are marked as a superset:
- The two exercises SHALL be shown together, grouped, with a header such as "Superserie A · 3 rondas".
- Each exercise SHALL be labelled A1 or A2.
- When the transition is 0 s, A1's set rows SHALL be marked "sin descanso".

Swapping either exercise for an alternative SHALL keep its letter and position in the superset. Completed sets SHALL be recorded per exercise and per set, as for any session.

#### Scenario: Grouped superset
- **WHEN** the user starts a session with superset A of press and row for 3 rounds
- **THEN** the press and row cards are shown together under "Superserie A · 3 rondas", labelled A1 and A2

#### Scenario: No rest after A1
- **WHEN** the superset's transition is 0 s
- **THEN** each of A1's set rows is marked "sin descanso", and A2's rows are not

#### Scenario: Swapping inside a superset
- **WHEN** the user swaps A2 for an alternative
- **THEN** the alternative is shown as A2 inside the same superset
