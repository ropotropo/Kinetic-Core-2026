# Kinetic Core v0.4.4

Created by **Mykyta Borisov**, the sole game author.

The author page now introduces Mykyta as a 14-year-old creator from Ukraine,
inspired by space, technology and people who pursue bold goals. It presents
space exploration as humanity's greatest journey of discovery.

This release adds a Windows x64 NSIS installer and an Android preview APK,
packaging the same local web game without a backend or native JavaScript
bridge. The pinned build sources, platform notes and notices travel with the
source archive. Core physics and mission state are unchanged.

Validation: 86 tests passed; web and portable builds completed. Safari portable
HTTP and the Mac Electron host displayed the biography correctly. The same
Electron host loaded the secure local origin and rendered the 3D vehicle.
The Windows installer was cross-built, its PE payload inspected and all 35
bundled game files verified against dist. Windows installation/runtime and
real Android device performance are not claimed.

Windows is an unsigned preview. The APK uses development signing, not a
Google Play release identity. Platform save stores are separate. Android JSON
file-picker/download integration is not included. See DISTRIBUTION.md and the
platform READMEs before stable public updates.

Android compilation and a second offline build passed. APK signature verification
passed; all 34 web-game assets plus authorship and Android dependency notices
were verified inside the APK. The APK has application ID
`ua.mykyta.kineticcore`, version 0.4.4, minimum API 26 and target API 35. Checksums and
platform build receipts accompany the release.
