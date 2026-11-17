# STARFORGE

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Permana61/starforge/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Permana61/starforge/reward.svg)](https://make.fun/bounty/best-game-01)

**STARFORGE** is a night-sky arcade game built from scratch for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01). Stars fall from a nebula sky; catch them with your chalice and forge them, node by node, into the constellations. Pure HTML + hand-written JavaScript + Canvas 2D — no libraries, no network requests, no copied code.

## The game

You are the keeper of a dark sky. White and gold stars rain down, and every one you catch fills the next node of the constellation you are forging — The Cup, The Arrow, The Crown, The Swan, The Dragon, The Phoenix, and finally The Forge itself. Complete a pattern and it ignites in the sky forever, with a burst of light and a bonus that grows with your combo.

But the sky is not kind:

- **Blue guiding stars** are worth 25 points — let one hit the ground and you lose a life.
- **Red embers** burn: catch one and you lose a life.
- Every star you miss dims the sky a little; every star you catch brings the light back.

Three lives. Seven constellations. Forge them all and the sky is yours.

## What makes it a complete game

- **Full loop:** title screen → waves of falling stars → forge celebrations → victory (all seven forged) or game over → instant restart.
- **Growing challenge:** each wave falls faster, spawns quicker, and adds more embers; golden stars appear from wave 3.
- **Choices that matter:** chase a golden star across the sky or guard the guiding stars — the combo multiplier (up to x5) rewards long streaks.
- **Feel:** a glowing chalice with banked stars in its bowl, sparkle bursts, forge rays and rings, floating score text, shooting stars, a twinkling sky that visibly dims when you miss, screen shake and a red flash when a life goes — and fully synthesized WebAudio (catch blips that climb in pitch with your combo, forge chords, a win arpeggio). No audio files.
- **HUD:** score, wave and constellation name, combo multiplier, three lives, and a live target panel showing the constellation outline with its nodes filling in as you catch stars.

## How to play

Serve the game and open it in a desktop browser:

```
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| Mouse | Move the chalice |
| ← → / A D | Move the chalice |
| Click | Start / restart |
| P / Esc | Pause |
| M | Mute |
| R | Restart after game over or victory |

## For the curious

The four dossier screenshots are not files in this repo: `main.ts` paints them itself at grade time (`tools/render-shots.mjs`, Node standard library only), because a screenshot file cannot be pushed here as text. The painter reuses the game's own sky, constellations and HUD layout, so the dossier shows the real game.
