# Kineti Core project instructions

- Mykyta Borisov (ropotropo) is the sole game author. Keep authorship consistent with AUTHORS.md. Tool assistance and third-party notices are separate from game authorship.
- Use specialist agents for substantial independent physics, visuals and QA work. Assign disjoint file ownership when agents edit concurrently.
- For Kineti Core interface or 3D visual work, read `skills/kineti-design/SKILL.md` and `docs/DESIGN.md`. This repository has its own black aerospace design language; do not import another project's branding.
- Read `docs/NORTH-STAR.md` before expanding mission scope. A training scenario, a chosen destination and a continuous transfer must remain distinguishable.
- Keep the game interface, submission materials and repository documentation in English. Conversation with the author may be Ukrainian.
- Use SI units and a fixed simulation step. A graphical engine is not an orbital solver. Never replace a physical condition with a progress timer or silently apply vacuum damping.
- Distinguish NASA/JPL source data from fictional hardware parameters, illustrative assets and game-specific safety limits. Document important model approximations.
- Preserve checkpoint validation, reconstruct trusted constants on restore, and release held inputs on pause/blur.
- Each completed version must be tested, built, committed and pushed so Mykyta can try it. Include the portable `dist/Kineti-Core.html` build. Request pull-request review from `ropotropo` when a version is ready; do not merge automatically.
- Keep the game portable to another repository. Follow docs/REPOSITORY-TRANSFER.md; export an exact clean commit with npm run export and preserve asset/license notices. Do not silently rewrite Git history.
- Keep scratch files in `work/`, screenshots/results in `outputs/`; both are ignored. Do not commit node_modules or credentials.
- Run `npm test` and `npm run build` for physics/logic changes. Verify the playable in a real browser, including Safari for the final version, and state any unverified scenarios accurately.
