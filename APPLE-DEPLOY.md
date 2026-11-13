# CK Team — iOS deployment (git → App Store)

Mac-free pipeline: push to git → a macOS GitHub Actions runner builds, signs (via an
App Store Connect **API key**, no local Mac/Keychain), and uploads to **TestFlight**.

---

## What is already set up (code-side, done)

- **iOS Capacitor project** (`ios/`) — bundle id `net.collectivekindness.ckteam`, scheme `App`.
- **Face ID** usage string in `Info.plist` (required by the biometric unlock).
- **Export compliance** declared (`ITSAppUsesNonExemptEncryption = false`) — standard HTTPS only, so no export docs and no per-build prompt.
- **Privacy manifest** (`PrivacyInfo.xcprivacy`) declaring Capacitor's required-reason APIs (UserDefaults, file timestamp, system boot time, disk space) — avoids the ITMS-91053 rejection.
- **App icon + splash** generated from the brand art (`assets/`).
- **Automatic signing** (`CODE_SIGN_STYLE = Automatic`) — the runner provisions the distribution cert + profile through the API key.
- **Fastlane** (`fastlane/Fastfile`, `Appfile`) — `ios beta` lane: build → upload to TestFlight.
- **GitHub Actions** (`.github/workflows/ios-release.yml`) — runs the lane on manual trigger or an `ios-v*` tag.

## What is pending

- **Apple Developer Program** membership for Collective Kindness — *enrolled, awaiting Apple approval*. Nothing below can run until it is active.

---

## After the membership is approved — do these once

### 1. Create the app in App Store Connect
App Store Connect → **My Apps → +** → New App:
- Platform **iOS**, Name **CK Team**, Primary language **English (U.S.)**
- Bundle ID **net.collectivekindness.ckteam** (select from the list; it registers on first use)
- SKU: `ckteam` (any unique string)

### 2. Create an App Store Connect API key
App Store Connect → **Users and Access → Integrations → App Store Connect API** → **+**:
- Name `ck-team-ci`, Access **App Manager**
- Note the **Issuer ID** (top of the page) and the key's **Key ID**
- **Download the `.p8`** (only downloadable once — keep it safe)

### 3. Find the Team ID
Apple Developer → **Membership** → **Team ID** (10 characters).

### 4. Add the four GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `ASC_KEY_ID` | the API key's Key ID |
| `ASC_ISSUER_ID` | the Issuer ID |
| `ASC_KEY_P8` | the `.p8` contents, **base64-encoded** |
| `APPLE_TEAM_ID` | the 10-char Team ID |

Base64 the key (any machine):
```
base64 -w0 AuthKey_XXXXXXXXXX.p8      # Linux/Git Bash
base64 -i AuthKey_XXXXXXXXXX.p8       # macOS
```

### 5. Run the build
Repo → **Actions → iOS TestFlight → Run workflow** (branch `mobile-ios`), **or** push a tag:
```
git tag ios-v1.0.0 && git push origin ios-v1.0.0
```
The build appears in **TestFlight** a few minutes after the run finishes.

### 6. TestFlight testing
App Store Connect → **TestFlight** → add internal testers (up to 100, no review needed).

---

## Later — App Store submission (public release)
When ready to go public, complete in App Store Connect: screenshots (use the store pack),
description, keywords, **privacy policy URL**, App Privacy (data types), content/age rating,
category, and a **demo account** for App Review (`reviewer@ckteam.app` / `072026`).

---

## Notes
- **On-device name** is currently **"Collective Kindness"** (Capacitor `appName`), while the store listing is **"CK Team"**. Say the word to change the home-screen name to "CK Team" on both platforms.
- **Push notifications** are not wired yet (needs an APNs key + the Push capability). It's a clean follow-up once the account is active; the app builds and runs without it.
- **Signing** needs no manually-created certificate — automatic signing + the API key handles it on the runner. (For a locked-down team setup later, `fastlane match` can store certs in a private git repo instead.)
