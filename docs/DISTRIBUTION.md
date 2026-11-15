# Installation and distribution

Kinetic Core is created by **Mykyta Borisov**, the sole game author.
Version 0.4.4 adds Windows and Android preview packages around the same bundled
web game. The browser game and portable HTML remain available.

## Downloads

Use the [v0.4.4 release](https://github.com/ropotropo/Kinetic-Core-2026/releases/tag/v0.4.4).

| File | Platform | Status |
| --- | --- | --- |
| `Kinetic-Core-0.4.4-Windows-x64-Setup.exe` | Windows 10/11 x64 | Per-user NSIS installer; unsigned preview |
| `Kinetic-Core-0.4.4-Android-preview.apk` | Android 8+/API 26+, OpenGL ES 3 | Development-signed direct-install preview |
| `Kineti-Core.html` | Desktop browser | Self-contained game; no installer |
| `Kinetic-Core-v0.4.4-source.zip` | Development/transfer | Exact committed source without Git history |

`SHA256SUMS.txt` records the downloadable files. Keep the source manifest and
third-party notices when moving the project to a new repository.

## Windows

The [desktop host](../desktop/README.md) packages a bundled Chromium engine
through Electron. Its isolated renderer has no Node integration or native
bridge. The installer does not request administrator access. Core game assets
are local; optional online Earth mode needs internet.

This initial installer has no publisher code-signing certificate. Windows may
show an unknown-publisher warning. No Windows installation or device/GPU test
was performed on the macOS build host. Native-host loading, the 3D renderer,
menu and author page were checked using the same Electron host on macOS.
The EXE payload and every bundled game file were verified separately.

## Android

The [Android host](../android/README.md) serves the bundled game through
AndroidX WebViewAssetLoader's local HTTPS origin. Hardware acceleration and
DOM storage are enabled; file/content access, cleartext traffic, popups and
native JavaScript bridges are disabled. Returning to the background releases
held inputs and pauses the game.

The APK is signed with a development key for direct testing. It is not a
Google Play release and no AAB/store submission is included. Mykyta should
create and privately retain his own release key before stable public updates.
A different signing key requires reinstalling, which removes local saves.
Real Android device installation, touch-flight and GPU/memory performance
remain unverified. JSON file import/export is not integrated with the native
file picker/download manager; use the browser build to transfer spacecraft.

## Saves and future distribution

Browser, desktop and Android saves are separate local stores. Installing the
app does not import a browser checkpoint. Preserve checkpoint validation,
held-input release, asset notices and the version lock in future changes.

macOS installers, signing/notarization, Google Play AABs, an updater, save
migration and a PWA remain separate work. No paid service or store account was
introduced. Build commands and pinned toolchains travel with the repository.

## Primary references

- [Electron process isolation](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron custom protocols](https://www.electronjs.org/docs/latest/api/protocol)
- [electron-builder NSIS](https://www.electron.build/nsis.html)
- [Android local WebView content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
- [Android app signing](https://developer.android.com/studio/publish/app-signing)
- [Android Gradle Plugin 8.9 compatibility](https://developer.android.com/build/releases/agp-8-9-0-release-notes)
