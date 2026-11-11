(function attachCasino(root) {
  const Engine = root.GGEngine;
  const { icon } = root.GGIcons;
  const { cardHTML, formatChips } = root.GGPokerTable;

  function createSession(game = 'blackjack') {
    return {
      game,
      wager: 100,
      status: 'idle',
      message: 'Choose your play-chip wager and start a round.',
      player: [],
      dealer: [],
      deck: [],
      spinning: false,
      symbols: ['GG', 'GG', 'GG'],
      number: null,
      betType: 'red',
      betValue: null,
      banker: [],
      baccaratPlayer: [],
      baccaratResult: null,
    };
  }

  function debit(context, amount) {
    if (context.balance < amount) {
      context.notify('Not enough play chips', 'Claim the daily reward or adjust your local balance in Admin.', true);
      return false;
    }
    context.debit(amount);
    return true;
  }

  function act(session, action, context) {
    const next = { ...session };
    if (action === 'set-wager') {
      next.wager = Math.max(10, Math.floor(Number(context.value) || 100));
      return next;
    }
    if (action === 'roulette-bet') {
      next.betType = context.betType;
      next.betValue = context.value == null ? null : Number(context.value);
      next.message = `Bet selected: ${next.betType}${next.betValue != null ? ` ${next.betValue}` : ''}. Spin when ready.`;
      return next;
    }
    if (action === 'blackjack-deal') {
      if (!debit(context, next.wager)) return next;
      next.deck = Engine.shuffle(Engine.createDeck());
      next.player = [next.deck.pop(), next.deck.pop()];
      next.dealer = [next.deck.pop(), next.deck.pop()];
      next.status = 'playing';
      next.message = 'Hit, stand, or double down.';
      if (Engine.blackjackScore(next.player).total === 21) return settleBlackjack(next, context, true);
      return next;
    }
    if (action === 'blackjack-hit' && next.status === 'playing') {
      next.player = next.player.concat(next.deck.pop());
      if (Engine.blackjackScore(next.player).total > 21) {
        next.status = 'complete';
        next.message = `Bust with ${Engine.blackjackScore(next.player).total}. Dealer takes the round.`;
      } else {
        next.message = `${Engine.blackjackScore(next.player).total}. Hit again or stand.`;
      }
      return next;
    }
    if (action === 'blackjack-double' && next.status === 'playing') {
      if (!debit(context, next.wager)) return next;
      next.wager *= 2;
      next.player = next.player.concat(next.deck.pop());
      if (Engine.blackjackScore(next.player).total > 21) {
        next.status = 'complete';
        next.message = 'Bust after doubling. Dealer takes the round.';
        return next;
      }
      return settleBlackjack(next, context);
    }
    if (action === 'blackjack-stand' && next.status === 'playing') return settleBlackjack(next, context);
    if (action === 'slots-spin') {
      if (!debit(context, next.wager)) return next;
      const symbols = ['SEVEN', 'GEM', 'BELL', 'GG', 'ACE', 'CHIP'];
      next.symbols = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
      next.payout = Engine.evaluateSlots(next.symbols.map((symbol) => ({ SEVEN: 'seven', GEM: 'diamond', BELL: 'bell', GG: 'spade', ACE: 'heart', CHIP: 'club' })[symbol]), next.wager);
      next.spinning = true;
      next.status = 'spinning';
      next.message = 'Reels are spinning…';
      return next;
    }
    if (action === 'roulette-spin') {
      if (!debit(context, next.wager)) return next;
      next.number = Math.floor(Math.random() * 37);
      next.payout = next.wager * Engine.roulettePayout({ type: next.betType, value: next.betValue }, next.number);
      next.spinning = true;
      next.status = 'spinning';
      next.message = 'No more bets. Wheel spinning…';
      return next;
    }
    if (action === 'baccarat-deal') {
      if (!debit(context, next.wager)) return next;
      const result = Engine.dealBaccarat();
      next.baccaratPlayer = result.player;
      next.banker = result.banker;
      next.baccaratResult = result;
      const payoutRatio = result.winner === 'tie' ? 9 : result.winner === next.betType ? (result.winner === 'banker' ? 1.95 : 2) : 0;
      next.payout = Math.floor(next.wager * payoutRatio);
      if (next.payout) context.credit(next.payout);
      next.status = 'complete';
      next.message = `${result.winner === 'tie' ? 'Tie' : `${result.winner === 'player' ? 'Player' : 'Banker'} wins`} · ${result.playerScore} to ${result.bankerScore}. ${next.payout ? `You receive ${formatChips(next.payout)} chips.` : 'Your selected side did not win.'}`;
      return next;
    }
    return next;
  }

  function resolve(session, context) {
    const next = { ...session, spinning: false, status: 'complete' };
    if (next.game === 'slots') {
      if (next.payout) context.credit(next.payout);
      next.message = next.payout ? `${next.symbols.join(' · ')} pays ${formatChips(next.payout)} play chips.` : `${next.symbols.join(' · ')} · no matching combination this time.`;
    } else if (next.game === 'roulette') {
      if (next.payout) context.credit(next.payout);
      next.message = `The ball landed on ${next.number}. ${next.payout ? `Your ${next.betType} bet pays ${formatChips(next.payout)} chips.` : 'Your selected bet did not win.'}`;
    }
    return next;
  }

  function settleBlackjack(session, context, natural = false) {
    const next = { ...session };
    while (Engine.blackjackScore(next.dealer).total < 17) next.dealer.push(next.deck.pop());
    const playerScore = Engine.blackjackScore(next.player).total;
    const dealerScore = Engine.blackjackScore(next.dealer).total;
    let payout = 0;
    let outcome = '';
    if (natural && dealerScore !== 21) {
      payout = Math.floor(next.wager * 2.5);
      outcome = 'Blackjack! Paid 3:2.';
    } else if (dealerScore > 21 || playerScore > dealerScore) {
      payout = next.wager * 2;
      outcome = dealerScore > 21 ? `Dealer busts with ${dealerScore}.` : `${playerScore} beats ${dealerScore}.`;
    } else if (playerScore === dealerScore) {
      payout = next.wager;
      outcome = `Push at ${playerScore}. Your wager is returned.`;
    } else {
      outcome = `Dealer wins ${dealerScore} to ${playerScore}.`;
    }
    if (payout) context.credit(payout);
    next.payout = payout;
    next.status = 'complete';
    next.message = `${outcome}${payout ? ` ${formatChips(payout)} chips returned.` : ''}`;
    return next;
  }

  function wagerControls(session, startAction, startLabel) {
    return `<div class="casino-controls"><div class="field"><label for="casino-wager">Wager in play chips</label><select class="select" id="casino-wager" data-action="casino-wager" ${session.status === 'playing' || session.spinning ? 'disabled' : ''}>${[100, 250, 500, 1000, 2500].map((value) => `<option value="${value}" ${session.wager === value ? 'selected' : ''}>${formatChips(value)}</option>`).join('')}</select></div><button class="button button-primary" data-action="${startAction}" ${session.status === 'playing' || session.spinning ? 'disabled' : ''}>${icon('play', 17)} ${startLabel}</button></div>`;
  }

  function renderBlackjack(session) {
    const reveal = session.status === 'complete';
    return `<div class="casino-table"><div class="blackjack-row"><strong>DEALER ${reveal ? `· ${Engine.blackjackScore(session.dealer).total}` : ''}</strong><div class="card-hand">${session.dealer.length ? session.dealer.map((card, index) => cardHTML(card, { hidden: !reveal && index === 1, index })).join('') : '<span class="muted">Dealer waits for your wager</span>'}</div></div><div class="blackjack-row"><strong>YOU ${session.player.length ? `· ${Engine.blackjackScore(session.player).total}` : ''}</strong><div class="card-hand">${session.player.map((card, index) => cardHTML(card, { index })).join('')}</div></div></div><p class="game-message" aria-live="polite">${session.message}</p>${session.status === 'playing' ? `<div class="casino-controls"><button class="button button-secondary" data-action="blackjack-hit">${icon('plus', 17)} Hit</button><button class="button button-primary" data-action="blackjack-stand">${icon('check', 17)} Stand</button><button class="button button-gold" data-action="blackjack-double">${icon('chip', 17)} Double</button></div>` : wagerControls(session, 'blackjack-deal', session.status === 'complete' ? 'Deal again' : 'Deal cards')}`;
  }

  function renderSlots(session) {
    return `<div class="slot-machine"><div class="slot-reels">${session.symbols.map((symbol, index) => `<div class="slot-reel ${session.spinning ? 'spinning' : ''}" style="animation-delay:${index * 80}ms">${session.spinning ? 'GG' : symbol}</div>`).join('')}</div></div><p class="game-message" aria-live="polite">${session.message}</p>${wagerControls(session, 'slots-spin', session.spinning ? 'Spinning…' : 'Spin reels')}<div class="card-pad" style="margin-top:18px"><small>Three SEVEN symbols pay 50× · GEM 25× · BELL 15× · GG 10× · ACE 8× · CHIP 5×. Any two matching symbols pay 2×. Payouts include play-chip winnings only.</small></div>`;
  }

  function renderRoulette(session) {
    const bets = [['red', 'Red'], ['black', 'Black'], ['even', 'Even'], ['odd', 'Odd'], ['low', '1–18'], ['high', '19–36']];
    return `<div class="roulette-layout"><div class="roulette-wheel ${session.spinning ? 'spinning' : ''}"><div class="roulette-number">${session.number == null ? '?' : session.number}</div></div><div><div class="roulette-bets">${bets.map(([type, label]) => `<button class="button button-secondary ${session.betType === type ? 'active' : ''}" data-action="roulette-bet" data-bet="${type}">${label}</button>`).join('')}<button class="button button-secondary ${session.betType === 'number' && session.betValue === 0 ? 'active' : ''}" data-action="roulette-bet" data-bet="number" data-value="0">Zero · 35:1</button><button class="button button-secondary ${session.betType === 'dozen' && session.betValue === 1 ? 'active' : ''}" data-action="roulette-bet" data-bet="dozen" data-value="1">1st 12 · 2:1</button><button class="button button-secondary ${session.betType === 'dozen' && session.betValue === 2 ? 'active' : ''}" data-action="roulette-bet" data-bet="dozen" data-value="2">2nd 12 · 2:1</button></div></div></div><p class="game-message" aria-live="polite">${session.message}</p>${wagerControls(session, 'roulette-spin', session.spinning ? 'Spinning…' : 'Spin wheel')}`;
  }

  function renderBaccarat(session) {
    return `<div class="casino-table"><div class="baccarat-scores"><strong>BANKER ${session.baccaratResult ? session.baccaratResult.bankerScore : ''}</strong><strong>PLAYER ${session.baccaratResult ? session.baccaratResult.playerScore : ''}</strong></div><div class="blackjack-row"><strong>BANKER</strong><div class="card-hand">${session.banker.map((card, index) => cardHTML(card, { index })).join('')}</div></div><div class="blackjack-row"><strong>PLAYER</strong><div class="card-hand">${session.baccaratPlayer.map((card, index) => cardHTML(card, { index })).join('')}</div></div></div><p class="game-message" aria-live="polite">${session.message}</p><div class="casino-controls">${['player', 'banker', 'tie'].map((type) => `<button class="button button-secondary ${session.betType === type ? 'active' : ''}" data-action="roulette-bet" data-bet="${type}">${type === 'tie' ? 'Tie · 8:1' : `${type === 'player' ? 'Player' : 'Banker'} · ${type === 'banker' ? '0.95:1' : '1:1'}`}</button>`).join('')}</div>${wagerControls(session, 'baccarat-deal', session.status === 'complete' ? 'Deal again' : 'Deal baccarat')}`;
  }

  function render(session) {
    const names = { blackjack: 'Blackjack', slots: 'River Slots', roulette: 'European Roulette', baccarat: 'Baccarat' };
    const descriptions = { blackjack: 'Beat the dealer to 21. Dealer stands on all 17s.', slots: 'Three local reels with transparent play-chip payouts.', roulette: 'Single-zero wheel with red, black, even, odd, ranges and dozens.', baccarat: 'Classic third-card rules with player, banker and tie bets.' };
    return `<div class="casino-game-head"><div><h2>${names[session.game]}</h2><p>${descriptions[session.game]}</p></div><span class="tag tag-green">Play chips only</span></div>${({ blackjack: renderBlackjack, slots: renderSlots, roulette: renderRoulette, baccarat: renderBaccarat })[session.game](session)}`;
  }

  root.GGCasino = { createSession, act, resolve, render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
