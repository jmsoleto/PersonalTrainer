# workout-templates Specification

## Purpose
Let each user build their own training on the device: reusable day sessions, weeks assembled from those days, and multi-week plans assembled from those weeks, which can then be activated as the user's training plan.

## Requirements

### Requirement: Device-local, per-user template library

The system SHALL store day, week and plan templates only on the user's device, with no network transmission. Every template SHALL belong to exactly one user profile. A user SHALL only see, edit, use and delete their own templates.

#### Scenario: Templates are isolated per user
- **WHEN** user A creates a day template "Pierna A" and the app switches to user B
- **THEN** user B's library does not list "Pierna A"

#### Scenario: No network involved
- **WHEN** the user creates, edits or deletes any template while offline
- **THEN** the operation succeeds and the change persists after reloading the app

### Requirement: Day template structure

A day template SHALL have a non-empty name and three sections: an optional **warm-up**, a **main workout** with at least one exercise, and an optional **cool-down/stretching**. Each section SHALL be an ordered list of blocks. Each block SHALL have a `kind` and one or more exercise items. Each item SHALL reference an exercise and SHALL have an ordered list of sets.

#### Scenario: Day without warm-up or stretching
- **WHEN** the user saves a day template with only main-workout exercises
- **THEN** the template is saved and its warm-up and cool-down sections are empty

#### Scenario: Day without main exercises is rejected
- **WHEN** the user tries to save a day template whose main workout is empty
- **THEN** the save is refused and the user is told the main workout needs at least one exercise

#### Scenario: Same exercise twice in the main workout
- **WHEN** the user tries to add an exercise that is already in the day's main workout
- **THEN** the exercise is shown as already added and cannot be added again, because a session tracks each main exercise once

#### Scenario: Reordering exercises
- **WHEN** the user moves an exercise above another one within a section
- **THEN** the saved template keeps the new order

### Requirement: Exercises come from the catalog

Every exercise in a template SHALL be an exercise from the app's exercise catalog. The exercise picker SHALL allow filtering by muscle group and by exercise category, and SHALL allow searching by name. The warm-up picker SHALL default to the `warmup` category. The cool-down picker SHALL default to the `cooldown` and `flexibility` categories. The user MAY clear these defaults.

#### Scenario: Filter by muscle group
- **WHEN** the user opens the main-workout picker and selects the muscle group "Espalda"
- **THEN** only catalog exercises that work the back are listed

#### Scenario: Warm-up picker default
- **WHEN** the user adds an exercise to the warm-up section
- **THEN** the picker initially lists only `warmup` exercises

#### Scenario: Missing catalog exercise
- **WHEN** a stored template references an exercise id that is no longer in the catalog
- **THEN** the editor marks that item as unavailable and the template cannot be activated until the item is replaced or removed

### Requirement: Set prescription

Each exercise item SHALL have a mode, either **reps** or **time**. Each set SHALL carry, depending on the mode, a repetition count (reps mode) or a duration in seconds (time mode). Optionally it SHALL also carry a target weight in kg and a rest time in seconds after the set. Values SHALL be positive. Weight MAY be empty, meaning bodyweight or not prescribed.

#### Scenario: Reps-based exercise
- **WHEN** the user configures "Sentadilla" with 4 sets of 10 reps, 40 kg, 90 s rest
- **THEN** the item is saved in reps mode with 4 sets, each with 10 reps, 40 kg and 90 s rest

#### Scenario: Time-based exercise
- **WHEN** the user switches "Plancha" to time mode and sets 3 sets of 45 s
- **THEN** the item is saved in time mode with 3 sets of 45 seconds and no reps value

#### Scenario: Invalid value
- **WHEN** the user enters 0 or a negative number of reps, seconds or kg
- **THEN** the value is rejected and the previous valid value is kept

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

### Requirement: Week template structure

A week template SHALL have a non-empty name and exactly seven slots, Monday to Sunday. Each slot SHALL be one of: a **training** day that references one of the user's day templates, an **active-rest** day that optionally references a day template, or a **rest** day. A week template SHALL contain at least one training day. The same day template MAY be used in several slots.

#### Scenario: Building a week
- **WHEN** the user assigns "Pierna A" to Monday and Thursday, "Torso B" to Tuesday and Friday, and leaves the other days as rest
- **THEN** the saved week has those four training slots and three rest slots

#### Scenario: Week without training days is rejected
- **WHEN** the user tries to save a week where every slot is rest or active rest
- **THEN** the save is refused

#### Scenario: Edits to a day propagate inside the library
- **WHEN** the user edits "Pierna A" after it is used in a week template
- **THEN** that week template shows the updated "Pierna A" content

### Requirement: Plan template structure

A plan template SHALL have a non-empty name and an ordered list of between 1 and 52 week references to the user's week templates. The same week template MAY appear several times. The user SHALL be able to add, remove, duplicate and reorder weeks in the plan.

#### Scenario: Repeating a week
- **WHEN** the user builds a plan with "Semana base" four times followed by "Descarga" once
- **THEN** the saved plan has 5 weeks in that order

#### Scenario: Plan length limit
- **WHEN** the user tries to add a 53rd week
- **THEN** the addition is refused

### Requirement: Duplicate a template

The user SHALL be able to duplicate any of their day, week or plan templates. The copy SHALL get a new identity and a distinguishable name (for example, the original name followed by "(copia)"). Duplicating a week or plan SHALL copy only that template; it SHALL keep referencing the same day or week templates.

#### Scenario: Duplicate a day
- **WHEN** the user duplicates "Pierna A"
- **THEN** a new day template "Pierna A (copia)" with identical content appears, and editing it does not change "Pierna A"

### Requirement: Deleting a template that is in use

The system SHALL refuse to delete a day template referenced by any of the user's week templates, and SHALL refuse to delete a week template referenced by any of the user's plan templates. When refusing, the system SHALL list the templates that use it. Unreferenced templates SHALL be deletable after confirmation. Deleting a plan template SHALL NOT affect a training plan that was already activated from it.

#### Scenario: Deleting a day used by a week
- **WHEN** the user tries to delete "Pierna A", which is used by "Semana base"
- **THEN** the deletion is refused and "Semana base" is shown as the template using it

#### Scenario: Deleting an unused day
- **WHEN** the user deletes a day template that no week uses and confirms
- **THEN** the template is removed from the library

### Requirement: Activate a plan template

The user SHALL be able to activate a plan template, choosing whether it starts this week or next Monday. Activation SHALL create a new active training plan for the user containing a full copy of the plan's weeks, days and exercises as they are at activation time. Any previously active plan SHALL become abandoned, as with existing plan generation. The new plan SHALL be marked as user-created. The weeks of the plan SHALL start on a Monday, and each week slot SHALL become the plan day for that weekday. Training slots SHALL produce a session with warm-up, main workout and cool-down. Rest slots SHALL produce rest days. Active-rest slots SHALL produce active-rest days, with a session only if a day template is referenced.

#### Scenario: Activation produces a normal plan
- **WHEN** the user activates a 5-week plan template
- **THEN** the active plan has 5 weeks, and its sessions can be started, timed, completed and counted in history, achievements and challenges like any other plan

#### Scenario: Straight sets in the active plan
- **WHEN** a day contains "Sentadilla" as 4 straight sets of 10 reps at 40 kg with 90 s rest
- **THEN** the corresponding session exercise prescribes 4 sets of 10 reps, 40 kg target weight and 90 s rest

#### Scenario: Snapshot isolation
- **WHEN** the user edits "Pierna A" after activating a plan that uses it
- **THEN** the sessions of the active plan keep the content they had at activation

#### Scenario: Start next Monday
- **WHEN** the user activates a plan on a Wednesday and chooses "next Monday"
- **THEN** week 1 of the plan begins on the following Monday

#### Scenario: Activation blocked by invalid content
- **WHEN** the plan, or a week or day it references, is missing or contains an unavailable exercise
- **THEN** activation is refused and the user is told which template needs fixing

### Requirement: Progress through plans longer than 12 weeks

The current week of the active plan SHALL be computed from the plan's start date and SHALL be bounded by the plan's own number of weeks, not by a fixed maximum.

#### Scenario: Week 20 of a 24-week plan
- **WHEN** the active plan has 24 weeks and started 19 full weeks ago
- **THEN** the current week shown is week 20

### Requirement: No AI recalculation for user-created plans

When the active plan is user-created, the system SHALL NOT offer or run AI plan recalculation. This includes the prompts after equipment changes, injury changes and session feedback.

#### Scenario: Equipment change with a custom plan
- **WHEN** the user changes their equipment while a user-created plan is active
- **THEN** the equipment is saved and no "recalcular plan" action is offered

### Requirement: Templates are included in backups

The data export SHALL include the user's day, week and plan templates. Importing such a backup SHALL restore them. Importing a backup made before this feature SHALL still succeed and leave the library empty.

#### Scenario: Round-trip
- **WHEN** the user exports their data, clears the app and imports the backup
- **THEN** all their day, week and plan templates are restored with the same content and references

#### Scenario: Older backup
- **WHEN** the user imports a backup that has no template data
- **THEN** the import succeeds and the rest of the data is restored
