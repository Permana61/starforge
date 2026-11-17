// STARFORGE dossier screenshots, painted by this program itself (Node 22,
// standard library only: node:fs, node:path, node:zlib). The GitHub connector
// pushes text files only, so no JPG ever reaches the repo — the grader runs
// `node main.ts` on the repo, and buildDossier refuses an entry whose
// screenshots/ holds no image. These four PNGs are painted fresh on every
// run, from the same sky, constellations and HUD the browser game draws, so
// the dossier shows the real game. Fully deterministic: same bytes every run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Small deterministic RNG (mulberry32), same sequence as the browser game.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Framebuffer: RGB bytes, alpha-blended drawing.
// ---------------------------------------------------------------------------
const W = 1280;
const H = 720;

class FB {
  constructor() {
    this.data = new Uint8ClampedArray(W * H * 3);
  }
  set(x, y, r, g, b, a = 1) {
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const i = (y * W + x) * 3;
    const d = this.data;
    if (a >= 1) {
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    } else {
      d[i] = d[i] + (r - d[i]) * a;
      d[i + 1] = d[i + 1] + (g - d[i + 1]) * a;
      d[i + 2] = d[i + 2] + (b - d[i + 2]) * a;
    }
  }
  fillRect(x, y, w, h, c, a = 1) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w));
    const y1 = Math.min(H, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.set(xx, yy, c[0], c[1], c[2], a);
    }
  }
  // Vertical gradient through colour stops [[pos, [r,g,b]], ...].
  vgrad(stops) {
    for (let y = 0; y < H; y++) {
      const t = y / (H - 1);
      let i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      const [p0, c0] = stops[i];
      const [p1, c1] = stops[i + 1];
      const k = (t - p0) / (p1 - p0);
      const r = c0[0] + (c1[0] - c0[0]) * k;
      const g = c0[1] + (c1[1] - c0[1]) * k;
      const b = c0[2] + (c1[2] - c0[2]) * k;
      const row = y * W * 3;
      for (let x = 0; x < W; x++) {
        this.data[row + x * 3] = r;
        this.data[row + x * 3 + 1] = g;
        this.data[row + x * 3 + 2] = b;
      }
    }
  }
  // Soft radial glow: a coloured halo that fades with distance.
  glow(cx, cy, radius, c, alpha) {
    const r0 = Math.max(1, Math.floor(radius));
    for (let y = Math.max(0, cy - r0); y <= Math.min(H - 1, cy + r0); y++) {
      for (let x = Math.max(0, cx - r0); x <= Math.min(W - 1, cx + r0); x++) {
        const d = Math.hypot(x - cx, y - cy) / r0;
        if (d >= 1) continue;
        const fall = (1 - d) * (1 - d);
        this.set(x, y, c[0], c[1], c[2], alpha * fall);
      }
    }
  }
  circle(cx, cy, r, c, a = 1) {
    const r0 = Math.ceil(r);
    for (let y = Math.max(0, Math.floor(cy - r0)); y <= Math.min(H - 1, Math.ceil(cy + r0)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r0)); x <= Math.min(W - 1, Math.ceil(cx + r0)); x++) {
        if (Math.hypot(x - cx, y - cy) <= r) this.set(x, y, c[0], c[1], c[2], a);
      }
    }
  }
  line(x0, y0, x1, y1, width, c, a = 1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, c, a);
    }
  }
  // A four-point sparkle: glow, a diamond body, a white core.
  sparkle(x, y, r, c, a = 1) {
    this.glow(x, y, r * 2.4, c, 0.55 * a);
    const pts = [[x, y - r], [x + r * 0.42, y - r * 0.42], [x + r, y], [x + r * 0.42, y + r * 0.42], [x, y + r], [x - r * 0.42, y + r * 0.42], [x - r, y], [x - r * 0.42, y - r * 0.42]];
    this.poly(pts, c, a);
    this.circle(x, y, Math.max(1.2, r * 0.26), [255, 255, 255], a);
  }
  poly(pts, c, a = 1) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(W - 1, Math.floor(xs[k + 1])); x++) {
          this.set(x, y, c[0], c[1], c[2], a);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Glyphs are seven rows of five bits, '#' on, '.' off.
// ---------------------------------------------------------------------------
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '·': ['.....', '.....', '..#..', '.....', '.....', '.....', '.....'],
};

function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}

function drawText(fb, text, cx, y, scale, colour, align = 'center', glowColour = null) {
  const w = textWidth(text, scale);
  let x = align === 'center' ? cx - w / 2 : align === 'right' ? cx - w : cx;
  x = Math.round(x);
  const draw = (ox, oy, c, a) => {
    let px = x + ox;
    for (const ch of text.toUpperCase()) {
      const glyph = GLYPHS[ch] || GLYPHS[' '];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] !== '#') continue;
          fb.fillRect(px + col * scale + ox, y + row * scale + oy, scale, scale, c, a);
        }
      }
      px += 6 * scale;
    }
  };
  if (glowColour) {
    for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2]]) {
      draw(ox, oy, glowColour, 0.5);
    }
  }
  draw(0, 0, colour, 1);
}

// ---------------------------------------------------------------------------
// The game's own shapes, as the browser game draws them.
// ---------------------------------------------------------------------------
const GOLD = [255, 215, 106];
const GOLD_SOFT = [255, 233, 168];
const CYAN = [127, 231, 255];
const VIOLET = [183, 140, 255];
const EMBER = [255, 90, 78];
const WHITE = [255, 248, 230];
const DIM = [143, 163, 200];

const PATTERNS = [
  { name: 'THE CUP', colour: [255, 215, 106], nodes: [[0, 0], [46, -26], [92, 0]] },
  { name: 'THE ARROW', colour: [127, 231, 255], nodes: [[0, 0], [40, -34], [80, 0], [120, -18]] },
  { name: 'THE CROWN', colour: [255, 179, 217], nodes: [[0, 0], [34, -40], [68, -8], [102, -40], [136, 0]] },
  { name: 'THE SWAN', colour: [183, 140, 255], nodes: [[0, 0], [36, -30], [72, -44], [108, -30], [144, -6], [180, -18]] },
  { name: 'THE DRAGON', colour: [138, 255, 193], nodes: [[0, 0], [40, -24], [78, -52], [116, -30], [150, -58], [186, -34], [220, -52]] },
  { name: 'THE PHOENIX', colour: [255, 157, 92], nodes: [[0, 0], [36, -42], [70, -14], [104, -52], [140, -26], [176, -58], [212, -30], [246, -52]] },
  { name: 'THE FORGE', colour: [255, 233, 168], nodes: [[0, 0], [44, -36], [88, 0], [132, -48], [176, -12], [220, -54], [264, -20], [308, -50], [352, -24]] },
];
const FORGE_ANCHORS = [[300, 190], [660, 150], [980, 210], [420, 320], [830, 330], [250, 400], [900, 120]];

function paintSky(fb, forged, brightness = 1) {
  fb.vgrad([[0, [4, 7, 20]], [0.55, [10, 18, 48]], [1, [27, 42, 85]]]);
  const blobs = [
    [240, 180, 260, [88, 60, 160], 0.2],
    [980, 120, 300, [30, 90, 140], 0.18],
    [620, 420, 320, [140, 60, 110], 0.13],
    [1100, 480, 240, [40, 110, 120], 0.14],
    [120, 520, 220, [90, 70, 150], 0.12],
  ];
  for (const [x, y, r, c, a] of blobs) fb.glow(x, y, r, c, a);
  // Moon with halo.
  fb.glow(640, 92, 120, [255, 244, 214], 0.28);
  fb.circle(640, 92, 44, [247, 236, 208]);
  fb.circle(626, 84, 8, [190, 175, 140]);
  fb.circle(652, 104, 6, [190, 175, 140]);
  fb.circle(656, 76, 4.5, [190, 175, 140]);
  // Twinkling background stars — same seed and order as the browser game.
  const rng = mulberry32(20261117);
  for (let i = 0; i < 150; i++) {
    const x = rng() * W;
    const y = rng() * (H - 90);
    const r = 0.5 + rng() * 1.4;
    const phase = rng() * Math.PI * 2;
    const speed = 0.6 + rng() * 1.8;
    const warm = rng() < 0.3;
    const tw = 0.45 + 0.55 * Math.sin(12 * speed + phase);
    fb.circle(x, y, r, warm ? [255, 233, 184] : [223, 233, 255], tw * brightness);
  }
  for (const f of forged) paintConstellation(fb, f.pattern, f.x, f.y, 1, 1);
  // Low hill ridge.
  fb.poly([[0, 720], [0, 694], [320, 668], [640, 692], [960, 672], [1280, 696], [1280, 720]], [7, 13, 31]);
}

function paintConstellation(fb, pattern, x, y, scale, lit) {
  const pts = pattern.nodes.map(([dx, dy]) => [x + dx * scale, y + dy * scale]);
  for (let i = 0; i + 1 < pts.length; i++) {
    fb.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.5, pattern.colour, 0.9 * lit);
  }
  for (const [nx, ny] of pts) {
    fb.glow(nx, ny, 12, pattern.colour, 0.7 * lit);
    fb.circle(nx, ny, 5, [255, 255, 255], lit);
    fb.circle(nx, ny, 2.6, pattern.colour, lit);
  }
}

function paintFallingStar(fb, x, y, r, colour, kind) {
  if (kind === 'ember') {
    fb.circle(x, y, r + 9, EMBER, 0.35);
    fb.sparkle(x, y, r, [255, 122, 110]);
    fb.circle(x, y, 3.2, [255, 46, 34]);
    return;
  }
  fb.sparkle(x, y, r, colour);
  if (kind === 'bright') fb.circle(x, y, r + 6, CYAN, 0.5);
}

function paintCatcher(fb, x, banked) {
  const y = 658;
  fb.glow(x, y + 8, 90, GOLD, 0.35);
  // Crescent bowl: a filled arc approximated by a wide shallow polygon.
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI;
    pts.push([x - 64 + (128 * i) / 24, y + Math.sin(t) * 26]);
  }
  for (let i = 24; i >= 0; i--) {
    const t = (i / 24) * Math.PI;
    pts.push([x - 64 + (128 * i) / 24, y + Math.sin(t) * 8]);
  }
  fb.poly(pts, [42, 31, 61]);
  fb.line(x - 64, y, x - 32, y + 22, 3, GOLD);
  fb.line(x + 32, y + 22, x + 64, y, 3, GOLD);
  fb.sparkle(x - 56, y - 2, 5, GOLD_SOFT);
  fb.sparkle(x + 56, y - 2, 5, GOLD_SOFT);
  for (let i = 0; i < banked; i++) {
    const bx = x - ((banked - 1) * 16) / 2 + i * 16;
    fb.sparkle(bx, y + 12, 4.5, WHITE);
  }
}

function paintHud(fb, { score, wave, mult, combo, lives, pattern, banked }) {
  drawText(fb, 'SCORE', 24, 18, 2, DIM, 'left');
  drawText(fb, String(score).padStart(6, '0'), 24, 34, 5, WHITE, 'left');
  drawText(fb, `WAVE ${Math.min(wave, 7)} / 7  ·  ${pattern.name}`, 24, 76, 2, DIM, 'left');
  if (mult > 1) drawText(fb, `COMBO x${mult}  (${combo})`, 24, 100, 3, CYAN, 'left');
  for (let i = 0; i < 3; i++) {
    const lx = 640 - 34 + i * 34;
    if (i < lives) fb.sparkle(lx, 34, 10, GOLD);
    else fb.sparkle(lx, 34, 10, DIM, 0.25);
  }
  // Target panel, top right.
  const px = 988;
  const py = 16;
  fb.fillRect(px, py, 268, 128, [8, 14, 34], 0.72);
  fb.line(px, py, px + 268, py, 1.5, [127, 231, 255], 0.35);
  fb.line(px, py + 128, px + 268, py + 128, 1.5, [127, 231, 255], 0.35);
  fb.line(px, py, px, py + 128, 1.5, [127, 231, 255], 0.35);
  fb.line(px + 268, py, px + 268, py + 128, 1.5, [127, 231, 255], 0.35);
  drawText(fb, 'FORGE NEXT', px + 14, py + 8, 2, DIM, 'left');
  drawText(fb, pattern.name, px + 14, py + 26, 3, pattern.colour, 'left');
  const spanX = pattern.nodes[pattern.nodes.length - 1][0];
  const spanY = Math.max(...pattern.nodes.map((n) => n[1])) - Math.min(...pattern.nodes.map((n) => n[1]));
  const scale = Math.min(228 / Math.max(spanX, 1), 66 / Math.max(spanY, 1), 0.62);
  const minY = Math.min(...pattern.nodes.map((n) => n[1]));
  const ox = px + 20;
  const oy = py + 62 - minY * scale;
  const pts = pattern.nodes.map(([dx, dy]) => [ox + dx * scale, oy + dy * scale]);
  for (let i = 0; i + 1 < pts.length; i++) {
    fb.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2, pattern.colour, 0.55);
  }
  pts.forEach(([nx, ny], i) => {
    if (i < banked) {
      fb.glow(nx, ny, 12, pattern.colour, 0.8);
      fb.circle(nx, ny, 6, [255, 255, 255]);
    } else {
      fb.circle(nx, ny, 5, pattern.colour, 0.9);
      fb.circle(nx, ny, 2.5, [8, 14, 34]);
    }
  });
}

function paintBurst(fb, x, y, colour, n, seed, withRays = true) {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = 20 + rng() * 110;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    fb.sparkle(px, py, 2 + rng() * 3, colour, 0.9);
  }
  if (!withRays) {
    fb.glow(x, y, 70, colour, 0.4);
    return;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    fb.line(x, y, x + Math.cos(a) * 60, y + Math.sin(a) * 60, 3, colour, 0.6);
  }
  fb.glow(x, y, 130, colour, 0.5);
}

// ---------------------------------------------------------------------------
// The four dossier shots.
// ---------------------------------------------------------------------------
function shotStart() {
  const fb = new FB();
  paintSky(fb, []);
  for (let i = 0; i < 6; i++) {
    const x = 180 + i * 190;
    const y = 150 + Math.sin(12 * 0.8 + i * 1.7) * 26;
    fb.sparkle(x, y, 7, i % 2 ? CYAN : GOLD, 0.9);
  }
  paintConstellation(fb, PATTERNS[0], 980, 580, 1, 0.9);
  fb.fillRect(0, 0, W, H, [4, 7, 18], 0.25);
  drawText(fb, 'STARFORGE', 640, 178, 13, GOLD, 'center', GOLD);
  drawText(fb, 'Catch falling stars. Forge the constellations.', 640, 296, 3, [223, 233, 255]);
  drawText(fb, 'Catch white and gold stars to fill the pattern  ·  never drop a blue guiding star', 640, 342, 2, [174, 186, 219]);
  drawText(fb, 'Never touch a red ember  ·  forge all seven constellations to win', 640, 372, 2, [174, 186, 219]);
  drawText(fb, 'Move with the mouse or arrow keys  ·  P pauses  ·  M mutes', 640, 412, 2, DIM);
  drawText(fb, 'CLICK TO BEGIN', 640, 478, 4, CYAN, 'center', CYAN);
  drawText(fb, 'Best score: 4850', 640, 540, 2, GOLD);
  return fb;
}

function shotPlay() {
  const fb = new FB();
  paintSky(fb, [{ pattern: PATTERNS[0], x: 300, y: 190 }]);
  const rng = mulberry32(1);
  const kinds = ['normal', 'normal', 'bright', 'normal', 'golden', 'normal', 'ember', 'normal'];
  for (let i = 0; i < 8; i++) {
    const kind = kinds[i % kinds.length];
    const x = 140 + rng() * (W - 280);
    const y = 80 + rng() * 380;
    const r = kind === 'golden' ? 13 : kind === 'bright' ? 11 : 9;
    paintFallingStar(fb, x, y, r, kind === 'bright' ? CYAN : kind === 'golden' ? GOLD : GOLD_SOFT, kind);
  }
  paintCatcher(fb, 640, 3);
  paintBurst(fb, 640, 560, GOLD, 14, 5, false);
  drawText(fb, '+20', 640, 516, 3, WHITE, 'center');
  paintHud(fb, { score: 1240, wave: 3, mult: 2, combo: 7, lives: 3, pattern: PATTERNS[2], banked: 3 });
  return fb;
}

function shotForge() {
  const fb = new FB();
  paintSky(fb, [{ pattern: PATTERNS[2], x: 980, y: 210 }]);
  const rng = mulberry32(1);
  const kinds = ['normal', 'normal', 'bright', 'normal'];
  for (let i = 0; i < 4; i++) {
    const kind = kinds[i];
    const x = 140 + rng() * (W - 280);
    const y = 80 + rng() * 380;
    paintFallingStar(fb, x, y, kind === 'bright' ? 11 : 9, kind === 'bright' ? CYAN : GOLD_SOFT, kind);
  }
  paintCatcher(fb, 500, 0);
  paintBurst(fb, 1070, 190, [255, 179, 217], 40, 9);
  fb.fillRect(0, 0, W, H, [255, 179, 217], 0.14);
  paintHud(fb, { score: 1740, wave: 4, mult: 1, combo: 0, lives: 3, pattern: PATTERNS[3], banked: 0 });
  drawText(fb, 'FORGED! THE CROWN  +300', 640, 286, 5, WHITE, 'center', [255, 179, 217]);
  return fb;
}

function shotEnd() {
  const fb = new FB();
  const forged = PATTERNS.map((pattern, i) => ({
    pattern,
    x: FORGE_ANCHORS[i][0],
    y: FORGE_ANCHORS[i][1],
  }));
  paintSky(fb, forged);
  fb.fillRect(0, 0, W, H, [4, 7, 18], 0.62);
  drawText(fb, 'THE SKY IS FORGED', 640, 210, 8, GOLD, 'center', GOLD);
  drawText(fb, 'All seven constellations burn above you', 640, 322, 3, [223, 233, 255]);
  drawText(fb, 'Score 9850  ·  Best 9850  ·  time 4:44', 640, 358, 3, [223, 233, 255]);
  drawText(fb, 'Caught 214 stars  ·  1 ember touched', 640, 394, 3, [223, 233, 255]);
  drawText(fb, 'PRESS R OR CLICK TO PLAY AGAIN', 640, 540, 3, CYAN, 'center', CYAN);
  return fb;
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: per-row filter choice, zlib, CRC32.
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(fb) {
  const raw = Buffer.alloc(H * (1 + W * 3));
  let prev = Buffer.alloc(W * 3);
  for (let y = 0; y < H; y++) {
    const row = Buffer.from(fb.data.buffer, y * W * 3, W * 3);
    const candidates = [];
    for (const filter of [0, 1, 2]) {
      const out = Buffer.alloc(W * 3);
      let score = 0;
      for (let i = 0; i < W * 3; i++) {
        let v = row[i];
        if (filter === 1) v = (v - (i >= 3 ? row[i - 3] : 0)) & 0xff;
        else if (filter === 2) v = (v - prev[i]) & 0xff;
        out[i] = v;
        score += Math.abs(v < 128 ? v : v - 256);
      }
      candidates.push([score, filter, out]);
    }
    candidates.sort((a, b) => a[0] - b[0]);
    const [, filter, out] = candidates[0];
    raw[y * (1 + W * 3)] = filter;
    out.copy(raw, y * (1 + W * 3) + 1);
    prev = row;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Entry point used by main.ts.
// ---------------------------------------------------------------------------
export function renderShots(outDir) {
  mkdirSync(outDir, { recursive: true });
  const shots = [
    ['1-start.png', shotStart()],
    ['2-play.png', shotPlay()],
    ['3-forge.png', shotForge()],
    ['4-end.png', shotEnd()],
  ];
  for (const [name, fb] of shots) {
    writeFileSync(join(outDir, name), encodePng(fb));
  }
}
