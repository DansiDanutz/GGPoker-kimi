(function attachPokerTable(root) {
  const Engine = root.GGEngine;
  const { icon } = root.GGIcons;
  const suits = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const variantNames = { holdem: 'No-Limit Hold’em', omaha: 'Pot-Limit Omaha', plo5: 'PLO-5', plo6: 'PLO-6', shortdeck: 'Short Deck' };
  const formatNames = { standard: 'Classic', rush: 'Rush & Cash', spin: 'Spin & Gold', aof: 'All-In or Fold', flip: 'Flip & Go', bounty: 'Mystery Bounty' };

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function formatChips(value) {
    return Math.floor(Number(value) || 0).toLocaleString('en-US');
  }

  function cardHTML(card, options = {}) {
    const { hidden = false, size = '', index = 0, placeholder = false, squeeze = false, flip = false, delay = 0, slot = null } = options;
    if (placeholder) return `<div class="playing-card card-placeholder ${size}" ${slot !== null ? `data-card-slot="${slot}"` : ''} aria-hidden="true"></div>`;
    if (hidden) return `<div class="playing-card card-back ${size}" style="--card-index:${index}" aria-label="Face-down card"></div>`;
    const suit = Engine.suitOf(card);
    const rank = card.slice(0, -1);
    const red = suit === 'h' || suit === 'd';
    return `<div class="playing-card ${red ? 'red' : ''} ${size} ${squeeze ? 'squeeze' : ''} ${flip ? 'flip' : ''}" data-card-code="${card}" ${slot !== null ? `data-card-slot="${slot}"` : ''} style="--card-index:${index};--flip-delay:${delay}ms" aria-label="${rank} of ${({ s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' })[suit]}"><span class="card-face card-front"><span class="card-rank">${rank}</span><span class="card-suit">${suits[suit]}</span></span><span class="card-face card-back-face" aria-hidden="true">GG</span></div>`;
  }

  function createSession(config, options = {}) {
    const bots = (options.bots || root.GGData.bots).slice(0, Math.max(1, Math.min(5, config.players - 1)));
    const hero = { id: 'hero', name: options.heroName || 'David', chips: options.heroChips || config.buyIn, isBot: false };
    const players = [hero, ...bots.map((bot) => ({ id: bot.id, name: bot.name, chips: config.buyIn, isBot: true }))];
    const multiplier = drawMultiplier();
    const state = Engine.startHand(players, {
      variant: config.variant,
      format: config.format,
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      handId: `${config.id}-${Date.now()}`,
    });
    return {
      config,
      state,
      bots,
      handNumber: 1,
      multiplier,
      showSpin: config.format === 'spin',
      spinStage: config.format === 'spin' ? 'awaiting' : null,
      difficulty: options.difficulty || 'balanced',
      theme: options.theme || 'emerald',
      hud: options.hud !== false,
      recorded: false,
      finished: false,
      spinBonus: 0,
      bounty: 0,
      squeezed: false,
      presentationCursor: 0,
      actionSignature: '',
    };
  }

  function drawMultiplier() {
    const roll = Math.random();
    if (roll > 0.995) return 200;
    if (roll > 0.97) return 25;
    if (roll > 0.88) return 10;
    if (roll > 0.65) return 5;
    if (roll > 0.35) return 3;
    return 2;
  }

  function apply(session, action) {
    if (session.finished) return session;
    const next = { ...session, squeezed: false };
    next.state = Engine.applyAction(session.state, action);
    if (next.config.format === 'spin' && next.state.street === 'complete' && !session.spinBonus) {
      const hero = next.state.players[0];
      const heroWon = (next.state.winnings.hero || 0) > 0;
      const expectedPrize = next.config.buyIn * next.multiplier;
      const normalPrize = next.state.winnings.hero || 0;
      next.spinBonus = heroWon ? Math.max(0, expectedPrize - normalPrize) : 0;
      hero.chips += next.spinBonus;
    }
    if (next.config.format === 'bounty' && next.state.street === 'complete' && !session.bounty) {
      const eliminated = next.state.players.some((player, index) => index > 0 && player.chips === 0 && player.folded === false);
      if (eliminated && (next.state.winnings.hero || 0) > 0) {
        next.bounty = [250, 500, 1000, 2500, 5000][Math.floor(Math.random() * 5)];
        next.state.players[0].chips += next.bounty;
      }
    }
    return next;
  }

  function preflopStrength(player) {
    const ranks = player.holeCards.map(Engine.rankOf).sort((a, b) => b - a);
    if (!ranks.length) return 0;
    let score = ranks[0] / 20 + (ranks[1] || 10) / 45;
    if (ranks[0] === ranks[1]) score += 0.27;
    if (Engine.suitOf(player.holeCards[0]) === Engine.suitOf(player.holeCards[1])) score += 0.05;
    return Math.min(1, score);
  }

  function handStrength(state, player) {
    if (!state.board.length) return preflopStrength(player);
    if (state.board.length < 3) return 0.5;
    const evaluation = Engine.evaluateBest(player.holeCards, state.board, { variant: state.variant });
    return Math.min(1, 0.16 + evaluation.score[0] * 0.105 + evaluation.score[1] / 100);
  }

  function botAct(session) {
    const state = session.state;
    const index = state.actingIndex;
    if (index == null || index === 0) return session;
    const player = state.players[index];
    const legal = Engine.getLegalActions(state, index);
    const strength = handStrength(state, player);
    const roll = Math.random();
    const expertise = session.difficulty === 'expert' ? 0.08 : session.difficulty === 'casual' ? -0.08 : 0;
    const bluff = session.difficulty === 'expert' ? 0.04 : 0.1;
    const raisesThisStreet = state.log.filter((entry) => entry.street === state.street && entry.player === player.id && entry.type === 'raise').length;
    if (session.config.format === 'aof') return apply(session, { type: strength + expertise > 0.55 ? 'allin' : 'fold' });
    if (legal.canRaise && raisesThisStreet < 2 && (strength + expertise > 0.82 || roll < bluff)) {
      const desired = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, state.currentBet + state.bigBlind * 2));
      if (strength > 0.94 && roll > 0.72) return apply(session, { type: 'allin' });
      return apply(session, { type: 'raise', amount: desired });
    }
    if (legal.canCall) {
      if (strength + expertise < 0.38 && roll > 0.12) return apply(session, { type: 'fold' });
      if (legal.callAmount >= player.chips && strength < 0.6) return apply(session, { type: 'fold' });
      return apply(session, { type: 'call' });
    }
    if (legal.canBet && (strength > 0.62 || roll < bluff)) return apply(session, { type: 'raise', amount: legal.minRaiseTo });
    if (legal.canCheck) return apply(session, { type: 'check' });
    return apply(session, { type: 'fold' });
  }

  function nextHand(session) {
    let players = session.state.players.map((player) => ({ id: player.id, name: player.name, chips: player.chips, isBot: player.isBot }));
    if (['spin', 'bounty'].includes(session.config.format)) players = players.filter((player) => player.chips > 0);
    if (players.length < 2 || players[0].chips <= 0) return { ...session, finished: true };
    const dealer = (session.state.dealer + 1) % players.length;
    const state = Engine.startHand(players, {
      variant: session.config.variant,
      format: session.config.format,
      smallBlind: session.config.smallBlind,
      bigBlind: session.config.bigBlind,
      dealerIndex: dealer,
      handId: `${session.config.id}-${Date.now()}-${session.handNumber + 1}`,
    });
    return {
      ...session,
      state,
      handNumber: session.handNumber + 1,
      showSpin: session.config.format === 'spin',
      spinStage: session.config.format === 'spin' ? 'awaiting' : null,
      multiplier: session.config.format === 'spin' ? drawMultiplier() : session.multiplier,
      recorded: false,
      spinBonus: 0,
      bounty: 0,
      squeezed: false,
      presentationCursor: 0,
      actionSignature: '',
    };
  }

  function rebuy(session) {
    const players = session.state.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      chips: index === 0 || player.chips <= 0 ? session.config.buyIn : player.chips,
      isBot: player.isBot,
    }));
    const state = Engine.startHand(players, {
      variant: session.config.variant,
      format: session.config.format,
      smallBlind: session.config.smallBlind,
      bigBlind: session.config.bigBlind,
      handId: `${session.config.id}-${Date.now()}-rebuy`,
    });
    return { ...session, state, handNumber: session.handNumber + 1, finished: false, recorded: false, spinBonus: 0, bounty: 0, presentationCursor: 0, actionSignature: '' };
  }

  function rabbitHunt(session) {
    const board = session.state.board.slice();
    const deck = session.state.deck.slice();
    while (board.length < 5 && deck.length) board.push(deck.pop());
    return board;
  }

  function latestAction(session) {
    const labels = { fold: 'folds', check: 'checks', call: 'calls', raise: 'raises', 'all-in': 'is all-in', 'call-all-in': 'calls all-in' };
    for (let index = session.state.log.length - 1; index >= 0; index -= 1) {
      const entry = session.state.log[index];
      if (labels[entry.type]) {
        const player = session.state.players.find((item) => item.id === entry.player);
        return `${player ? player.name : entry.player} ${labels[entry.type]}${entry.amount ? ` · ${formatChips(entry.amount)}` : ''}`;
      }
      if (entry.type === 'street') return `${entry.street[0].toUpperCase()}${entry.street.slice(1)} dealt`;
      if (entry.type === 'showdown') return 'Showdown';
    }
    return `Hand ${session.handNumber} · blinds ${session.config.blinds}`;
  }

  function playerAction(session, player) {
    for (let index = session.state.log.length - 1; index >= 0; index -= 1) {
      const entry = session.state.log[index];
      if (entry.player === player.id && ['fold', 'check', 'call', 'raise', 'all-in', 'call-all-in'].includes(entry.type)) return entry.type.replace('-', ' ').toUpperCase();
    }
    return '';
  }

  function seatCards(session, player, index) {
    const reveal = session.state.street === 'complete' && !player.folded;
    return player.holeCards.map((card, cardIndex) => cardHTML(card, {
      hidden: index !== 0 && !reveal,
      size: index === 0 ? '' : 'tiny',
      index: cardIndex,
      squeeze: index === 0 && session.squeezed,
    })).join('');
  }

  function renderSeat(session, player, index) {
    const state = session.state;
    const hero = index === 0;
    const bot = session.bots[index - 1];
    const active = state.actingIndex === index;
    const action = playerAction(session, player);
    const avatar = hero ? '<span class="avatar avatar-hero">D</span>' : `<span class="avatar">${root.GGScenes.avatar(bot || { color: '#567d70' }, Math.max(0, index - 1))}</span>`;
    return `<section class="seat seat-${index} ${hero ? 'seat-hero' : ''} ${player.folded ? 'folded' : ''} ${active ? 'active' : ''}" data-seat-id="${player.id}" data-cards="${player.holeCards.length}" data-cards-signature="${state.handId}:${player.holeCards.join('-')}:${state.street}:${session.squeezed}" aria-label="${escapeHTML(player.name)}, ${formatChips(player.chips)} chips${active ? ', acting now' : ''}">
      <div class="seat-cards">${seatCards(session, player, index)}</div>
      <div class="seat-info">${avatar}<div class="seat-copy"><strong>${escapeHTML(player.name)}${hero ? ' · Admin' : ''}</strong><small class="seat-stack">${formatChips(player.chips)}</small>${!hero && bot && session.hud ? `<div class="smart-hud"><span>VPIP ${bot.vpip}%</span><span>PFR ${bot.pfr}%</span></div>` : ''}</div>${state.dealer === index ? '<span class="dealer-button" aria-label="Dealer">D</span>' : ''}${action ? `<span class="seat-action">${action}</span>` : ''}</div>
      <span class="seat-bet" data-bet="${player.roundBet}">${player.roundBet ? `${root.GGScenes.chipStack(Math.ceil(player.roundBet / session.config.bigBlind), 'gold')}<b>${formatChips(player.roundBet)}</b>` : ''}</span>
    </section>`;
  }

  function renderActions(session) {
    const state = session.state;
    if (session.finished) return `<div class="action-dock complete-panel" data-action-region><h2>Table complete</h2><p>Your table result is saved in PokerCraft.</p><div class="complete-actions"><button class="button button-primary" data-action="leave-table">Return to lobby</button></div></div>`;
    if (state.street === 'complete') {
      const hero = state.players[0];
      const won = (state.winnings.hero || 0) + session.spinBonus + session.bounty;
      const net = won - hero.totalBet;
      const canNext = state.players[0].chips > 0;
      return `<div class="action-dock complete-panel" data-action-region><h2>${net > 0 ? `+${formatChips(net)} play chips` : `${formatChips(net)} play chips`}</h2><p>${won > 0 ? 'Hand won and added to your table stack.' : 'Hand complete. Review the cards or take on the next one.'}${session.spinBonus ? ` Spin bonus: ${formatChips(session.spinBonus)}.` : ''}${session.bounty ? ` Mystery bounty: ${formatChips(session.bounty)}.` : ''}</p><div class="complete-actions"><button class="button button-secondary" data-action="replay-current">${icon('history', 17)} Replay</button><button class="button button-secondary" data-action="rabbit-hunt">${icon('eye', 17)} Rabbit hunt</button><button class="button button-primary" data-action="${canNext ? 'next-hand' : 'rebuy-hand'}">${icon('play', 17)} ${canNext ? 'Next hand' : 'Rebuy & continue'}</button></div></div>`;
    }
    const legal = Engine.getLegalActions(state, 0);
    if (!legal.active) return `<div class="action-dock complete-panel" data-action-region><p>${state.players[0].folded ? 'You folded. Simulated opponents are finishing this hand.' : 'Simulated opponents are thinking…'}</p><div class="complete-actions"><button class="button button-secondary" data-action="toggle-squeeze">${icon('eye', 17)} Squeeze cards</button><button class="button button-ghost" data-action="leave-table">Leave table</button></div></div>`;
    const player = state.players[0];
    const aof = session.config.format === 'aof';
    const minimum = legal.minRaiseTo;
    const maximum = legal.maxRaiseTo;
    const raiseLabel = state.currentBet ? 'Raise to' : 'Bet';
    return `<div class="action-dock" data-action-region aria-label="Poker actions">
      ${aof ? '' : `<div class="bet-controls"><div class="bet-presets"><button class="button button-ghost" data-action="bet-fraction" data-value="0.5">½ pot</button><button class="button button-ghost" data-action="bet-fraction" data-value="0.75">¾ pot</button><button class="button button-ghost" data-action="bet-fraction" data-value="1">Pot</button></div><label class="sr-only" for="raise-range">Raise amount</label><input class="range" id="raise-range" type="range" min="${minimum}" max="${maximum}" value="${minimum}" step="${session.config.smallBlind}" ${legal.canRaise ? '' : 'disabled'}><output class="bet-value" id="raise-output" for="raise-range">${formatChips(minimum)}</output></div>`}
      <div class="action-buttons ${aof ? 'aof-actions' : ''}"><button class="button action-fold" data-action="poker-fold">${icon('close', 18)} Fold</button>${aof ? `<button class="button action-raise" data-action="poker-allin">${icon('chip', 18)} All-in ${formatChips(player.chips)}</button>` : `<button class="button button-secondary" data-action="${legal.canCheck ? 'poker-check' : 'poker-call'}">${icon('check', 18)} ${legal.canCheck ? 'Check' : `Call ${formatChips(legal.callAmount)}`}</button><button class="button action-raise" data-action="poker-raise" ${legal.canRaise ? '' : 'disabled'}>${icon('arrow', 18)} ${raiseLabel} <span id="raise-button-value">${formatChips(minimum)}</span></button>`}</div>
      ${aof ? '' : `<div class="action-hint">Your turn · ${formatNames[session.config.format]} · stack ${formatChips(player.chips)}</div>`}
    </div>`;
  }

  function render(session) {
    const state = session.state;
    const feltColors = { emerald: '#116044', midnight: '#193f67', graphite: '#3c4842', ruby: '#68352f' };
    return `<div class="table-page" data-hand-id="${state.handId}">
      <header class="table-toolbar"><button class="button button-ghost button-small" data-action="leave-table">${icon('chevron', 16)} Lobby</button><div class="table-title"><h1 tabindex="-1">${escapeHTML(session.config.name)}</h1><small>${variantNames[session.config.variant]} · ${formatNames[session.config.format]} · Hand ${session.handNumber}</small></div><div class="page-actions table-tags"><span class="tag">Blinds ${session.config.blinds}</span><span class="tag tag-green">Play chips</span>${session.config.format === 'spin' ? `<span class="tag tag-gold">Prize ×${session.multiplier}</span>` : ''}</div><button class="button button-secondary button-small" data-action="table-settings">${icon('settings', 16)} Table</button></header>
      <div class="table-layout">
        <div class="table-stage" data-street="${state.street}" style="--table-felt:${feltColors[session.theme] || feltColors.emerald}">
          <div class="table-scene">
            <div class="table-status"><span class="tag tag-green">Offline simulation</span><span class="tag" data-street-label>${state.street.toUpperCase()}</span></div>
            <div class="table-side-actions"><button class="button button-ghost button-small" data-action="toggle-squeeze">${icon('eye', 16)} Squeeze</button><button class="button button-ghost button-small" data-action="rabbit-hunt">${icon('history', 16)} Rabbit</button></div>
            <div class="poker-felt" aria-label="Poker table"><span class="table-watermark">GG PLAY MONEY</span><div class="pot-display"><span class="pot-chips">${root.GGScenes.chipStack(5, 'gold')}</span><small>Total pot</small><strong>${icon('chip', 17)} <span data-pot-value>${formatChips(Engine.getPotTotal(state))}</span></strong></div><div class="community-cards" aria-label="Community cards">${Array.from({ length: 5 }, (_, index) => state.board[index] ? cardHTML(state.board[index], { index, slot: index }) : cardHTML('', { placeholder: true, slot: index })).join('')}</div></div>
            ${state.players.map((player, index) => renderSeat(session, player, index)).join('')}
            <div class="last-action" aria-live="polite">${escapeHTML(latestAction(session))}</div>
          </div>
        </div>
        ${renderActions(session)}
      </div>
    </div>`;
  }

  function patch(session) {
    const page = document.querySelector('.table-page');
    if (!page || page.dataset.handId !== session.state.handId) return false;
    const state = session.state;
    const events = state.log.slice(session.presentationCursor || 0);
    session.presentationCursor = state.log.length;
    const streetEvents = events.filter((entry) => entry.type === 'street');
    const streetDelay = new Map();
    streetEvents.forEach((entry, eventIndex) => entry.board.forEach((card) => streetDelay.set(card, eventIndex * 180)));
    const stage = page.querySelector('.table-stage');
    stage.dataset.street = state.street;
    page.querySelector('[data-street-label]').textContent = state.street.toUpperCase();
    page.querySelector('.table-title small').textContent = `${variantNames[session.config.variant]} · ${formatNames[session.config.format]} · Hand ${session.handNumber}`;
    const potValue = page.querySelector('[data-pot-value]');
    const nextPot = formatChips(Engine.getPotTotal(state));
    if (potValue.textContent !== nextPot) {
      potValue.textContent = nextPot;
      const pot = page.querySelector('.pot-display');
      pot.classList.remove('pulse');
      void pot.offsetWidth;
      pot.classList.add('pulse');
    }
    const slots = page.querySelectorAll('.community-cards > [data-card-slot]');
    slots.forEach((slot) => {
      const index = Number(slot.dataset.cardSlot);
      const card = state.board[index];
      if (!card) {
        if (!slot.classList.contains('card-placeholder')) slot.outerHTML = cardHTML('', { placeholder: true, slot: index });
      } else if (slot.dataset.cardCode !== card) {
        slot.outerHTML = cardHTML(card, { index, slot: index, flip: true, delay: streetDelay.get(card) || 0 });
      }
    });
    state.players.forEach((player, index) => {
      const seat = page.querySelector(`[data-seat-id="${player.id}"]`);
      if (!seat) return;
      seat.classList.toggle('folded', player.folded);
      seat.classList.toggle('active', state.actingIndex === index);
      seat.setAttribute('aria-label', `${player.name}, ${formatChips(player.chips)} chips${state.actingIndex === index ? ', acting now' : ''}`);
      const signature = `${state.handId}:${player.holeCards.join('-')}:${state.street}:${session.squeezed}`;
      if (seat.dataset.cardsSignature !== signature) {
        seat.querySelector('.seat-cards').innerHTML = seatCards(session, player, index);
        seat.dataset.cardsSignature = signature;
      }
      seat.querySelector('.seat-stack').textContent = formatChips(player.chips);
      const action = playerAction(session, player);
      let actionLabel = seat.querySelector('.seat-action');
      if (action && !actionLabel) {
        seat.querySelector('.seat-info').insertAdjacentHTML('beforeend', `<span class="seat-action">${action}</span>`);
      } else if (actionLabel) {
        if (action) actionLabel.textContent = action;
        else actionLabel.remove();
      }
      const bet = seat.querySelector('.seat-bet');
      if (bet.dataset.bet !== String(player.roundBet)) {
        bet.innerHTML = player.roundBet ? `${root.GGScenes.chipStack(Math.ceil(player.roundBet / session.config.bigBlind), 'gold')}<b>${formatChips(player.roundBet)}</b>` : '';
        bet.classList.remove('added');
        void bet.offsetWidth;
        if (player.roundBet) bet.classList.add('added');
        bet.dataset.bet = String(player.roundBet);
      }
    });
    page.querySelector('.last-action').textContent = latestAction(session);
    const legal = Engine.getLegalActions(state, 0);
    const signature = [state.street, state.actingIndex, state.currentBet, legal.callAmount, legal.minRaiseTo, legal.maxRaiseTo, session.finished, session.squeezed].join(':');
    if (session.actionSignature !== signature) {
      const active = document.activeElement && document.activeElement.closest('[data-action-region]') ? document.activeElement.dataset.action : null;
      const previous = page.querySelector('[data-action-region]');
      const holder = document.createElement('div');
      holder.innerHTML = renderActions(session);
      const nextRegion = holder.firstElementChild;
      previous.className = nextRegion.className;
      previous.setAttribute('aria-label', nextRegion.getAttribute('aria-label') || 'Poker actions');
      previous.innerHTML = nextRegion.innerHTML;
      session.actionSignature = signature;
      const region = previous;
      if (active) {
        const equivalent = region.querySelector(`[data-action="${active}"]`);
        if (equivalent) equivalent.focus({ preventScroll: true });
        else {
          const fallback = region.querySelector('button:not(:disabled)') || page.querySelector('.table-title h1');
          fallback.focus({ preventScroll: true });
        }
      }
    }
    return true;
  }

  root.GGPokerTable = { createSession, apply, botAct, nextHand, rebuy, rabbitHunt, render, patch, cardHTML, formatChips, variantNames, formatNames, escapeHTML };
})(typeof globalThis !== 'undefined' ? globalThis : this);
