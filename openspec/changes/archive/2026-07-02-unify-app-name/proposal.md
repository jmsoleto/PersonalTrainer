## Why

The application currently ships under at least four different names depending on where you look — `personal-trainer`, `Personal Trainer`, `PT`, and `FileticsTrainer` — and the browser tab title renders empty because `productName` is never set. This fragmented branding is confusing for users (the PWA install prompt, the Android home-screen icon, and the in-app header disagree) and makes the product look unpolished across install surfaces.

## What Changes

- Adopt **"Filetics Trainer"** as the single canonical display name, with **"Filetics"** as the short name for constrained surfaces (PWA `short_name`, home-screen icon).
- Set `productName` in `package.json` so the HTML `<title>` (`<%= productName %>`) resolves instead of rendering empty.
- Normalize the npm `name` in `package.json` to `filetics-trainer` (kebab-case) to match the brand.
- Update the PWA manifest (`quasar.config.ts`): `name` → "Filetics Trainer", `short_name` → "Filetics".
- Update Capacitor config (`capacitor.config.ts`): `appName` → "Filetics Trainer".
- Update the Android resources (`android/.../strings.xml`): `app_name` and `title_activity_main` → "Filetics Trainer".
- Update the in-app header default title (`AppHeader.vue`) fallback → "Filetics Trainer".
- Leave the application identifier `com.jmsoleto.app` (appId, Android namespace/applicationId, `package_name`, `custom_url_scheme`) **unchanged** — changing it would break existing installs and store listings. This change is display-name-only.

## Capabilities

### New Capabilities
- `app-branding`: Defines the single canonical application name and how it must be applied consistently across every user-visible and packaging surface (PWA manifest, HTML title, Android resources, Capacitor config, in-app header), while keeping the application identifier stable.

### Modified Capabilities
<!-- No existing specs in openspec/specs/ — this is the first capability. -->

## Impact

- **Files:** `package.json`, `quasar.config.ts`, `capacitor.config.ts`, `android/app/src/main/res/values/strings.xml`, `src/components/layout/AppHeader.vue`.
- **Build targets:** PWA (manifest + HTML title) and Android/Capacitor (app label). Web SPA build picks up the new title automatically.
- **No breaking identifiers:** `com.jmsoleto.app` stays; existing Android installs and any deep links via `custom_url_scheme` are unaffected.
- **No dependencies or APIs changed.** Purely metadata/branding.
