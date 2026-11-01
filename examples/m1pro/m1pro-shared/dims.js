// Every number the GravaStar Mercury M1 Pro simulator uses, with where it came from. Lengths in millimetres.
// Tiers: OFFICIAL (gravastar.com / driver guide), DATASHEET (PixArt, Omron, Nordic), FCC (FCC ID 2ASXF-M1 internal
// photos), TRACED (measured off the official renders or the FCC photos, ±1.5 mm), ASSUMED (unpublished; labelled).
// Full sources: references/gravastar-m1-pro/REFERENCES.md and fcc/map/PCB-MAP.md.

export const SPEC = {
  length: 124, // OFFICIAL
  width: 64.5, // OFFICIAL
  height: 39.5, // OFFICIAL
  mass: 88, // g, OFFICIAL (the FAQ's "79 g" row belongs to the M2)
  dpiMax: 26000, // DATASHEET PAW3395
  ipsMax: 650, // DATASHEET
  gMax: 50, // DATASHEET
  dpiPresets: [800, 1200, 1600, 2400, 3200, 6400], // OFFICIAL FAQ, generic Mercury answer
  dpiDefault: 1600, // OFFICIAL driver guide
  lod: [1, 2], // OFFICIAL driver guide, default 1 mm
  debounce: 8, // ms, OFFICIAL driver guide default (0..19)
  price: 99.95,
};

// the four links: report rate (Hz), vendor latency (ms), rated battery life (h, LEDs off)
export const LINKS = {
  k1: {name: '2.4G 1K', rate: 1000, latency: 1.0, life: 146, note: 'IN THE BOX'},
  k4: {name: '2.4G 4K', rate: 4000, latency: 0.25, life: 36, note: '$18.95 4K RECEIVER'},
  bt: {name: 'BT 5.1', rate: 125, latency: 20, life: 200, note: '125 HZ'},
  usb: {name: 'USB-C', rate: 1000, latency: 1.2, life: 0, note: 'FULL-SPEED USB'},
};
export const LINK_KEYS = ['k1', 'k4', 'bt', 'usb'];

// Omron D2FC-F-K(50M), family values from the D2FC catalogue (not M1-Pro specific)
export const SWITCH = {
  pt: 0.3, // pre-travel to contact, ±0.2
  md: 0.12, // movement differential (hysteresis), max
  ot: 0.2, // over-travel, min
  of: 0.59, // operating force N, 0.44..0.74
  rf: 0.24, // release force N, min
  body: [12.8, 5.8, 6.5],
};

// battery: the photographed cell is drawn; 400 mAh (gravastar.de, YOHO) is a flagged footnote
export const BATTERY = {cell: 'HSZ 602030', mAh: 300, alt: 400, wh: 1.11, volts: 3.7, dims: [30, 20, 6]};
// light-on battery life from gravastar.de (flagged secondary source): 4K, 1K, BT
export const LIFE_LIT = {k4: 25, k1: 62, bt: 72};

// the scroll encoder's detents per revolution are unpublished: 24 assumed (15° each)
export const DETENTS = 24;

// ------------------------------------------------------------ the shell, traced from the official renders
// s = mm from the nose tip, rearward. Half-width of the top-view outline (top-full.png, 8.1 px/mm).
export const PLAN = [
  [0, 0], [0.25, 3.4], [2.7, 13.6], [5.2, 17.9], [7.7, 21.2], [10.1, 23.7], [12.6, 25.9], [15.1, 27.5], [17.5, 29.1],
  [20, 30.2], [22.5, 31.2], [24.9, 31.8], [27.4, 32.2], [29.9, 32.2], [32.3, 32.3], [34.8, 32.0], [37.3, 31.6],
  [39.8, 31.1], [42.2, 30.6], [44.7, 30.2], [47.2, 29.8], [49.6, 29.4], [52.1, 29.1], [54.6, 28.9], [57, 28.8],
  [59.5, 28.8], [62, 28.9], [64.4, 29.0], [66.9, 29.3], [69.4, 29.5], [71.9, 29.8], [74.3, 30.1], [76.8, 30.4],
  [79.3, 30.6], [81.7, 31.0], [84.2, 31.2], [86.7, 31.4], [89.1, 31.7], [91.6, 31.7], [94.1, 31.8], [96.5, 31.7],
  [99, 31.6], [101.5, 31.2], [104, 30.7], [106.4, 30.0], [108.9, 29.3], [111.4, 28.0], [113.8, 26.5], [116.3, 24.6],
  [118.8, 22.1], [121.2, 17.9], [123.7, 9.1], [124.2, 0],
];
// crest height above the desk along the centreline (side-left-full.png, normalised to the 39.5 mm height)
export const CREST = [
  [0, 12.5], [1.5, 15.2], [4, 16.6], [7, 18.3], [10, 20.3], [15, 22.6], [20, 24.7], [25, 26.6], [30, 28.6],
  [35, 30.6], [40, 32.6], [45, 34.9], [50, 36.9], [55, 38.2], [60, 39.0], [65, 39.4], [70, 39.5], [75, 39.1],
  [80, 38.1], [85, 36.7], [90, 34.9], [95, 32.8], [100, 30.2], [105, 27.4], [110, 24.1], [115, 20.4], [120, 16.8],
  [124.2, 14.2],
];
// the skeleton's lower edge: it sits on the base tray, and the tail lifts off the desk behind the tray
export const FOOT = [[0, 3.2], [108, 3.2], [112, 4.4], [116, 6.6], [120, 9.4], [124.2, 11.2]];
// section shape: |z/W|^P + |(y - foot)/(crest - foot)|^Q = 1 (checked against both views: the flank windows land
// at the heights the side render shows)
export const SECTION = {P: 3.4, Q: 2.0};
export const WALL = 1.4; // ASSUMED 1.2..1.5 (unpublished)

// Openings, traced. top: (s, z), z = mm right of centre. left/right: (s, y), y = mm above the desk. front: (z, y).
// Each is a closed loop of control points, smoothed. Right-side openings mirror the left ones (no right render).
const mirror = (pts) => pts.map(([s, z]) => [s, -z]);
const PADDLE_L = [
  [8.2, -16.5], [7.6, -12], [9, -9.8], [16, -9.5], [30, -9.5], [40, -9.7], [44.5, -10.8], [49, -13.6], [52.3, -17.5],
  [53.4, -22], [51.5, -26.2], [46.5, -28.6], [38, -29.1], [28, -29], [20, -27.8], [14, -25.4], [10.3, -21.5],
];
export const PADDLES = {L: PADDLE_L, R: mirror(PADDLE_L)};
const WHEEL_HOLE = [
  [11.3, 0], [12, 2.5], [13.5, 4.0], [17, 5.0], [25, 5.3], [35, 5.3], [39, 4.6], [41, 2.8], [41.6, 0],
  [41, -2.8], [39, -4.6], [35, -5.3], [25, -5.3], [17, -5.0], [13.5, -4.0], [12, -2.5],
];
const SLIM_L = [[41.6, -4.6], [44, -5.9], [48, -6.4], [52, -6.1], [55, -5.2], [54.8, -4.4], [51.5, -4.4], [48, -4.6], [44.5, -4.4], [42.3, -4.0]];
const OVAL_L = [[55.6, -11.5], [55.5, -16.5], [57.5, -18.5], [63, -18.8], [66.2, -16], [66.5, -13], [64.5, -10.6], [59, -10.4]];
const CENTRE = [[58.3, 0], [58.6, 3.4], [60.5, 5.2], [65, 6.3], [72, 7.0], [78, 6.5], [81, 4.2], [82.4, 0], [81, -4.2], [78, -6.5], [72, -7.0], [65, -6.3], [60.5, -5.2], [58.6, -3.4]];
const FLANK_L = [[68.6, -19.5], [69.5, -15.5], [73, -12.2], [80, -11.0], [87, -11.5], [91.5, -13.5], [93.2, -16.5], [92, -20], [87.5, -23.5], [80, -24.6], [73, -23.6], [69.6, -21.8]];
const REARFLANK_L = [[95.2, -28.5], [95.5, -24], [97.5, -19.5], [100.5, -15], [103.5, -13.8], [105.8, -16], [106.2, -21], [105.5, -27], [102, -30], [98, -30.2]];
const CORNER_L = [[108.6, -25], [108.6, -19], [110.5, -15], [114, -13.6], [118, -14.5], [119.3, -18], [118.5, -23.5], [116, -27.5], [112, -28.4]];
const NOTCH = [[102.5, 0], [102.8, 2.8], [104.5, 4.3], [110, 4.6], [131, 4.6], [131, -4.6], [110, -4.6], [104.5, -4.3], [102.8, -2.8]];
const rr = (s0, s1, y0, y1, r) => [[s0 + r, y0], [s1 - r, y0], [s1, y0 + r], [s1, y1 - r], [s1 - r, y1], [s0 + r, y1], [s0, y1 - r], [s0, y0 + r]];
// the six vents in the left wall (pixel-scanned: a short leading slot, four long, one medium)
export const VENTS = [
  [[26.6, 6.5], [28.3, 6.5], [31.3, 10.7], [26.6, 9.6]],
  [[29.9, 6.3], [33.1, 6.3], [39.6, 13.0], [36.4, 13.0]],
  [[36.0, 7.3], [39.3, 7.3], [46.0, 14.2], [42.5, 14.2]],
  [[41.8, 7.8], [45.2, 7.8], [51.5, 14.4], [48.1, 14.4]],
  [[48.6, 9.0], [52.1, 9.0], [57.1, 14.5], [53.6, 14.5]],
  [[54.6, 9.5], [57.9, 9.5], [60.6, 12.4], [58.6, 13.9]],
];
// the side-button pocket, front button s 45..59.9, rear 60.1..75.5 (pixel-checked against the render)
export const SIDE_POCKET = [[45, 20.4], [45.4, 23.6], [52, 25.4], [60, 26.6], [68, 25.8], [75.2, 24.2], [76, 22.4], [75.5, 21.1], [68, 21.4], [60, 21.9], [52, 21.0], [46, 19.7]];
const SIDE_HOLES = [
  rr(10.3, 17.5, 6.4, 11.1, 2.2), // front pill (purpose unknown)
  [[64.2, 15.4], [65.5, 18.0], [69, 19.3], [75, 19.0], [79.5, 17.2], [80.8, 14.5], [78, 11.5], [72, 10.4], [67, 11.6]],
  [[82.5, 14.8], [88, 16.4], [94.5, 15.8], [97.5, 13.0], [96, 10.3], [89, 9.9], [84, 11.0]],
  [[91.2, 27.2], [95.5, 31.2], [101, 31.3], [104.3, 27.8], [103, 22], [99.5, 18.6], [95.5, 19], [92.2, 22.5]],
  [[105.6, 24], [106.8, 26.4], [109.5, 26.1], [113.5, 22.8], [117.2, 18.6], [117.6, 15.8], [114, 14.8], [109, 15.6], [106, 18.5]],
];
export const HOLES = [
  {view: 'top', pts: PADDLE_L, sharp: true},
  {view: 'top', pts: mirror(PADDLE_L), sharp: true},
  {view: 'top', pts: WHEEL_HOLE},
  {view: 'top', pts: SLIM_L},
  {view: 'top', pts: mirror(SLIM_L)},
  {view: 'top', pts: rr(45.1, 53.3, -3.9, 3.9, 2.2)}, // DPI ring bore
  {view: 'top', pts: OVAL_L},
  {view: 'top', pts: mirror(OVAL_L)},
  {view: 'top', pts: CENTRE},
  {view: 'top', pts: FLANK_L},
  {view: 'top', pts: mirror(FLANK_L)},
  {view: 'top', pts: REARFLANK_L},
  {view: 'top', pts: mirror(REARFLANK_L)},
  {view: 'top', pts: CORNER_L},
  {view: 'top', pts: mirror(CORNER_L)},
  {view: 'top', pts: NOTCH},
  {view: 'front', pts: rr(-5.2, 5.2, 8.4, 12.8, 2.0)}, // USB-C
  {view: 'left', pts: SIDE_POCKET, sharp: true},
  ...VENTS.map((pts) => ({view: 'left', pts, poly: true})),
  ...VENTS.map((pts) => ({view: 'right', pts, poly: true})),
  ...SIDE_HOLES.map((pts) => ({view: 'left', pts})),
  ...SIDE_HOLES.map((pts) => ({view: 'right', pts})),
];

// ------------------------------------------------------------ inside: board frame (FCC photos, PCB-MAP rev 2)
// map (x forward from the board's rear edge, y toward the mouse's right) → mouse frame: s = 93 - x, z = y - 18.9
export const BOARD = {
  offset: 31.0, // board x = 0 sits 31.0 mm from the mouse's rear (±1.5)
  top: 9.0, // TRACED: wheel top 31.6 mm in the side render, axle 10.9 above the board top
  thick: 1.2, // ASSUMED
};
export const sOf = (x) => 124 - (BOARD.offset + x);
export const zOf = (y) => y - 18.9;
// the wheel: Ø23.5 ± 1 × 7.3, axle at map (66.0, 18.9), 10.9 mm above the board top
export const WHEEL = {d: 23.5, w: 7.3, x: 66.0, y: 18.9, h: 10.9};
