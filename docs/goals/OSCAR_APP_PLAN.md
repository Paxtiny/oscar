# oscar Mobile App - Implementation Plan

**Status:** PHASE 0 COMPLETE
**Author:** Claude + Clemens
**Date:** 2026-03-27

---

## 1. What We're Building

A native Android app for oscar using **Capacitor 8 + Vue 3 + Tailwind CSS v4 + shadcn-vue + TypeScript**.

**Decision (2026-03-27):** Same repo as oscar, new `src/app/` entry point. Shared code (stores, lib, models, core, consts, locales) imported directly via `@/` alias - no copying.

| | Desktop (existing) | Mobile App (new) |
|---|---|---|
| **Framework** | Vuetify (Vue) | Tailwind CSS v4 + shadcn-vue (Vue) |
| **Distribution** | Browser | Play Store + sideload APK |
| **Backend** | Go server | Same Go server |
| **Database** | PostgreSQL (via API) | Same PostgreSQL (via API) |
| **Local storage** | n/a | IndexedDB (existing code) |
| **Encryption** | Shared crypto lib | Same shared crypto lib |

Both frontends talk to the same Go backend and the same user accounts. A user with a 16-digit account number can use both.

---

## 2. Why Capacitor

Capacitor wraps a Vue + Tailwind web app inside Android's Chrome WebView, packaged as a native APK. It gives us:

- **Native bridge**: Camera, biometrics, secure storage, push notifications via plugins
- **Play Store + sideload**: Produces a real APK/AAB, distributable anywhere
- **Web tech you know**: Vue 3, TypeScript, Tailwind - no new language to learn
- **Stitch designs drop in 1:1**: Stitch generates Tailwind HTML. No translation layer.
- **82% code reuse**: Stores, models, crypto, i18n, IndexedDB layer all import directly from existing oscar code
- **Offline-first**: IndexedDB + sync-to-server, exactly like the current onboarding flow

### What Capacitor is NOT
- Not a browser in disguise (it's a native app with a WebView engine)
- Not Electron (no desktop, Android only)
- Not React Native or Flutter (those are different tech stacks entirely)

---

## 3. Architecture

```
oscar/                              # Same repo - app is a new entry point
  src/
    app.html                        # App HTML shell (Capacitor WebView entry)
    app/                            # App-specific code (new)
      main.ts                       # Entry point (Vue + Pinia + i18n + Tailwind)
      App.vue                       # Root component
      router/                       # Vue Router (SPA routing, Phase 1+)
      views/                        # Screen templates (Tailwind, from Stitch)
      components/ui/                # shadcn-vue components (Button, Dialog, Sheet...)
      styles/globals.css            # Tailwind v4 base + oscar purple theme
      lib/utils.ts                  # shadcn-vue cn() helper
    stores/                         # Shared Pinia stores (existing, imported via @/)
    lib/                            # Shared utilities (existing, imported via @/)
    models/                         # Shared TypeScript interfaces (existing)
    core/                           # Shared domain logic (existing)
    consts/                         # Shared constants (existing)
    locales/                        # Shared 19 language JSON files (existing)
  android/                          # Capacitor Android project (auto-generated)
  capacitor.config.ts               # App ID, WebView settings, plugins
  vite.config.app.ts                # App-specific Vite config (Tailwind v4 plugin)
  vite.config.ts                    # Existing desktop/mobile web config (UNCHANGED)
  components.json                   # shadcn-vue configuration
```

### Go Backend (unchanged)
The existing Go backend at `oscar server run` stays exactly as-is. The app calls the same REST API. No backend changes required.

---

## 4. Tech Stack Details

| Component | Choice | Why |
|---|---|---|
| **Runtime** | Capacitor 8 | Latest stable (Dec 2025), Android 7.0+, JDK 21, Node 22+ |
| **UI framework** | Vue 3 + Composition API | Already used in oscar, team expertise |
| **CSS** | Tailwind CSS v4 | Android 12+ WebViews auto-update to Chrome 147+ (v4 needs Chrome 111+). Safety net: WebView version check at startup. |
| **Components** | shadcn-vue + Reka UI | Headless accessible primitives (Dialog, Sheet, Tabs, Toast). Copy-paste model, zero bundle bloat. oscar purple via CSS variables. |
| **State** | Pinia | Already used in oscar, carries over directly |
| **i18n** | vue-i18n | Already used in oscar, 19 languages ready |
| **HTTP** | Axios | Already used in oscar services layer |
| **Routing** | Vue Router | Standard SPA routing (replaces F7 router) |
| **Crypto** | Web Crypto API + @nicodaimus/crypto | Works in WebView with `androidScheme: 'https'` |
| **Local DB** | IndexedDB | Already implemented in oscar's local-storage layer |
| **Build** | Vite | Already used in oscar, Capacitor integrates natively |

### Critical Capacitor Config
```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.nicodaimus.oscar',
  appName: 'oscar',
  webDir: 'dist/app',           // Separate from dist/ (desktop/mobile web)
  server: {
    androidScheme: 'https',    // REQUIRED: enables crypto.subtle + stable IndexedDB
    hostname: 'localhost'       // Secure context
  }
};
```

---

## 5. Code Reuse from oscar

**82% of oscar's codebase (15,000+ lines) is imported directly - no copying.**

Since the app lives in the same repo (`src/app/`), shared code is imported via `@/` alias (e.g., `import { useVaultStore } from '@/stores/vault'`). No duplication, single source of truth.

### Direct import (zero changes needed)

| Directory | Files | What it does |
|---|---|---|
| `stores/` | 20 files (~3,800 LOC) | Pinia stores: auth, onboarding, transactions, vault, settings |
| `models/` | 23 files (~2,300 LOC) | TypeScript interfaces: user, account, transaction, auth responses |
| `core/` | 28 files (~1,800 LOC) | Domain logic: currencies, formatting, transaction types, categories |
| `consts/` | 16 files (~1,200 LOC) | Constants: API endpoints, colors, icons, categories |
| `locales/` | 25+ files (~2,000 LOC) | 19 language JSON files + i18n composable |
| `lib/local-storage/` | 7 files (~800 LOC) | IndexedDB CRUD for transactions, goals, settings, migration |
| `lib/vault-service.ts` | 1 file | Encryption vault (passphrase, encrypt/decrypt) |
| `lib/services.ts` | 1 file | Axios HTTP client, API wrappers |

### New for app (Tailwind from Stitch)

| What | Notes |
|---|---|
| All screen templates | Stitch Tailwind HTML + shadcn-vue components |
| `src/app/lib/ui.ts` | App UI helpers (replaces F7 dialogs/toasts with shadcn-vue Dialog/Toast) |
| Navigation | Vue Router replaces F7 router |
| Theming | Tailwind v4 CSS variables + `dark:` classes |

---

## 6. Encryption Plan

Encryption is **independent of the UI framework**. The same plan applies to both desktop and app.

### How it works
1. User creates account (16-digit number)
2. User sets a passphrase during vault setup
3. Passphrase goes through Argon2id key derivation (@nicodaimus/crypto)
4. All sensitive data encrypted with AES-256-GCM before sending to server
5. Server stores encrypted blobs - cannot read them
6. On login: user enters passphrase, vault unlocks, data decrypts client-side

### In the app specifically
- `crypto.subtle` (Web Crypto API) works in Capacitor's WebView when `androidScheme: 'https'`
- The existing `@nicodaimus/crypto` package and `vault-service.ts` carry over unchanged
- Same encrypt/decrypt code runs on desktop browser and in the app

---

## 7. Development Phases

### Phase 0: Project Scaffold (1 session) - COMPLETE
- Added `src/app/` entry point to existing oscar repo
- Installed Capacitor 8 + Android platform with `androidScheme: 'https'`
- Created `vite.config.app.ts` (separate from existing Vite config)
- Installed Tailwind v4 + shadcn-vue + Reka UI
- Configured oscar purple theme (#7C3AED)
- Hello World rendering in browser with Tailwind styles + shared i18n
- Added `build:app` to existing CI pipeline
- Android Studio + emulator deferred to next session

### Phase 1: Onboarding Flow (2 sessions)
- Screens from Stitch (Tailwind HTML, fresh designs - NOT reusing F7 mobile layouts)
- Vue Router for screen navigation
- IndexedDB local storage (already implemented, just import)
- Account creation with ALTCHA proof-of-work
- Connect to Go backend API

### Phase 2: Core App (3 sessions)
- Login page (16-digit account number)
- Home dashboard
- Add transaction (manual entry + category selection)
- Transaction list with filters
- Settings page
- OCR scanning (Tesseract.js + Capacitor camera plugin)

### Phase 3: Encryption + Vault (1-2 sessions)
- Vault setup flow (passphrase entry)
- Encrypt/decrypt transactions
- Same implementation as desktop

### Phase 4: Polish + Ship (1-2 sessions)
- Splash screen, app icon, status bar theming
- APK signing + build automation
- Sideload download page on nicodaimus.com
- Play Store listing (later)

---

## 8. Development Setup

### Prerequisites
- Node.js 22+
- JDK 21
- Android Studio (for SDK, emulator, and APK signing)

### Local Development Workflow
```bash
# Start app Vite dev server (port 5174, separate from desktop/mobile on 8081)
npm run serve:app

# Build app for production (outputs to dist/app/)
npm run build:app

# Sync built app to Android project (after Android Studio installed)
npx cap sync

# Run on emulator with live-reload (after Android Studio installed)
npx cap run android --livereload
```

---

## 9. Decisions Made (2026-03-27)

1. **Repo strategy**: Same repo, new `src/app/` entry point. Shared code imported directly.
2. **Component library**: shadcn-vue + Reka UI. Copy-paste model, Tailwind-native.
3. **Android Studio**: Not installed yet. Step-by-step guide after Phase 0 scaffold.
4. **Play Store account**: Not yet. Sideload first, Play Store later (Phase 4).
5. **Sideload priority**: Sideload first (confirmed).
6. **App icon**: TBD - decide later.
7. **No upstream PR**: oscar is a private fork. No PRs to ezBookkeeping.
8. **MIT license**: Fully compliant. Keep MaysWind copyright + MIT license. Add to app's "About" screen when shipping.
9. **App UI is fresh from Stitch**: Do NOT reuse F7 mobile layouts (broken/ugly). All screens rebuilt with Tailwind + shadcn-vue.
