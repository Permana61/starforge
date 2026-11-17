// Staged scenes for screenshots: ?shot=start|play|forge|end&seed=N puts the
// game into a fixed, deterministic pose so a screenshot is reproducible.
// The game itself never reads this in normal play.
import { W, PATTERNS } from './config.js';
import { mulberry32 } from './random.js';

function fixedStars(game, seed, wave, count) {
  const rng = mulberry32(seed);
  game.stars = [];
  const kinds = ['normal', 'normal', 'bright', 'normal', 'golden', 'normal', 'ember', 'normal'];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    game.stars.push({
      x: 140 + rng() * (W - 280),
      y: 80 + rng() * 380,
      vy: 90,
      drift: 0,
      phase: rng() * 6,
      kind,
      r: kind === 'golden' ? 13 : kind === 'bright' ? 11 : 9,
      points: kind === 'golden' ? 50 : kind === 'bright' ? 25 : 10,
      spin: 0,
    });
  }
  game.wave = wave;
  game.state = 'playing';
}

export function stageShot(game, name, seed) {
  game.time = 12; // fixed clock so twinkles and the moon sit still
  game.forgeToast = null;
  game.flash = 0;
  game.shake = 0;
  if (name === 'start') {
    game.state = 'menu';
    game.best = 4850;
    return;
  }
  if (name === 'play') {
    fixedStars(game, seed, 3, 8);
    game.score = 1240;
    game.combo = 7;
    game.mult = 2;
    game.banked = 3;
    game.lives = 3;
    game.catcher.x = 640;
    game.catcher.tx = 640;
    game.particles.burst(640, 560, '#ffd76a', 14, 180);
    game.particles.floatText(640, 520, '+20', '#ffffff', 20);
    return;
  }
  if (name === 'forge') {
    fixedStars(game, seed, 3, 4);
    game.score = 1740;
    game.combo = 0;
    game.mult = 1;
    game.banked = 0;
    game.lives = 3;
    game.wave = 4;
    game.catcher.x = 500;
    game.catcher.tx = 500;
    const pattern = PATTERNS[2]; // THE CROWN, just forged
    game.forged = [{ pattern, x: 980, y: 210, born: 12 }];
    game.flash = 0.55;
    game.flashColour = pattern.colour;
    game.forgeToast = { text: 'FORGED! THE CROWN  +300', until: 99 };
    game.particles.burst(1070, 190, pattern.colour, 40, 260);
    game.particles.rays(1070, 190, pattern.colour, 12);
    game.particles.ring(1070, 190, pattern.colour);
    return;
  }
  if (name === 'end') {
    game.state = 'win';
    game.score = 9850;
    game.best = 9850;
    game.elapsed = 284;
    game.stats = { caught: 214, missed: 31, embers: 1, brightLost: 0 };
    game.lives = 2;
    game.wave = 7;
    game.forged = PATTERNS.map((pattern, i) => ({
      pattern,
      x: [300, 660, 980, 420, 830, 250, 900][i],
      y: [190, 150, 210, 320, 330, 400, 120][i],
      born: 12,
    }));
    return;
  }
  game.state = 'menu';
}
