# GGPoker PlayMoney

An unofficial, offline macOS poker and casino app. David is the local administrator and every balance uses play chips with no cash value.

## Noir & Gold experience

The current release includes a cinematic original-art lobby, compact utility navigation, format-specific scenes, layered tactile tables, original avatars and chip stacks, deterministic Spin & Gold wheel reveal, incremental table rendering, and accessible native dialogs. See `docs/designs/noir-gold-redesign.md` and `docs/designs/noir-gold-redesign-results.md` for the EGM-reviewed specification and final approval.

## Run in a browser

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. No dependency installation is needed.

## Build and install the macOS app

```sh
npm run build
open dist/GGPoker-PlayMoney.app
```

To build, install into `/Applications`, and launch:

```sh
bash native/install.sh
```

The build uses macOS Swift/WebKit tools and creates a 532 KB local `.app` bundle. Runtime web content is bundled into the app; HTTP(S) resources are blocked. The installed app has the bundle ID `com.danslab.ggpokerplaymoney`.

## Verify

```sh
npm run verify
```

This runs 17 engine tests and verifies the native build and ad-hoc signature. Rendered browser checks also cover every primary tab, all poker formats, all four casino games, admin workflows, replay, export, reset, responsive layouts, and console errors. The 12 expanded redesign checks cover stable rendering, keyboard focus, full breakpoint geometry, all seat/card configurations, reduced motion, and deterministic screenshot evidence:

```sh
export PLAYWRIGHT_MODULE=/Users/davidai/.npm-global/lib/node_modules/rea-agents/node_modules/playwright-core
npm run verify:ui
```

`CHROME_PATH` and `APP_URL` can override the default Chrome executable and local server. Start `npm run dev` first. Browser QA results are saved in `evidence/ui-qa.json`, `evidence/formats-qa.json`, and `evidence/redesign-qa.json`; screenshots are written to the gitignored `qa-output/` directory. Native accessibility and restart evidence is in `evidence/native-qa.json` and `evidence/native-redesign-qa.json`.

The implementation and evidence-led scope are documented in `docs/designs/play-money-app.md`. REA analysis of the installed launcher is under `evidence/`.

## Play-money guarantee

There is no cashier, payment provider, remote account, purchase, withdrawal, or cash-conversion path. Opponents and tournaments are simulated locally. Randomness is not certified for wagering.

GGPoker is a trademark of its respective owner. This independent project is not affiliated with or endorsed by GGPoker. All runtime code, icons, visuals, and sounds are original and generated locally.
