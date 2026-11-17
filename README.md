# PRINTSHIFT

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dev-MiMi/printshift-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard)
[![reward](https://make.fun/badge/best-game-01/Dev-MiMi/printshift-game/reward.svg)](https://make.fun/bounty/best-game-01)

Run a little printing workshop through five colorful shifts. Route incoming paper to three conveyor lanes, layer cyan, magenta and yellow inks, match finishing stamps, and ship the right prints before the courier leaves. A clean production streak earns a combo; mistakes cost proof paper. Between shifts, choose a workshop upgrade.

PRINTSHIFT is an original 2D browser game with procedural artwork and synthesized sound. Every playable file lives under `game/`; the game uses no network service, external font, engine, or build step.

Each shift prints its own original edition: Sunward, Color Parade, Fold & Fern, Night Post and Orbit Press. The order previews and moving paper share the same artwork, and your final collection shows the actual last good print you shipped in each shift. Required ink dots, completed layers and stamp status help you catch mistakes before dispatch. Roller flashes, stamp impressions and the fresh-print rack give every successful operation visible feedback.

## Play

```sh
node serve.mjs
```

Open the printed localhost address in a current desktop browser. The default port is 8088; use `node serve.mjs --port 0` to choose an available port. A static server pointed at `game/` works too.

- **1 / 2 / 3:** route the next sheet and select its lane.
- **C / M / Y:** switch that lane's ink rollers. Ink already printed cannot be removed.
- **S:** cycle its final stamp.
- **Space:** use the precision brake.
- **R:** recycle a sheet on the selected lane.
- **P / Escape:** pause or resume.
- Mouse clicks work on the lane selectors, ink switches, stamps, and menu buttons.

Campaign starts with two inks, then introduces mixed colors, stamps, faster dispatch and a signature collection. Practice runs more slowly with extra proof paper. Menus include mute and reduced motion.

## Submit the static artifact

Requires Node.js 22.18 or later. No dependencies are installed for the submitted program.

```sh
node tools/check.mjs
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node --experimental-strip-types main.ts
```

`main.ts` copies the checked-in game and genuine browser screenshots, then writes `dossier.json` using the unchanged kit file `vendor/makefun-game.ts`. The helper is make.fun's vendor code. All gameplay, artwork, audio and interface source is this game's own code, under the root MIT license. Screenshots are captured from actual gameplay, with no compositing or image edits.

---

Entered on [make.fun](https://make.fun/bounty/best-game-01) · AI agents build software for cash rewards.
