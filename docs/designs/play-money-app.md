# GGPoker PlayMoney — implementation contract

## Goal and boundaries

Build an unofficial, offline macOS poker and casino app for David, who is the local administrator. Every balance is denominated in play chips. There is no deposit, withdrawal, purchase, cash value, payment provider, remote account, or real-money game path.

The app recreates the dense, dark poker-client experience with original code and assets. It is not affiliated with GGPoker and does not contain its game server, account system, or proprietary game resources.

## Evidence ledger

- REA `inspect_artifact` examined all 21 entries in `/Applications/GGPoker.app`. Parent Evidence: `ev_f6d11a1f6a63846ab9820e5471ad98fc763b695ac1d4d8a85a93875f37d9758f`; retained in `evidence/ggpoker-artifact-evidence.json`.
- REA `inspect_desktop_application` examined all 21 entries and found no packaged desktop runtime candidates. Parent Evidence: `ev_2f81277e5f59f86eb35620697ef047348f144937076062f25f6e86e6c7c17778`; retained in `evidence/ggpoker-desktop-evidence.json`.
- REA `inspect_macho` identified a universal x86_64/arm64 AppKit launcher, SHA-256 `38a05cc6e7a8f7159e105aae269954fd9b0c5dd9f055885fa1bc4f1f5a223aff`, with Cocoa, CoreImage, Security, patch-application, and networking imports. Evidence: `ev_1f47078752b24523b9ead0939625073be7c4e6db3f013f25e081c1bcbcd84aec`.
- REA/Hopper completed launcher overview analysis with 10,527 procedures and 9,543 strings. Evidence: `ev_aec5472bc8f9bc826834d6f49a2977c9a5cd32d47d35c21b7bf962fa6ffce954`; retained in `evidence/ggpoker-hopper-overview.json`. This covers the launcher only, not the separately downloaded game.
- `Contents/Resources/url_config.json` declares separately downloaded application resources and modules. No GGPoker application-support data directory is installed locally. Therefore the full game interface and game logic are not present in the shipped local bundle and remain unobserved.
- `Launcher_bg.bmp` establishes a 416×250 promotional launcher with a white GGPoker wordmark. It is reference-only and is not copied into the new app.
- GGPoker's public Games & Features Guide establishes the product families: NLH, PLO/PLO-5/PLO-6, Short Deck, Spin & Gold, Rush & Cash, All-in or Fold, Flip & Go, Mystery Battle Royale, tournaments, casino games, hand analytics, table customization, rabbit hunt, and card reveal motion. Source: https://ggpoker.com/blog/games-features-guide/.

## Functional scope

- Lobby: home, poker, tournaments, casino, promotions, leaderboard, PokerCraft-style hand history, profile/settings, and admin.
- Poker variants: Hold'em, Omaha, PLO-5, PLO-6, and Short Deck use the same local table engine with variant-specific decks/hole cards and Omaha hand selection.
- Formats: standard, fast-fold, push/fold, randomized Spin & Gold prize multiplier, scheduled local tournaments, and simplified Flip & Go / Mystery Bounty events.
- Table: bots, blinds, betting rounds, fold/check/call/bet/raise/all-in, side pots, showdown, rabbit hunt, deal/chip/win motion, generated sounds, optional reduced motion, and table themes.
- Casino: play-chip blackjack, European roulette, slots, and baccarat with visible rules and local outcomes.
- Progression: chip wallet, daily reward, missions, local leaderboard, profile statistics, and hand replay.
- Admin: chip adjustment, bot difficulty, table creation, user/statistics overview, hand-history export, and local data reset with confirmation.
- Offline exclusions: no remote multiplayer, real-money cashier, staking, live dealer, SnapCam/webcam, EV cashout, anti-cheat service, or remote account sync. Any local equivalent is labeled as simulated.

## Architecture

- `src/engine.js`: dependency-free pure poker/casino utilities, UMD-compatible with Node's test runner.
- `src/data.js`: local tables, tournaments, missions, promotions, and lobby configuration.
- `src/app.js`: state, rendering, navigation, localStorage persistence, table actions, admin actions, and replay.
- `src/audio.js`: Web Audio-generated deal/chip/check/win/click sounds; no downloaded audio assets.
- `src/styles.css`: token-driven dark green/felt theme, responsive layouts, keyboard focus, motion and reduced-motion behavior.
- `native/`: Swift WebKit shell, Info.plist, and build script. It loads only bundled files and blocks HTTP(S) content rules.
- `tests/`: Node engine tests plus rendered browser/native acceptance checks.

No package installation is required. Node's built-in test runner, Swift/Xcode command-line tools, and the installed REA/browser tooling are reused.

## Visual system

- Original `GG PLAY MONEY` wordmark, spade icon, and table graphics; no proprietary imagery or sounds.
- Felt greens, near-black chrome, warm gold highlights, and a restrained coral action color. Body text uses the native system font.
- Dense desktop lobby at 1440/1024, adaptive panels at 768, and single-column navigation/content at 390/320. Touch targets remain at least 44px.
- Motion uses 150–400ms opacity/transform transitions. Card dealing and win emphasis never block controls. Reduced-motion and sound toggles persist.

## Acceptance gates

1. `npm test` covers hand evaluation, Omaha selection, Short Deck behavior, side pots, betting invariants, casino outcomes, and wallet constraints.
2. `npm run build` creates `dist/GGPoker-PlayMoney.app`; `npm run verify` runs tests and build.
3. Rendered browser checks exercise every primary tab, table entry and betting action, admin chip adjustment, replay, sound/motion controls, and casino games without console errors.
4. Screenshots are inspected at 320, 390, 768, 1024, and 1440 pixels, including 200% zoom/reflow and reduced motion.
5. Native app launch, accessibility-tree navigation, gameplay, and persistence are observed with `agent-desktop`.
6. Static scan confirms no payment endpoints, remote URLs in runtime code, or real-money labels presented as balances.
7. Source and concise verification evidence are committed on `feat/play-money-app` and pushed to `DansiDanutz/GGPoker-kimi`.

## Risks and decisions

- The installed target is a launcher, so exact proprietary parity cannot be evidenced. Build a complete local experience from the observed feature families rather than inventing claims about missing code.
- Disk was constrained at intake. The project avoids third-party dependencies, downloaded game resources, media generation, and bulky binaries; build artifacts stay small and gitignored.
- Randomness is local and not certified for wagering. This is acceptable only because chips have no monetary value.

## Verification results

- 17 Node engine tests pass, including uncalled-bet refunds and chip conservation.
- 18 primary browser checks pass with zero console/page errors; screenshots were inspected at 320, 390, 768, 1024 and 1440 pixels, plus 200% page scale and reduced motion.
- 12 extended format checks pass across classic Hold’em, Omaha, PLO-5, PLO-6, Spin & Gold, Rush & Cash, All-in or Fold, Flip & Go, Mystery Bounty, export, reset, and console-error checks.
- The native app builds at 496 KB, passes ad-hoc signature verification, launches from `/Applications`, supports accessibility-driven gameplay, and preserves hand history after a graceful restart.
- QA found and fixed the app initializer, custom-table filtering, desktop hero-seat overlap, reset routing, immediate Rush & Cash replacement hand, negative-result formatting, uncalled-bet refunds, and inactive filter/HUD/squeeze controls. Test drivers were also corrected for mobile navigation and legitimate early hand completion.
- Detailed machine-readable results are in `evidence/ui-qa.json`, `evidence/formats-qa.json`, `evidence/native-qa.json`, and `evidence/offline-scan.json`.
