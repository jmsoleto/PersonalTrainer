# challenges

## Purpose

Let users commit to time-boxed goals (e.g. "200 exercise days this year", "lift 500 kg this month"), track live progress with an optional starting baseline, and have each challenge resolve to completed or failed at its deadline. Challenges build on completed plan sessions and manually logged activities.

## Requirements

### Requirement: Challenge catalog

The system SHALL provide a static, declarative catalog of challenge definitions (`challenges.json`), each with an `id`, `name`, `description`, `icon`, `category`, a `metric`, a numeric `target`, a `window` descriptor, and the flags `allowsBaseline` and `countsExternal`. Supported metrics SHALL include at least: `exercise_days`, `sessions`, `total_reps`, `total_weight`, `streak_days`, `single_lift_kg`, and `activity_distance`.

#### Scenario: Catalog is browsable
- **WHEN** the user opens the challenges page
- **THEN** the catalog of available challenges is listed with name, description, target, and time window

#### Scenario: Distance metric can target an activity type
- **WHEN** a challenge has `metric = activity_distance` and `activityType = running`
- **THEN** only running activities contribute to its progress

### Requirement: Accept a challenge with an optional baseline

The user SHALL be able to accept a challenge. On acceptance the system SHALL resolve and store the challenge's time window (`windowStart`, `windowEnd`) from its `window` descriptor and the acceptance date, and SHALL create an `active` accepted-challenge record for the current user. If the definition has `allowsBaseline = true`, the user MAY declare a numeric **baseline** representing progress already achieved before using the app; the baseline SHALL default to 0.

#### Scenario: Accepting a calendar-year challenge mid-year
- **WHEN** the user accepts a "200 exercise days / calendar year" challenge on March 1
- **THEN** an active record is created with `windowStart` = January 1 and `windowEnd` = December 31 of the current year

#### Scenario: Declaring a baseline
- **WHEN** the user accepts that challenge and declares a baseline of 60
- **THEN** the stored record has `baseline = 60`

#### Scenario: Baseline is fixed after acceptance
- **WHEN** a challenge has been accepted with a baseline
- **THEN** the baseline cannot be edited while the challenge is active (only changed by abandoning and re-accepting)

#### Scenario: A challenge cannot be accepted twice while active
- **WHEN** the user has an active accepted record for a challenge definition
- **THEN** the catalog presents it as already active rather than offering a second acceptance

### Requirement: Progress computation

The system SHALL compute the progress of each active accepted challenge as `baseline + progressSinceAcceptance`, where `progressSinceAcceptance` is derived from the relevant metric over events occurring on or after the acceptance date and within the challenge window. Manual activities SHALL contribute only when the definition has `countsExternal = true`. Progress SHALL be capped for display at the `target`.

#### Scenario: Baseline plus post-acceptance events
- **WHEN** an `exercise_days` challenge with `baseline = 60` has 12 exercise days recorded after acceptance and within the window
- **THEN** its computed progress is 72

#### Scenario: Events before acceptance are not double counted
- **WHEN** the user completed plan sessions earlier in the window but before accepting the challenge
- **THEN** those earlier sessions do NOT add to progress on top of the baseline

#### Scenario: External activities respect the countsExternal flag
- **WHEN** a challenge has `countsExternal = false`
- **THEN** manual activities do not contribute to its progress, only completed plan sessions do

#### Scenario: Single-lift metric uses the max set weight
- **WHEN** a challenge has `metric = single_lift_kg` with `target = 100`
- **THEN** progress reflects the heaviest single completed set weight recorded within the window (not an accumulated total)

### Requirement: Challenge status lifecycle and deadline resolution

An accepted challenge SHALL move from `active` to `completed` when its progress reaches the `target`, and to `failed` when its `windowEnd` passes without the target being met. The user MAY `abandon` an active challenge. The system SHALL resolve completion and deadline-based failure whenever the checker runs, including on app/page mount, so that a deadline that passes without any user action is still resolved.

#### Scenario: Reaching the target completes the challenge
- **WHEN** an active challenge's computed progress reaches its target
- **THEN** its status becomes `completed`

#### Scenario: Passing the deadline without meeting the target fails the challenge
- **WHEN** the checker runs and an active challenge's `windowEnd` is in the past and its progress is below target
- **THEN** its status becomes `failed`

#### Scenario: Abandoning a challenge
- **WHEN** the user abandons an active challenge
- **THEN** its status becomes `abandoned` and it stops appearing among active challenges on Home

### Requirement: Checker triggers

The challenge checker SHALL run at the same points the achievement checker runs — after a plan session is completed and on relevant page mount — and additionally after a manual activity is recorded, edited, or deleted, so that progress and status stay current.

#### Scenario: Completing a session updates challenge progress
- **WHEN** the user completes a plan session
- **THEN** the progress of active challenges whose metric depends on sessions or exercise days is recomputed

#### Scenario: Logging an activity updates challenge progress
- **WHEN** the user logs a qualifying manual activity
- **THEN** the progress of active challenges that count external activity is recomputed

### Requirement: Accepted challenges on Home

Active accepted challenges SHALL be shown on the Home dashboard as cards displaying the challenge name, a progress indicator (current vs target), and time remaining in the window. Home SHALL also expose an entry point to the challenges page.

#### Scenario: Active challenge card on Home
- **WHEN** the user has an active challenge with progress 128 of 200
- **THEN** the Home dashboard shows a card for it with a progress indicator reading 128 / 200 and the time remaining

#### Scenario: No active challenges
- **WHEN** the user has no active challenges
- **THEN** Home does not render challenge cards, and the challenges entry point is still available in quick access
