# PRINTSHIFT

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dev-MiMi/printshift-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard)
[![reward](https://make.fun/badge/best-game-01/Dev-MiMi/printshift-game/reward.svg)](https://make.fun/bounty/best-game-01)

Run a little printing workshop through five colorful shifts. Route incoming paper to three conveyor lanes, layer cyan, magenta and yellow inks, crossfeed unfinished paper between lanes, match finishing stamps, and ship the right prints before the courier leaves. A clean production streak earns a combo; mistakes cost proof paper. Between shifts, install a workshop upgrade and choose your next client commission.

PRINTSHIFT is an original 2D browser game with procedural artwork and synthesized sound. Every playable file lives under `game/`; the game uses no network service, external font, engine, or build step.

Each shift prints its own original edition: Sunward, Color Parade, Fold & Fern, Night Post and Orbit Press. The order previews and moving paper share the same artwork, and your final collection shows the actual last good print you shipped in each shift. Required ink dots, completed layers and stamp status help you catch mistakes before dispatch. Roller flashes, stamp impressions and the fresh-print rack give every successful operation visible feedback.

Four clients change your order book. Corner Books orders inks in pairs and rewards a clean streak. Parade Studio rotates its palette and rewards color variety. Nightline Dispatch sends faster priority orders. Fern Archive repeats a spot color with changing stamps. Their mastery objectives are optional score bonuses: the print quota always remains the shift's main goal.

Six upgrades support different strategies. Build around safer proofs, longer brakes, clean combos, faster crossfeed, recycled proof recovery, or repeat-ink batch bonuses. Paper recovery preserves a streak when recycling; batch memory rewards paired commissions. Crossfeed changes a sheet's lane while preserving every ink layer, and an occupied destination blocks the move. Upgrade and client offers change with each collection; retrying a shift keeps its order sequence and earlier work.

Between shifts, the workshop planning desk puts the next client and your upgrade beside one another. Preview the client's actual first three orders, compare its print quota, feed pattern, time and proof allowance, then choose the press upgrade that suits your plan. Pick a client first to highlight matching tools, or install a tool first and choose its next job. The collection route shows the clients you already delivered for and the next edition. The finale records your real route and installed press; the local archive keeps six completed builds so you can compare their scores and try another combination next collection.

The daily challenge starts at the three advanced shifts, using the UTC date as its shared seed and a fixed client route. Replay it with another upgrade strategy to improve your personal best. The local print archive saves actual completed color editions and mastered clients. No login or network connection is needed; saved progress is optional, and the game still plays if browser storage is unavailable.

## Play

```sh
node serve.mjs
```

Open the printed localhost address in a current desktop browser. The default port is 8088; use `node serve.mjs --port 0` to choose an available port. A static server pointed at `game/` works too.

- **1 / 2 / 3:** route the next sheet and select its lane.
- **C / M / Y:** switch that lane's ink rollers. Ink already printed cannot be removed.
- **S:** cycle its final stamp.
- **Q / E:** crossfeed the leading unfinished paper up or down a lane (unlocked after shift 1). Click a moving sheet to select its lane; the destination must have room, and ink already printed stays on the sheet.
- **Space:** use the precision brake.
- **R:** recycle a sheet on the selected lane.
- **P / Escape:** pause or resume.
- Mouse clicks work on the lane selectors, ink switches, stamps, and menu buttons.

Campaign starts with two inks, then introduces mixed colors, crossfeed, stamps, client contracts and faster dispatch. Practice runs more slowly with extra proof paper. Menus include mute and reduced motion; pause freezes the clock, paper and tool cooldowns.

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
