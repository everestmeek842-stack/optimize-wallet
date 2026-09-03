# Android APK build

The `android` folder is a native Android WebView shell for Nexus AI Browser. It packages the root `index.html`, `app.js`, and `styles.css` as read-only app assets at build time.

## Requirements

- Java 17 or newer.
- Android command-line tools, Android Platform 36, Build Tools 36.0.0, and Platform Tools.
- Gradle 8.14.3 or Android Studio.

## Build a test APK

From the `android` folder, run:

```powershell
gradle assembleDebug
```

The result is `android/app/build/outputs/apk/debug/app-debug.apk`. It is a debug APK, suitable for direct installation on your Android phone after allowing installs from your file manager.

## Production release

Before publishing, replace the temporary vector icon with the supplied logo, then create a keystore and generate an Android App Bundle (`bundleRelease`). Keep the keystore and its password offline; Google Play requires the release to be signed.

## Security

The app keeps API keys in the WebView's device storage only when the user explicitly chooses to remember them. Do not hard-code Gemini, OpenRouter, Telegram BotFather, or signing keys into this repository.
