## 1. Web / npm metadata

- [x] 1.1 In `package.json`, change `name` from `personal-trainer` to `filetics-trainer`
- [x] 1.2 In `package.json`, add `"productName": "Filetics Trainer"` so `index.html`'s `<%= productName %>` title resolves

## 2. PWA manifest

- [x] 2.1 In `quasar.config.ts` `pwa.manifestOptions`, set `name` to `Filetics Trainer`
- [x] 2.2 In `quasar.config.ts` `pwa.manifestOptions`, set `short_name` to `Filetics`

## 3. Native (Android / Capacitor)

- [x] 3.1 In `capacitor.config.ts`, set `appName` to `Filetics Trainer`
- [x] 3.2 In `android/app/src/main/res/values/strings.xml`, set `app_name` to `Filetics Trainer`
- [x] 3.3 In `android/app/src/main/res/values/strings.xml`, set `title_activity_main` to `Filetics Trainer`

## 4. In-app UI

- [x] 4.1 In `src/components/layout/AppHeader.vue`, change the `pageTitle` fallback from `'Personal Trainer'` to `'Filetics Trainer'`

## 5. Verification

- [x] 5.1 Grep the repo for `personal-trainer`, `Personal Trainer`, `FileticsTrainer` (no space), and `'PT'` to confirm no legacy display names remain (excluding `node_modules` and this change's own docs)
- [x] 5.2 Confirm `com.jmsoleto.app` still appears unchanged in `capacitor.config.ts`, `android/app/build.gradle`, and `strings.xml` (`package_name` + `custom_url_scheme`)
- [x] 5.3 Run `quasar build` and confirm the built `index.html` `<title>` reads `Filetics Trainer`
