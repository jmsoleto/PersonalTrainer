# challenges

## MODIFIED Requirements

### Requirement: Accepted challenges on Home

Active accepted challenges SHALL be shown on the Home dashboard as high-impact progress cards. Each card SHALL display the challenge name, a prominent `current / target` value, and a thick progress bar with milestone marks at 25%, 50%, and 75% and an animated shimmer. A card for a `streak_days` challenge SHALL show an animated fire indicator next to its name. A card SHALL show the time-urgency chip when the challenge is urgent (see the Time-urgency indicator requirement). Home SHALL keep exposing an entry point to the challenges page, and the cards SHALL keep linking to it. Cards SHALL keep their existing order (nearest deadline first).

#### Scenario: Active challenge card on Home
- **WHEN** the user has an active challenge with progress 128 of 200
- **THEN** the Home dashboard shows a card for it with a prominent value reading 128 / 200, a thick progress bar with milestone marks and shimmer, and the time remaining

#### Scenario: Streak challenge shows a fire indicator
- **WHEN** an active challenge on Home has `metric = streak_days`
- **THEN** its card shows an animated fire indicator next to the challenge name

#### Scenario: No active challenges
- **WHEN** the user has no active challenges
- **THEN** Home does not render challenge cards, and the challenges entry point is still available in quick access

## ADDED Requirements

### Requirement: Time-urgency indicator

The system SHALL treat an active challenge as **urgent** when its remaining days are `≤ 3` OR its progress `ratio` is `≥ 0.85`, where remaining days is derived purely from `windowEnd` and today. When a challenge is urgent, its progress presentation (on Home, on the challenges page hero, and on the "En curso" cards) SHALL show an urgency chip. The chip SHALL convey urgency through an icon and text ("Quedan N días"), not color alone, and SHALL pulse subtly. The urgency computation SHALL be a pure derivation with no new data, network, or store access.

#### Scenario: Urgent by remaining days
- **WHEN** an active challenge has 3 or fewer days remaining until `windowEnd`
- **THEN** its progress presentation shows the urgency chip

#### Scenario: Urgent by near-completion
- **WHEN** an active challenge's progress ratio is 0.85 or higher
- **THEN** its progress presentation shows the urgency chip

#### Scenario: Not urgent
- **WHEN** an active challenge has more than 3 days remaining AND a ratio below 0.85
- **THEN** no urgency chip is shown for it

### Requirement: Featured (hero) challenge on the challenges page

The challenges page SHALL show a featured "hero" panel above the activity-log entry point whenever there is at least one active challenge. The hero SHALL feature the active challenge with the highest progress `ratio` (the one closest to its target), showing a label, a giant `current / target` value, the thick milestone progress bar, the percent completed, and the urgency chip when that challenge is urgent. The hero selection SHALL derive from the already-loaded active-progress data with no additional data call. When there are no active challenges, the hero SHALL NOT be rendered.

#### Scenario: Hero features the closest-to-target challenge
- **WHEN** the user has two or more active challenges
- **THEN** the challenges page shows a single hero panel featuring the one with the highest progress ratio

#### Scenario: Hero hidden with no active challenges
- **WHEN** the user has no active challenges
- **THEN** the challenges page does not render the hero panel

### Requirement: Reduced-motion for progress animations

All progress-presentation animations (bar shimmer, urgency chip pulse, streak fire) SHALL respect the user's `prefers-reduced-motion: reduce` setting by disabling or freezing to a static state, while keeping all information (values, urgency, streak indicator) visible and legible.

#### Scenario: Reduced motion disables animations
- **WHEN** the user's system requests reduced motion
- **THEN** the shimmer, urgency pulse, and fire animations do not animate, and the challenge value, urgency chip, and streak indicator remain visible
