const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const IS_QA = process.argv.includes('--qa-smoke');
const IS_SHOWCASE = process.argv.includes('--qa-showcase');
const IS_SIMULATION = process.argv.includes('--qa-simulate');
const IS_CAPTURE = process.argv.includes('--qa-capture');
const IS_ISOLATED = IS_QA || IS_SHOWCASE || IS_SIMULATION || IS_CAPTURE;
const ALLOWED_FILES = new Set([
  'index.html',
  'styles.css',
  'renderer.mjs',
  'world.mjs',
  'gameplay.mjs'
]);
const ALLOWED_PREFIXES = ['node_modules/three/'];
const BLOCK_TYPES = new Set([
  'driftstone', 'silt', 'moss', 'chalk', 'emberglass', 'crystal',
  'conduit', 'crystalActive', 'conduitActive', 'wood', 'canopy'
]);

let server;
let serverOrigin;
let mainWindow;
let saveChain = Promise.resolve();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm'
};

function normalizeRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  } catch {
    return null;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!ALLOWED_FILES.has(relativePath) && !ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return null;
  }

  const resolved = path.resolve(ROOT, relativePath);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) return null;
  return resolved;
}

function startLocalServer() {
  if (server) return Promise.resolve(Number(new URL(serverOrigin).port));

  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      if (!['GET', 'HEAD'].includes(request.method || '')) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
        return;
      }

      const filePath = normalizeRequestPath(request.url);
      if (!filePath) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      fs.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
          response.writeHead(404).end('Not found');
          return;
        }

        response.writeHead(200, {
          'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'no-referrer'
        });

        if (request.method === 'HEAD') {
          response.end();
          return;
        }
        fs.createReadStream(filePath).pipe(response);
      });
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      serverOrigin = `http://127.0.0.1:${port}`;
      resolve(port);
    });
  });
}

function assertTrustedSender(event) {
  const frameUrl = event.senderFrame?.url;
  if (!frameUrl || new URL(frameUrl).origin !== serverOrigin) {
    throw new Error('Untrusted IPC sender.');
  }
}

function saveFilePath() {
  const fileName = IS_ISOLATED ? 'driftloom-qa-world-v1.json' : 'driftloom-world-v1.json';
  return path.join(app.getPath('userData'), fileName);
}

const SURVIVAL_FIELDS = new Set([
  'health', 'maxHealth', 'shield', 'charge', 'score', 'kills', 'night', 'wave',
  'networkRank', 'dawnsHeld', 'bestNight', 'siegeComplete'
]);

function validateSurvival(survival) {
  if (survival === undefined) return;
  if (!survival || typeof survival !== 'object' || Array.isArray(survival)) {
    throw new Error('Invalid survival state.');
  }

  for (const key of Object.keys(survival)) {
    if (!SURVIVAL_FIELDS.has(key)) throw new Error('Unknown survival field.');
  }

  const boundedNumber = (key, min, max) => {
    if (survival[key] === undefined) return;
    if (!Number.isFinite(survival[key]) || survival[key] < min || survival[key] > max) {
      throw new Error(`Invalid survival ${key}.`);
    }
  };
  const boundedInteger = (key, min, max) => {
    boundedNumber(key, min, max);
    if (survival[key] !== undefined && !Number.isInteger(survival[key])) {
      throw new Error(`Invalid survival ${key}.`);
    }
  };

  boundedNumber('maxHealth', 1, 500);
  boundedNumber('health', 0, 500);
  boundedNumber('shield', 0, 500);
  boundedNumber('charge', 0, 8);
  boundedInteger('score', 0, 1_000_000_000);
  boundedInteger('kills', 0, 1_000_000);
  boundedInteger('night', 0, 10_000);
  boundedInteger('wave', 0, 3);
  boundedInteger('networkRank', 0, 3);
  boundedInteger('dawnsHeld', 0, 10_000);
  boundedInteger('bestNight', 0, 10_000);

  if (survival.health !== undefined && survival.maxHealth !== undefined && survival.health > survival.maxHealth) {
    throw new Error('Survival health exceeds maximum.');
  }
  if (survival.siegeComplete !== undefined && typeof survival.siegeComplete !== 'boolean') {
    throw new Error('Invalid survival siegeComplete.');
  }
}

function validateWorld(payload) {
  if (!payload || typeof payload !== 'object' || ![1, 2].includes(payload.version)) {
    throw new Error('Unsupported world schema.');
  }
  if (payload.seed !== 'DRIFTLOOM-01') throw new Error('Unexpected world seed.');
  if (!Array.isArray(payload.blocks) || payload.blocks.length < 1 || payload.blocks.length > 30000) {
    throw new Error('Invalid block list.');
  }

  for (const block of payload.blocks) {
    if (!Array.isArray(block) || block.length !== 4) throw new Error('Malformed block tuple.');
    const [x, y, z, type] = block;
    if (![x, y, z].every(Number.isInteger)) throw new Error('Non-integer block coordinate.');
    if (x < -48 || x > 48 || z < -48 || z > 48 || y < 0 || y > 31) throw new Error('Block outside world bounds.');
    if (!BLOCK_TYPES.has(type)) throw new Error('Unknown block type.');
  }

  const player = payload.player;
  if (!player || !['x', 'y', 'z', 'yaw', 'pitch'].every((key) => Number.isFinite(player[key]))) {
    throw new Error('Invalid player state.');
  }
  if (Math.abs(player.x) > 64 || Math.abs(player.z) > 64 || player.y < -20 || player.y > 50) {
    throw new Error('Player outside safe bounds.');
  }
  if (!Number.isInteger(payload.selected) || payload.selected < 0 || payload.selected > 4) {
    throw new Error('Invalid hotbar selection.');
  }
  if (!Number.isFinite(payload.time) || payload.time < 0 || payload.time >= 1) {
    throw new Error('Invalid world time.');
  }
  if (payload.version === 1 && payload.survival !== undefined) {
    throw new Error('Survival state requires world schema 2.');
  }
  if (payload.version === 2) validateSurvival(payload.survival);

  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json, 'utf8') > 2 * 1024 * 1024) throw new Error('World save is too large.');
  return json;
}

ipcMain.handle('world:save', async (event, payload) => {
  assertTrustedSender(event);
  const json = validateWorld(payload);
  const destination = saveFilePath();
  const queuedSave = async () => {
    const temporary = `${destination}.${process.pid}.tmp`;
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.writeFile(temporary, json, { encoding: 'utf8', mode: 0o600 });
    await fs.promises.rename(temporary, destination);
    return { ok: true, savedAt: new Date().toISOString() };
  };
  const result = saveChain.then(queuedSave, queuedSave);
  saveChain = result.catch(() => {});
  return result;
});

ipcMain.handle('world:load', async (event) => {
  assertTrustedSender(event);
  await saveChain;
  try {
    const payload = JSON.parse(await fs.promises.readFile(saveFilePath(), 'utf8'));
    validateWorld(payload);
    return payload;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    console.error(`[save:load] ${error.message}`);
    return null;
  }
});

ipcMain.handle('world:delete', async (event) => {
  assertTrustedSender(event);
  await saveChain;
  try {
    await fs.promises.unlink(saveFilePath());
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { ok: true };
});

ipcMain.handle('snapshot:save', async (event, dataUrl) => {
  assertTrustedSender(event);
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Snapshot data was not a PNG.');
  }
  const data = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  if (data.length > 24 * 1024 * 1024) throw new Error('Snapshot is too large.');

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Driftloom image',
    defaultPath: 'driftloom-world.png',
    filters: [{ name: 'PNG image', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.promises.writeFile(result.filePath, data);
  return { canceled: false, filePath: result.filePath };
});

async function runQaSmoke(window) {
  try {
    const result = await window.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(async () => {
          if (window.__DRIFTLOOM_QA__) {
            clearInterval(timer);
            try { resolve(await window.__DRIFTLOOM_QA__.runSmoke()); }
            catch (error) { reject(error); }
          } else if (Date.now() - started > 15000) {
            clearInterval(timer);
            reject(new Error('QA bridge timeout'));
          }
        }, 50);
      })
    `, true);
    console.log(`DRIFTLOOM_QA_RESULT ${JSON.stringify(result)}`);
    app.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(`DRIFTLOOM_QA_FAILURE ${error.stack || error.message}`);
    app.exit(1);
  }
}

async function runQaSimulation(window) {
  try {
    const result = await window.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (window.__DRIFTLOOM_QA__) {
            clearInterval(timer);
            const before = window.__DRIFTLOOM_QA__.state();
            window.__DRIFTLOOM_QA__.resumeSimulation();
            setTimeout(() => {
              window.__DRIFTLOOM_QA__.pauseSimulation();
              const after = window.__DRIFTLOOM_QA__.state();
              resolve({ before, after });
            }, 2400);
          } else if (Date.now() - started > 15000) {
            clearInterval(timer);
            reject(new Error('Simulation bridge timeout'));
          }
        }, 50);
      })
    `, true);
    const moved = result.after.enemies.some((enemy, index) => (
      JSON.stringify(enemy.position) !== JSON.stringify(result.before.enemies[index]?.position)
    ));
    const changed = moved || result.after.projectiles !== result.before.projectiles ||
      result.after.survival.health !== result.before.survival.health ||
      result.after.survival.shield !== result.before.survival.shield;
    console.log(`DRIFTLOOM_SIMULATION_RESULT ${JSON.stringify({ ok: changed, moved, ...result })}`);
    app.exit(changed ? 0 : 1);
  } catch (error) {
    console.error(`DRIFTLOOM_SIMULATION_FAILURE ${error.stack || error.message}`);
    app.exit(1);
  }
}

async function runQaCapture(window) {
  try {
    await window.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (window.__DRIFTLOOM_QA__) {
            clearInterval(timer);
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          } else if (Date.now() - started > 15000) {
            clearInterval(timer);
            reject(new Error('Capture bridge timeout'));
          }
        }, 50);
      })
    `, true);
    const image = await window.webContents.capturePage();
    const destination = '/tmp/driftloom-final-packaged.png';
    await fs.promises.writeFile(destination, image.toPNG());
    console.log(`DRIFTLOOM_CAPTURE_RESULT ${JSON.stringify({ ok: !image.isEmpty(), destination, size: image.getSize() })}`);
    app.exit(image.isEmpty() ? 1 : 0);
  } catch (error) {
    console.error(`DRIFTLOOM_CAPTURE_FAILURE ${error.stack || error.message}`);
    app.exit(1);
  }
}

async function createWindow() {
  await startLocalServer();
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0a1020',
    title: 'Driftloom',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const gameSession = mainWindow.webContents.session;
  const isGameOrigin = (value) => {
    try {
      return new URL(value).origin === serverOrigin;
    } catch {
      return false;
    }
  };
  gameSession.setPermissionCheckHandler((contents, permission, requestingOrigin, details) => (
    permission === 'pointerLock' &&
    contents === mainWindow?.webContents &&
    details.isMainFrame === true &&
    isGameOrigin(requestingOrigin) &&
    (!details.requestingUrl || isGameOrigin(details.requestingUrl))
  ));
  gameSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(
      permission === 'pointerLock' &&
      contents === mainWindow?.webContents &&
      details.isMainFrame === true &&
      isGameOrigin(details.requestingUrl)
    );
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== serverOrigin) event.preventDefault();
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const method = level >= 2 ? 'error' : 'log';
    console[method](`[renderer:${level}] ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`[renderer:load-failed] ${code} ${description} ${url}`);
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  if (!IS_QA && !IS_SIMULATION && !IS_CAPTURE) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }
  if (IS_QA) mainWindow.webContents.once('did-finish-load', () => runQaSmoke(mainWindow));
  if (IS_SIMULATION) {
    mainWindow.once('ready-to-show', () => mainWindow.showInactive());
    mainWindow.webContents.once('did-finish-load', () => runQaSimulation(mainWindow));
  }
  if (IS_CAPTURE) {
    mainWindow.once('ready-to-show', () => mainWindow.showInactive());
    mainWindow.webContents.once('did-finish-load', () => runQaCapture(mainWindow));
  }

  const modeQuery = IS_QA ? '?qa=1' : IS_SHOWCASE || IS_SIMULATION || IS_CAPTURE ? '?showcase=1' : '';
  await mainWindow.loadURL(`${serverOrigin}/index.html${modeQuery}`);
}

app.setName('Driftloom');
app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  if (server) server.close();
});
