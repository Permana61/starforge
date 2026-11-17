// Everything the player sees: the sky, the falling stars, the chalice, the
// HUD and every menu. The game logic lives in game.js; this file only draws.
import { W, H, CATCHER, MAX_LIVES, COLOURS } from './config.js';
import { drawSky, drawTargetPanel, drawConstellationShape, roundRect } from './sky.js';
import { drawStar, drawSparkle } from './stars.js';
import { currentPattern } from './constellations.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

export function drawGame(ctx, game) {
  ctx.save();
  if (game.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  const brightness = 1 - game.skyDim * 0.55;
  if (game.state !== 'menu') drawSky(ctx, game.bg, game.time, game.forged, brightness);

  if (game.state === 'menu') {
    drawMenu(ctx, game);
  } else {
    // On the end screens the world rests: no falling stars, no chalice, no
    // HUD — just the forged sky and the result.
    const inRun = game.state === 'playing' || game.state === 'paused';
    if (inRun) {
      for (const s of game.stars) drawStar(ctx, s, game.time);
      drawCatcher(ctx, game);
    }
    game.particles.draw(ctx);
    if (inRun) drawHud(ctx, game);
    if (game.state === 'paused') drawPaused(ctx);
    if (game.state === 'over') drawOver(ctx, game);
    if (game.state === 'win') drawWin(ctx, game);
  }

  if (game.flash > 0) {
    ctx.globalAlpha = game.flash * 0.5;
    ctx.fillStyle = game.flashColour;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCatcher(ctx, game) {
  const x = game.catcher.x;
  const y = CATCHER.y;
  // Glow under the chalice.
  const glow = ctx.createRadialGradient(x, y + 8, 4, x, y + 8, 90);
  glow.addColorStop(0, 'rgba(255, 215, 106, 0.35)');
  glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 90, y - 82, 180, 180);
  // The chalice: a crescent bowl with a bright rim.
  ctx.save();
  ctx.shadowColor = '#ffd76a';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#2a1f3d';
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - CATCHER.w / 2, y);
  ctx.quadraticCurveTo(x, y + 34, x + CATCHER.w / 2, y);
  ctx.quadraticCurveTo(x, y + 12, x - CATCHER.w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Rim sparkles.
  drawSparkle(ctx, x - CATCHER.w / 2 + 8, y - 2, 5, '#ffe9a8');
  drawSparkle(ctx, x + CATCHER.w / 2 - 8, y - 2, 5, '#ffe9a8');
  // Banked stars sit in the bowl as tiny lights.
  for (let i = 0; i < game.banked; i++) {
    const bx = x - ((game.banked - 1) * 16) / 2 + i * 16;
    drawSparkle(ctx, bx, y + 12, 4.5, '#fff8e6');
  }
}

function drawHud(ctx, game) {
  ctx.textAlign = 'left';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#8fa3c8';
  ctx.font = `11px ${FONT}`;
  ctx.fillText('SCORE', 24, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText(String(game.score).padStart(6, '0'), 24, 64);
  ctx.fillStyle = '#8fa3c8';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`WAVE ${Math.min(game.wave, 7)} / 7   ·   ${currentPattern(game.wave).name}`, 24, 90);
  if (game.mult > 1) {
    ctx.fillStyle = '#7fe7ff';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`COMBO x${game.mult}  (${game.combo})`, 24, 116);
  }
  // Lives as three small stars, top centre.
  for (let i = 0; i < MAX_LIVES; i++) {
    const lx = W / 2 - 34 + i * 34;
    if (i < game.lives) drawSparkle(ctx, lx, 34, 10, '#ffd76a');
    else {
      ctx.save();
      ctx.globalAlpha = 0.25;
      drawSparkle(ctx, lx, 34, 10, '#8fa3c8');
      ctx.restore();
    }
  }
  ctx.shadowBlur = 0;
  drawTargetPanel(ctx, currentPattern(game.wave), game.banked, W - 292, 16, 268, 128);
  if (game.forgeToast) {
    ctx.textAlign = 'center';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = 18;
    ctx.fillText(game.forgeToast.text, W / 2, 300);
    ctx.shadowBlur = 0;
  }
}

function dimOverlay(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(4, 7, 18, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function titleText(ctx, text, y, size, colour) {
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 26;
  ctx.fillText(text, W / 2, y);
  ctx.shadowBlur = 0;
}

function bodyText(ctx, text, y, size, colour) {
  ctx.textAlign = 'center';
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = colour;
  ctx.fillText(text, W / 2, y);
}

function drawMenu(ctx, game) {
  drawSky(ctx, game.bg, game.time, game.forged, 1);
  // A few decorative stars drift across the title screen.
  for (let i = 0; i < 6; i++) {
    const x = 180 + i * 190;
    const y = 150 + Math.sin(game.time * 0.8 + i * 1.7) * 26;
    drawSparkle(ctx, x, y, 7, i % 2 ? '#7fe7ff' : '#ffd76a', 0.9);
  }
  drawConstellationShape(ctx, currentPattern(1), 980, 580, 1, '#ffd76a', 0.9);
  dimOverlay(ctx, 0.25);
  titleText(ctx, 'STARFORGE', 250, 92, '#ffd76a');
  bodyText(ctx, 'Catch falling stars. Forge the constellations.', 300, 24, '#dfe9ff');
  bodyText(ctx, 'Catch white and gold stars to fill the pattern  ·  never drop a blue guiding star', 350, 19, '#aebadb');
  bodyText(ctx, 'Never touch a red ember  ·  forge all seven constellations to win', 380, 19, '#aebadb');
  bodyText(ctx, 'Move with the mouse or ← → keys  ·  P pauses  ·  M mutes', 420, 17, '#8fa3c8');
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  titleText(ctx, 'CLICK TO BEGIN', 500, 30, '#7fe7ff');
  ctx.restore();
  if (game.best > 0) bodyText(ctx, `Best score: ${game.best}`, 548, 18, '#ffd76a');
}

function drawPaused(ctx) {
  dimOverlay(ctx, 0.6);
  titleText(ctx, 'PAUSED', 330, 64, '#7fe7ff');
  bodyText(ctx, 'Press P or click to keep forging', 380, 20, '#dfe9ff');
}

function endScreen(ctx, game, title, colour, lines) {
  dimOverlay(ctx, 0.62);
  titleText(ctx, title, 260, 62, colour);
  let y = 330;
  for (const line of lines) {
    bodyText(ctx, line, y, 22, '#dfe9ff');
    y += 36;
  }
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  titleText(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', 560, 26, '#7fe7ff');
  ctx.restore();
}

function drawOver(ctx, game) {
  const acc = game.stats.caught + game.stats.missed;
  endScreen(ctx, game, 'THE SKY WENT DARK', '#ff5a4e', [
    `Score ${game.score}   ·   Best ${game.best}`,
    `Forged ${game.forged.length} of 7 constellations   ·   caught ${game.stats.caught} stars`,
    acc > 0 ? `Accuracy ${Math.round((game.stats.caught / acc) * 100)}%` : 'No stars caught',
  ]);
}

function drawWin(ctx, game) {
  const mins = Math.floor(game.elapsed / 60);
  const secs = Math.floor(game.elapsed % 60);
  endScreen(ctx, game, 'THE SKY IS FORGED', '#ffd76a', [
    `All seven constellations burn above you`,
    `Score ${game.score}   ·   Best ${game.best}   ·   time ${mins}:${String(secs).padStart(2, '0')}`,
    `Caught ${game.stats.caught} stars   ·   ${game.stats.embers} embers touched`,
  ]);
}
