# Driftloom v0.2.1 verification

Acceptance sentence: a signed Apple-silicon Electron app opens the original procedural floating-island sandbox, preserves schema-v1 worlds, and supports captured-cursor first-person traversal, mining, placement, lumen-network construction, three finite enemy waves, three distinct hostile classes, close-range combat, ranged attacks, four power-ups, charged lumen pulses, death/retry, progression, local saves, and dawn completion.

## Final artifact

- Source: `/Users/chrisdimarco/Cabinet/advisors/chief-of-staff/desk/Driftloom`
- Packaged app: `/Users/chrisdimarco/Cabinet/advisors/chief-of-staff/desk/Driftloom/dist/Driftloom-darwin-arm64/Driftloom.app`
- Version: `0.2.1`
- Architecture: arm64 Mach-O
- Signature: strict deep verification passed; ad-hoc local signature
- Rendering: local Three.js, original procedural geometry and materials, offline
- Seed: `DRIFTLOOM-01`
- Baseline fingerprint: `0a9b5197`
- Final packaged `app.asar` SHA-256: `d168919fa06746a64523617a2682369fd90da5021e58f32dcb1c8b882b51824d`

## Automated gates

`npm run check` passed syntax checks for every JavaScript entry point and the deterministic gameplay smoke script.

The final packaged executable passed all 19 deterministic checks:

1. 10,651-cell terrain generation.
2. Clear player spawn.
3. Solid ground collision.
4. Block placement.
5. Block mining.
6. Lumen-network activation.
7. Exact wave sizes of 5, 7, and 7.
8. First Contact includes a Hushwing, Nullbrute, and three Fraylings immediately on launch.
9. Exact final-wave roster: four Fraylings, two Hushwings, one Nullbrute.
10. Three structurally distinct hostile rigs.
11. Seven-hostile live cap.
12. Shield-first damage and repeat-hit immunity.
13. Heartseed, Ward Bloom, Swiftspore, and Brightwrath effects.
14. Full-charge lumen pulse consumption and defeat effect.
15. Hostile freeze while paused.
16. World save round-trip.
17. Survival-state save round-trip.
18. Schema-v1 save migration defaults.
19. World-time advancement.

The final packaged simulation then advanced an active wave-three encounter for 2.4 seconds. All three hostile classes moved, the Hushwing emitted a projectile, the player collected both staged power-ups, and the nearby Nullbrute damped the live network. Result: `ok: true`, `moved: true`.

## Visual and window gates

- Final packaged render: `verification/survival-v1/final-packaged-render.png`
- Final normal-launch enemy lineup: `verification/survival-v1/v0.2.1-final-visible-enemies.png`
- Final normal packaged window on the restored world: `verification/survival-v1/final-normal-open.png`
- Live captured-cursor state: `verification/survival-v1/final-normal-playing.png`
- Responsive 1280×720 render: `verification/survival-v1/packaged-showcase-1280x720.png`
- Responsive 1440×900 render: `verification/survival-v1/packaged-showcase-1440x900.png`
- Original packaged interaction receipts: `verification/packaged-menu.png` and `verification/packaged-after-interaction.png`

The final packaged render was inspected at full resolution. A separate 3184×2144 CoreGraphics capture of v0.2.1's normal launch confirms that the restored 10,618-cell world opens with all five First Contact enemies in view: the flying Hushwing at left, three Fraylings across the clearing, and the large Nullbrute at right. The compact bottom prompt leaves the lineup unobstructed and keeps the simulation paused until the player enters the siege.

## Save and rollback protection

- Original accepted app: `/Users/chrisdimarco/Cabinet/advisors/chief-of-staff/desk/Driftloom-v0-package-preserved/Driftloom-v0.app`
- Original pre-survival save backup: `Driftloom-v0-package-preserved/save-backup/driftloom-world-v1-before-survival.json`
- Latest pre-launch save backup: `Driftloom-v0-package-preserved/save-backup/driftloom-world-v1-latest-before-final-open.json`
- Latest backup SHA-256: `69dbde6750db4415da0493a6b04bb46f8b7508abb152520317d8c3c2cc799791`
- Post-launch schema-v2 save backup: `Driftloom-v0-package-preserved/save-backup/driftloom-world-v2-post-launch-play.json`
- Post-launch backup SHA-256: `7afc57b66d308b7074fceaf0b9e3291f64a6107f9592e9d17d4180c133413bf5`
- Superseded Giza prototype: `/Users/chrisdimarco/Cabinet/advisors/chief-of-staff/desk/giza-prototype-2026-08-13`

## Limits

- Local Apple-silicon build only.
- Ad-hoc signed, not Developer-ID signed or notarized.
- Finite single-player vertical slice; no crafting, multiplayer, or infinite chunk streaming.
