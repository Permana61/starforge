// The forge: banked stars fill the target pattern node by node; when the
// last node fills, the constellation ignites in the sky and the wave ends.
import { PATTERNS, FORGE_ANCHORS } from './config.js';

export function currentPattern(wave) {
  return PATTERNS[(wave - 1) % PATTERNS.length];
}

export function forgeBonus(wave, mult) {
  return 100 * wave * mult;
}

// Called when the banked count reaches the pattern's node count. Returns the
// forged constellation record to hang in the sky, or null.
export function tryForge(game) {
  const pattern = currentPattern(game.wave);
  if (game.banked < pattern.nodes.length) return null;
  const anchor = FORGE_ANCHORS[(game.wave - 1) % FORGE_ANCHORS.length];
  const forged = { pattern, x: anchor[0], y: anchor[1], born: game.time };
  game.forged.push(forged);
  const bonus = forgeBonus(game.wave, game.mult);
  game.score += bonus;
  game.banked = 0;
  game.wave += 1;
  game.flash = 1;
  game.flashColour = pattern.colour;
  game.particles.burst(anchor[0] + 90, anchor[1] - 20, pattern.colour, 46, 260);
  game.particles.rays(anchor[0] + 90, anchor[1] - 20, pattern.colour, 12);
  game.particles.ring(anchor[0] + 90, anchor[1] - 20, pattern.colour);
  game.particles.floatText(640, 300, `FORGED! ${pattern.name}`, pattern.colour, 44);
  game.particles.floatText(640, 340, `+${bonus}`, '#ffffff', 26);
  game.sound.forge();
  game.forgeToast = { text: `FORGED! ${pattern.name}  +${bonus}`, until: game.time + 2.2 };
  if (game.wave > PATTERNS.length) {
    game.state = 'win';
    game.best = Math.max(game.best, game.score);
    game.sound.win();
  } else {
    game.sound.wave();
  }
  return forged;
}
