// Preload for engine/sims/capture.mjs: launch Chromium with software WebGL (SwiftShader) when the shell cannot
// reach the GPU. Use: node --import examples/m1pro/tools/swgl.mjs engine/sims/capture.mjs ...
import {createRequire} from 'node:module';
const require = createRequire(new URL('../../../engine/x.js', import.meta.url));
const {chromium} = require('playwright');
const launch = chromium.launch.bind(chromium);
chromium.launch = (opts = {}) =>
  launch({...opts, args: [...(opts.args || []).filter((a) => !a.startsWith('--use-angle')), '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
