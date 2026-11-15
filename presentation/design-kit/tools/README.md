# Screenshot intake

Run this utility from the presentation kit folder with Node.js. `--list` reads the capture slots in `presentation-content.json`. Import a PNG, JPEG or WebP with `--slot` and `--file`; relative source paths are relative to your current working directory. The utility checks the file signature and dimensions, copies the original bytes into `screenshots/<slot>-<sha8>.<extension>`, and updates the selected slot’s preferred file, status and provenance. It never resizes or edits the screenshot, overwrites a screenshot, changes the source file, installs dependencies or contacts a service. Reimporting identical bytes reuses their existing asset. `asset-journal.json` records each import and its previous slot metadata, with prepared/committed phases for recovery. UTC dates describe intake and source modification time, not an inferred capture time. The supplied build label, commit SHA and note are recorded as entered, not inferred from the image.

```sh
node tools/intake-screenshot.mjs --list
node tools/intake-screenshot.mjs --slot builder --file /absolute/path/workshop.png \
  --build "v0.4.0 reference" --commit d495fd715efc7ac1a19c57974c3750263763c192 \
  --note "Custom lunar craft, dimension and performance values visible"
```

Imports default to `reference`. Use `--final` only for a genuine capture from the frozen final build and provide both `--build` and a hexadecimal `--commit` SHA. The utility records that explicit assertion for the selected image; it does not certify gameplay, invent capture evidence, mark the entire release ready, or update descriptive slide notes about earlier reference captures. Review those slide notes and the image’s content before final submission. Writes stay within this output folder, reject symlink file destinations and external screenshot directories, and use atomic JSON replacement plus an intake lock. If intake reports that the content document changed, retry with the updated file; any copied image remains safely preserved. Image checks inspect bitmap containers and dimensions rather than performing a full codec decode.

```sh
node tools/intake-screenshot.mjs --slot moon-touchdown --file /absolute/path/touchdown.jpg \
  --build "<actual frozen build label>" --commit "<actual commit SHA>" \
  --note "<actual guidance mode, site and contact telemetry>" --final
```

## Apply an editor draft

Export a draft from `deck.html`, then apply its JSON file to the kit with the command below. The importer validates the draft schema, the seven known slide IDs, fixed **Kinetic Core / Mykyta Borisov** identity, two allowed cover choices, HTTP/HTTPS links and embedded PNG/JPEG/WebP screenshots of at most 30 MB each. It merges only slide titles, leads and up to three body strings, the cover choice and demo/repository links. Cover and closing identity fields stay fixed. Release readiness, source evidence, notes, limitations and other authoritative data are preserved. It atomically updates `presentation-content.json` and regenerates `presentation-content.js` for the local editor; run the kit’s build command afterward to refresh exported presentation files.

```sh
node tools/apply-draft.mjs /absolute/path/kinetic-core-presentation-draft.json
```

Embedded screenshots are validated and decoded into a private temporary folder, using generated filenames rather than the uploaded names. Each is passed through `intake-screenshot.mjs` as a **reference**, never as a final-build assertion. Source filename, draft path, browser intake timestamp, build label and commit are retained in the intake note/provenance. The private temporary files are removed afterward; imported, hash-versioned screenshot assets and their journals stay in the kit even if a later import or text merge fails. Draft values cannot replace release status, numerical evidence or capture provenance. Unknown slots, malformed/noncanonical base64, mismatched image MIME types and unsafe file destinations are rejected. Browser UI state alone does not regenerate final PNG/PPTX exports.
