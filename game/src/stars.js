// The falling stars themselves: four kinds, one rule each.
//  normal — white-gold, 10 points, a miss only breaks the combo.
//  bright — cyan guiding star, 25 points; let one hit the ground and a life goes.
//  golden — rare, 50 points, worth chasing across the sky.
//  ember  — red and dangerous: catch one and a life goes.
import { W, STAR_POINTS, fallSpeed, spawnInterval, emberChance, goldenChance, brightChance } from './config.js';
import { mulberry32, range, chance } from './random.js';

export function makeSpawner(seed) {
  return { rng: mulberry32(seed), timer: 0.6 };
}

export function spawnStar(spawner, wave, stars) {
  const rng = spawner.rng;
  let kind = 'normal';
  const roll = rng();
  if (chance(rng, emberChance(wave))) kind = 'ember';
  else if (chance(rng, goldenChance(wave))) kind = 'golden';
  else if (roll < brightChance()) kind = 'bright';
  const speed = fallSpeed(wave) * range(rng, 0.9, 1.25) * (kind === 'bright' ? 0.65 : 1);
  stars.push({
    x: range(rng, 50, W - 50),
    y: -24,
    vy: speed,
    drift: range(rng, -26, 26),
    phase: rng() * Math.PI * 2,
    kind,
    r: kind === 'golden' ? 13 : kind === 'bright' ? 11 : 9,
    points: STAR_POINTS[kind],
    spin: range(rng, -1.4, 1.4),
  });
}

export function updateSpawner(spawner, wave, stars, dt) {
  spawner.timer -= dt;
  if (spawner.timer <= 0 && stars.length < 15) {
    spawner.timer = spawnInterval(wave) * (0.8 + spawner.rng() * 0.4);
    spawnStar(spawner, wave, stars);
  }
}

// A four-point sparkle: two crossed tapers plus a bright core. The same
// shape is used for the catcher glow, the HUD lives and the forged nodes.
export function drawSparkle(ctx, x, y, r, colour, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.2, r * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const KIND_COLOUR = {
  normal: '#ffe9a8',
  bright: '#7fe7ff',
  golden: '#ffd76a',
  ember: '#ff5a4e',
};

export function drawStar(ctx, star, time) {
  const tw = 0.75 + 0.25 * Math.sin(time * 5 + star.phase);
  const colour = KIND_COLOUR[star.kind];
  const wobble = Math.sin(time * 1.4 + star.phase) * star.drift * 0.12;
  const x = star.x + wobble;
  if (star.kind === 'ember') {
    // Embers pulse red and wear a warning ring.
    const pulse = 0.6 + 0.4 * Math.sin(time * 7 + star.phase);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.4 * pulse;
    ctx.strokeStyle = '#ff5a4e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, star.y, star.r + 7 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawSparkle(ctx, x, star.y, star.r * tw, '#ff7a6e');
    ctx.fillStyle = '#ff2e22';
    ctx.beginPath();
    ctx.arc(x, star.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  drawSparkle(ctx, x, star.y, star.r * tw, colour);
  if (star.kind === 'bright') {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#7fe7ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, star.y, star.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
