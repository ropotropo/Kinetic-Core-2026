# Kinetic Core — archive and publication continuity

## Repository roles

| Repository | Role | Existing public game |
| --- | --- | --- |
| [Hakaton2026](https://github.com/ropotropo/Hakaton2026) | Development archive; retains submitted PDF and historical references | [Archive playable](https://ropotropo.github.io/Hakaton2026/kinetic-core/) |
| [Kinetic-Core-2026](https://github.com/ropotropo/Kinetic-Core-2026) | Author-owned publication repository | [Publication playable](https://ropotropo.github.io/Kinetic-Core-2026/) |

Both games are independent static deployments. Their current game source/build can be compared by checksums; future synchronization must be deliberate. There is no automatic mirror, shared backend or cross-origin save migration.

## Preserve old addresses

- Keep [the original submitted PDF](https://github.com/ropotropo/Hakaton2026/blob/codex/final-presentations/presentation/Kinetic-Core-EN.pdf) at its current branch/path and preserve its bytes. Do not delete `codex/final-presentations`, rename the archive repository or make it private while those links are in use.
- Keep both existing game URLs reachable. Do not replace a playable with a redirect or assume that the judges have received the new address.
- Keep published releases and notices with their own repository. Metadata can label an old version as historical; it should not reassign commit authors or claim identical future versions.
- Video is published independently. The publication watch link is **[https://ropotropo.github.io/Kinetic-Core-2026/demo/](https://ropotropo.github.io/Kinetic-Core-2026/demo/)**. The archive’s latest-film viewer is **[https://ropotropo.github.io/Hakaton2026/demo/](https://ropotropo.github.io/Hakaton2026/demo/)**. These are separate deployments: synchronize the completed media and its notes explicitly when transferring. Publishing a replacement media file at its existing site path retains the viewer URL. This preparation does not edit either video or its deployment.

## Portable Wiki and documentation

`docs/wiki/` contains English source templates. `project-links.json` defines this repository's role and addresses. `docs/migration/Kinetic-Core-2026.links.json` defines the publication repository. The renderer needs only Node.js and makes no network requests:

```sh
node scripts/render-project-docs.mjs --config project-links.json --output work/generated-docs
node scripts/render-project-docs.mjs --config docs/migration/Kinetic-Core-2026.links.json --output work/generated-publication-docs
```

Review the generated Wiki, `PROJECT-LINKS.md` and `VIDEO.md`. Rendering does not modify GitHub, deployment settings or the game. When copying this tooling to the publication repository, copy its configuration to `project-links.json` first. The generated source/documentation links then target that repository's `main`, not a source commit that exists only in the archive's unrelated history.

GitHub Wiki is a **separate Git repository** and is not copied by importing the game. An owner/editor must initialize its first page in the GitHub Wiki UI, then commit/push the generated `wiki/*.md` to `Kinetic-Core-2026.wiki.git`. Preserve an existing Wiki's pages and history before updating. The archive Wiki remains a valid separate guide. No access grants are created by this procedure.

## Native and media source compatibility

Keep lockfiles, bundled assets, wrapper sources, notices and capture/provenance records. The game build already uses relative asset paths. Package name `kineti-core` and portable filename `Kineti-Core.html` remain compatibility identifiers. They do not require renaming the product.

Do not copy workstation paths, `node_modules`, keys or caches. Do not overwrite the clean repository's existing transfer receipt or author-owned history. Copy only the reviewed documentation/tooling changes, keeping its code, current video and original-code license choice intact.

## Completion checks in the publication repository

1. Record its current `main` SHA and preserve concurrent work; render with its own configuration.
2. Run the game test/build if source or build files changed. If only documentation changes, compare protected game files and check local/remote links.
3. Verify its own game, presentation, release, Wiki and `/demo/` URLs in a signed-out browser.
4. Confirm that no source link requires an old-archive commit, except an explicitly labelled historical/submitted reference.
5. Verify original submitted archive URLs separately. Keep them until retention is no longer required.

Publication-repository write access is required to apply or publish there. Preparing this migration kit does not imply that those changes are already installed.
