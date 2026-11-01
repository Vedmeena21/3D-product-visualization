// Where things live, and the knobs you can set from the environment.
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(ENGINE, '..');
export const MODULES = process.env.PV_MODULES || path.join(ENGINE, 'node_modules');
export const OUT = path.resolve(process.env.PV_OUT || 'out');
export const DIST = path.join(OUT, 'dist');
export const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// import 'rig/…' in a scene resolves to engine/web/…
export const RIG_PREFIX = 'rig/';
export const RIG_DIR = path.join(ENGINE, 'web');

export const need = (id) => createRequire(path.join(MODULES, 'x.js'))(id);

// GPU WebGL by default; on Windows ask ANGLE for D3D11 so a discrete GPU wins over the integrated one.
export const BROWSER_ARGS = [
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  '--hide-scrollbars',
];
