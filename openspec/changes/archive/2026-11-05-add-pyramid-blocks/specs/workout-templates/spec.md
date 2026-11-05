## MODIFIED Requirements

### Requirement: Straight sets in the first version

The editor SHALL offer the **straight** block kind: one exercise whose sets all share the same prescription. Editing the set count, reps or time, weight or rest of a straight block SHALL apply to all its sets. In the main workout the editor SHALL also offer the **pyramid** block kind, as defined by the pyramid-blocks capability. The editor SHALL NOT offer the **superset** block kind yet. The stored block model SHALL keep the kind and one prescription per set, so that superset blocks can be added later without changing data already stored.

#### Scenario: Changing set count
- **WHEN** the user changes a straight block from 3 to 5 sets of 12 reps
- **THEN** the item has 5 sets and every set has 12 reps

#### Scenario: Block kinds offered
- **WHEN** the user edits a main-workout block
- **THEN** the available block kinds are straight and pyramid, and superset is not offered
