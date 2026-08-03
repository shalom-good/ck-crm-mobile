# Building and shipping CK Team

The app is an Ionic + Capacitor + React SPA. One codebase, three targets:
web (Vercel), iOS (App Store), Android (Play Store).

## Identity

- App name: **CK Team**
- Bundle / application id: **net.collectivekindness.ckteam**
- API: `https://ck-crm.vercel.app/api/mobile/*` (Bearer JWT). The web build
  proxies `/api/mobile/*` same-origin via `vercel.json`; native shells call
  the API directly (CORS for `capacitor://localhost` etc. is allowed
  CRM-side in `middleware.js`).
- Sign in: team email, 6-digit emailed code. Apple review demo account:
  `reviewer@ckteam.app` / `072026` (synthetic data only).

## Web

```
npm run build
vercel --prod --yes        # project: ck-crm-mobile.vercel.app
```

## Android

Toolchain lives in `~/ck-android-tools` (JDK 17 + Android SDK, no Android
Studio needed):

```
export JAVA_HOME=~/ck-android-tools/jdk-17*/Contents/Home
export ANDROID_HOME=~/ck-android-tools/sdk
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug        # debug APK, sideloadable
./gradlew bundleRelease                      # AAB for Play (needs signing, below)
```

Debug APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

Release signing (one time): create a keystore, keep it safe forever
(losing it means losing the Play listing identity):

```
keytool -genkeypair -v -keystore ckteam-release.keystore \
  -alias ckteam -keyalg RSA -keysize 2048 -validity 10000
```

Then reference it from `android/app/build.gradle` signingConfigs or
`~/.gradle/gradle.properties`. Upload the AAB in Play Console, internal
testing track first.

## iOS (needs Xcode installed)

```
sudo xcode-select -s /Applications/Xcode.app
npm run build && npx cap sync ios
cd ios/App && pod install        # CocoaPods; `sudo gem install cocoapods` or brew
open App.xcworkspace
```

In Xcode: select the App target, set the team (Apple Developer account),
bundle id `net.collectivekindness.ckteam`, then Product > Archive >
Distribute App > App Store Connect. TestFlight first.

Icons and splash are already generated into both shells (source images in
`assets/`, regenerate with `npx capacitor-assets generate`).

## Store assets

Everything is staged in `~/Downloads/ck-team-assets/`:
- `listing.md` (names, descriptions, keywords, review notes w/ demo login)
- `icons/` (store icons; shells already carry them)
- `screenshots/` (6 shots at 1290x2796, demo data only)
- `play-feature-graphic-1024x500.png`
- Live URLs: privacy `https://ck-team-site.vercel.app/privacy`,
  terms `/terms`, support `/support` (repo: `~/Downloads/ck-team-site`).

Apple note: if review pushes back on an employee-only app (Guideline 3.2),
request Unlisted App Distribution (same App Store, link-only visibility).

## Push notifications (next milestone)

The app already registers and POSTs its device token to
`/api/mobile/push-token` (accept-and-log today). To go live:
1. APNs auth key (.p8) from the Apple Developer account.
2. Firebase project for FCM (Android), `google-services.json` into
   `android/app/`.
3. A device-token table + a sender (cron or trigger on new chat messages)
   CRM-side.
No app-store release is needed for the server half.
