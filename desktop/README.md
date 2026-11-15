# Windows installer

Created by **Mykyta Borisov**.

From the repository root, build the web game first (`npm ci && npm run build`).
Then run in this directory:

```sh
npm ci
npm run package:windows
```

The output is `release/Kinetic-Core-<version>-Windows-x64-Setup.exe`, a
per-user NSIS installer for Windows 10/11 x64. No administrator privilege,
account or backend is required for the core game. Electron renders the bundled
game using WebGL; checkpoints persist locally to this desktop application's
origin and are separate from browser/Android saves. The optional online Earth
mode still needs internet.

This preview is **unsigned**. Windows may show an unknown-publisher/SmartScreen
notice. The installer, application window and executable use the approved KC
icon. A build-only pure-JavaScript resource hook applies Kinetic Core product
metadata and Mykyta Borisov authorship while preserving every other Electron
resource, including the ASAR integrity record and application manifest.
There is no updater or native JavaScript bridge. Popups and navigation outside
the bundled game are denied; read external reference links in the browser game.

The exact Electron and builder dependencies are pinned in package-lock.json.
Dependency licenses are included by electron-builder. Original game asset and
library notices travel inside the bundled game.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security),
[custom protocols](https://www.electronjs.org/docs/latest/api/protocol),
[electron-builder NSIS](https://www.electron.build/nsis/).

Build-only resource editing uses [resedit](https://github.com/jet2jet/resedit-js)
(MIT) and pe-library (MIT); their notices are in
`resources/BUILD-TOOL-NOTICES.txt`. These dependencies are not shipped as runtime
JavaScript.
