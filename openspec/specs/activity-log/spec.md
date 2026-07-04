# activity-log

## Purpose

Let users record exercise done outside the training plan (running, cycling, swimming, hiking, other) so it can count toward their goals, and expose the derived "exercise day" concept that unifies completed plan sessions with these manual activities.

## Requirements

### Requirement: Record a manual activity

The system SHALL let the current user record an exercise activity done outside the training plan. Each activity SHALL capture a `date`, a `type` (one of `running`, `cycling`, `swimming`, `hiking`, `other`), and MAY capture a magnitude and a free-text `note`. Distance for `running`, `cycling`, and `hiking` SHALL be entered and stored in kilometers (`distanceKm`); distance for `swimming` SHALL be entered and stored in meters (`distanceM`). Duration (`durationMin`) MAY be recorded for any type. Activities are owned by the current `userId` and persisted in IndexedDB.

#### Scenario: Logging an activity with magnitude
- **WHEN** the user logs a `running` activity dated today with `distanceKm = 8`
- **THEN** a manual activity record is stored for the current user with that date, type, and distance
- **AND** it appears in the user's activity history

#### Scenario: Logging an activity without magnitude
- **WHEN** the user logs a `hiking` activity with no distance or duration
- **THEN** the record is stored successfully with only date, type, and (optional) note

#### Scenario: Activities are per user
- **WHEN** activities are loaded
- **THEN** only activities belonging to the current user are returned

### Requirement: Edit and delete a manual activity

The user SHALL be able to edit or delete a previously recorded manual activity.

#### Scenario: Deleting an activity
- **WHEN** the user deletes a logged activity
- **THEN** the record is removed from IndexedDB and from the history
- **AND** any challenge progress that counted it is recomputed on the next check

### Requirement: Derived exercise days

The system SHALL expose the set of "exercise days" for a user: the distinct calendar dates (`YYYY-MM-DD`) on which the user either completed at least one plan session **or** logged at least one manual activity. Multiple qualifying events on the same date SHALL count as a single exercise day.

#### Scenario: Session and activity on the same day count once
- **WHEN** the user completes a plan session and logs a run on the same calendar date
- **THEN** that date contributes exactly one exercise day

#### Scenario: A manual-activity-only day counts
- **WHEN** on a given date the user has no completed session but logged a hike
- **THEN** that date is counted as an exercise day

#### Scenario: Exercise days are restricted to a window
- **WHEN** exercise days are requested for a date window `[start, end]`
- **THEN** only dates within that inclusive window are returned
