## Purpose

Let users prescribe pyramid and drop-set work in their day templates, where the sets of one exercise differ from each other. The user's targets for each set must reach the active plan and the session unchanged.

## ADDED Requirements

### Requirement: Pyramid variants

A main-workout block SHALL be able to be a **pyramid** of one exercise. A pyramid SHALL have one of these variants:
- **ascending**: load increases set by set.
- **descending**: load decreases set by set.
- **triangle**: load rises to a peak set and then decreases back, mirroring the rising sets.
- **drop set**: a start weight followed by 1 to 4 drops, with no rest between stages.

The variant SHALL be stored with the block and shown wherever the block is listed. For ascending and descending pyramids the variant describes the intent and sets the editor's default values. The system SHALL NOT reject a pyramid because its values do not follow the variant's direction, so bodyweight and time pyramids can vary reps or seconds in either direction. A pyramid SHALL have between 2 and 10 sets. A triangle SHALL have between 2 and 5 rising steps; its total set count is twice the steps minus one.

#### Scenario: Triangle set count
- **WHEN** the user creates a triangle pyramid with 3 rising steps
- **THEN** the block has 5 sets and the 4th and 5th sets repeat the 2nd and 1st

#### Scenario: Variant is visible
- **WHEN** a day template contains a drop-set block for "Curl con Barra"
- **THEN** the day editor labels that block "Drop set"

### Requirement: Generating sets from parameters

For ascending and descending pyramids the user SHALL enter the number of sets, the first and last value of reps (reps mode) or seconds (time mode), optionally the first and last weight, and the rest after each set. For a triangle the user SHALL enter the number of rising steps, the base and peak values and the rest. The system SHALL generate the sets by spreading values evenly between first and last.

Generated values SHALL be rounded:
- weight to the nearest 2.5 kg;
- reps to a whole number;
- seconds to the nearest 5 s.

Generated reps, seconds and weights SHALL be positive.

#### Scenario: Ascending pyramid with weight
- **WHEN** the user generates an ascending pyramid of 4 sets, reps 12 → 6, weight 40 → 55 kg, rest 90 s
- **THEN** the sets are 12×40, 10×45, 8×50 and 6×55, each with 90 s rest

#### Scenario: Weight rounding
- **WHEN** the user generates an ascending pyramid of 4 sets with weight 40 → 50 kg
- **THEN** the weights are 40, 42.5, 47.5 and 50 kg

#### Scenario: Bodyweight pyramid
- **WHEN** the user generates a descending pyramid of 4 sets, reps 15 → 8, and leaves the weight empty
- **THEN** the sets have 15, 13, 10 and 8 reps and no weight

#### Scenario: Time pyramid
- **WHEN** the user switches "Plancha" to time mode and generates an ascending pyramid of 3 sets, 30 → 60 s
- **THEN** the sets last 30, 45 and 60 seconds and have no reps

### Requirement: Drop sets

A drop set SHALL be in reps mode and SHALL require a start weight. The user SHALL enter:
- the start weight;
- the number of drops (1 to 4);
- the percentage removed at each drop (10 % to 40 %, 20 % by default);
- the reps of each stage;
- the rest after the last stage.

Each stage's weight SHALL be the previous stage's weight reduced by the percentage, rounded to 2.5 kg. Every stage except the last SHALL have 0 s rest. Each stage SHALL weigh strictly less than the previous one and at least 2.5 kg; otherwise the drop set SHALL be rejected.

#### Scenario: Generating a drop set
- **WHEN** the user creates a drop set starting at 60 kg with 2 drops of 20 %, 10 reps per stage and 120 s final rest
- **THEN** the stages are 10×60, 10×47.5 and 10×37.5, the first two with 0 s rest and the last with 120 s

#### Scenario: Drop set without weight
- **WHEN** the user tries to save a drop set with no start weight
- **THEN** the save is refused and the user is told a drop set needs a weight

#### Scenario: Drops too small to apply
- **WHEN** the user creates a drop set starting at 5 kg with 3 drops of 10 %
- **THEN** the drop set is rejected because the stages would not decrease or would fall below 2.5 kg

#### Scenario: No time mode for drop sets
- **WHEN** the user picks the drop-set variant
- **THEN** the time mode is not available for that block

### Requirement: Manual adjustment of sets

After generating, the user SHALL be able to edit each set's reps or seconds, weight and rest, and to add or remove sets within the allowed range. Once a set is edited by hand the pyramid SHALL be marked as adjusted by hand. Changing a parameter of a pyramid adjusted by hand SHALL ask for confirmation before regenerating, because regenerating replaces the hand-made values. Invalid values SHALL be rejected and the previous value kept, as for straight blocks.

#### Scenario: Retouching one set
- **WHEN** the user generates 12×40, 10×45, 8×50 and changes the 3rd set to 52.5 kg
- **THEN** the block keeps 8×52.5 for the 3rd set and is shown as adjusted by hand

#### Scenario: Regenerating after a manual change
- **WHEN** the user changes the number of sets of a pyramid that was adjusted by hand
- **THEN** the user is asked to confirm, and the hand-made values are kept if the user cancels

#### Scenario: Reopening the editor
- **WHEN** the user saves a pyramid, leaves and reopens the day template
- **THEN** the variant, the parameters and the set values are shown as they were saved

### Requirement: Pyramids only in the main workout

Pyramid blocks SHALL be available only in the main workout. Warm-up and cool-down blocks SHALL remain straight. A stored template with a pyramid block outside the main workout SHALL be invalid.

#### Scenario: Warm-up block kind
- **WHEN** the user edits an exercise in the warm-up section
- **THEN** no block kind selector is offered and the block stays straight

### Requirement: Converting between straight and pyramid

The user SHALL be able to switch a main-workout block between straight and pyramid.
- Switching from straight to pyramid SHALL start from the block's current values: the same set count, with first and last values equal to the current reps or seconds and weight.
- Switching from pyramid to straight SHALL warn that the per-set values will be lost. On confirmation it SHALL keep the first set's values for all sets.

#### Scenario: Straight to ascending
- **WHEN** the user switches a straight block of 4 × 10 reps at 40 kg to an ascending pyramid
- **THEN** the pyramid starts with 4 sets, reps 10 → 10 and weight 40 → 40 kg, ready to adjust

#### Scenario: Pyramid to straight
- **WHEN** the user switches the pyramid 12×40, 10×45, 8×50 to straight and confirms the warning
- **THEN** the block becomes 3 × 12 reps at 40 kg

### Requirement: Pyramids in the active plan

Activating a plan template that contains pyramids SHALL produce sessions whose exercises carry each set's own target: reps or seconds, weight and rest. The exercise SHALL also keep a summary prescription equal to its first set, so screens that read only one prescription keep working. Plans generated by AI or imported from a file SHALL be unaffected. Supersets SHALL still be rejected at activation.

#### Scenario: Activating a pyramid
- **WHEN** the user activates a plan whose day has "Press de Banca con Barra" as 12×40, 10×45, 8×50, 6×55 with 90 s rest
- **THEN** that session exercise prescribes 4 sets with those exact targets per set

#### Scenario: Superset still blocked
- **WHEN** a stored template contains a superset block and the user tries to activate a plan that uses it
- **THEN** activation is refused and the template is listed as needing fixes

### Requirement: Pyramids in a session

When a session exercise has per-set targets:
- Each set row SHALL be pre-filled with that set's target.
- The exercise header SHALL summarise the prescription with the per-set values, for example "12/10/8/6 reps · 40→55 kg" or "30/45/60 s".
- For drop sets, the header SHALL say "Drop set", and the stages followed by no rest SHALL be marked "sin descanso".

Completed sets SHALL be recorded per set, as for any session. Swapping the exercise for an alternative SHALL keep the per-set targets. The weights SHALL be kept only if the alternative is a weighted movement.

#### Scenario: Pre-filled pyramid rows
- **WHEN** the user starts a session with the pyramid 12×40, 10×45, 8×50, 6×55
- **THEN** the four set rows show 12 reps at 40 kg, 10 at 45, 8 at 50 and 6 at 55

#### Scenario: Drop set in the session
- **WHEN** the user starts a session with the drop set 10×60, 10×47.5, 10×37.5
- **THEN** the header reads "Drop set", and the first two rows are marked "sin descanso"

#### Scenario: Swapping a bodyweight alternative
- **WHEN** the user swaps a weighted pyramid for an alternative that uses no weight
- **THEN** the alternative keeps the per-set reps and rest, and has no weights
