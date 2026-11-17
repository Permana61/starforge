// STARFORGE — tuning, colours and the seven constellations.
// A night sky 1280x720. Stars fall; catch them with the chalice and fill the
// target constellation, node by node. Forge all seven and the sky is yours.
export const W = 1280;
export const H = 720;

export const SKY = {
  top: [4, 7, 20],
  mid: [10, 18, 48],
  low: [27, 42, 85],
  horizon: [48, 66, 120],
};

export const COLOURS = {
  gold: '#ffd76a',
  goldSoft: '#ffe9a8',
  cyan: '#7fe7ff',
  violet: '#b78cff',
  ember: '#ff5a4e',
  white: '#fff8e6',
  dim: '#8fa3c8',
  panel: 'rgba(8, 14, 34, 0.72)',
  panelEdge: 'rgba(127, 231, 255, 0.35)',
};

// The seven constellations, in the order they must be forged. Nodes are
// offsets in pixels from the pattern's anchor; the same offsets drive the
// browser game, the target panel and the dossier screenshots.
export const PATTERNS = [
  {
    name: 'THE CUP',
    colour: '#ffd76a',
    nodes: [[0, 0], [46, -26], [92, 0]],
  },
  {
    name: 'THE ARROW',
    colour: '#7fe7ff',
    nodes: [[0, 0], [40, -34], [80, 0], [120, -18]],
  },
  {
    name: 'THE CROWN',
    colour: '#ffb3d9',
    nodes: [[0, 0], [34, -40], [68, -8], [102, -40], [136, 0]],
  },
  {
    name: 'THE SWAN',
    colour: '#b78cff',
    nodes: [[0, 0], [36, -30], [72, -44], [108, -30], [144, -6], [180, -18]],
  },
  {
    name: 'THE DRAGON',
    colour: '#8affc1',
    nodes: [[0, 0], [40, -24], [78, -52], [116, -30], [150, -58], [186, -34], [220, -52]],
  },
  {
    name: 'THE PHOENIX',
    colour: '#ff9d5c',
    nodes: [[0, 0], [36, -42], [70, -14], [104, -52], [140, -26], [176, -58], [212, -30], [246, -52]],
  },
  {
    name: 'THE FORGE',
    colour: '#ffe9a8',
    nodes: [[0, 0], [44, -36], [88, 0], [132, -48], [176, -12], [220, -54], [264, -20], [308, -50], [352, -24]],
  },
];

// Where each forged constellation hangs in the sky, one per wave.
export const FORGE_ANCHORS = [
  [300, 190],
  [660, 150],
  [980, 210],
  [420, 320],
  [830, 330],
  [250, 400],
  [900, 120],
];

// Points per caught star, by kind.
export const STAR_POINTS = { normal: 10, bright: 25, golden: 50, ember: 0 };

// Falling speed and spawn pace grow with the wave.
export function fallSpeed(wave) {
  return 72 + wave * 15;
}
export function spawnInterval(wave) {
  return Math.max(0.5, 1.2 - wave * 0.09);
}
export function emberChance(wave) {
  if (wave < 2) return 0;
  return Math.min(0.18, 0.08 + wave * 0.012);
}
export function goldenChance(wave) {
  return wave < 3 ? 0 : 0.08;
}
export function brightChance() {
  return 0.09;
}

export const CATCHER = { w: 128, h: 26, y: H - 62, speed: 560 };
export const MAX_LIVES = 3;
export const COMBO_STEP = 5; // every 5 catches in a row raises the multiplier
export const MAX_MULT = 5;
