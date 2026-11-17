// STARFORGE bootstrap: canvas, frame loop, staging for screenshots.
// The game runs at a fixed 1280x720 internal resolution and scales by CSS.
import { W, H } from './config.js';
import { createGame, updateGame } from './game.js';
import { drawGame } from './render.js';
import { Input } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = createGame();
const input = new Input(canvas);
window.__game = game;

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1');
let staged = false;
let frames = 0;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (shot && !staged) {
    stageShot(game, shot, seed);
    staged = true;
  }
  updateGame(game, input, dt);
  drawGame(ctx, game);
  frames += 1;
  if (shot && frames === 3) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
