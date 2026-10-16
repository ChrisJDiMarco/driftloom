import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BLOCK_META,
  DriftWorld,
  HOTBAR,
  WORLD_HEIGHT,
  WORLD_LIMIT,
  WORLD_SEED,
  isSolidType
} from './world.mjs';

const query = new URLSearchParams(window.location.search);
const qaMode = query.has('qa');
const showcaseMode = query.has('showcase');
const canvas = document.querySelector('#world');
const gateway = document.querySelector('#gateway');
const enterWorldButton = document.querySelector('#enter-world');
const menuKicker = document.querySelector('#menu-kicker');
const menuTitle = document.querySelector('#menu-title');
const menuCopy = document.querySelector('#menu-copy');
const hotbarElement = document.querySelector('#hotbar');
const selectedName = document.querySelector('#selected-name');
const coordinates = document.querySelector('#coordinates');
const clockLabel = document.querySelector('#clock');
const blockCountLabel = document.querySelector('#block-count');
const mouseStatus = document.querySelector('#mouse-status');
const mouseDot = document.querySelector('#mouse-dot');
const saveStatus = document.querySelector('#save-status');
const saveDot = document.querySelector('#save-dot');
const objectiveText = document.querySelector('#objective-text');
const signal = document.querySelector('#signal');
const reticle = document.querySelector('#reticle');
const targetLabel = document.querySelector('#target-label');
const toast = document.querySelector('#toast');
const saveButton = document.querySelector('#save-world');
const loadButton = document.querySelector('#load-world');
const resetButton = document.querySelector('#reset-world');
const snapshotButton = document.querySelector('#snapshot');
const survivalHud = document.querySelector('#survivalHud');
const healthFill = document.querySelector('#healthFill');
const healthValue = document.querySelector('#healthValue');
const shieldFill = document.querySelector('#shieldFill');
const shieldValue = document.querySelector('#shieldValue');
const lumenFill = document.querySelector('#lumenFill');
const lumenValue = document.querySelector('#lumenValue');
const combatWave = document.querySelector('#combatWave');
const combatRemaining = document.querySelector('#combatRemaining');
const combatScore = document.querySelector('#combatScore');
const combatKills = document.querySelector('#combatKills');
const buffList = document.querySelector('#buffList');
const enemyReadout = document.querySelector('#enemyReadout');
const enemyName = document.querySelector('#enemyName');
const enemyHealthFill = document.querySelector('#enemyHealthFill');
const pulseHint = document.querySelector('#pulseHint');
const damageFlash = document.querySelector('#damageFlash');
const hitMarker = document.querySelector('#hitMarker');

const world = new DriftWorld();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x12162b);
scene.fog = new THREE.FogExp2(0x1b1a32, 0.015);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(69, window.innerWidth / window.innerHeight, 0.05, 190);
camera.rotation.order = 'YXZ';
scene.add(camera);

const controls = new PointerLockControls(camera, canvas);
controls.pointerSpeed = 0.72;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const hemi = new THREE.HemisphereLight(0xb7e4df, 0x171225, 1.4);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffedc1, 4.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -42;
sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42;
sun.shadow.camera.bottom = -42;
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.03;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x7a7fe8, 0.85);
fill.position.set(-25, 18, 22);
scene.add(fill);

const skySun = new THREE.Mesh(
  new THREE.SphereGeometry(3.1, 32, 20),
  new THREE.MeshBasicMaterial({ color: 0xffd786, fog: false })
);
scene.add(skySun);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(5.2, 32, 20),
  new THREE.MeshBasicMaterial({ color: 0xc6d2ef, fog: false })
);
scene.add(moon);

const mistMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x4b3b70,
  transparent: true,
  opacity: 0.52,
  roughness: 0.25,
  metalness: 0.02,
  transmission: 0.16,
  depthWrite: false,
  side: THREE.DoubleSide
});
const mist = new THREE.Mesh(new THREE.PlaneGeometry(210, 210, 1, 1), mistMaterial);
mist.rotation.x = -Math.PI / 2;
mist.position.y = 1.4;
scene.add(mist);

function seededRandom(index, seed = 1) {
  const value = Math.sin(index * 91.713 + seed * 17.19) * 43758.5453;
  return value - Math.floor(value);
}

function makeAtmospherePoints(count, radius, low, high, color, size, opacity) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = seededRandom(index, 2) * Math.PI * 2;
    const distance = radius * (0.25 + seededRandom(index, 3) * 0.75);
    positions[index * 3] = Math.cos(angle) * distance;
    positions[index * 3 + 1] = low + seededRandom(index, 4) * (high - low);
    positions[index * 3 + 2] = Math.sin(angle) * distance;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, fog: false });
  return new THREE.Points(geometry, material);
}

const stars = makeAtmospherePoints(760, 105, 18, 78, 0xe2ebff, 0.19, 0.82);
scene.add(stars);
const driftDust = makeAtmospherePoints(430, 68, 3, 27, 0xffe6bd, 0.055, 0.34);
scene.add(driftDust);

const blockRoot = new THREE.Group();
scene.add(blockRoot);
const enemyRoot = new THREE.Group();
enemyRoot.name = 'hostiles';
scene.add(enemyRoot);
const projectileRoot = new THREE.Group();
projectileRoot.name = 'hostile-projectiles';
scene.add(projectileRoot);
const pickupRoot = new THREE.Group();
pickupRoot.name = 'fallen-boons';
scene.add(pickupRoot);
const blockMeshes = new Map();
const sharedGeometries = {
  block: new RoundedBoxGeometry(0.98, 0.98, 0.98, 2, 0.055),
  crystal: new THREE.OctahedronGeometry(0.69, 0),
  conduit: new RoundedBoxGeometry(0.84, 0.16, 0.84, 2, 0.045),
  wood: new RoundedBoxGeometry(0.48, 0.98, 0.48, 2, 0.08),
  canopy: new THREE.OctahedronGeometry(0.72, 0)
};
sharedGeometries.crystal.scale(0.74, 1.22, 0.74);
sharedGeometries.conduit.translate(0, -0.39, 0);

const blockMaterials = new Map();
for (const [type, meta] of Object.entries(BLOCK_META)) {
  let material;
  if (meta.glass) {
    material = new THREE.MeshPhysicalMaterial({
      color: meta.color,
      roughness: meta.roughness,
      metalness: 0.05,
      transmission: 0.46,
      thickness: 0.4,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      vertexColors: true
    });
  } else if (meta.crystal) {
    material = new THREE.MeshPhysicalMaterial({
      color: meta.color,
      roughness: meta.roughness,
      metalness: 0.08,
      transmission: type === 'crystalActive' ? 0.28 : 0.12,
      thickness: 0.6,
      emissive: meta.emissive ? meta.color : 0x194f50,
      emissiveIntensity: meta.emissive ? 3.3 : 0.7,
      vertexColors: true
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      color: meta.color,
      roughness: meta.roughness,
      metalness: meta.conduit ? 0.68 : 0.04,
      emissive: meta.emissive ? meta.color : 0x000000,
      emissiveIntensity: meta.emissive ? 2.5 : 0,
      vertexColors: true
    });
  }
  blockMaterials.set(type, material);
}

const selectionBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.035, 1.035, 1.035)),
  new THREE.LineBasicMaterial({ color: 0xfff2c2, transparent: true, opacity: 0.85, depthTest: false })
);
selectionBox.renderOrder = 20;
selectionBox.visible = false;
scene.add(selectionBox);

function geometryForType(type) {
  if (BLOCK_META[type].crystal) return sharedGeometries.crystal;
  if (BLOCK_META[type].conduit) return sharedGeometries.conduit;
  if (type === 'wood') return sharedGeometries.wood;
  if (type === 'canopy') return sharedGeometries.canopy;
  return sharedGeometries.block;
}

function coordinateShade(x, y, z) {
  const value = Math.sin(x * 12.9898 + y * 41.233 + z * 78.119) * 43758.5453;
  return 0.84 + (value - Math.floor(value)) * 0.2;
}

function rebuildWorld() {
  for (const mesh of blockMeshes.values()) blockRoot.remove(mesh);
  blockMeshes.clear();

  const visibleByType = new Map();
  for (const [key, type] of world.blocks) {
    const [x, y, z] = key.split(',').map(Number);
    if (!world.isVisible(x, y, z)) continue;
    if (!visibleByType.has(type)) visibleByType.set(type, []);
    visibleByType.get(type).push({ x, y, z });
  }

  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();
  for (const [type, positions] of visibleByType) {
    const mesh = new THREE.InstancedMesh(geometryForType(type), blockMaterials.get(type), positions.length);
    mesh.castShadow = type !== 'emberglass' && type !== 'canopy';
    mesh.receiveShadow = true;
    mesh.userData.positions = positions;
    mesh.userData.type = type;
    for (let index = 0; index < positions.length; index += 1) {
      const { x, y, z } = positions[index];
      matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
      mesh.setMatrixAt(index, matrix);
      const shade = coordinateShade(x, y, z);
      tint.setRGB(shade, shade, shade);
      mesh.setColorAt(index, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    blockRoot.add(mesh);
    blockMeshes.set(type, mesh);
  }

  blockCountLabel.textContent = `${world.blocks.size.toLocaleString()} CELLS`;
  updateNetworkUI(world.networkStatus());
}

const PLAYER_RADIUS = 0.29;
const PLAYER_HEIGHT = 1.78;
const EYE_HEIGHT = 1.62;
const player = {
  feet: new THREE.Vector3(0.5, 11, 4.5),
  velocityY: 0,
  grounded: false
};

function spawnPlayer() {
  const groundY = world.getHighest(0, 4);
  player.feet.set(0.5, groundY + 1.015, 4.5);
  player.velocityY = 0;
  camera.rotation.set(-0.075, 0, 0);
  syncCamera();
}

function syncCamera() {
  camera.position.set(player.feet.x, player.feet.y + EYE_HEIGHT, player.feet.z);
}

function playerCollides(position) {
  const minX = Math.floor(position.x - PLAYER_RADIUS + 0.001);
  const maxX = Math.floor(position.x + PLAYER_RADIUS - 0.001);
  const minY = Math.floor(position.y + 0.001);
  const maxY = Math.floor(position.y + PLAYER_HEIGHT - 0.001);
  const minZ = Math.floor(position.z - PLAYER_RADIUS + 0.001);
  const maxZ = Math.floor(position.z + PLAYER_RADIUS - 0.001);
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (isSolidType(world.get(x, y, z))) return true;
      }
    }
  }
  return false;
}

function blockIntersectsPlayer(x, y, z) {
  const playerMin = { x: player.feet.x - PLAYER_RADIUS, y: player.feet.y, z: player.feet.z - PLAYER_RADIUS };
  const playerMax = { x: player.feet.x + PLAYER_RADIUS, y: player.feet.y + PLAYER_HEIGHT, z: player.feet.z + PLAYER_RADIUS };
  return x < playerMax.x && x + 1 > playerMin.x && y < playerMax.y && y + 1 > playerMin.y && z < playerMax.z && z + 1 > playerMin.z;
}

const ENEMY_DEFINITIONS = Object.freeze({
  frayling: Object.freeze({
    label: 'FRAYLING', health: 30, speed: 5.2, damage: 8, attackRange: 1.18,
    attackDelay: 1, score: 100, radius: 0.42, height: 0.86, color: 0xe55f76
  }),
  hushwing: Object.freeze({
    label: 'HUSHWING', health: 24, speed: 3.8, damage: 7, attackRange: 8.2,
    attackDelay: 1.8, projectileSpeed: 9, score: 180, radius: 0.48, height: 1.1, color: 0x8b86ff
  }),
  nullbrute: Object.freeze({
    label: 'NULLBRUTE', health: 90, speed: 3, damage: 15, attackRange: 1.5,
    attackDelay: 1.5, score: 500, radius: 0.72, height: 1.72, color: 0x3e244f
  })
});

const SIEGE_WAVES = Object.freeze([
  Object.freeze({ name: 'FIRST CONTACT', roster: Object.freeze(['hushwing', 'nullbrute', 'frayling', 'frayling', 'frayling']) }),
  Object.freeze({ name: 'WINGS IN THE HUSH', roster: Object.freeze(['frayling', 'frayling', 'frayling', 'frayling', 'frayling', 'hushwing', 'hushwing']) }),
  Object.freeze({ name: 'THE NULL ARRIVES', roster: Object.freeze(['frayling', 'frayling', 'frayling', 'frayling', 'hushwing', 'hushwing', 'nullbrute']) })
]);

const MAX_ENEMIES = 7;
const MAX_CHARGE = 8;
const PULSE_RADIUS = 9;
const PULSE_DAMAGE = 30;
const PULSE_STUN = 2.5;
const MELEE_RANGE = 3.3;

const POWERUP_DEFINITIONS = Object.freeze({
  heartseed: Object.freeze({ label: 'HEARTSEED', color: 0xff7284, tone: 520 }),
  wardbloom: Object.freeze({ label: 'WARD BLOOM', color: 0x71d9ff, tone: 610 }),
  swiftspore: Object.freeze({ label: 'SWIFTSPORE', color: 0xffd76e, tone: 720 }),
  brightwrath: Object.freeze({ label: 'BRIGHTWRATH', color: 0xd889ff, tone: 820 }),
  charge: Object.freeze({ label: 'LUMEN SHARD', color: 0xffef9b, tone: 940 })
});

const DEFAULT_SURVIVAL = Object.freeze({
  health: 100,
  maxHealth: 100,
  shield: 0,
  charge: 0,
  score: 0,
  kills: 0,
  night: 0,
  wave: 0,
  networkRank: 0,
  dawnsHeld: 0,
  bestNight: 0,
  siegeComplete: false
});

const survival = {
  ...DEFAULT_SURVIVAL,
  buffs: { swiftspore: 0, brightwrath: 0 }
};

const encounter = {
  phase: 'dormant',
  wave: 0,
  queue: [],
  timer: 0,
  spawnTimer: 0,
  serial: 0,
  retryWave: 0
};

const enemies = [];
const projectiles = [];
const pickups = [];
let enemyTarget = null;
let attackCooldown = 0;
let pulseCooldown = 0;
let damageCooldown = 0;
let damageFreeTime = 99;
let hitMarkerTimer = 0;
let networkAwake = false;
let networkDamped = false;
let activeNetworkCells = [];
let buffMarkup = '';

const entityGeometry = Object.freeze({
  softCube: new RoundedBoxGeometry(1, 1, 1, 3, 0.14),
  smallCube: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
  shard: new THREE.OctahedronGeometry(0.5, 0),
  orb: new THREE.SphereGeometry(0.5, 18, 12),
  wing: new THREE.ConeGeometry(0.5, 1.05, 3),
  ring: new THREE.TorusGeometry(0.5, 0.055, 8, 28),
  bolt: new THREE.SphereGeometry(0.13, 12, 8)
});

const enemyMaterials = Object.freeze({
  frayling: new THREE.MeshStandardMaterial({ color: 0xb94760, roughness: 0.58, metalness: 0.08, emissive: 0x541525, emissiveIntensity: 0.62 }),
  hushwing: new THREE.MeshPhysicalMaterial({ color: 0x706ee0, roughness: 0.24, metalness: 0.18, transmission: 0.12, emissive: 0x25245f, emissiveIntensity: 1.35 }),
  nullbrute: new THREE.MeshStandardMaterial({ color: 0x352040, roughness: 0.86, metalness: 0.03, emissive: 0x170d21, emissiveIntensity: 0.48 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xffe58a, toneMapped: false }),
  nullEye: new THREE.MeshBasicMaterial({ color: 0x9bf9ef, toneMapped: false }),
  dark: new THREE.MeshStandardMaterial({ color: 0x171225, roughness: 0.72, metalness: 0.2 }),
  wing: new THREE.MeshPhysicalMaterial({ color: 0xb8b8ff, roughness: 0.17, metalness: 0.08, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  damp: new THREE.MeshBasicMaterial({ color: 0x75528c, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  bolt: new THREE.MeshBasicMaterial({ color: 0xa3a7ff, toneMapped: false })
});

const pickupMaterials = new Map(Object.entries(POWERUP_DEFINITIONS).map(([type, definition]) => [
  type,
  new THREE.MeshPhysicalMaterial({
    color: definition.color,
    roughness: 0.16,
    metalness: 0.12,
    transmission: 0.18,
    emissive: definition.color,
    emissiveIntensity: type === 'charge' ? 2.8 : 1.85,
    transparent: true,
    opacity: 0.94
  })
]));

function resetSurvival(snapshot = null) {
  const source = snapshot || DEFAULT_SURVIVAL;
  for (const key of Object.keys(DEFAULT_SURVIVAL)) {
    const fallback = DEFAULT_SURVIVAL[key];
    survival[key] = typeof source[key] === typeof fallback ? source[key] : fallback;
  }
  survival.health = THREE.MathUtils.clamp(survival.health, 0, survival.maxHealth);
  survival.shield = THREE.MathUtils.clamp(survival.shield, 0, 100);
  survival.charge = THREE.MathUtils.clamp(survival.charge, 0, MAX_CHARGE);
  survival.buffs.swiftspore = 0;
  survival.buffs.brightwrath = 0;
}

function serializeSurvival() {
  return Object.fromEntries(Object.keys(DEFAULT_SURVIVAL).map((key) => [key, survival[key]]));
}

function groundHeightAt(x, z) {
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  for (let y = WORLD_HEIGHT - 1; y >= 0; y -= 1) {
    if (isSolidType(world.get(cellX, y, cellZ))) return y;
  }
  return -1;
}

function clearObjectChildren(root) {
  while (root.children.length) root.remove(root.children[root.children.length - 1]);
}

function clearCombatEntities() {
  clearObjectChildren(enemyRoot);
  clearObjectChildren(projectileRoot);
  clearObjectChildren(pickupRoot);
  enemies.length = 0;
  projectiles.length = 0;
  pickups.length = 0;
  enemyTarget = null;
  enemyReadout.classList.remove('visible', 'active');
  enemyReadout.setAttribute('aria-hidden', 'true');
}

function tagEnemyVisual(group, id) {
  group.userData.enemyId = id;
  group.traverse((object) => {
    object.userData.enemyId = id;
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function addBox(group, material, position, scale, geometry = entityGeometry.smallCube) {
  const mesh = new THREE.Mesh(geometry, material.clone());
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
}

function createEnemyVisual(type, id) {
  const group = new THREE.Group();
  group.name = `${type}-${id}`;
  const shell = enemyMaterials[type];

  if (type === 'frayling') {
    addBox(group, shell, [0, 0.42, 0], [0.76, 0.42, 0.9], entityGeometry.softCube);
    addBox(group, enemyMaterials.dark, [0, 0.66, 0.32], [0.55, 0.36, 0.48]);
    for (const x of [-0.23, 0.23]) {
      for (const z of [-0.27, 0.27]) addBox(group, shell, [x, 0.16, z], [0.16, 0.34, 0.17]);
      addBox(group, enemyMaterials.eye, [x * 0.58, 0.72, 0.575], [0.09, 0.08, 0.05]);
    }
  } else if (type === 'hushwing') {
    const core = new THREE.Mesh(entityGeometry.shard, shell.clone());
    core.scale.set(0.76, 1.26, 0.72);
    group.add(core);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(entityGeometry.wing, enemyMaterials.wing.clone());
      wing.position.set(side * 0.66, 0.04, 0);
      wing.rotation.z = side * -Math.PI / 2;
      wing.scale.set(0.8, 1.04, 0.45);
      group.add(wing);
    }
    const ring = new THREE.Mesh(entityGeometry.ring, enemyMaterials.eye.clone());
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(1.05);
    group.add(ring);
    addBox(group, enemyMaterials.eye, [0, 0.03, 0.44], [0.12, 0.12, 0.08]);
  } else {
    addBox(group, shell, [0, 0.88, 0], [1.18, 1.52, 0.82], entityGeometry.softCube);
    addBox(group, enemyMaterials.dark, [0, 1.68, 0.06], [0.7, 0.48, 0.62]);
    addBox(group, shell, [-0.76, 1.12, 0], [0.42, 0.7, 0.66]);
    addBox(group, shell, [0.76, 1.12, 0], [0.42, 0.7, 0.66]);
    addBox(group, enemyMaterials.nullEye, [0, 0.95, 0.45], [0.3, 0.34, 0.08], entityGeometry.shard);
    const damp = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 12), enemyMaterials.damp.clone());
    damp.position.y = 0.92;
    group.add(damp);
  }
  return tagEnemyVisual(group, id);
}

const spawnOffsets = Object.freeze([
  [10, 0], [9, 5], [6, 9], [1, 11], [-5, 10], [-9, 6], [-11, 1], [-10, -5],
  [-6, -9], [0, -11], [6, -9], [10, -5], [13, 2], [-13, -2]
]);

function findSpawnPoint(serial, type, close = false) {
  const start = close ? [3.8, 0] : spawnOffsets[serial % spawnOffsets.length];
  for (let attempt = 0; attempt < spawnOffsets.length; attempt += 1) {
    const offset = attempt === 0 ? start : spawnOffsets[(serial + attempt) % spawnOffsets.length];
    const x = offset[0] + 0.5;
    const z = offset[1] + 0.5;
    const ground = groundHeightAt(x, z);
    if (ground < 4) continue;
    if (!close && Math.hypot(x - player.feet.x, z - player.feet.z) < 6) continue;
    return new THREE.Vector3(x, ground + (type === 'hushwing' ? 3.35 : 1.02), z);
  }
  const ground = groundHeightAt(7.5, 7.5);
  return new THREE.Vector3(7.5, Math.max(1, ground) + (type === 'hushwing' ? 3.35 : 1.02), 7.5);
}

function spawnEnemy(type, options = {}) {
  if (!ENEMY_DEFINITIONS[type] || enemies.length >= MAX_ENEMIES) return null;
  encounter.serial += 1;
  const id = `${type}-${encounter.serial}`;
  const group = createEnemyVisual(type, id);
  const position = options.position?.clone() || findSpawnPoint(encounter.serial, type, options.close === true);
  group.position.copy(position);
  enemyRoot.add(group);
  const definition = ENEMY_DEFINITIONS[type];
  const enemy = {
    id,
    type,
    definition,
    group,
    health: definition.health,
    maxHealth: definition.health,
    attackTimer: 0.35 + seededRandom(encounter.serial, 31) * 0.55,
    stun: 0,
    age: seededRandom(encounter.serial, 41) * 6,
    hitFlash: 0,
    dead: false
  };
  enemies.push(enemy);
  tone(type === 'nullbrute' ? 72 : type === 'hushwing' ? 210 : 108, 0.13, 0.018, type === 'hushwing' ? 'sine' : 'sawtooth');
  return enemy;
}

function removeEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  enemyRoot.remove(enemy.group);
  if (enemyTarget?.id === enemy.id) enemyTarget = null;
}

function createPickup(type, position, value = 1) {
  const definition = POWERUP_DEFINITIONS[type];
  if (!definition || pickups.length >= 20) return null;
  const group = new THREE.Group();
  const core = new THREE.Mesh(type === 'charge' ? entityGeometry.shard : entityGeometry.orb, pickupMaterials.get(type));
  core.scale.setScalar(type === 'charge' ? 0.42 : 0.36);
  group.add(core);
  const ring = new THREE.Mesh(entityGeometry.ring, pickupMaterials.get(type));
  ring.rotation.x = Math.PI / 2;
  ring.scale.setScalar(type === 'charge' ? 0.52 : 0.66);
  group.add(ring);
  group.position.copy(position).add(new THREE.Vector3(0, 0.45, 0));
  pickupRoot.add(group);
  const pickup = { type, value, group, age: 0, phase: seededRandom(encounter.serial + pickups.length, 71) * Math.PI * 2 };
  pickups.push(pickup);
  return pickup;
}

function deterministicPowerup(enemy) {
  if (enemy.type === 'nullbrute') return ['heartseed', 'wardbloom', 'swiftspore', 'brightwrath'][enemy.id.length % 4];
  const roll = seededRandom(encounter.serial + survival.kills * 13, 97);
  if (roll >= 0.38) return null;
  return ['heartseed', 'wardbloom', 'swiftspore', 'brightwrath'][Math.floor(roll * 100) % 4];
}

function defeatEnemy(enemy) {
  if (!enemy || enemy.dead) return;
  enemy.dead = true;
  const deathPosition = enemy.group.position.clone();
  const chargeValue = enemy.type === 'nullbrute' ? 5 : enemy.type === 'hushwing' ? 2 : 1;
  createPickup('charge', deathPosition, chargeValue);
  const powerup = deterministicPowerup(enemy);
  if (powerup) createPickup(powerup, deathPosition.clone().add(new THREE.Vector3(0.65, 0, 0)), 1);
  survival.kills += 1;
  survival.score += enemy.definition.score;
  removeEnemy(enemy);
  tone(enemy.type === 'nullbrute' ? 84 : 148, 0.24, 0.035, 'triangle');
  showToast(`${enemy.definition.label} UNRAVELED · +${enemy.definition.score}`);
  scheduleSave();
}

function flashHitMarker() {
  hitMarker.classList.remove('active');
  void hitMarker.offsetWidth;
  hitMarker.classList.add('active');
  hitMarkerTimer = 0.22;
}

function damageEnemy(enemy, damage, knockback = 0.35) {
  if (!enemy || enemy.dead) return false;
  enemy.health = Math.max(0, enemy.health - damage);
  enemy.stun = Math.max(enemy.stun, 0.14);
  enemy.hitFlash = 0.18;
  const away = enemy.group.position.clone().sub(player.feet).setY(0);
  if (away.lengthSq() > 0.001) {
    away.normalize().multiplyScalar(knockback);
    const next = enemy.group.position.clone().add(away);
    const ground = groundHeightAt(next.x, next.z);
    if (ground >= 0) {
      enemy.group.position.x = next.x;
      enemy.group.position.z = next.z;
      if (enemy.type !== 'hushwing') enemy.group.position.y = ground + 1.02;
    }
  }
  flashHitMarker();
  tone(enemy.health <= 0 ? 96 : 238, 0.075, 0.03, enemy.health <= 0 ? 'triangle' : 'square');
  if (enemy.health <= 0) defeatEnemy(enemy);
  return true;
}

function damagePlayer(amount) {
  if (damageCooldown > 0 || survival.health <= 0) return false;
  damageCooldown = 0.55;
  damageFreeTime = 0;
  const absorbed = Math.min(survival.shield, amount);
  survival.shield -= absorbed;
  survival.health = Math.max(0, survival.health - (amount - absorbed));
  damageFlash.classList.remove('active');
  void damageFlash.offsetWidth;
  damageFlash.classList.add('active');
  survivalHud.classList.add('alert');
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + 0.025, -1.48, 1.48);
  tone(76, 0.18, 0.045, 'sawtooth');
  if (survival.health <= 0) severLoom();
  return true;
}

function isInNetworkField(position = player.feet) {
  if (!networkAwake || networkDamped) return false;
  const radius = survival.networkRank >= 3 ? 6.5 : 5;
  return activeNetworkCells.some((cell) => Math.hypot(position.x - cell.x, position.z - cell.z) <= radius);
}

function refreshNetworkState() {
  const status = world.networkStatus();
  networkAwake = status.active;
  activeNetworkCells = [];
  for (const [key, type] of world.blocks) {
    if (type !== 'crystalActive' && type !== 'conduitActive') continue;
    const [x, y, z] = key.split(',').map(Number);
    activeNetworkCells.push(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
  }
  return status;
}

function clearProjectiles() {
  clearObjectChildren(projectileRoot);
  projectiles.length = 0;
}

function armSiege(wave = Math.max(1, survival.wave || 1), delay = 10) {
  if (survival.siegeComplete) return;
  clearCombatEntities();
  encounter.wave = THREE.MathUtils.clamp(wave, 1, SIEGE_WAVES.length);
  encounter.retryWave = encounter.wave;
  encounter.queue = [];
  encounter.phase = 'countdown';
  encounter.timer = delay;
  encounter.spawnTimer = 0;
  worldTime = 0.79;
  showToast(`THE DARK ANSWERS · WAVE ${encounter.wave} IN ${Math.ceil(delay)}`, 2800);
}

function beginWave(wave = encounter.wave || 1) {
  encounter.wave = THREE.MathUtils.clamp(wave, 1, SIEGE_WAVES.length);
  encounter.retryWave = encounter.wave;
  encounter.queue = [...SIEGE_WAVES[encounter.wave - 1].roster];
  encounter.phase = 'spawning';
  encounter.spawnTimer = 0;
  survival.wave = encounter.wave;
  showToast(`WAVE ${encounter.wave} · ${SIEGE_WAVES[encounter.wave - 1].name}`, 2600);
  tone(92, 0.5, 0.04, 'triangle');
}

const FIRST_CONTACT_LINEUP = Object.freeze([
  Object.freeze([-2.6, -2.2]),
  Object.freeze([0.5, -2.7]),
  Object.freeze([3.4, -1.6]),
  Object.freeze([-4.6, -5.2]),
  Object.freeze([4.8, -5.4])
]);

function stageVisibleFirstContact() {
  clearCombatEntities();
  spawnPlayer();
  camera.rotation.set(-0.035, 0, 0);
  syncCamera();
  worldTime = 0.79;

  encounter.wave = 1;
  encounter.retryWave = 1;
  encounter.queue = [];
  encounter.phase = 'active';
  encounter.spawnTimer = 0;
  survival.wave = 1;

  SIEGE_WAVES[0].roster.forEach((type, index) => {
    const [x, z] = FIRST_CONTACT_LINEUP[index];
    const ground = groundHeightAt(x, z);
    const position = ground >= 4
      ? new THREE.Vector3(x, ground + (type === 'hushwing' ? 3.35 : 1.02), z)
      : findSpawnPoint(index + 1, type, true);
    spawnEnemy(type, { position });
  });

  menuKicker.textContent = 'HOSTILES IN SIGHT · FIRST CONTACT';
  menuTitle.innerHTML = 'The dark is already here.';
  menuCopy.textContent = 'A Hushwing, a Nullbrute, and three Fraylings are directly ahead. Capture the mouse to enter the fight; connect the pylons during the siege to unlock healing and the lumen pulse.';
  enterWorldButton.querySelector('span').textContent = 'ENTER THE SIEGE';
  gateway.classList.add('visible', 'first-contact');
  document.body.classList.remove('playing');
  mouseStatus.textContent = 'MOUSE FREE · HOSTILES PAUSED';
  mouseDot.dataset.state = 'free';
  updateSurvivalHUD();
}

function finishWave() {
  clearProjectiles();
  const cleared = encounter.wave;
  survival.bestNight = Math.max(survival.bestNight, cleared);
  survival.score += cleared * 350;
  if (cleared === 1) {
    survival.networkRank = Math.max(survival.networkRank, 2);
    survival.maxHealth = Math.max(survival.maxHealth, 115);
    survival.health = Math.min(survival.maxHealth, survival.health + 15);
    showToast('NETWORK RANK II · VITALITY EXPANDED', 3000);
  } else if (cleared === 2) {
    survival.networkRank = Math.max(survival.networkRank, 3);
    showToast('NETWORK RANK III · STRIKE & FIELD AMPLIFIED', 3000);
  }
  if (cleared >= SIEGE_WAVES.length) {
    survival.siegeComplete = true;
    survival.dawnsHeld += 1;
    survival.night = Math.max(1, survival.night + 1);
    survival.wave = 3;
    encounter.phase = 'complete';
    worldTime = 0.235;
    showToast('DAWN HELD · THE ARCHIPELAGO REMEMBERS', 5200);
    tone(174, 0.9, 0.045, 'sine');
  } else {
    encounter.phase = 'intermission';
    encounter.timer = 8;
    survival.wave = cleared;
    const type = survival.health < survival.maxHealth * 0.6 ? 'heartseed' : ['wardbloom', 'swiftspore', 'brightwrath'][cleared % 3];
    createPickup(type, new THREE.Vector3(player.feet.x + 1.3, player.feet.y, player.feet.z), 1);
  }
  scheduleSave();
}

function severLoom() {
  const retry = Math.max(1, encounter.wave || encounter.retryWave || survival.wave || 1);
  clearCombatEntities();
  survival.health = survival.maxHealth;
  survival.shield = 0;
  survival.charge = 0;
  survival.buffs.swiftspore = 0;
  survival.buffs.brightwrath = 0;
  spawnPlayer();
  armSiege(retry, 3);
  menuKicker.textContent = 'LOOM SEVERED';
  menuTitle.innerHTML = 'The weave can<br />be taken back.';
  menuCopy.textContent = `Your blocks remain. Recapture the mouse to retry wave ${retry}; temporary boons and lumen charge were lost.`;
  if (controls.isLocked) controls.unlock();
  scheduleSave();
}

function spawnProjectile(enemy) {
  if (projectiles.length >= 12) return;
  const mesh = new THREE.Mesh(entityGeometry.bolt, enemyMaterials.bolt.clone());
  mesh.position.copy(enemy.group.position).add(new THREE.Vector3(0, 0.12, 0));
  const velocity = camera.position.clone().sub(mesh.position).normalize().multiplyScalar(enemy.definition.projectileSpeed || 9);
  projectileRoot.add(mesh);
  projectiles.push({ mesh, velocity, damage: enemy.definition.damage, age: 0 });
  tone(310, 0.08, 0.015, 'sine');
}

function tryGroundMove(enemy, direction, distance) {
  const next = enemy.group.position.clone().addScaledVector(direction, distance);
  const ground = groundHeightAt(next.x, next.z);
  const currentGround = groundHeightAt(enemy.group.position.x, enemy.group.position.z);
  if (ground < 0 || currentGround < 0 || Math.abs(ground - currentGround) > 1.05) return false;
  const footY = ground + 1;
  if (isSolidType(world.get(Math.floor(next.x), Math.floor(footY), Math.floor(next.z)))) return false;
  enemy.group.position.x = next.x;
  enemy.group.position.z = next.z;
  enemy.group.position.y = ground + 1.02;
  return true;
}

function simulateGroundEnemy(enemy, delta) {
  const toPlayer = player.feet.clone().sub(enemy.group.position).setY(0);
  const distance = toPlayer.length();
  if (distance <= enemy.definition.attackRange && Math.abs(player.feet.y - enemy.group.position.y) < 2.2) {
    if (enemy.attackTimer <= 0) {
      damagePlayer(enemy.definition.damage);
      enemy.attackTimer = enemy.definition.attackDelay;
    }
    return;
  }
  if (distance < 0.01) return;
  const direction = toPlayer.normalize();
  const slowed = networkAwake && !networkDamped && isInNetworkField(enemy.group.position) ? 0.8 : 1;
  const distanceStep = enemy.definition.speed * slowed * delta;
  if (!tryGroundMove(enemy, direction, distanceStep)) {
    const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar((enemy.id.length % 2 ? 1 : -1));
    if (!tryGroundMove(enemy, side, distanceStep)) tryGroundMove(enemy, direction.clone().multiplyScalar(-0.35), distanceStep);
  }
  enemy.group.lookAt(player.feet.x, enemy.group.position.y, player.feet.z);
}

function simulateHushwing(enemy, delta) {
  const toPlayer = player.feet.clone().add(new THREE.Vector3(0, 2.05, 0)).sub(enemy.group.position);
  const horizontal = new THREE.Vector3(toPlayer.x, 0, toPlayer.z);
  const distance = horizontal.length();
  const direction = distance > 0.01 ? horizontal.normalize() : new THREE.Vector3(1, 0, 0);
  const orbit = new THREE.Vector3(-direction.z, 0, direction.x);
  const radial = distance > 7.2 ? 1 : distance < 5.2 ? -0.8 : 0;
  const motion = direction.multiplyScalar(radial).addScaledVector(orbit, 0.45).normalize();
  const next = enemy.group.position.clone().addScaledVector(motion, enemy.definition.speed * delta);
  const ground = groundHeightAt(next.x, next.z);
  if (ground >= 0) {
    enemy.group.position.x = next.x;
    enemy.group.position.z = next.z;
  }
  const hoverY = player.feet.y + 2.2 + Math.sin(enemy.age * 2.3) * 0.4;
  enemy.group.position.y = THREE.MathUtils.lerp(enemy.group.position.y, hoverY, Math.min(1, delta * 2.8));
  enemy.group.lookAt(camera.position);
  if (distance < 9.5 && enemy.attackTimer <= 0) {
    spawnProjectile(enemy);
    enemy.attackTimer = enemy.definition.attackDelay;
  }
}

function simulateEnemies(delta) {
  networkDamped = activeNetworkCells.some((cell) => enemies.some((enemy) => (
    enemy.type === 'nullbrute' && !enemy.dead && Math.hypot(enemy.group.position.x - cell.x, enemy.group.position.z - cell.z) <= 5
  )));
  for (const enemy of [...enemies]) {
    enemy.age += delta;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
    enemy.stun = Math.max(0, enemy.stun - delta);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
    const pulse = 1 + Math.sin(enemy.age * (enemy.type === 'frayling' ? 7 : 3.2)) * 0.025;
    enemy.group.scale.setScalar(pulse + (enemy.hitFlash > 0 ? 0.08 : 0));
    if (enemy.type === 'hushwing') {
      enemy.group.rotation.z = Math.sin(enemy.age * 3.4) * 0.12;
    }
    if (enemy.stun > 0) continue;
    if (enemy.type === 'hushwing') simulateHushwing(enemy, delta);
    else simulateGroundEnemy(enemy, delta);
  }
}

function removeProjectile(projectile) {
  const index = projectiles.indexOf(projectile);
  if (index >= 0) projectiles.splice(index, 1);
  projectileRoot.remove(projectile.mesh);
}

function simulateProjectiles(delta) {
  for (const projectile of [...projectiles]) {
    projectile.age += delta;
    projectile.mesh.position.addScaledVector(projectile.velocity, delta);
    const { x, y, z } = projectile.mesh.position;
    if (isSolidType(world.get(Math.floor(x), Math.floor(y), Math.floor(z)))) {
      removeProjectile(projectile);
      continue;
    }
    if (projectile.mesh.position.distanceTo(camera.position) < 0.58) {
      damagePlayer(projectile.damage);
      removeProjectile(projectile);
      continue;
    }
    if (projectile.age > 3) removeProjectile(projectile);
  }
}

function collectPickup(pickup) {
  if (pickup.type === 'charge') survival.charge = Math.min(MAX_CHARGE, survival.charge + pickup.value);
  if (pickup.type === 'heartseed') {
    if (survival.health >= survival.maxHealth) survival.shield = Math.min(100, survival.shield + 15);
    else survival.health = Math.min(survival.maxHealth, survival.health + 30);
  }
  if (pickup.type === 'wardbloom') survival.shield = Math.min(100, survival.shield + 30);
  if (pickup.type === 'swiftspore') survival.buffs.swiftspore = 12;
  if (pickup.type === 'brightwrath') survival.buffs.brightwrath = 12;
  const definition = POWERUP_DEFINITIONS[pickup.type];
  tone(definition.tone, 0.14, 0.025, 'sine');
  showToast(`${definition.label} COLLECTED`);
  const index = pickups.indexOf(pickup);
  if (index >= 0) pickups.splice(index, 1);
  pickupRoot.remove(pickup.group);
  scheduleSave();
}

function simulatePickups(delta) {
  for (const pickup of [...pickups]) {
    pickup.age += delta;
    pickup.group.rotation.y += delta * 1.8;
    pickup.group.children[1].rotation.z += delta * 0.9;
    pickup.group.position.y += Math.sin(pickup.age * 3 + pickup.phase) * delta * 0.12;
    const distance = pickup.group.position.distanceTo(player.feet.clone().add(new THREE.Vector3(0, 0.8, 0)));
    if (distance < 4) {
      const magnet = player.feet.clone().add(new THREE.Vector3(0, 0.8, 0)).sub(pickup.group.position).normalize();
      pickup.group.position.addScaledVector(magnet, delta * (distance < 2 ? 7 : 3.4));
    }
    if (distance < 1.2) collectPickup(pickup);
    else if (pickup.age > 18) {
      const index = pickups.indexOf(pickup);
      if (index >= 0) pickups.splice(index, 1);
      pickupRoot.remove(pickup.group);
    }
  }
}

function simulateEncounter(delta) {
  if (!playing) return;
  attackCooldown = Math.max(0, attackCooldown - delta);
  pulseCooldown = Math.max(0, pulseCooldown - delta);
  damageCooldown = Math.max(0, damageCooldown - delta);
  damageFreeTime += delta;
  survival.buffs.swiftspore = Math.max(0, survival.buffs.swiftspore - delta);
  survival.buffs.brightwrath = Math.max(0, survival.buffs.brightwrath - delta);

  if (networkAwake && isInNetworkField() && damageFreeTime >= 3 && survival.health < survival.maxHealth) {
    survival.health = Math.min(survival.maxHealth, survival.health + delta * 2);
  }

  if (encounter.phase === 'countdown') {
    encounter.timer -= delta;
    if (encounter.timer <= 0) beginWave(encounter.wave);
  } else if (encounter.phase === 'spawning') {
    encounter.spawnTimer -= delta;
    if (encounter.queue.length && enemies.length < MAX_ENEMIES && encounter.spawnTimer <= 0) {
      spawnEnemy(encounter.queue.shift());
      encounter.spawnTimer = 1.25;
    }
    if (!encounter.queue.length) encounter.phase = 'active';
  } else if (encounter.phase === 'intermission') {
    encounter.timer -= delta;
    if (encounter.timer <= 0) beginWave(encounter.wave + 1);
  }

  simulateEnemies(delta);
  simulateProjectiles(delta);
  simulatePickups(delta);
  if (encounter.phase === 'active' && enemies.length === 0 && encounter.queue.length === 0) finishWave();
}

function primaryAction() {
  if (enemyTarget) {
    if (enemyTarget.distance > MELEE_RANGE) {
      showToast('HOSTILE BEYOND STRIKE RANGE', 800);
      return;
    }
    if (attackCooldown > 0) return;
    const quick = survival.buffs.swiftspore > 0;
    attackCooldown = quick ? 0.24 : 0.42;
    const base = survival.networkRank >= 3 ? 20 : 16;
    const damage = base * (survival.buffs.brightwrath > 0 ? 1.75 : 1);
    damageEnemy(enemyTarget.enemy, damage, 0.48);
    return;
  }
  mineTarget();
}

function releasePulse() {
  if (pulseCooldown > 0) return;
  if (survival.charge < MAX_CHARGE) {
    showToast(`LUMEN CHARGE ${Math.floor(survival.charge)}/${MAX_CHARGE}`);
    return;
  }
  if (!networkAwake || networkDamped || !isInNetworkField()) {
    showToast(networkDamped ? 'THE NULLBRUTE IS DAMPING THE WEAVE' : 'ENTER THE LIVE NETWORK FIELD');
    return;
  }
  survival.charge = 0;
  pulseCooldown = 0.8;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.88, 84),
    new THREE.MeshBasicMaterial({ color: 0x65d9d0, transparent: true, opacity: 0.98, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(player.feet).add(new THREE.Vector3(0, 0.12, 0));
  scene.add(ring);
  pulseEffects.push({ ring, age: 0 });
  for (const enemy of [...enemies]) {
    if (enemy.group.position.distanceTo(player.feet) <= PULSE_RADIUS) {
      enemy.stun = Math.max(enemy.stun, PULSE_STUN);
      damageEnemy(enemy, PULSE_DAMAGE, 1.15);
    }
  }
  tone(132, 0.78, 0.055, 'triangle');
  showToast('LUMEN PULSE RELEASED', 1800);
  scheduleSave();
}

function updateSurvivalHUD() {
  const healthPercent = THREE.MathUtils.clamp((survival.health / survival.maxHealth) * 100, 0, 100);
  healthFill.style.width = `${healthPercent}%`;
  healthValue.textContent = `${Math.ceil(survival.health)}`;
  healthFill.parentElement.setAttribute('aria-valuemax', `${survival.maxHealth}`);
  healthFill.parentElement.setAttribute('aria-valuenow', `${Math.ceil(survival.health)}`);
  shieldFill.style.width = `${THREE.MathUtils.clamp(survival.shield, 0, 100)}%`;
  shieldValue.textContent = `${Math.ceil(survival.shield)}`;
  shieldFill.parentElement.setAttribute('aria-valuenow', `${Math.ceil(survival.shield)}`);
  lumenFill.style.width = `${(survival.charge / MAX_CHARGE) * 100}%`;
  lumenValue.textContent = `${Math.floor(survival.charge)}/${MAX_CHARGE}`;
  lumenFill.parentElement.setAttribute('aria-valuemax', `${MAX_CHARGE}`);
  lumenFill.parentElement.setAttribute('aria-valuenow', `${Math.floor(survival.charge)}`);
  combatScore.textContent = String(Math.round(survival.score)).padStart(6, '0');
  combatKills.textContent = String(survival.kills).padStart(2, '0');

  const remaining = enemies.length + encounter.queue.length;
  if (encounter.phase === 'dormant') combatWave.textContent = 'DORMANT';
  else if (encounter.phase === 'complete') combatWave.textContent = 'DAWN HELD';
  else combatWave.textContent = `WAVE ${encounter.wave}/3`;
  combatRemaining.textContent = encounter.phase === 'countdown'
    ? `${Math.max(0, Math.ceil(encounter.timer))} SEC`
    : `${remaining} HOSTILE${remaining === 1 ? '' : 'S'}`;

  const buffs = [];
  if (survival.buffs.swiftspore > 0) buffs.push(`<span class="buff">SWIFT <time>${Math.ceil(survival.buffs.swiftspore)}s</time></span>`);
  if (survival.buffs.brightwrath > 0) buffs.push(`<span class="buff">WRATH <time>${Math.ceil(survival.buffs.brightwrath)}s</time></span>`);
  const markup = buffs.length ? buffs.join('') : '<span class="buff-empty">NO ACTIVE BOONS</span>';
  if (markup !== buffMarkup) {
    buffMarkup = markup;
    buffList.innerHTML = markup;
  }

  const pulseReady = survival.charge >= MAX_CHARGE && networkAwake && !networkDamped && isInNetworkField();
  pulseHint.classList.toggle('ready', pulseReady);
  pulseHint.querySelector('span').textContent = pulseReady
    ? 'PULSE READY · RELEASE THE WEAVE'
    : networkDamped
      ? 'WEAVE DAMPED BY NULLBRUTE'
      : !networkAwake
        ? 'Pulse unavailable · connect both pylons'
        : !isInNetworkField()
          ? 'Stand inside the live network field'
          : `Collect ${MAX_CHARGE - Math.floor(survival.charge)} more lumen`;
  survivalHud.classList.toggle('alert', survival.health < survival.maxHealth * 0.3 || ['spawning', 'active'].includes(encounter.phase));

  if (encounter.phase === 'countdown') objectiveText.textContent = `Lumen breach in ${Math.max(0, Math.ceil(encounter.timer))} · prepare the clearing`;
  else if (['spawning', 'active'].includes(encounter.phase)) objectiveText.textContent = `Lumen Siege · wave ${encounter.wave}/3 · ${remaining} remain`;
  else if (encounter.phase === 'intermission') objectiveText.textContent = `Wave ${encounter.wave} held · next breach in ${Math.ceil(encounter.timer)}`;
  else if (encounter.phase === 'complete') objectiveText.textContent = 'Dawn held · build freely across the living archipelago';
  else if (!networkAwake) objectiveText.textContent = 'Bridge the two lumen pylons with conduit';
  else objectiveText.textContent = 'Lumen network alive · the dark is listening';
}

const keys = new Set();
let selected = 0;
let worldTime = 0.294;
let target = null;
let playing = false;
let playRequested = false;
let toastTimer;
let saveTimer;
let resetArmed = false;
let resetTimer;
let audioContext;
const pulseEffects = [];

function showToast(message, duration = 1800) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), duration);
}

function tone(frequency, duration = 0.08, gain = 0.025, type = 'sine') {
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    volume.gain.setValueAtTime(gain, audioContext.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(volume).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is optional; gameplay stays intact when the host denies it.
  }
}

function createHotbar() {
  hotbarElement.replaceChildren();
  HOTBAR.forEach((type, index) => {
    const meta = BLOCK_META[type];
    const button = document.createElement('button');
    button.className = `slot${index === selected ? ' active' : ''}`;
    button.dataset.type = type;
    button.style.setProperty('--block-color', `#${meta.color.toString(16).padStart(6, '0')}`);
    button.setAttribute('aria-label', `${index + 1}: ${meta.label}`);
    button.innerHTML = `<small>${index + 1}</small><b></b>`;
    button.addEventListener('click', () => selectSlot(index));
    hotbarElement.append(button);
  });
  selectedName.textContent = BLOCK_META[HOTBAR[selected]].label;
}

function selectSlot(index) {
  selected = (index + HOTBAR.length) % HOTBAR.length;
  [...hotbarElement.children].forEach((element, slotIndex) => element.classList.toggle('active', slotIndex === selected));
  selectedName.textContent = BLOCK_META[HOTBAR[selected]].label;
  tone(320 + selected * 55, 0.055, 0.018);
}

function updateNetworkUI(status) {
  refreshNetworkState();
  signal.classList.toggle('active', status.active);
  signal.setAttribute('aria-label', status.active ? 'Lumen network live' : 'Lumen network dormant');
  updateSurvivalHUD();
}

function makeSavePayload() {
  return {
    version: 2,
    seed: WORLD_SEED,
    blocks: world.serialize(),
    player: {
      x: player.feet.x,
      y: player.feet.y,
      z: player.feet.z,
      yaw: camera.rotation.y,
      pitch: camera.rotation.x
    },
    selected,
    time: ((worldTime % 1) + 1) % 1,
    survival: serializeSurvival()
  };
}

async function saveGame({ silent = false } = {}) {
  saveStatus.textContent = 'SAVING…';
  saveDot.style.background = '#ffe58a';
  try {
    const result = await window.driftloom.saveWorld(makeSavePayload());
    saveStatus.textContent = 'SAVED LOCALLY';
    saveDot.style.background = '#68a47c';
    if (!silent) showToast('World folded safely into local memory');
    return result;
  } catch (error) {
    saveStatus.textContent = 'SAVE FAILED';
    saveDot.style.background = '#c85e64';
    if (!silent) showToast(`Save failed: ${error.message}`, 2600);
    throw error;
  }
}

function scheduleSave() {
  saveStatus.textContent = 'UNSAVED CHANGES';
  saveDot.style.background = '#ffe58a';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveGame({ silent: true }).catch(() => {}), 900);
}

function applySave(payload) {
  clearCombatEntities();
  world.deserialize(payload.blocks);
  player.feet.set(payload.player.x, payload.player.y, payload.player.z);
  player.velocityY = 0;
  camera.rotation.set(payload.player.pitch, payload.player.yaw, 0);
  selected = payload.selected;
  worldTime = payload.time;
  resetSurvival(payload.version >= 2 ? payload.survival : null);
  world.updateNetworks();
  rebuildWorld();
  createHotbar();
  syncCamera();
  refreshNetworkState();
  if (networkAwake) survival.networkRank = Math.max(1, survival.networkRank);
  if (networkAwake && !survival.siegeComplete) armSiege(Math.max(1, survival.wave || 1), 3);
  else encounter.phase = survival.siegeComplete ? 'complete' : 'dormant';
  updateSurvivalHUD();
}

async function loadGame({ silent = false } = {}) {
  const payload = await window.driftloom.loadWorld();
  if (!payload) {
    if (!silent) showToast('No local world save found');
    return null;
  }
  applySave(payload);
  saveStatus.textContent = 'SAVE LOADED';
  saveDot.style.background = '#68a47c';
  if (!silent) showToast('Local world restored');
  return payload;
}

function resetWorld() {
  clearCombatEntities();
  world.generate();
  selected = 0;
  worldTime = 0.294;
  resetSurvival();
  encounter.phase = 'dormant';
  encounter.wave = 0;
  encounter.queue = [];
  encounter.timer = 0;
  spawnPlayer();
  rebuildWorld();
  createHotbar();
  saveStatus.textContent = 'NEW SURVEY';
  saveDot.style.background = '#68a47c';
  refreshNetworkState();
  updateSurvivalHUD();
}

function makePulseEffect() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1.02, 80),
    new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.5, 10.08, -3.5);
  scene.add(ring);
  pulseEffects.push({ ring, age: 0 });
  tone(174, 0.8, 0.045, 'triangle');
  setTimeout(() => tone(348, 0.65, 0.035, 'sine'), 90);
  showToast('Lumen weave complete · dormant ground awakened', 3200);
}

function handleNetworkResult(result) {
  if (result.activated) {
    survival.networkRank = Math.max(survival.networkRank, 1);
    makePulseEffect();
  }
  updateNetworkUI({ active: result.activeNetworks > 0, activeCrystals: result.activeCrystals });
  if (result.activated && !survival.siegeComplete && encounter.phase === 'dormant') armSiege(1, 10);
}

const raycaster = new THREE.Raycaster();
raycaster.far = 6.5;
const center = new THREE.Vector2(0, 0);

function dominantNormal(normal) {
  const absolute = [Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)];
  const axis = absolute.indexOf(Math.max(...absolute));
  if (axis === 0) return { x: Math.sign(normal.x), y: 0, z: 0 };
  if (axis === 1) return { x: 0, y: Math.sign(normal.y), z: 0 };
  return { x: 0, y: 0, z: Math.sign(normal.z) };
}

function updateTarget() {
  raycaster.setFromCamera(center, camera);
  const enemyHits = raycaster.intersectObjects(enemyRoot.children, true);
  const enemyHit = enemyHits.find((candidate) => candidate.distance <= 6.5 && candidate.object.userData.enemyId);
  const hits = raycaster.intersectObjects([...blockMeshes.values()], false);
  const hit = hits.find((candidate) => candidate.distance <= 6.5 && candidate.instanceId !== undefined);
  const hitEnemy = enemyHit && (!hit || enemyHit.distance < hit.distance)
    ? enemies.find((enemy) => enemy.id === enemyHit.object.userData.enemyId)
    : null;

  if (hitEnemy) {
    enemyTarget = { id: hitEnemy.id, enemy: hitEnemy, distance: enemyHit.distance };
    target = null;
    selectionBox.visible = false;
    targetLabel.classList.remove('visible');
    reticle.classList.add('targeted');
    enemyName.textContent = hitEnemy.definition.label;
    enemyHealthFill.style.width = `${(hitEnemy.health / hitEnemy.maxHealth) * 100}%`;
    enemyReadout.classList.add('visible');
    enemyReadout.setAttribute('aria-hidden', 'false');
    return;
  }

  enemyTarget = null;
  enemyReadout.classList.remove('visible', 'active');
  enemyReadout.setAttribute('aria-hidden', 'true');
  if (!hit) {
    target = null;
    selectionBox.visible = false;
    targetLabel.classList.remove('visible');
    reticle.classList.remove('targeted');
    return;
  }

  const position = hit.object.userData.positions[hit.instanceId];
  const normal = dominantNormal(hit.face.normal);
  target = { ...position, normal, type: hit.object.userData.type };
  selectionBox.position.set(position.x + 0.5, position.y + 0.5, position.z + 0.5);
  selectionBox.visible = true;
  targetLabel.textContent = BLOCK_META[target.type].label.toUpperCase();
  targetLabel.classList.add('visible');
  reticle.classList.add('targeted');
}

function mineTarget() {
  if (!target || target.y <= 0) return;
  const removedType = target.type;
  world.set(target.x, target.y, target.z, null);
  const result = world.updateNetworks();
  rebuildWorld();
  handleNetworkResult(result);
  scheduleSave();
  tone(removedType.includes('crystal') ? 520 : 118, 0.09, 0.028, removedType.includes('crystal') ? 'sine' : 'square');
}

function placeBlock() {
  if (!target) return;
  const x = target.x + target.normal.x;
  const y = target.y + target.normal.y;
  const z = target.z + target.normal.z;
  const type = HOTBAR[selected];
  if (Math.abs(x) > WORLD_LIMIT + 8 || Math.abs(z) > WORLD_LIMIT + 8 || y < 0 || y >= WORLD_HEIGHT) {
    showToast('That edge cannot hold a block');
    return;
  }
  if (world.has(x, y, z)) return;
  if (isSolidType(type) && blockIntersectsPlayer(x, y, z)) {
    showToast('Step back before shaping that cell');
    return;
  }
  world.set(x, y, z, type);
  const result = world.updateNetworks();
  rebuildWorld();
  handleNetworkResult(result);
  scheduleSave();
  tone(type === 'conduit' ? 284 : 176, 0.075, 0.024, 'triangle');
}

function moveAxis(axis, amount) {
  if (amount === 0) return;
  const previous = player.feet[axis];
  player.feet[axis] += amount;
  if (playerCollides(player.feet)) {
    player.feet[axis] = previous;
    if (axis === 'y') {
      if (amount < 0) player.grounded = true;
      player.velocityY = 0;
    }
  } else if (axis === 'y' && amount < 0) {
    player.grounded = false;
  }
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const movement = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function simulatePlayer(delta) {
  if (!playing) return;
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, up).normalize();
  movement.set(0, 0, 0);
  if (keys.has('KeyW')) movement.add(forward);
  if (keys.has('KeyS')) movement.sub(forward);
  if (keys.has('KeyD')) movement.add(right);
  if (keys.has('KeyA')) movement.sub(right);
  if (movement.lengthSq() > 0) movement.normalize();
  const speedBoost = survival.buffs.swiftspore > 0 ? 1.35 : 1;
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9.5 : 6.2) * speedBoost;
  movement.multiplyScalar(speed * delta);

  player.velocityY -= 22 * delta;
  const maxDisplacement = Math.max(Math.abs(movement.x), Math.abs(movement.z), Math.abs(player.velocityY * delta));
  const steps = Math.max(1, Math.ceil(maxDisplacement / 0.22));
  for (let step = 0; step < steps; step += 1) {
    moveAxis('x', movement.x / steps);
    moveAxis('z', movement.z / steps);
    moveAxis('y', (player.velocityY * delta) / steps);
  }

  if (player.feet.y < -12 || Math.abs(player.feet.x) > 48 || Math.abs(player.feet.z) > 48) {
    spawnPlayer();
    damagePlayer(24);
    showToast('The mist returned you to the survey point');
  }
  syncCamera();
}

function updateSky(delta) {
  if (playing) worldTime = (worldTime + delta / 240) % 1;
  const angle = worldTime * Math.PI * 2 - Math.PI / 2;
  const sunHeight = Math.sin(angle);
  const daylight = THREE.MathUtils.smoothstep(sunHeight, -0.15, 0.72);
  const twilight = 1 - THREE.MathUtils.smoothstep(Math.abs(sunHeight), 0.08, 0.6);
  const nightColor = new THREE.Color(0x090d1d);
  const dawnColor = new THREE.Color(0x403352);
  const dayColor = new THREE.Color(0x7e9eaa);
  const skyColor = nightColor.clone().lerp(dayColor, daylight).lerp(dawnColor, twilight * 0.52);
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor).multiplyScalar(0.72);
  scene.fog.density = 0.013 + (1 - daylight) * 0.006;
  hemi.intensity = 0.55 + daylight * 1.15;
  hemi.color.set(0x9bd9d7).lerp(new THREE.Color(0xdce8dd), daylight);
  sun.intensity = 0.25 + daylight * 4.2;
  fill.intensity = 0.65 + (1 - daylight) * 0.65;
  mistMaterial.opacity = 0.38 + (1 - daylight) * 0.2;
  stars.material.opacity = 0.08 + (1 - daylight) * 0.88;

  const sunDistance = 85;
  sun.position.set(Math.cos(angle) * sunDistance, Math.sin(angle) * sunDistance, -28);
  skySun.position.copy(sun.position);
  moon.position.copy(sun.position).multiplyScalar(-1.08);
  skySun.visible = sunHeight > -0.16;
  moon.visible = sunHeight < 0.28;

  const totalMinutes = Math.floor(worldTime * 24 * 60);
  const hours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  clockLabel.textContent = `${hours}:${minutes}`;
}

function updatePulseEffects(delta) {
  for (let index = pulseEffects.length - 1; index >= 0; index -= 1) {
    const effect = pulseEffects[index];
    effect.age += delta;
    const scale = 1 + effect.age * 13;
    effect.ring.scale.setScalar(scale);
    effect.ring.material.opacity = Math.max(0, 0.95 - effect.age * 0.75);
    effect.ring.position.y += delta * 0.18;
    if (effect.age > 1.3) {
      scene.remove(effect.ring);
      effect.ring.geometry.dispose();
      effect.ring.material.dispose();
      pulseEffects.splice(index, 1);
    }
  }
}

function showPlayingState() {
  gateway.classList.remove('first-contact');
  gateway.classList.remove('visible');
  document.body.classList.add('playing');
  mouseStatus.textContent = 'MOUSE CAPTURED';
  mouseDot.dataset.state = 'captured';
  menuKicker.textContent = 'SURVEY PAUSED';
  menuTitle.innerHTML = 'The drift is waiting.';
  menuCopy.textContent = 'The mouse is free. Click or press Enter to recapture it; Escape releases it again.';
  enterWorldButton.querySelector('span').textContent = 'CAPTURE MOUSE & RESUME';
}

function enterPlay() {
  if (controls.isLocked || playRequested) return;
  playRequested = true;
  mouseStatus.textContent = 'CAPTURING…';
  mouseDot.dataset.state = 'requesting';
  enterWorldButton.querySelector('span').textContent = 'CAPTURING MOUSE…';
  controls.lock();
}

function leavePlay() {
  playRequested = false;
  playing = false;
  gateway.classList.add('visible');
  document.body.classList.remove('playing');
  mouseStatus.textContent = 'MOUSE FREE';
  mouseDot.dataset.state = 'free';
  enterWorldButton.querySelector('span').textContent = 'CAPTURE MOUSE & RESUME';
  keys.clear();
}

controls.addEventListener('lock', () => {
  playRequested = false;
  playing = true;
  showPlayingState();
});

controls.addEventListener('unlock', () => {
  if (playing || playRequested) leavePlay();
});

document.addEventListener('pointerlockerror', () => {
  setTimeout(() => {
    if (document.pointerLockElement === canvas) return;
    leavePlay();
    mouseStatus.textContent = 'CAPTURE BLOCKED';
    mouseDot.dataset.state = 'error';
    showToast('Mouse capture failed · click to try again');
  }, 0);
});

enterWorldButton.addEventListener('click', enterPlay);
gateway.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('button')) enterPlay();
});
saveButton.addEventListener('click', () => saveGame().catch(() => {}));
loadButton.addEventListener('click', () => loadGame().catch((error) => showToast(error.message)));
snapshotButton.addEventListener('click', async () => {
  try {
    const result = await window.driftloom.saveSnapshot(renderer.domElement.toDataURL('image/png'));
    if (!result.canceled) showToast('Image saved');
  } catch (error) {
    showToast(`Image failed: ${error.message}`);
  }
});
resetButton.addEventListener('click', async () => {
  if (!resetArmed) {
    resetArmed = true;
    resetButton.textContent = 'Confirm reset';
    showToast('Reset removes the local world save');
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      resetArmed = false;
      resetButton.textContent = 'Reset';
    }, 3500);
    return;
  }
  await window.driftloom.deleteWorld();
  resetWorld();
  resetArmed = false;
  resetButton.textContent = 'Reset';
  showToast('A fresh archipelago has unfolded');
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && !playing) {
    enterPlay();
    return;
  }
  if (event.code.startsWith('Digit')) {
    const index = Number(event.code.slice(5)) - 1;
    if (index >= 0 && index < HOTBAR.length) selectSlot(index);
  }
  if (event.code === 'Space' && playing && player.grounded) {
    player.velocityY = 8.15;
    player.grounded = false;
    tone(210, 0.07, 0.016, 'triangle');
  }
  if (event.code === 'KeyR' && playing) {
    spawnPlayer();
    showToast('Returned to survey point');
  }
  if (event.code === 'KeyQ' && playing && !event.repeat) releasePulse();
  if ((event.metaKey || event.ctrlKey) && event.code === 'KeyS') {
    event.preventDefault();
    saveGame().catch(() => {});
  }
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  keys.clear();
  if (controls.isLocked) controls.unlock();
});
window.addEventListener('wheel', (event) => {
  if (!playing) return;
  selectSlot(selected + (event.deltaY > 0 ? 1 : -1));
}, { passive: true });
window.addEventListener('mousedown', (event) => {
  if (!playing) return;
  if (event.button === 0) primaryAction();
  if (event.button === 2) placeBlock();
});
window.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let lastTime = performance.now();
let accumulator = 0;
const FIXED_STEP = 1 / 60;

function animate(now) {
  requestAnimationFrame(animate);
  const frameDelta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += frameDelta;
  while (accumulator >= FIXED_STEP) {
    simulatePlayer(FIXED_STEP);
    simulateEncounter(FIXED_STEP);
    accumulator -= FIXED_STEP;
  }
  updateSky(frameDelta);
  updateTarget();
  updatePulseEffects(frameDelta);
  updateSurvivalHUD();
  driftDust.rotation.y += frameDelta * 0.006;
  stars.rotation.y -= frameDelta * 0.0018;
  mist.position.y = 1.38 + Math.sin(now * 0.00024) * 0.08;
  coordinates.textContent = `${Math.floor(player.feet.x)} · ${Math.floor(player.feet.y)} · ${Math.floor(player.feet.z)}`;
  renderer.render(scene, camera);
}

async function runSmoke() {
  const checks = [];
  const pristineBlocks = world.serialize();
  const pristinePlayer = player.feet.clone();
  const pristineTime = worldTime;
  const pristineSurvival = serializeSurvival();
  const pristineFingerprint = world.fingerprint();

  checks.push({ name: 'terrain-generated', pass: world.blocks.size > 2000, detail: world.blocks.size });
  checks.push({ name: 'spawn-clear', pass: !playerCollides(player.feet), detail: player.feet.toArray() });
  checks.push({ name: 'ground-solid', pass: isSolidType(world.get(0, 9, 4)), detail: world.get(0, 9, 4) });

  const edit = { x: 28, y: 24, z: 28 };
  const beforeEdit = world.get(edit.x, edit.y, edit.z);
  world.set(edit.x, edit.y, edit.z, 'moss');
  checks.push({ name: 'place-block', pass: world.get(edit.x, edit.y, edit.z) === 'moss' });
  world.set(edit.x, edit.y, edit.z, null);
  checks.push({ name: 'mine-block', pass: world.get(edit.x, edit.y, edit.z) === null });
  if (beforeEdit) world.set(edit.x, edit.y, edit.z, beforeEdit);

  for (let x = -2; x <= 2; x += 1) world.set(x, 10, -4, 'conduit');
  const network = world.updateNetworks();
  checks.push({ name: 'lumen-network', pass: network.activeNetworks >= 1 && world.get(-3, 10, -4) === 'crystalActive', detail: network });

  checks.push({
    name: 'wave-compositions',
    pass: JSON.stringify(SIEGE_WAVES.map((wave) => wave.roster.length)) === JSON.stringify([5, 7, 7]),
    detail: SIEGE_WAVES.map((wave) => wave.roster.length)
  });
  checks.push({
    name: 'first-contact-shows-all-hostile-classes',
    pass: ['frayling', 'hushwing', 'nullbrute'].every((type) => SIEGE_WAVES[0].roster.includes(type)),
    detail: SIEGE_WAVES[0].roster
  });
  checks.push({
    name: 'wave-three-roster',
    pass: SIEGE_WAVES[2].roster.filter((type) => type === 'frayling').length === 4 &&
      SIEGE_WAVES[2].roster.filter((type) => type === 'hushwing').length === 2 &&
      SIEGE_WAVES[2].roster.filter((type) => type === 'nullbrute').length === 1,
    detail: SIEGE_WAVES[2].roster
  });

  clearCombatEntities();
  const specimenTypes = ['frayling', 'hushwing', 'nullbrute'];
  const specimens = specimenTypes.map((type, index) => spawnEnemy(type, {
    position: new THREE.Vector3(index * 2 - 2, type === 'hushwing' ? 13.35 : 10.02, -1)
  }));
  checks.push({
    name: 'three-distinct-hostiles',
    pass: specimens.every(Boolean) && new Set(specimens.map((enemy) => enemy.group.children.length)).size === 3,
    detail: specimens.map((enemy) => [enemy.type, enemy.group.children.length])
  });
  for (let index = 0; index < 10; index += 1) spawnEnemy('frayling');
  checks.push({ name: 'enemy-cap', pass: enemies.length === MAX_ENEMIES, detail: enemies.length });
  clearCombatEntities();

  resetSurvival({ ...DEFAULT_SURVIVAL, health: 60, shield: 10 });
  damageCooldown = 0;
  const firstDamage = damagePlayer(8);
  const repeatedDamage = damagePlayer(8);
  checks.push({
    name: 'damage-immunity',
    pass: firstDamage && !repeatedDamage && survival.health === 60 && survival.shield === 2,
    detail: { health: survival.health, shield: survival.shield, firstDamage, repeatedDamage }
  });

  const pickupPosition = player.feet.clone();
  survival.health = 50;
  collectPickup(createPickup('heartseed', pickupPosition));
  collectPickup(createPickup('wardbloom', pickupPosition));
  collectPickup(createPickup('swiftspore', pickupPosition));
  collectPickup(createPickup('brightwrath', pickupPosition));
  collectPickup(createPickup('charge', pickupPosition, 8));
  checks.push({
    name: 'powerups-apply',
    pass: survival.health === 80 && survival.shield === 32 && survival.charge === 8 &&
      survival.buffs.swiftspore === 12 && survival.buffs.brightwrath === 12,
    detail: { health: survival.health, shield: survival.shield, charge: survival.charge, buffs: { ...survival.buffs } }
  });

  networkAwake = true;
  networkDamped = false;
  activeNetworkCells = [player.feet.clone()];
  pulseCooldown = 0;
  const pulseTarget = spawnEnemy('frayling', { position: player.feet.clone().add(new THREE.Vector3(2, 0, 0)) });
  releasePulse();
  checks.push({
    name: 'lumen-pulse',
    pass: survival.charge === 0 && pulseTarget.dead && !enemies.includes(pulseTarget),
    detail: { charge: survival.charge, defeated: pulseTarget.dead }
  });

  clearCombatEntities();
  const pausedEnemy = spawnEnemy('frayling', { position: player.feet.clone().add(new THREE.Vector3(4, 0, 0)) });
  const pausedPosition = pausedEnemy.group.position.clone();
  playing = false;
  encounter.phase = 'active';
  simulateEncounter(1);
  checks.push({ name: 'pause-freezes-hostiles', pass: pausedEnemy.group.position.equals(pausedPosition), detail: pausedEnemy.group.position.toArray() });
  clearCombatEntities();

  world.deserialize(pristineBlocks);
  player.feet.copy(pristinePlayer);
  worldTime = pristineTime;
  resetSurvival({ ...pristineSurvival, health: 73, shield: 11, charge: 5, kills: 9, score: 1234 });
  encounter.phase = 'dormant';
  await saveGame({ silent: true });
  world.set(28, 24, 28, 'moss');
  const loaded = await window.driftloom.loadWorld();
  world.deserialize(loaded.blocks);
  checks.push({ name: 'save-roundtrip', pass: world.fingerprint() === pristineFingerprint, detail: world.fingerprint() });
  checks.push({
    name: 'survival-save-roundtrip',
    pass: loaded.version === 2 && loaded.survival.health === 73 && loaded.survival.charge === 5 && loaded.survival.kills === 9,
    detail: loaded.survival
  });
  resetSurvival();
  checks.push({
    name: 'legacy-save-defaults',
    pass: survival.health === 100 && survival.charge === 0 && survival.kills === 0 && survival.siegeComplete === false,
    detail: serializeSurvival()
  });

  const beforeTime = worldTime;
  worldTime = (worldTime + 0.01) % 1;
  checks.push({ name: 'time-advances', pass: worldTime !== beforeTime, detail: [beforeTime, worldTime] });

  clearTimeout(saveTimer);
  await window.driftloom.deleteWorld();
  return {
    ok: checks.every((check) => check.pass),
    seed: WORLD_SEED,
    fingerprint: pristineFingerprint,
    checks
  };
}

function setupShowcase() {
  for (let x = -2; x <= 2; x += 1) world.set(x, 10, -4, 'conduit');
  world.updateNetworks();
  rebuildWorld();
  refreshNetworkState();
  clearCombatEntities();
  resetSurvival({
    ...DEFAULT_SURVIVAL,
    health: 78,
    shield: 32,
    charge: 8,
    score: 2480,
    kills: 14,
    wave: 3,
    networkRank: 3
  });
  encounter.phase = 'active';
  encounter.wave = 3;
  encounter.queue = [];
  const groundAt = (x, z, flying = false) => groundHeightAt(x, z) + (flying ? 3.35 : 1.02);
  spawnEnemy('hushwing', { position: new THREE.Vector3(-2.6, groundAt(-2.6, -2.2, true), -2.2) });
  spawnEnemy('nullbrute', { position: new THREE.Vector3(0.5, groundAt(0.5, -2.7), -2.7) });
  spawnEnemy('frayling', { position: new THREE.Vector3(3.4, groundAt(3.4, -1.6), -1.6) });
  createPickup('heartseed', new THREE.Vector3(-1.1, 10.05, 1.2));
  createPickup('swiftspore', new THREE.Vector3(2.0, 10.05, 1.0));
  worldTime = 0.81;
  spawnPlayer();
  camera.rotation.set(-0.035, 0, 0);
  syncCamera();
  playing = false;
  gateway.classList.remove('visible');
  document.body.classList.add('playing');
  mouseStatus.textContent = 'SHOWCASE · SIMULATION PAUSED';
  mouseDot.dataset.state = 'captured';
  updateSurvivalHUD();
}

async function initialize() {
  createHotbar();
  spawnPlayer();
  if (qaMode || showcaseMode) {
    await window.driftloom.deleteWorld();
  } else {
    const saved = await window.driftloom.loadWorld();
    if (saved) {
      applySave(saved);
      saveStatus.textContent = 'SAVE RESTORED';
    }
  }
  world.updateNetworks();
  rebuildWorld();
  syncCamera();
  updateSky(0);
  if (showcaseMode) setupShowcase();
  else if (!qaMode && !survival.siegeComplete) stageVisibleFirstContact();
  document.documentElement.dataset.ready = 'true';
  if (qaMode || showcaseMode) window.__DRIFTLOOM_QA__ = {
    runSmoke,
    resumeSimulation: () => { playing = true; },
    pauseSimulation: () => { playing = false; },
    state: () => ({
      encounter: { phase: encounter.phase, wave: encounter.wave, queued: encounter.queue.length },
      survival: serializeSurvival(),
      enemies: enemies.map((enemy) => ({ id: enemy.id, type: enemy.type, health: enemy.health, position: enemy.group.position.toArray() })),
      projectiles: projectiles.length,
      pickups: pickups.map((pickup) => pickup.type),
      networkAwake,
      networkDamped,
      playing
    })
  };
  requestAnimationFrame(animate);
}

initialize().catch((error) => {
  console.error(error);
  menuTitle.textContent = 'The world failed to unfold.';
  menuCopy.textContent = error.message;
});
