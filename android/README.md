# Kinetic Core for Android

Created by **Mykyta Borisov**, the sole game author.

This native Android shell includes the built game and its local textures. It
serves them through AndroidX WebViewAssetLoader at an internal HTTPS origin,
with no JavaScript/native bridge, file access, account or server requirement.
Only the optional online Earth view needs internet. WebGL rendering uses the
installed Android System WebView and the device GPU.

## Build the installable preview

Pinned toolchain: JDK 17, Gradle **8.11.1**, Android Gradle Plugin **8.9.2**,
Android platform **35**, Build Tools **35.0.0**, AndroidX Webkit **1.12.1**.
The app supports Android 8.0/API 26 and later with OpenGL ES 3 hardware.

From the repository root:

```sh
npm ci
npm run build
# Install Gradle 8.11.1 and set JAVA_HOME plus ANDROID_HOME to the JDK and SDK.
gradle -p android :app:assembleDebug --no-daemon
```

The build copies `dist/` into generated Android assets. It excludes the duplicate
portable HTML and includes the bundled dependency/asset notices. Do not edit or
commit generated assets, APKs, SDK tools, local.properties or signing keys.
Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## What this preview means

- This is a real APK for direct device installation, signed with the build
  machine's development key. It is **not a Play Store production release**.
  WebView debugging is disabled even in the preview APK.
- Development signing keys may change between build machines. A later preview
  with a different key cannot update this one in place; uninstalling it removes
  its local saves. Before distributing stable updates, Mykyta should create and
  securely retain his own release keystore outside Git, then configure release
  signing. No production signing identity or credential is bundled here.
- Browser and Android checkpoints live in separate local origins and do not
  automatically migrate. Android process death reloads the game; saved
  checkpoints remain available. Rotation resizes the existing WebView.
- Touch controls are the game's existing controls. Real-device performance and
  full-mission mobile play still require acceptance testing. Keep Android System
  WebView updated. JSON file import/export is a browser capability and has not
  been integrated with Android's file picker/download manager in this minimal
  shell; use the browser build when transferring spacecraft files.
- External navigation is blocked inside the game. User-initiated same-window
  HTTPS links may open in the default browser; popup windows are denied.

## Build references

- [AGP 8.9 compatibility](https://developer.android.com/build/releases/agp-8-9-0-release-notes)
- [AndroidX Webkit releases](https://developer.android.com/jetpack/androidx/releases/webkit)
- [Android's guide to local WebView content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
