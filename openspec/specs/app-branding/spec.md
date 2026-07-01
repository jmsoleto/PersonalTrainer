# app-branding

## Purpose

Defines the single canonical application name and how it must be applied consistently across every user-visible and packaging surface (PWA manifest, HTML title, Android resources, Capacitor config, in-app UI), while keeping the application identifier stable so existing installs and data are never orphaned.

## Requirements

### Requirement: Single canonical application name

The application SHALL present a single canonical display name, **"Filetics Trainer"**, across all user-visible and packaging surfaces. Where a surface is space-constrained, the short name **"Filetics"** MUST be used. No surface may display a legacy or alternate name (`personal-trainer`, `Personal Trainer`, `PT`, `FileticsTrainer` without a space).

#### Scenario: PWA install and home-screen label

- **WHEN** a user installs the Progressive Web App
- **THEN** the manifest `name` reads "Filetics Trainer" and `short_name` reads "Filetics"

#### Scenario: Android app label

- **WHEN** the Android build is installed on a device
- **THEN** the launcher icon and the main activity title both read "Filetics Trainer"

#### Scenario: In-app header fallback

- **WHEN** a route does not define its own `meta.title`
- **THEN** the app header displays "Filetics Trainer" as the default title

#### Scenario: User selection screen

- **WHEN** the user opens the profile selection screen
- **THEN** the screen title reads "Filetics Trainer"

### Requirement: Browser tab title resolves

The application SHALL define `productName` in `package.json` so that the HTML `<title>` template (`<%= productName %>`) resolves to the canonical name rather than rendering empty.

#### Scenario: Web SPA tab title

- **WHEN** the built web app is loaded in a browser
- **THEN** the browser tab title reads "Filetics Trainer" (not empty)

### Requirement: Stable application identifier

The application identifier `com.jmsoleto.app` SHALL remain unchanged by this branding work. The appId, Android `namespace` and `applicationId`, `package_name`, and `custom_url_scheme` MUST NOT be modified, so that existing installs, store listings, and deep links continue to function.

#### Scenario: Identifier is preserved

- **WHEN** the branding change is applied
- **THEN** all occurrences of `com.jmsoleto.app` remain identical to their pre-change values
