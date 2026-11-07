## MODIFIED Requirements

### Requirement: Straight sets in the first version

The editor SHALL offer the **straight** block kind: one exercise whose sets all share the same prescription. Editing the set count, reps or time, weight or rest of a straight block SHALL apply to all its sets. In the main workout the editor SHALL also offer the **pyramid** block kind, as defined by the pyramid-blocks capability, and the **superset** block kind, as defined by the superset-blocks capability. Warm-up and cool-down blocks SHALL be straight only. The stored block model SHALL keep the kind and one prescription per set.

#### Scenario: Changing set count
- **WHEN** the user changes a straight block from 3 to 5 sets of 12 reps
- **THEN** the item has 5 sets and every set has 12 reps

#### Scenario: Block kinds offered
- **WHEN** the user edits a main-workout block
- **THEN** the available block kinds are straight, pyramid and superset

#### Scenario: Warm-up block kinds
- **WHEN** the user edits a warm-up or cool-down block
- **THEN** no block kind selector is shown and the block is straight
