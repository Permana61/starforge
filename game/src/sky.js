// The night itself: a gradient sky, soft nebula clouds, twinkling background
// stars, a cratered moon, and the constellations the player has already
// forged, hanging lit in the sky. The nebula is painted once into an
// offscreen canvas at load so the frame loop stays cheap.
import { W, H, SKY } from './config.js';
import { mulberry32, range } from './random.js';

export function makeBackground() {
  const rng = mulberry32(20261117);
  const bgStars = [];
  for (let i = 0; i < 150; i++) {
    bgStars.push({
      x: rng() * W,
      y: rng() * (H - 90),
      r: 0.5 + rng() * 1.4,
      phase: rng() * Math.PI * 2,
      speed: 0.6 + rng() * 1.8,
      warm: rng() < 0.3,
    });
  }
  const nebula = document.createElement('canvas');
  nebula.width = W;
  nebula.height = H;
  const nctx = nebula.getContext('2d');
  const blobs = [
    { x: 240, y: 180, r: 260, c: 'rgba(88, 60, 160, 0.20)' },
    { x: 980, y: 120, r: 300, c: 'rgba(30, 90, 140, 0.18)' },
    { x: 620, y: 420, r: 320, c: 'rgba(140, 60, 110, 0.13)' },
    { x: 1100, y: 480, r: 240, c: 'rgba(40, 110, 120, 0.14)' },
    { x: 120, y: 520, r: 220, c: 'rgba(90, 70, 150, 0.12)' },
  ];
  for (const b of blobs) {
    const g = nctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    nctx.fillStyle = g;
    nctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  return { bgStars, nebula };
}

export function drawSky(ctx, bg, time, forged, brightness) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgb(${SKY.top[0]}, ${SKY.top[1]}, ${SKY.top[2]})`);
  grad.addColorStop(0.55, `rgb(${SKY.mid[0]}, ${SKY.mid[1]}, ${SKY.mid[2]})`);
  grad.addColorStop(1, `rgb(${SKY.low[0]}, ${SKY.low[1]}, ${SKY.low[2]})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(bg.nebula, 0, 0);

  // Moon, top centre, with a soft halo and three craters.
  const mx = 640;
  const my = 92;
  const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
  halo.addColorStop(0, 'rgba(255, 244, 214, 0.28)');
  halo.addColorStop(1, 'rgba(255, 244, 214, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - 120, my - 120, 240, 240);
  ctx.fillStyle = '#f7ecd0';
  ctx.beginPath();
  ctx.arc(mx, my, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 175, 140, 0.55)';
  for (const [cx, cy, cr] of [[mx - 14, my - 8, 8], [mx + 12, my + 12, 6], [mx + 16, my - 16, 4.5]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Twinkling background stars; the sky dims as stars are missed.
  for (const s of bg.bgStars) {
    const tw = 0.45 + 0.55 * Math.sin(time * s.speed + s.phase);
    ctx.globalAlpha = tw * brightness;
    ctx.fillStyle = s.warm ? '#ffe9b8' : '#dfe9ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Forged constellations stay lit in the sky for the rest of the run.
  for (const f of forged) {
    drawConstellationShape(ctx, f.pattern, f.x, f.y, 1, f.pattern.colour, 1);
  }

  // A low ridge of hills so the catcher has ground to stand on.
  ctx.fillStyle = '#070d1f';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, H - 26);
  ctx.quadraticCurveTo(320, H - 52, 640, H - 28);
  ctx.quadraticCurveTo(960, H - 48, W, H - 24);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

// Draw one constellation at (x, y) with node scale s: glowing lines between
// nodes, then bright nodes. `lit` 0..1 fades it in as it is being forged.
export function drawConstellationShape(ctx, pattern, x, y, s, colour, lit) {
  const nodes = pattern.nodes.map(([dx, dy]) => [x + dx * s, y + dy * s]);
  ctx.save();
  ctx.globalAlpha = lit;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(nodes[0][0], nodes[0][1]);
  for (let i = 1; i < nodes.length; i++) ctx.lineTo(nodes[i][0], nodes[i][1]);
  ctx.stroke();
  for (const [nx, ny] of nodes) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(nx, ny, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The ghost outline of the constellation being worked on, drawn in the
// target panel at the top right: unfilled nodes are hollow, filled ones glow.
export function drawTargetPanel(ctx, pattern, banked, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 14, 34, 0.72)';
  ctx.strokeStyle = 'rgba(127, 231, 255, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fa3c8';
  ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('FORGE NEXT', x + 14, y + 20);
  ctx.fillStyle = pattern.colour;
  ctx.font = 'bold 17px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(pattern.name, x + 14, y + 42);
  const spanX = pattern.nodes[pattern.nodes.length - 1][0] - pattern.nodes[0][0];
  const spanY = Math.max(...pattern.nodes.map((n) => n[1])) - Math.min(...pattern.nodes.map((n) => n[1]));
  const scale = Math.min((w - 40) / Math.max(spanX, 1), (h - 62) / Math.max(spanY, 1), 0.62);
  const minY = Math.min(...pattern.nodes.map((n) => n[1]));
  const ox = x + 20;
  const oy = y + 62 - minY * scale;
  const pts = pattern.nodes.map(([dx, dy]) => [ox + dx * scale, oy + dy * scale]);
  ctx.strokeStyle = pattern.colour;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.globalAlpha = 1;
  pts.forEach(([px, py], i) => {
    if (i < banked) {
      ctx.shadowColor = pattern.colour;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = pattern.colour;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
