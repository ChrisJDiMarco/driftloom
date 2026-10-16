import assert from 'node:assert/strict';
import {
  ENEMY_TYPES,
  MAX_ALIVE,
  MAX_CHARGE,
  POWERUP_TYPES,
  PULSE_COST,
  WAVES,
  applyPlayerDamage,
  applyPowerup,
  canPulse,
  createSurvivalState,
  deterministicDrop,
  meleeDamage,
  movementMultiplier,
  recordEnemyDefeat,
  recordWaveClear,
  serializeSurvival,
  spendPulse,
  tickSurvival,
  validateSurvivalSnapshot,
  waveComposition
} from '../gameplay.mjs';

const near = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
};

assert.deepEqual(
  [
    ENEMY_TYPES.frayling.health,
    ENEMY_TYPES.frayling.speed,
    ENEMY_TYPES.frayling.damage,
    ENEMY_TYPES.frayling.attackCooldown
  ],
  [30, 5.2, 8, 1]
);
assert.deepEqual(
  [
    ENEMY_TYPES.hushwing.health,
    ENEMY_TYPES.hushwing.speed,
    ENEMY_TYPES.hushwing.damage,
    ENEMY_TYPES.hushwing.attackCooldown,
    ENEMY_TYPES.hushwing.projectileSpeed
  ],
  [24, 3.8, 7, 1.8, 9]
);
assert.deepEqual(
  [
    ENEMY_TYPES.nullbrute.health,
    ENEMY_TYPES.nullbrute.speed,
    ENEMY_TYPES.nullbrute.damage,
    ENEMY_TYPES.nullbrute.attackCooldown
  ],
  [90, 3, 15, 1.5]
);
assert.deepEqual(WAVES.map((wave) => wave.enemies.length), [5, 7, 7]);
assert.deepEqual(waveComposition(1), ['hushwing', 'nullbrute', ...Array(3).fill('frayling')]);
assert.deepEqual(new Set(waveComposition(1)), new Set(['frayling', 'hushwing', 'nullbrute']));
assert.deepEqual(waveComposition(2), [...Array(5).fill('frayling'), ...Array(2).fill('hushwing')]);
assert.deepEqual(waveComposition(3), [
  ...Array(4).fill('frayling'),
  ...Array(2).fill('hushwing'),
  'nullbrute'
]);
assert.equal(MAX_ALIVE, 7);

// A pre-survival save has no survival payload and must restore clean defaults.
const oldSaveState = createSurvivalState({ version: 1, blocks: [], player: { feet: [0, 10, 4] } });
assert.equal(oldSaveState.health, 100);
assert.equal(oldSaveState.shield, 0);
assert.equal(oldSaveState.charge, 0);
assert.equal(oldSaveState.kills, 0);
assert.equal(oldSaveState.siegeComplete, false);

const state = createSurvivalState({ health: 70, shield: 10 });
let hit = applyPlayerDamage(state, 18, 1);
assert.equal(hit.absorbed, 10);
assert.equal(hit.damage, 8);
assert.equal(state.health, 62);
assert.equal(state.shield, 0);

const glassward = applyPowerup(state, 'glassward', 2);
assert.equal(glassward.applied, true);
assert.equal(state.shield, 30);
assert.equal(state.buffs.glassward, POWERUP_TYPES.glassward.duration);
hit = applyPlayerDamage(state, 20, 3);
assert.equal(hit.warded, true);
near(hit.incoming, 11);
assert.equal(state.shield, 19);
assert.equal(state.health, 62);

applyPowerup(state, 'mendlight', 4);
assert.equal(state.health, 94);
applyPowerup(state, 'quickthread', 5);
near(meleeDamage(state, 5), 38.4);
assert.equal(movementMultiplier(state, 5), 1.45);
tickSurvival(state, 17);
assert.equal(state.buffs.glassward, 0);
assert.equal(state.buffs.quickthread, 0);
assert.equal(meleeDamage(state, 17), 24);

assert.equal(MAX_CHARGE, 8);
assert.equal(PULSE_COST, 8);
for (let index = 0; index < 3; index += 1) applyPowerup(state, 'sunspool', 18);
assert.equal(state.charge, 8);
assert.equal(canPulse(state, false, true), false);
assert.equal(canPulse(state, true, false), false);
assert.equal(canPulse(state, true, true), true);
assert.equal(spendPulse(state), true);
assert.equal(state.charge, 0);
assert.equal(spendPulse(state), false);

const firstDrop = deterministicDrop('DRIFTLOOM-01', 'frayling-7', 'frayling', 7);
assert.equal(firstDrop, deterministicDrop('DRIFTLOOM-01', 'frayling-7', 'frayling', 7));
assert.ok(firstDrop === null || Object.hasOwn(POWERUP_TYPES, firstDrop));
const observedDrops = new Set();
for (let index = 0; index < 256; index += 1) {
  observedDrops.add(deterministicDrop('DRIFTLOOM-01', `enemy-${index}`, 'frayling', index));
}
for (const type of Object.keys(POWERUP_TYPES)) assert.ok(observedDrops.has(type), `${type} was unreachable`);
assert.ok(observedDrops.has(null), 'the no-drop result was unreachable');

assert.equal(recordEnemyDefeat(state, 'nullbrute'), ENEMY_TYPES.nullbrute.score);
assert.equal(state.kills, 1);
assert.equal(state.score, ENEMY_TYPES.nullbrute.score);
recordWaveClear(state, 3);
assert.equal(state.highestWave, 3);
assert.equal(state.bestNight, 3);
assert.equal(state.dawnsHeld, 1);
assert.equal(state.networkRank, 1);
assert.equal(state.siegeComplete, true);

const serialized = serializeSurvival(state);
assert.equal(validateSurvivalSnapshot(serialized), true);
assert.equal(validateSurvivalSnapshot({ ...serialized, health: Number.NaN }), false);
assert.equal(validateSurvivalSnapshot({ ...serialized, charge: 9 }), false);
assert.equal(validateSurvivalSnapshot({ ...serialized, siegeComplete: 'yes' }), false);
assert.deepEqual(serializeSurvival(createSurvivalState({ survival: serialized })), serialized);

console.log('gameplay smoke: pass');
