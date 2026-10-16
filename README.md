# Driftloom

Driftloom is an original single-player voxel survival sandbox for macOS. It runs offline in a secure Electron shell and renders a procedural floating archipelago with Three.js.

## Play

- `WASD` moves; `Shift` sprints; `Space` jumps; `R` returns to the survey point.
- Click the game or press `Enter` to capture the mouse. Mouse movement looks around without the cursor leaving the window; `Esc` releases it.
- Left click strikes a centered hostile in range; otherwise it mines. Right click places.
- `1`–`5` or the wheel selects a material.
- `Q` releases a charged lumen pulse while you are inside a live network field.
- `Esc` opens the pause/save menu.
- Connect the two cyan lumen pylons with at least three copper conduit cells to awaken the first network.

## Lumen Siege

First Contact begins visibly at launch with a Hushwing, a Nullbrute, and three Fraylings paused in the clearing until the player enters. Fraylings rush the player, Hushwings fire visible bolts, and the Nullbrute suppresses the network field at close range. Connecting the pylons during the three-wave siege unlocks field healing and the charged lumen pulse. Defeated enemies release lumen charge and temporary boons for health, shielding, speed, or damage. Dying restarts the current wave without deleting anything the player mined or built.

The survival record is stored inside the same validated local world save. Original schema-v1 creative saves migrate in place with safe survival defaults.

World saves are validated and written atomically under Driftloom's macOS application-support folder. The renderer has no Node.js or filesystem access.

## Development

```sh
npm run check
npm run qa
npm start
npm run package:mac
```

The packaged local build is `dist/Driftloom-darwin-arm64/Driftloom.app`.

## Scope

This is a polished vertical slice: finite world, creative materials, local saves, day/night lighting, mining, placement, collisions, lumen weaving, three original enemy classes, combat, power-ups, and a finite survival progression. It does not include crafting, multiplayer, or infinite terrain.
