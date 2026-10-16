export const WORLD_SEED = 'DRIFTLOOM-01';
export const WORLD_LIMIT = 30;
export const WORLD_HEIGHT = 32;

export const BLOCK_META = Object.freeze({
  driftstone: { label: 'Driftstone', color: 0x2f394d, roughness: 0.88, solid: true },
  silt: { label: 'Coral silt', color: 0xc66067, roughness: 0.84, solid: true },
  moss: { label: 'Cloud moss', color: 0x68a47c, roughness: 0.92, solid: true },
  chalk: { label: 'Moon chalk', color: 0xe8dcc3, roughness: 0.76, solid: true },
  emberglass: { label: 'Emberglass', color: 0xe4a866, roughness: 0.18, solid: true, glass: true },
  crystal: { label: 'Dormant lumen', color: 0x65d9d0, roughness: 0.18, solid: true, crystal: true },
  conduit: { label: 'Copper conduit', color: 0xb87955, roughness: 0.32, solid: false, conduit: true },
  crystalActive: { label: 'Woven lumen', color: 0xffe58a, roughness: 0.08, solid: true, crystal: true, emissive: true },
  conduitActive: { label: 'Live conduit', color: 0xffbf69, roughness: 0.2, solid: false, conduit: true, emissive: true },
  wood: { label: 'Rose reed', color: 0x7d4c61, roughness: 0.86, solid: true },
  canopy: { label: 'Mist frond', color: 0x7fbd9a, roughness: 0.72, solid: false }
});

export const HOTBAR = Object.freeze(['moss', 'chalk', 'emberglass', 'conduit', 'driftstone']);
export const NEIGHBORS = Object.freeze([
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
]);

const NETWORK_TYPES = new Set(['crystal', 'crystalActive', 'conduit', 'conduitActive']);

export function blockKey(x, y, z) {
  return `${x},${y},${z}`;
}

export function parseBlockKey(value) {
  return value.split(',').map(Number);
}

function gaussian(x, z, cx, cz, rx, rz) {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz));
}

function hash2(x, z, seed = 0) {
  let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed + 1, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function valueNoise(x, z, scale, seed) {
  const sx = x / scale;
  const sz = z / scale;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const tx = smoothstep(sx - x0);
  const tz = smoothstep(sz - z0);
  const a = hash2(x0, z0, seed);
  const b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed);
  const d = hash2(x0 + 1, z0 + 1, seed);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * tz;
}

function fbm(x, z) {
  return valueNoise(x, z, 11, 3) * 0.56 + valueNoise(x, z, 5.5, 7) * 0.29 + valueNoise(x, z, 2.6, 13) * 0.15;
}

export function isSolidType(type) {
  return Boolean(type && BLOCK_META[type]?.solid);
}

export class DriftWorld {
  constructor() {
    this.blocks = new Map();
    this.generate();
  }

  get(x, y, z) {
    return this.blocks.get(blockKey(x, y, z)) || null;
  }

  set(x, y, z, type) {
    const key = blockKey(x, y, z);
    if (!type) this.blocks.delete(key);
    else this.blocks.set(key, type);
  }

  has(x, y, z) {
    return this.blocks.has(blockKey(x, y, z));
  }

  getHighest(x, z) {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y -= 1) {
      if (this.has(x, y, z)) return y;
    }
    return -1;
  }

  isVisible(x, y, z) {
    return NEIGHBORS.some(([dx, dy, dz]) => !this.has(x + dx, y + dy, z + dz));
  }

  forceColumn(x, z, top, surface = 'moss') {
    for (let y = 0; y < WORLD_HEIGHT; y += 1) this.set(x, y, z, null);
    const bottom = Math.max(1, top - 6);
    for (let y = bottom; y <= top; y += 1) {
      const depth = top - y;
      this.set(x, y, z, depth === 0 ? surface : depth < 3 ? 'silt' : 'driftstone');
    }
  }

  generate() {
    this.blocks.clear();

    for (let x = -WORLD_LIMIT; x <= WORLD_LIMIT; x += 1) {
      for (let z = -WORLD_LIMIT; z <= WORLD_LIMIT; z += 1) {
        const noise = fbm(x, z);
        const main = gaussian(x, z, 0, 1, 17, 14) * 0.96;
        const east = gaussian(x, z, 21, -12, 9, 8) * 0.76;
        const west = gaussian(x, z, -22, -8, 8, 10) * 0.7;
        const north = gaussian(x, z, 5, 23, 10, 7) * 0.64;
        const archipelago = Math.max(main, east, west, north) + (noise - 0.5) * 0.28;
        const fracture = valueNoise(x + 41, z - 19, 4.4, 23);
        const threshold = 0.25 + Math.max(0, fracture - 0.72) * 0.62;
        if (archipelago <= threshold) continue;

        const top = Math.min(16, Math.floor(5 + archipelago * 5.4 + noise * 2.4));
        const thickness = Math.max(2, Math.floor(2.5 + archipelago * 5 + valueNoise(x, z, 3.2, 31) * 2));
        const bottom = Math.max(1, top - thickness);
        const climate = valueNoise(x - 17, z + 9, 8, 47);
        const surface = climate > 0.69 ? 'chalk' : climate < 0.31 ? 'silt' : 'moss';

        for (let y = bottom; y <= top; y += 1) {
          const depth = top - y;
          let type = 'driftstone';
          if (depth === 0) type = surface;
          else if (depth < 3) type = climate < 0.45 ? 'silt' : 'chalk';
          this.set(x, y, z, type);
        }

        if (hash2(x, z, 59) > 0.975 && top > 6) {
          const glassY = Math.max(bottom, top - 2);
          this.set(x, glassY, z, 'emberglass');
        }
      }
    }

    // A calm authored clearing makes the spawn and first puzzle immediately legible.
    for (let x = -7; x <= 7; x += 1) {
      for (let z = -6; z <= 8; z += 1) {
        const distance = Math.hypot(x, z - 1);
        if (distance < 7.7) this.forceColumn(x, z, 9, distance > 6 ? 'chalk' : 'moss');
      }
    }

    // The first lumen weave: bridge these two nodes with five conduit blocks.
    this.set(-3, 10, -4, 'crystal');
    this.set(3, 10, -4, 'crystal');

    // Tall reeds and mineral blooms, kept clear of the central path.
    for (let x = -WORLD_LIMIT + 2; x <= WORLD_LIMIT - 2; x += 1) {
      for (let z = -WORLD_LIMIT + 2; z <= WORLD_LIMIT - 2; z += 1) {
        if (Math.hypot(x, z - 1) < 9) continue;
        const top = this.getHighest(x, z);
        if (top < 6 || this.get(x, top, z) !== 'moss') continue;
        const chance = hash2(x, z, 71);
        if (chance > 0.987) {
          const height = chance > 0.995 ? 4 : 3;
          for (let y = 1; y <= height; y += 1) this.set(x, top + y, z, 'wood');
          const crownY = top + height;
          for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
            this.set(x + dx, crownY + dy, z + dz, 'canopy');
          }
        } else if (chance < 0.013) {
          this.set(x, top + 1, z, 'crystal');
          if (hash2(x, z, 83) > 0.55) this.set(x, top + 2, z, 'crystal');
        }
      }
    }
  }

  updateNetworks() {
    const visited = new Set();
    let activated = false;
    let activeNetworks = 0;
    let activeCrystals = 0;

    for (const [startKey, startType] of this.blocks) {
      if (!NETWORK_TYPES.has(startType) || visited.has(startKey)) continue;
      const queue = [startKey];
      const component = [];
      let crystals = 0;
      let conduits = 0;
      let wasActive = false;
      visited.add(startKey);

      while (queue.length) {
        const key = queue.shift();
        component.push(key);
        const type = this.blocks.get(key);
        if (type === 'crystal' || type === 'crystalActive') crystals += 1;
        if (type === 'conduit' || type === 'conduitActive') conduits += 1;
        if (type === 'crystalActive' || type === 'conduitActive') wasActive = true;
        const [x, y, z] = parseBlockKey(key);
        for (const [dx, dy, dz] of NEIGHBORS) {
          const nextKey = blockKey(x + dx, y + dy, z + dz);
          if (visited.has(nextKey) || !NETWORK_TYPES.has(this.blocks.get(nextKey))) continue;
          visited.add(nextKey);
          queue.push(nextKey);
        }
      }

      const qualifies = crystals >= 2 && conduits >= 3;
      if (qualifies) {
        activeNetworks += 1;
        activeCrystals += crystals;
      }
      for (const key of component) {
        const type = this.blocks.get(key);
        if (type === 'crystal' || type === 'crystalActive') this.blocks.set(key, qualifies ? 'crystalActive' : 'crystal');
        if (type === 'conduit' || type === 'conduitActive') this.blocks.set(key, qualifies ? 'conduitActive' : 'conduit');
      }

      if (qualifies && !wasActive) {
        activated = true;
        this.transformAround(component);
      }
    }

    return { activated, activeNetworks, activeCrystals };
  }

  transformAround(component) {
    const centers = component
      .map(parseBlockKey)
      .filter(([x, y, z]) => ['crystal', 'crystalActive'].includes(this.get(x, y, z)));
    const touched = new Set();
    for (const [cx, , cz] of centers) {
      for (let x = cx - 4; x <= cx + 4; x += 1) {
        for (let z = cz - 4; z <= cz + 4; z += 1) {
          if (Math.hypot(x - cx, z - cz) > 4.2) continue;
          const y = this.getHighest(x, z);
          if (y < 0) continue;
          const key = blockKey(x, y, z);
          if (touched.has(key)) continue;
          touched.add(key);
          const type = this.get(x, y, z);
          if (type === 'silt' || type === 'chalk' || type === 'driftstone') this.set(x, y, z, 'moss');
          if (hash2(x, z, 97) > 0.88 && !this.has(x, y + 1, z)) this.set(x, y + 1, z, 'emberglass');
        }
      }
    }
  }

  networkStatus() {
    let activeCrystals = 0;
    for (const type of this.blocks.values()) if (type === 'crystalActive') activeCrystals += 1;
    return { active: activeCrystals >= 2, activeCrystals };
  }

  serialize() {
    return Array.from(this.blocks, ([key, type]) => [...parseBlockKey(key), type]);
  }

  deserialize(blocks) {
    this.blocks.clear();
    for (const [x, y, z, type] of blocks) this.set(x, y, z, type);
  }

  fingerprint() {
    let hash = 2166136261;
    const entries = Array.from(this.blocks.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [key, type] of entries) {
      const value = `${key}:${type}`;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}
