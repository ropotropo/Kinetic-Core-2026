# Kinetic Core presentation design system

Version 5.0 · 15 November 2026

This kit preserves a common visual language for the covers and a seven-slide presentation. The framework identifies the evidence needed for each slide. It does not certify unverified game features, physics accuracy, or test results.

## Identity and audience copy

| Field | Locked value |
| --- | --- |
| Project title | **Kinetic Core** |
| Cover title line 1 | **Kinetic** |
| Cover title line 2 | **Core** |
| Sole author | **Mykyta Borisov** |
| Author credit | **Created by Mykyta Borisov** |
| Event | **NASA Space Apps Challenge 2026** |
| Challenge | **Space Mission Design Game** |
| Audience language | English |

Use the exact title **Kinetic Core** throughout current materials. The cover title is the game name, while “Space Mission Design Game” identifies the challenge in smaller supporting text. Mykyta Borisov is the sole project author. Resource acknowledgements and production metadata remain separate from the authorship credit.

The approved identity direction is a classic space mission badge with a simple Latin **KC**, a white perimeter and orbit, a navigation star, and a lunar horizon with a restrained Ukrainian blue/yellow accent. The primary badge is `branding/kinetic-core-mission-emblem.png`. Its editable SVG companion family supplies a badge interpretation, minimal KC mark, horizontal wordmark, and 3:5 flag. The vector companion is a consistent editable interpretation rather than an exact trace of the PNG. Keep small marks subordinate to the main title and preserve their aspect ratios. KC uses Latin letters. The project badge is separate from an official event insignia.

The current visual design has no visible AI-image caption. Retain truthful image provenance in technical metadata, source notes, and production records: the astronaut scene is a freshly generated fictional visualization using the original supplied portrait for identity and the primary KC badge for the physical patch, rather than a photograph of an actual lunar mission.

## Art direction

A recognizable, naturally lit portrait and plausible lunar hardware provide the visual focus against uninterrupted black space. Apple influence appears through the system sans, precise hierarchy, generous spacing, and restraint. Natural Earth blue supplies localized color. Avoid reproducing another company’s branding or decorative interface chrome.

The current cover revision is **v5**, with **Shadowline**, **Sunlit**, and **Mission Portrait 2:3**. Generate every v5 scene fresh from scratch using only the original supplied portrait and the primary KC badge as reference inputs. Cinematic anamorphic optics, restrained horizontal streaks from the helmet LEDs, soft background focus, and fine film grain unify this revision.

Place Mykyta on the right in every current hero composition. Leave a broad black field on the left and clear outer edges for typography and later supplied logos. Safe margins are minimum clearances rather than targets to fill. Integrate the face with coherent lunar lighting and color, natural head rotation, proportional head/helmet/shoulders, and restrained material imperfections.

The portrait belongs on the cover. Interior slides give actual game captures and verified evidence the largest uninterrupted area. Native text explains the scene without adding a dashboard around it. Interactive selectors and download controls belong to the private preview outside the exported slide canvas.

## Palette and geometry

| Token | Hex | Use |
| --- | --- | --- |
| Vacuum | `#000000` | Slide background and open space |
| Carbon | `#0a0a0b` | Media wells and recessed preview surfaces |
| Titanium | `#303034` | Necessary rules and inactive preview controls |
| Ceramic | `#f5f5f7` | Primary text and selected items |
| Silver | `#a1a1a8` | Supporting text on black |
| Navigation | `#9bcaff` | Keyboard focus and actual navigation references |
| Success | `#a8d8bd` | Verified successful state |
| Caution | `#edb96d` | Meaningful limitation or caution |
| Failure | `#ff8b83` | Failed test or failed physical state |

Keep headlines one color. Avoid decorative neon, brass/gold, glowing HUD borders, colored headline words, nebula wallpaper, and a lunar atmosphere. Use straight full-bleed media edges. An inset screenshot may have a radius up to 16 master pixels. Rules are 1–2 pixels. Avoid enclosing every evidence item in its own card.

The badge/flag artwork uses black, white, Ukrainian blue `#0057b7`, and yellow `#ffd700`. Within a photograph, the badge’s color and embroidery detail belong to the physical sewn patch, with fabric, stitching, perspective, and scene-consistent light. Keep the presentation UI neutral black/white; do not convert the badge colors into decorative interface fills or headline accents. Existing navigation and state colors retain their functional meanings.

Status colors supplement explicit words. Never make a result depend on color alone. A limitation need not look like a failure, and an implemented feature does not automatically receive a success color.

## Typography and CSS contract

Use the Apple system sans on Apple platforms and the platform sans elsewhere. No Apple font files are bundled. Recheck line wrapping after export on another operating system.

```css
font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
```

Sizes describe the **1920 × 1080 master**, not a scaled browser preview. CSS variable names below match the existing unprefixed presentation variables.

| Role | CSS variable | Size | Weight | Line height | Tracking |
| --- | --- | ---: | ---: | ---: | ---: |
| Kinetic Core cover title | `--cover-title` | 144 px | 650 | 0.94 | −0.045 em |
| Challenge display heading, when needed | `--challenge-headline` | 96 px | 600 | 1.00 | −0.035 em |
| Section title | `--section-title` | 96 px | 600 | 1.00 | −0.035 em |
| Slide heading | `--heading` | 64 px | 600 | 1.06 | −0.025 em |
| Lead | `--lead` | 42 px | 400 | 1.20 | −0.015 em |
| Body | `--body` | 32 px | 400 | 1.35 | −0.01 em |
| Event | `--event` | 28 px | 500 | 1.25 | 0 |
| Byline | `--byline` | 28 px | 400 | 1.25 | 0 |
| Label | `--label` | 24 px | 500 | 1.25 | 0 |
| Caption | `--caption` | 22 px | 400 | 1.30 | 0 |

Set the cover title as **Kinetic / Core** using native editable text and the 144 px title role inside the **780 px left field**. It replaces the smaller generic challenge headline used during earlier exploration. Keep the challenge as supporting copy rather than a competing title.

Use sentence case, normal word spacing, and deliberate line breaks. Reserve monospace for literal code, timestamps, and keys. Numeric evidence uses `font-variant-numeric: tabular-nums`. Edit content or choose a different master before reducing type below its role size.

For a slide editor at a 20 × 11.25 inch physical canvas, 1 master pixel equals 0.75 points. Other physical canvas sizes require proportional conversion. Verify slide dimensions before using that conversion.

## Canvas, grid, and spacing

| Rule | 16:9 slide | 2:3 portrait |
| --- | --- | --- |
| Canvas | 1920 × 1080 | 2160 × 3240 |
| Minimum safe edge | 96 px | 108 px |
| Cover title size | 144 px | 162 px |
| Cover text field width | 780 px | 877.5 px |
| Cover title weight / line height / tracking | 650 / 0.94 / −0.045 em | Same |

The slide content area is 1728 × 888 px. Use 12 columns with 32 px gutters and an 8 px spacing rhythm. Related gaps are 16 or 24 px, main gaps 48 or 64 px, and major composition gaps 96 px. Text measures usually span 44–60 characters, at most 72.

Align the event, title, supporting copy, and author to the same left grid line. Keep the face, helmet opening, light housings, and important hardware out of text boxes. A black scrim may solve a real local contrast issue, but it must not compensate for a poorly composed hero.

The portrait is a distinct composition, not a center crop or a stretched landscape. Scale the shared typography and safe edges by 1.125 where specified. A browser preview uniformly scales the entire master rather than independently shrinking its text roles.

## Cover compositions and hero production

**Shadowline:** the recommended 16:9 cover, with Mykyta waist-up on the right, black field left, lunar surface low in the frame, a small distant lander, and Earth subordinate to the face. Directional light shapes the face and suit. Restrained horizontal LED lens streaks, a softly focused background, and fine grain give the scene its anamorphic cinematic treatment.

**Sunlit:** a brighter 16:9 alternative with a natural three-quarter head pose on the right and believable directional facial shadows. Relight face, neck, helmet, and suit together. Keep the lander distant and the left field clear. Retain the same restrained optics, background focus, and grain as Shadowline.

**Mission Portrait 2:3:** Mykyta on the right of the tall frame, title left or above the helmet opening, and generous clear outer edges. Preserve safe space for the author, event, and later authentic logos. Its fresh scene shares the wide covers’ optics, embroidered KC patch, LED housings, and fine grain.

For all three:

- Generate a fresh scene using only the original supplied portrait and primary KC badge as reference inputs. Use the portrait for identity and the badge for its physical suit patch. Preserve Mykyta’s apparent age, recognizable facial structure, eye spacing, nose, mouth, ears, hair, and natural expression. Do not age him into an adult or idealize his face.
- Natural head rotation is allowed. Match highlights, shadows, skin tone, color temperature, and reflections to the lunar environment. Avoid a pasted-on studio face.
- Keep the head, neck, helmet opening, shoulder width, and torso anatomically proportionate. Preserve a clear view of the face through the visor.
- Use a fictional modern lunar EVA suit informed by the contemporary AxEMU silhouette: technical white textile, articulated joints, connectors, and restrained dark/red detail.
- Retain small neutral-white LED task lights in practical helmet side/temple housings. Emitters may be bright, with modest local spill and restrained horizontal anamorphic streaks. Preserve the dominant sun direction. Avoid halos, neon strips, exaggerated beams, and flare that obscures facial identity or typography.
- Keep small plausible hardware details: fasteners, hinge joints, connector collars, cable routing, suit seams, latch edges, and restrained instrument markings. They support scale and realism rather than visual clutter.
- Preserve fine textile weave, natural skin variation, small creases, slight scuffs, localized lunar dust, and imperfect reflections. Use soft background focus and fine cinematic film grain while keeping the face, visor, hardware, and patch legible. Avoid waxy skin, uniformly pristine plastic, excessive HDR, and glossy game-render surfaces.
- Apply the primary **KC mission badge** as a restrained sewn textile patch, including its small blue/yellow lunar-horizon detail. Integrate embroidery, stitching, fabric deformation, perspective, and light into the physical suit. The colored embroidery stays on the photo patch; the presentation UI remains neutral black/white.
- An informal handwritten “Space Apps 2026” suit detail may remain. Omit generated institutional and sponsor logos. Any authentic logo supplied later remains a separate asset with its original proportions.
- Keep the lander fictional and distant. The airless Moon has a black sky without atmospheric haze or a blowing dust cloud.
- Keep clean image masters, final native-text compositions, exact prompts, reference records, and truthful provenance notes. Do not add a visible AI-image caption to the current cover.

## Seven-slide framework

This is the complete seven-slide structure, including its cover and closing. It is presentation infrastructure, not a statement that every topic is ready to claim. Each slide becomes publishable only after its relevant captures and evidence are supplied.

| Slide | Subject | Composition and content | Required evidence |
| --- | --- | --- | --- |
| 1 | Kinetic Core | Hero, game title, event/challenge, sole author | Approved title/credit and recorded image provenance |
| 2 | Concept and current build | One concise game premise, actual build view, current build identifier | Source for premise; actual capture; repository commit and build date; explicit current scope |
| 3 | Rocket builder and mission planning | Large actual builder/planner capture, a few specific feature callouts | Code locations and build capture for each implemented feature; test evidence kept separate |
| 4 | Earth flight and physics | Actual flight capture with a short explanation of the relevant modeled behavior | Scenario, controls/actions, physical quantity and units, implementation reference, bounded test status |
| 5 | Destinations, landing and docking | One main actual scenario capture or two clearly separated real captures | Exact destination/scenario, implemented operations, exercised controls, limitations; training versus transfer distinguished |
| 6 | Mathematical model and validation | Native editable evidence table, one supported takeaway if available | Equations/assumptions, quantities/units, source constants, test procedure, expected/observed results, tolerances and limitations |
| 7 | Demo, sources and closing | Usable demo/project link, short source list, author credit, restrained closing | Verified access, demonstrated build identity, relevant NASA/JPL/resource attribution, technical provenance in notes |

For slides 3–5, connect each claimed advantage to a specific feature and observable outcome. “The player can choose a compatible component before launch” requires that interaction in the captured build. Comparative claims such as “more accurate” or “better than” require a defined baseline and evidence. Do not replace missing evidence with general praise or invented feature counts.

Slide 6 should contain only the model claims that fit clearly at presentation size. Keep a fuller validation ledger in technical notes. Possible checks such as dimensional consistency, fixed-step behavior, convergence, energy/momentum behavior in an appropriate isolated scenario, or reference-trajectory comparison are a **test plan until executed**. Select checks that match the actual model and its boundary conditions. Do not claim numerical accuracy simply because a 3D scene looks plausible or a unit test passes.

## Evidence states

| State | Meaning | Minimum record | What it does not imply |
| --- | --- | --- | --- |
| **Implemented** | The specific capability exists in the identified build | Code location/commit plus actual build evidence for the described interaction | That all scenarios work, that a model is physically validated, or that performance was measured |
| **Tested** | A bounded scenario or automated check ran with recorded expectations and observations | Build/commit, procedure or test reference, expected result, observed result, pass/fail, tolerance where relevant | Universal correctness or unspecified accuracy |
| **Limitation** | A known simplification, unsupported case, unresolved issue, or boundary of the evidence | Clear scope, consequence, relevant scenario/model assumption | A hidden failure to disclose or a decorative warning |
| **Not verified** | Evidence is missing or has not been reviewed | Explicit pending status | Readiness for an audience claim |

A feature can be **Implemented** and have a **Limitation** at the same time. A **Tested** record includes a result; a failed test is still executed evidence and must not appear as a passing capability. Keep these dimensions separate instead of collapsing them into a single “complete” badge.

For mathematical statements, distinguish the equation being implemented, the constants/source being used, the numerical method, and what was actually checked. Record the specific quantity, units, comparison reference, scenario, tolerance, observed error, and limitations. Missing values remain missing.

## Actual screenshot stage and provenance

Screenshot slots accept **real captures of the actual game build only**. Do not generate gameplay screenshots, reconstruct interfaces as illustrations, or label concept art as implemented gameplay. An empty slot may say “Actual game capture pending” in the private working preview. It is not acceptable as a finished evidence slide.

Prefer landscape images with **contain** scaling inside a black/Carbon media stage. Preserve the whole UI, aspect ratio, legibility, and important controls. Do not stretch images or crop away warnings, scenario labels, or contrary evidence. A detail crop may supplement a retained full capture if its crop is identified and context remains available. Keep raw capture files and final presentation derivatives separately.

Each accepted screenshot records:

- Slot/slide and exact capability or scenario shown.
- Original file path, dimensions, and capture time with timezone.
- Repository identifier, commit, and build identifier/date. Record dirty working-tree state and modifications if applicable.
- Browser/platform, viewport, and device pixel ratio where relevant.
- Destination, initial conditions, actions/controls used, and visible outcome.
- Evidence state, associated implementation/test references, and known limitations.
- Any permitted crop, annotation, or other derivative operation. Preserve the raw capture; a file hash is useful for durable provenance.

Use real commit values only after inspection. A filename, a familiar interface, or the appearance of a metric is not proof of its underlying implementation or accuracy.

## Components and preview behavior

Slide components are native title, event, byline, body, caption, screenshot stage, editable evidence table, source footer, and link. Use shared heading origins and footer baselines. Keep charts/tables editable when they express evidence. Preserve units, source labels, dates, and uncertainty.

The private preview may provide cover selection, slide navigation, screenshot/evidence entry, fullscreen inspection, downloads, and this design reference. Controls have at least 44 CSS pixel targets, visible Navigation-blue keyboard focus, and reduced-motion behavior. Avoid automatic carousels.

Check text contrast against actual imagery: at least 4.5:1 for normal text and 3:1 for large display type. Check every full export at normal viewing size and 50% scale, including long names, source notes, and imported screenshots.

## Design-code handoff

`tokens.json` is the machine-readable reference. Its CSS variable names match the unprefixed presentation contract. Keep CSS, export constants, and token values synchronized. The following are actual names, not a separate prefix or a parallel theme system:

```css
:root {
  --vacuum: #000000;
  --carbon: #0a0a0b;
  --titanium: #303034;
  --ceramic: #f5f5f7;
  --silver: #a1a1a8;
  --navigation: #9bcaff;
  --font: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  --cover-title: 144px;
  --challenge-headline: 96px;
  --section-title: 96px;
  --heading: 64px;
  --lead: 42px;
  --body: 32px;
  --event: 28px;
  --byline: 28px;
  --label: 24px;
  --caption: 22px;
  --safe: 96px;
  --gutter: 32px;
}
.cover-portrait {
  --cover-title: 162px;
  --safe: 108px;
}
.screenshot-stage img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

The actual `.cover-title` style must use `var(--cover-title)`, weight 650, line height 0.94, and tracking −0.045 em. The optional `.challenge-headline` style uses the separate 96 px role. Do not accidentally keep the current game title bound to `--challenge-headline` from a previous generic cover.

Use relative image references inside the output directory and semantic layout classes. Keep editable sources, raw captures, metadata, and exports clearly named without destructive overwrites. Technical provenance stays available even when it is not shown on the cover. Private source portraits do not belong in a public package merely to make a generated hero work.

## Acceptance before presenting

1. The exact title is Kinetic Core and the sole author credit is Created by Mykyta Borisov. The approved KC mission-badge direction and editable companion family remain distinct from official event branding.
2. All audience text is English. Event and challenge names are correct and subordinate to the project title.
3. Both formats use the shared type scale, margins, black palette, and matching CSS variables. The title uses 144/162 px in the 780/877.5 px field.
4. The v5 Shadowline, Sunlit, and Mission Portrait 2:3 scenes use only the original portrait and primary badge as reference inputs. Hero likeness, facial relighting, proportions, right-side placement, practical helmet LEDs, restrained anamorphic streaks, soft background focus, fine grain, and physical badge embroidery remain convincing. No visible AI-image caption is added, and truthful provenance remains in technical notes/metadata.
5. The presentation contains the seven defined slides. Pending screenshots and claims are visibly pending in the working preview and are resolved before a finished evidence slide is presented.
6. Gameplay evidence comes from actual captures with build/commit provenance. Implemented, Tested, Limitation, and Not verified remain distinct.
7. Mathematical claims state the actual model, source quantities/units, approximation, test scope, and measured result where available. No unexecuted check is described as passed.
8. Demo links work for the intended audience, and all relevant source/resource attributions survive export.

This kit remains local/private. It does not authorize publication, new paid integrations, or production-game changes.
