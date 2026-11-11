# Noir & Gold redesign — EGM-reviewed implementation specification

## Context and verdict

The first release is functionally strong but visually reads as a generic SaaS poker dashboard. EGM design and structural reviewers independently identified four root problems: uniform green materials, interchangeable game artwork, a diagram-like table, and full-view rendering that destroys stable motion/focus. This redesign changes art direction and the table rendering boundary while preserving the tested game engine and play-money guarantees.

## Direction: Noir & Gold Cardroom

- **Chrome:** near-black navy with compact utility navigation, grouped Play / Progress / Administration destinations, and explicit accessible names.
- **Promotion:** oxblood/crimson, metallic gold, ivory cards, directional rim lighting, and original cinematic format scenes.
- **Gameplay:** saturated emerald felt inside a layered dark rail. 2.5D material depth and selective real card flips, not an orbiting camera or a game engine.
- **Analytics:** deliberate dark navy with cyan/gold data accents and a visible zero baseline.
- **Disclosure:** one clear, persistent `Offline · play chips` indicator. Remove repeated decorative disclaimers without hiding the guarantee.

## Shell and information hierarchy

1. Replace the wide labeled sidebar with an 84px desktop utility rail. Group primary play, progress, and admin rather than presenting eight equal destinations. Use labels/tooltips and explicit `aria-label` values at every breakpoint.
2. Keep search, sound, wallet, and profile in a slim top utility bar. Simplify mobile utilities and preserve labeled bottom navigation outside immersive table view.
3. Home has one H1 inside a static featured Spin & Gold scene. Greeting and account statistics become supporting content, not the dominant message.
4. Use available-space grids and readable metadata. Essential text and controls remain at least 12px; interactive hit areas are at least 44px even when visual chrome is smaller.
5. Use ordinary filter buttons with `aria-pressed` rather than incomplete tab semantics. Set the main landmark label from the active route H1.

## Original format artwork

Add `src/scenes.js` with cached, original inline SVG/DOM scenes. No downloaded proprietary assets or paid generation.

- **Spin & Gold:** cropped segmented wheel, gold rim, red/black segments, fixed pointer, prize multiplier.
- **Rush & Cash:** directional trails and displaced cards with compressed perspective.
- **All-in or Fold:** opposing card/chip clusters and a stark decision split.
- **Flip & Go:** cards mid-turn with fragmented stage lighting.
- **Mystery Bounty:** sealed vault/envelope and concealed reward glow.
- **Hold’em / Omaha / PLO-5 / PLO-6 / Short Deck:** distinct 2/4/5/6-card fans and table-specific accent lighting.
- **Avatars and chips:** a small original SVG portrait/emblem set and layered chip stacks. Names, balances, cards, and controls remain semantic DOM text.

Home game artwork uses 160–200px visual areas on desktop with consistent responsive aspect ratios. Format, stakes, availability, and buy-in remain the primary decision information.

## Table scene and geometry

Use a route-level grid: toolbar, decorative scene, then action/result region in normal flow. Remove the absolute action dock and negative-margin table coupling.

- One normalized `.table-scene` contains rail, felt, board, pot, seats, and chip stacks. Size from its container with `aspect-ratio` and `clamp()`; never mix unrelated viewport units and stage percentages.
- Layer dark outer rail, metallic/wood-edge highlight, inner rail shadow, felt, subtle vignette, and restrained center mark.
- Keep the surface mostly top-down. Use perspective/rotateX only on decorative felt/cards, never on seat text or legal controls.
- Hero cards are larger and count-aware for 2/4/5/6 cards. Side-seat cards and interactive content cannot be clipped at 320px or mobile landscape.
- Show physical chip stacks for active bets and the pot. Active-player emphasis uses a single rim light and action label; no fake countdown.

## Stable rendering and causal motion

Replace full-table `innerHTML` replacement with an initial scene skeleton plus incremental updates keyed by hand ID, seat ID, street, and card identity. Preserve route-level navigation, focus, and a persistent live announcer.

- New hole cards: 180–240ms dealer-origin flight with short stagger.
- Flop/turn/river: separate front/back faces, `backface-visibility`, 180–260ms reveal.
- Bets: 220–300ms chip travel from seat to betting position, merging toward the pot between streets.
- Pot settlement: one short movement toward the winner and a restrained highlight.
- No idle animation loop. Use CSS/WAAPI transforms and opacity only during real events.
- Focused controls survive bot actions. If a control disappears, focus moves to the equivalent legal action or scene heading.

Bot and casino logic timing must not depend on animation preference. Combine the saved motion setting with `matchMedia('(prefers-reduced-motion: reduce)')` for visual effects only.

## Deterministic Spin & Gold reveal

- `drawMultiplier()` remains the sole source of the result.
- A native accessible dialog presents the original wheel. The user selects **Reveal prize**; the wheel decelerates once for 1.2–1.8 seconds into the preselected segment, then **Start game** becomes available.
- Reduced motion shows the final position immediately. Announce the numeric multiplier and prize in a live region; animation is never the only result communication.

## Dialog and navigation accessibility

- Standardize notifications, replay, settings, reset, rabbit hunt, and Spin on native `<dialog>` with labelled titles, focus containment, Escape/backdrop handling, and focus restoration.
- Closed mobile navigation is `inert`; opening it traps focus, shows a backdrop, supports Escape, and restores focus. Synchronize `aria-expanded` and allow vertical scrolling.
- One route H1, labelled sections, descriptive replay buttons, semantic progress values, and textual chart alternatives.
- Persist a status announcer outside table updates. Table theme controls expose `aria-pressed`.

## PokerCraft correction

- Navy analytical surfaces, not lobby green.
- SVG or CSS outcomes around a visible zero baseline with positive/negative direction, units, and accessible text/table equivalents.
- No-data state shows no fabricated bars.
- Add variant/format/recent filters before ornamental animation.

## Audio and performance

- Keep background music off. Layer short filtered-noise card flicks and several detuned chip transients; keep win feedback restrained.
- Cache complex SVG scenes and use no permanent `will-change`. Avoid large continuous blur/parallax work.
- Optional hero parallax is limited to 1–2° on fine pointers and disabled for coarse pointers/reduced motion.
- All assets remain bundled and HTTP(S) stays blocked.

## Acceptance gates

1. Existing 17 engine tests and 12 format checks stay green.
2. Primary UI QA expands for the compact shell, format scenes, wheel reveal, focus persistence, dialogs, and corrected analytics.
3. Deterministic unique screenshots use route/state/width/height/theme/motion names. Clean or namespace output per run; no stale or duplicate evidence paths.
4. Layout matrix covers 320, 390, 700/701, 768, 900/901, 1024, 1180/1181, 1440, and 1500 where relevant, including 320×568 and mobile landscape.
5. Table states cover two/four/six seats, all hole-card counts, hero turn, bots thinking, folded, completed, Spin dialog, settings, replay, and rabbit hunt.
6. Assert internal overflow and bounding boxes for seats, cards, pot, toolbar, and action regions. `overflow:hidden` is not accepted as proof of fit.
7. Test accessible names at every breakpoint and dialog, one H1 per route, 44px targets, keyboard drawer/dialog behavior, and focus through bot actions.
8. Verify OS and in-app reduced motion, native WebKit zoom/reflow, and native accessibility gameplay/persistence.
9. Fresh EGM design/structure reviewers inspect the implementation and evidence before the final commit.

## Non-goals

No WebGL dependency, continuous 3D camera, particle explosions, remote multiplayer, payment/cashier, real-money labels, proprietary artwork, or claims of exact behavior for the unavailable full GGPoker client.


## Implementation addendum — readiness decisions

### Rendering and event contract

- `mountTable(session)` creates one scene skeleton and returns stable references. `patchTable(previous, next)` updates those references in place. Route-level navigation and the live announcer are not recreated.
- Every session has a presentation log cursor. A patch processes `next.state.log` from that cursor forward, then advances it. New hands reset the cursor to zero. Initial blinds/dealing use a synthetic `deal` event because the engine’s blinds entry is not an action.
- Events are handled chronologically: initial deal/blind chips → actions/chip travel → each street reveal in log order → chip merge → showdown/pot settlement → completed-action region. A multi-street all-in runout therefore visualizes every logged street rather than jumping directly to the final board.
- Legal game state and bot timers never wait for presentation. Visual state may fast-forward to the latest engine state when another action arrives. Next hand, leaving, route changes, and reduced motion cancel the active queue and clear transient effects without changing engine outcomes.
- Table QA asserts stable seat, board, pot, action-region, navigation, and announcer DOM identities across bot updates. It also asserts the street event sequence for an all-in runout and focus fallback when the current legal action disappears.

### Spin & Gold state machine

States are **awaiting reveal**, **revealing**, and **revealed**.

- Awaiting reveal: **Reveal prize** is enabled. Starting more than once is blocked. Escape/backdrop/close leaves the table through the normal cashout path; it never leaves a hidden `showSpin` gate.
- Revealing: Reveal is disabled. Escape/backdrop/close fast-forwards to the final position instead of closing. Leaving remains available through a separate explicit action and cancels presentation.
- Revealed: **Start game** is enabled. Start, Escape, backdrop, or close clears `showSpin`, closes the dialog, and begins bot scheduling. Focus goes to the table H1 or first legal action, not the removed lobby button.
- Wheel segment order is `[2, 3, 5, 10, 25, 200]`, six equal 60° spans with a fixed pointer at the top. The target is the segment center. Final rotation is `5 * 360 + (360 - (index * 60 + 30))` degrees. The multiplier text is always exposed independently of wheel orientation.
- Reduced motion displays the final rotation and result immediately. Existing Spin QA is updated to select Reveal before Start while preserving the behavioral check count.

### PokerCraft filters and chart

- Variant options: `all`, `holdem`, `omaha` (includes PLO-5/6), `shortdeck`. Default: `all`.
- Format options: `all`, `standard`, `rush`, `spin`, `aof`, `flip`, `bounty`. Default: `all`.
- Period options: `recent10` (latest ten completed hands) and `all`. Default: `recent10`.
- Filters apply to summary statistics, chart, and history table. Table order remains newest first. Empty results show zeroed statistics and an explicit empty chart/table state.
- Chart scaling: the largest absolute net result is 100%. The zero line is centered. Positive and negative bars each use at most 45% of chart height in their respective direction, with play-chip values and a textual equivalent.

### Intentional test changes

The redesign intentionally changes Home’s H1 and adds Reveal to Spin & Gold. Existing behavioral assertions may change for those interfaces while the number and meaning of the 12 format checks are preserved. Bot/casino outcome timing is tested with both in-app and OS reduced motion enabled; animation completion never gates those outcomes.
