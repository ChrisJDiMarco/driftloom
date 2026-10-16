// Driftloom's survival rules live here so renderer animation and save I/O stay
// separate from combat balance. Every helper is deterministic and Three-free.

export const SURVIVAL_SCHEMA = 1;
export const MAX_HEALTH = 100;
export const MAX_SHIELD = 100;
export const MAX_CHARGE = 8;
export const PULSE_COST = 8;
export const MAX_ALIVE = 7;
export const BASE_MELEE_DAMAGE = 24;

export const ENEMY_TYPES = Object.freeze({
  frayling: Object.freeze({
    id: 'frayling',
    label: 'Frayling',
    health: 30,
    speed: 5.2,
    damage: 8,
    attackCooldown: 1,
    attack: 'melee',
    score: 100
  }),
  hushwing: Object.freeze({
    id: 'hushwing',
    label: 'Hushwing',
    health: 24,
    speed: 3.8,
    damage: 7,
    attackCooldown: 1.8,
    projectileSpeed: 9,
    attack: 'bolt',
    score: 180
  }),
  nullbrute: Object.freeze({
    id: 'nullbrute',
    label: 'Nullbrute',
    health: 90,
    speed: 3,
    damage: 15,
    attackCooldown: 1.5,
    attack: 'melee',
    score: 500
  })
});

export const POWERUP_TYPES = Object.freeze({
  mendlight: Object.freeze({
    id: 'mendlight',
    label: 'Mendlight',
    color: 0xff718c,
    health: 32
  }),
  glassward: Object.freeze({
    id: 'glassward',
    label: 'Glassward',
    color: 0x77d8ff,
    shield: 30,
    duration: 12,
    incomingMultiplier: 0.55
  }),
  quickthread: Object.freeze({
    id: 'quickthread',
    label: 'Quickthread',
    color: 0xffd36a,
    duration: 11,
    movementMultiplier: 1.45,
    meleeMultiplier: 1.6
  }),
  sunspool: Object.freeze({
    id: 'sunspool',
    label: 'Sunspool',
    color: 0xffa85b,
    charge: 3
  })
});

const makeWave = (number, label, composition) => Object.freeze({
  number,
  label,
  composition: Object.freeze({ ...composition }),
  enemies: Object.freeze(Object.entries(composition).flatMap(([type, count]) => Array(count).fill(type)))
});

export const WAVES = Object.freeze([
  makeWave(1, 'First contact', { hushwing: 1, nullbrute: 1, frayling: 3 }),
  makeWave(2, 'Wings in the mist', { frayling: 5, hushwing: 2 }),
  makeWave(3, 'The null tide', { frayling: 4, hushwing: 2, nullbrute: 1 })
]);

const DEFAULT_BUFFS = Object.freeze({ glassward: 0, quickthread: 0 });

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, finite(value, minimum)));
}

function whole(value, minimum, maximum) {
  return Math.trunc(clamp(value, minimum, maximum));
}

function optionalFiniteInRange(object, key, minimum, maximum) {
  return object[key] === undefined || (Number.isFinite(object[key]) && object[key] >= minimum && object[key] <= maximum);
}

function sourceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {};
  if (snapshot.survival && typeof snapshot.survival === 'object' && !Array.isArray(snapshot.survival)) {
    return snapshot.survival;
  }
  return snapshot;
}

export function validateSurvivalSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
  if (snapshot.schema !== undefined && snapshot.schema !== SURVIVAL_SCHEMA) return false;
  if (!optionalFiniteInRange(snapshot, 'health', 0, MAX_HEALTH)) return false;
  if (!optionalFiniteInRange(snapshot, 'shield', 0, MAX_SHIELD)) return false;
  if (!optionalFiniteInRange(snapshot, 'charge', 0, MAX_CHARGE)) return false;
  for (const key of ['kills', 'score', 'night', 'wave', 'dawnsHeld', 'bestNight', 'networkRank', 'highestWave']) {
    if (!optionalFiniteInRange(snapshot, key, 0, Number.MAX_SAFE_INTEGER)) return false;
  }
  if (snapshot.siegeComplete !== undefined && typeof snapshot.siegeComplete !== 'boolean') return false;
  if (snapshot.buffs !== undefined) {
    if (!snapshot.buffs || typeof snapshot.buffs !== 'object' || Array.isArray(snapshot.buffs)) return false;
    if (!optionalFiniteInRange(snapshot.buffs, 'glassward', 0, 60 * 60)) return false;
    if (!optionalFiniteInRange(snapshot.buffs, 'quickthread', 0, 60 * 60)) return false;
  }
  return true;
}

export function createSurvivalState(snapshot = {}) {
  const source = sourceSnapshot(snapshot);
  const buffs = source.buffs && typeof source.buffs === 'object' ? source.buffs : DEFAULT_BUFFS;
  return {
    health: clamp(source.health ?? MAX_HEALTH, 0, MAX_HEALTH),
    shield: clamp(source.shield ?? 0, 0, MAX_SHIELD),
    charge: clamp(source.charge ?? 0, 0, MAX_CHARGE),
    kills: whole(source.kills ?? 0, 0, Number.MAX_SAFE_INTEGER),
    score: whole(source.score ?? 0, 0, Number.MAX_SAFE_INTEGER),
    night: whole(source.night ?? 0, 0, Number.MAX_SAFE_INTEGER),
    wave: whole(source.wave ?? 0, 0, WAVES.length),
    dawnsHeld: whole(source.dawnsHeld ?? 0, 0, Number.MAX_SAFE_INTEGER),
    bestNight: whole(source.bestNight ?? 0, 0, Number.MAX_SAFE_INTEGER),
    networkRank: whole(source.networkRank ?? 0, 0, Number.MAX_SAFE_INTEGER),
    highestWave: whole(source.highestWave ?? 0, 0, WAVES.length),
    siegeComplete: source.siegeComplete === true,
    buffs: {
      glassward: clamp(buffs.glassward ?? 0, 0, 60 * 60),
      quickthread: clamp(buffs.quickthread ?? 0, 0, 60 * 60)
    },
    _lastTick: null
  };
}

export function serializeSurvival(state) {
  const safe = createSurvivalState(state);
  return {
    schema: SURVIVAL_SCHEMA,
    health: safe.health,
    shield: safe.shield,
    charge: safe.charge,
    kills: safe.kills,
    score: safe.score,
    night: safe.night,
    wave: safe.wave,
    dawnsHeld: safe.dawnsHeld,
    bestNight: safe.bestNight,
    networkRank: safe.networkRank,
    highestWave: safe.highestWave,
    siegeComplete: safe.siegeComplete,
    buffs: { ...safe.buffs }
  };
}

// Buff clocks store remaining seconds. This survives saves and accepts any
// monotonic seconds clock (performance.now()/1000 or THREE.Clock elapsedTime).
export function tickSurvival(state, nowSeconds) {
  const now = finite(nowSeconds, 0);
  if (!Number.isFinite(state._lastTick)) {
    state._lastTick = now;
    return state;
  }
  const delta = Math.max(0, now - state._lastTick);
  state._lastTick = now;
  state.buffs.glassward = Math.max(0, state.buffs.glassward - delta);
  state.buffs.quickthread = Math.max(0, state.buffs.quickthread - delta);
  return state;
}

export function applyPlayerDamage(state, amount, nowSeconds) {
  tickSurvival(state, nowSeconds);
  const requested = Math.max(0, finite(amount, 0));
  const warded = state.buffs.glassward > 0;
  const incoming = requested * (warded ? POWERUP_TYPES.glassward.incomingMultiplier : 1);
  const absorbed = Math.min(state.shield, incoming);
  const healthDamage = Math.min(state.health, incoming - absorbed);
  state.shield = clamp(state.shield - absorbed, 0, MAX_SHIELD);
  state.health = clamp(state.health - healthDamage, 0, MAX_HEALTH);
  return {
    requested,
    incoming,
    absorbed,
    damage: healthDamage,
    health: state.health,
    shield: state.shield,
    warded,
    dead: state.health <= 0
  };
}

export function applyPowerup(state, type, nowSeconds) {
  tickSurvival(state, nowSeconds);
  const powerup = POWERUP_TYPES[type];
  if (!powerup) return { applied: false, type, health: 0, shield: 0, charge: 0, duration: 0 };

  const before = { health: state.health, shield: state.shield, charge: state.charge };
  if (powerup.health) state.health = clamp(state.health + powerup.health, 0, MAX_HEALTH);
  if (powerup.shield) state.shield = clamp(state.shield + powerup.shield, 0, MAX_SHIELD);
  if (powerup.charge) state.charge = clamp(state.charge + powerup.charge, 0, MAX_CHARGE);
  if (type === 'glassward') state.buffs.glassward = Math.max(state.buffs.glassward, powerup.duration);
  if (type === 'quickthread') state.buffs.quickthread = Math.max(state.buffs.quickthread, powerup.duration);

  return {
    applied: true,
    type,
    label: powerup.label,
    health: state.health - before.health,
    shield: state.shield - before.shield,
    charge: state.charge - before.charge,
    duration: powerup.duration ?? 0
  };
}

export function meleeDamage(state, nowSeconds) {
  tickSurvival(state, nowSeconds);
  const multiplier = state.buffs.quickthread > 0 ? POWERUP_TYPES.quickthread.meleeMultiplier : 1;
  return BASE_MELEE_DAMAGE * multiplier;
}

export function movementMultiplier(state, nowSeconds) {
  tickSurvival(state, nowSeconds);
  return state.buffs.quickthread > 0 ? POWERUP_TYPES.quickthread.movementMultiplier : 1;
}

export function canPulse(state, networkActive, inField) {
  return Boolean(networkActive && inField && state.health > 0 && state.charge >= PULSE_COST);
}

export function spendPulse(state) {
  if (state.charge < PULSE_COST) return false;
  state.charge = clamp(state.charge - PULSE_COST, 0, MAX_CHARGE);
  return true;
}

export function waveComposition(waveNumber) {
  const wave = WAVES.find((entry) => entry.number === Number(waveNumber));
  return wave ? [...wave.enemies] : [];
}

export function recordEnemyDefeat(state, enemyType) {
  const enemy = ENEMY_TYPES[enemyType];
  if (!enemy) return 0;
  state.kills = whole(state.kills + 1, 0, Number.MAX_SAFE_INTEGER);
  state.score = whole(state.score + enemy.score, 0, Number.MAX_SAFE_INTEGER);
  return enemy.score;
}

export function recordWaveClear(state, waveNumber) {
  const wave = whole(waveNumber, 0, WAVES.length);
  state.highestWave = Math.max(state.highestWave, wave);
  state.bestNight = Math.max(state.bestNight, wave);
  if (wave === WAVES.length) {
    state.dawnsHeld = whole(state.dawnsHeld + 1, 0, Number.MAX_SAFE_INTEGER);
    state.networkRank = whole(state.networkRank + 1, 0, Number.MAX_SAFE_INTEGER);
    state.siegeComplete = true;
  }
  return state;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicDrop(seed, enemyId, enemyType, killIndex = 0) {
  const key = `${String(seed)}|${String(enemyId)}|${String(enemyType)}|${whole(killIndex, 0, Number.MAX_SAFE_INTEGER)}`;
  const roll = hashString(key) % 100;
  if (roll < 22) return 'mendlight';
  if (roll < 42) return 'glassward';
  if (roll < 62) return 'quickthread';
  if (roll < 82) return 'sunspool';
  return null;
}
