// STARFORGE — the game itself: states, the loop, catching, missing, lives,
// combos and waves. Render lives in render.js; this file only decides.
import { W, H, CATCHER, MAX_LIVES, COMBO_STEP, MAX_MULT, PATTERNS } from './config.js';
import { clamp, lerp } from './random.js';
import { SoundBank } from './audio.js';
import { Particles } from './particles.js';
import { makeBackground } from './sky.js';
import { makeSpawner, updateSpawner } from './stars.js';
import { currentPattern, tryForge } from './constellations.js';

export function createGame() {
  const game = {
    state: 'menu', // menu | playing | paused | over | win
    time: 0,
    score: 0,
    best: 0,
    lives: MAX_LIVES,
    wave: 1,
    combo: 0,
    mult: 1,
    banked: 0,
    stars: [],
    forged: [],
    catcher: { x: W / 2, tx: W / 2 },
    spawner: makeSpawner((Date.now() % 2147483647) || 1),
    particles: new Particles(),
    sound: new SoundBank(),
    bg: makeBackground(),
    skyDim: 0, // 0 = bright sky, 1 = fully dimmed by misses
    flash: 0,
    flashColour: '#ffd76a',
    shake: 0,
    forgeToast: null,
    stats: { caught: 0, missed: 0, embers: 0, brightLost: 0 },
    startedAt: 0,
    elapsed: 0,
  };
  return game;
}

export function startGame(game) {
  game.state = 'playing';
  game.score = 0;
  game.lives = MAX_LIVES;
  game.wave = 1;
  game.combo = 0;
  game.mult = 1;
  game.banked = 0;
  game.stars = [];
  game.forged = [];
  game.particles = new Particles();
  game.skyDim = 0;
  game.flash = 0;
  game.shake = 0;
  game.forgeToast = null;
  game.stats = { caught: 0, missed: 0, embers: 0, brightLost: 0 };
  game.catcher.x = W / 2;
  game.catcher.tx = W / 2;
  game.spawner = makeSpawner((Date.now() % 2147483647) || 1);
  game.startedAt = game.time;
  game.elapsed = 0;
  game.sound.click();
}

function loseLife(game, reason) {
  game.lives -= 1;
  game.combo = 0;
  game.mult = 1;
  game.flash = 0.7;
  game.flashColour = '#ff5a4e';
  game.shake = 10;
  game.sound.lose();
  if (reason === 'ember') game.stats.embers += 1;
  if (reason === 'bright') game.stats.brightLost += 1;
  if (game.lives <= 0) {
    game.state = 'over';
    game.best = Math.max(game.best, game.score);
  }
}

function catchStar(game, star) {
  const pts = star.points * game.mult;
  game.score += pts;
  game.combo += 1;
  game.mult = Math.min(MAX_MULT, 1 + Math.floor(game.combo / COMBO_STEP));
  game.banked += 1;
  game.stats.caught += 1;
  game.skyDim = Math.max(0, game.skyDim - 0.06);
  game.particles.burst(star.x, star.y, star.kind === 'ember' ? '#ff5a4e' : '#ffd76a', star.kind === 'golden' ? 22 : 12, 200);
  game.particles.floatText(star.x, star.y - 18, `+${pts}`, '#ffffff', star.kind === 'golden' ? 24 : 18);
  game.sound.catchStar(star.kind, game.combo);
  if (game.combo > 0 && game.combo % COMBO_STEP === 0) {
    game.particles.floatText(game.catcher.x, CATCHER.y - 46, `COMBO x${game.mult}`, '#7fe7ff', 22);
  }
  tryForge(game);
}

function missStar(game, star) {
  game.stats.missed += 1;
  if (star.kind === 'bright') {
    game.particles.floatText(star.x, H - 90, 'GUIDING STAR LOST', '#7fe7ff', 18);
    loseLife(game, 'bright');
    return;
  }
  if (star.kind === 'ember') {
    // An ember that burns out on the ground harms no one.
    game.particles.burst(star.x, H - 30, '#ff5a4e', 6, 90);
    return;
  }
  // An ordinary star hitting the ground breaks the combo and dims the sky.
  game.combo = 0;
  game.mult = 1;
  game.skyDim = clamp(game.skyDim + 0.09, 0, 1);
}

export function updateGame(game, input, dt) {
  game.time += dt;
  if (game.state === 'menu') {
    if (input.consumeClick() || input.consumeKey(' ') || input.consumeKey('enter')) {
      game.sound.unlock();
      startGame(game);
    }
    game.particles.update(dt, W);
    return;
  }
  if (game.state === 'over' || game.state === 'win') {
    if (input.consumeClick() || input.consumeKey('r') || input.consumeKey(' ') || input.consumeKey('enter')) {
      game.sound.unlock();
      startGame(game);
    }
    game.particles.update(dt, W);
    return;
  }
  if (game.state === 'paused') {
    if (input.consumeKey('p') || input.consumeKey('escape') || input.consumeClick()) {
      game.state = 'playing';
    }
    return;
  }

  // Playing.
  game.elapsed = game.time - game.startedAt;
  if (input.consumeKey('p') || input.consumeKey('escape')) {
    game.state = 'paused';
    return;
  }
  if (input.consumeKey('m')) game.sound.toggleMute();

  // Catcher: the mouse leads, the keys nudge, the chalice follows fast.
  if (input.mouseInside) game.catcher.tx = clamp(input.mouseX, CATCHER.w / 2, W - CATCHER.w / 2);
  game.catcher.tx = clamp(game.catcher.tx + input.moveDirection() * CATCHER.speed * dt, CATCHER.w / 2, W - CATCHER.w / 2);
  game.catcher.x = lerp(game.catcher.x, game.catcher.tx, Math.min(1, dt * 18));

  updateSpawner(game.spawner, game.wave, game.stars, dt);

  const cy = CATCHER.y;
  for (let i = game.stars.length - 1; i >= 0; i--) {
    const s = game.stars[i];
    s.y += s.vy * dt;
    s.x += Math.sin(game.time * 1.4 + s.phase) * s.drift * dt * 0.4;
    const caught =
      s.y > cy - 14 && s.y < cy + CATCHER.h + 8 &&
      Math.abs(s.x - game.catcher.x) < CATCHER.w / 2 + s.r;
    if (caught) {
      game.stars.splice(i, 1);
      if (s.kind === 'ember') {
        game.particles.burst(s.x, s.y, '#ff5a4e', 26, 240);
        game.particles.floatText(s.x, s.y - 20, 'EMBER!', '#ff5a4e', 22);
        loseLife(game, 'ember');
      } else {
        catchStar(game, s);
      }
      continue;
    }
    if (s.y > H - 8) {
      game.stars.splice(i, 1);
      missStar(game, s);
      if (game.state !== 'playing') return;
    }
  }

  if (game.forgeToast && game.time > game.forgeToast.until) game.forgeToast = null;
  game.flash = Math.max(0, game.flash - dt * 1.4);
  game.shake = Math.max(0, game.shake - dt * 26);
  game.particles.update(dt, W);
}

export function patternName(game) {
  return currentPattern(game.wave).name;
}

export function patternCount(game) {
  return PATTERNS.length;
}
