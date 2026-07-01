## Context

The app's name is duplicated as literal strings across five files spanning three build concerns (npm/web metadata, PWA manifest, and native Android/Capacitor packaging). There is no single source of truth, which is how four different names drifted in. The values today:

| Surface | File | Current | Target |
|---|---|---|---|
| npm name | `package.json` → `name` | `personal-trainer` | `filetics-trainer` |
| HTML title | `package.json` → `productName` | *(absent → empty title)* | `Filetics Trainer` |
| PWA name | `quasar.config.ts` | `Personal Trainer` | `Filetics Trainer` |
| PWA short_name | `quasar.config.ts` | `PT` | `Filetics` |
| Capacitor label | `capacitor.config.ts` → `appName` | `FileticsTrainer` | `Filetics Trainer` |
| Android label | `android/.../strings.xml` → `app_name`, `title_activity_main` | `FileticsTrainer` | `Filetics Trainer` |
| Header fallback | `src/components/layout/AppHeader.vue` | `Personal Trainer` | `Filetics Trainer` |
| Identifier | multiple | `com.jmsoleto.app` | `com.jmsoleto.app` (unchanged) |

## Goals / Non-Goals

**Goals:**
- Every user-visible and store-facing name reads "Filetics Trainer" (or "Filetics" where short).
- The browser tab title stops rendering empty.
- Zero change to the application identifier and any install-affecting values.

**Non-Goals:**
- Introducing a shared constant / build-time single-source-of-truth for the name (the values live in heterogeneous file formats — JSON, TS config, Android XML — that are not trivially DRY-able; out of scope for this pass).
- Rebranding icons, splash screens, colors, or copy beyond the name string.
- Changing `appId`, package name, or URL scheme.

## Decisions

- **Canonical name "Filetics Trainer" with space; short name "Filetics".** Chosen over the spaceless `FileticsTrainer` (current Android value) for readability on home screens and install prompts. Chosen over the generic "Personal Trainer" because "Filetics" is the intended brand. The npm `name` uses kebab-case `filetics-trainer` because npm forbids spaces and capitals.
- **Keep `com.jmsoleto.app` frozen.** The identifier is display-independent; changing it would orphan existing Android installs and break `custom_url_scheme` deep links. Branding and identity are decoupled on purpose.
- **Edit native strings directly, don't only rely on Capacitor `appName`.** The Android `strings.xml` is the effective source for the installed label; `capacitor.config.ts` `appName` seeds it but the committed `strings.xml` must also be updated so the current build reflects the new name without a full regeneration. Update both to avoid drift.

## Risks / Trade-offs

- **[Duplicated string can drift again]** → Accepted for now; a follow-up could centralize. Tasks list every location explicitly and a spec scenario asserts no legacy name survives, so a grep-based verification catches regressions.
- **[Android label cached on device]** → Users with the app already installed may need a reinstall/rebuild to see the new launcher label; this is expected native behavior, not a defect.
- **[Accidentally changing the identifier]** → Mitigated by an explicit spec requirement and a verification step that greps `com.jmsoleto.app` is untouched.

## Migration Plan

1. Apply the string edits across the five files.
2. Rebuild web (`quasar build`) — tab title and PWA manifest update automatically.
3. Rebuild Android (`quasar build -m capacitor -T android`) — launcher label picks up `strings.xml`.
4. Rollback is trivial: revert the commit; no data or schema is touched.
