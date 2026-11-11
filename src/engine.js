(function attachEngine(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GGEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const SUITS = ['s', 'h', 'd', 'c'];
  const RANK_CODES = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const RANK_VALUES = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
  const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  function rankOf(card) {
    const code = card.slice(0, -1);
    return RANK_VALUES[code] || Number(code);
  }

  function suitOf(card) {
    return card.slice(-1);
  }

  function createDeck(shortDeck = false) {
    const minimum = shortDeck ? 6 : 2;
    const cards = [];
    for (const suit of SUITS) {
      for (let rank = minimum; rank <= 14; rank += 1) cards.push(`${RANK_CODES[rank]}${suit}`);
    }
    return cards;
  }

  function shuffle(deck, rng = Math.random) {
    const result = deck.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(rng() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function combinations(items, size) {
    const output = [];
    function visit(start, selected) {
      if (selected.length === size) {
        output.push(selected.slice());
        return;
      }
      for (let index = start; index <= items.length - (size - selected.length); index += 1) {
        selected.push(items[index]);
        visit(index + 1, selected);
        selected.pop();
      }
    }
    visit(0, []);
    return output;
  }

  function straightHigh(cards, shortDeck) {
    const ranks = [...new Set(cards.map(rankOf))].sort((a, b) => b - a);
    if (ranks.includes(14)) ranks.push(1);
    const lowStraight = shortDeck ? [9, 8, 7, 6, 1] : [5, 4, 3, 2, 1];
    for (let start = 0; start <= ranks.length - 5; start += 1) {
      const window = ranks.slice(start, start + 5);
      if (window.every((rank, index) => index === 0 || rank === window[index - 1] - 1)) {
        return window[0] === 1 ? window[1] : window[0];
      }
    }
    if (lowStraight.every((rank) => ranks.includes(rank))) return lowStraight[0];
    return 0;
  }

  function evaluateFive(cards, shortDeck = false) {
    if (!Array.isArray(cards) || cards.length !== 5) throw new Error('Exactly five cards are required');
    const ranks = cards.map(rankOf).sort((a, b) => b - a);
    const counts = new Map();
    for (const rank of ranks) counts.set(rank, (counts.get(rank) || 0) + 1);
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cards.every((card) => suitOf(card) === suitOf(cards[0]));
    const straight = straightHigh(cards, shortDeck);
    let score;
    let name;
    if (flush && straight) {
      score = [8, straight];
      name = straight === 14 ? 'Royal Flush' : 'Straight Flush';
    } else if (groups[0][1] === 4) {
      score = [7, groups[0][0], groups[1][0]];
      name = 'Four of a Kind';
    } else if (flush) {
      score = [shortDeck ? 6 : 5, ...ranks];
      name = 'Flush';
    } else if (groups[0][1] === 3 && groups[1][1] === 2) {
      score = [shortDeck ? 5 : 6, groups[0][0], groups[1][0]];
      name = 'Full House';
    } else if (straight) {
      score = [4, straight];
      name = 'Straight';
    } else if (groups[0][1] === 3) {
      score = [3, groups[0][0], ...groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)];
      name = 'Three of a Kind';
    } else if (groups[0][1] === 2 && groups[1][1] === 2) {
      const pairs = groups.slice(0, 2).map((group) => group[0]).sort((a, b) => b - a);
      score = [2, ...pairs, groups[2][0]];
      name = 'Two Pair';
    } else if (groups[0][1] === 2) {
      score = [1, groups[0][0], ...groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)];
      name = 'Pair';
    } else {
      score = [0, ...ranks];
      name = 'High Card';
    }
    return { score, name, cards: cards.slice() };
  }

  function compareScores(left, right) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const difference = (left[index] || 0) - (right[index] || 0);
      if (difference) return Math.sign(difference);
    }
    return 0;
  }

  function evaluateBest(holeCards, boardCards, options = {}) {
    const variant = options.variant || 'holdem';
    const shortDeck = options.shortDeck || variant === 'shortdeck';
    const omaha = ['omaha', 'plo5', 'plo6'].includes(variant);
    const candidates = omaha
      ? combinations(holeCards, 2).flatMap((holes) => combinations(boardCards, 3).map((board) => holes.concat(board)))
      : combinations(holeCards.concat(boardCards), 5);
    if (!candidates.length) throw new Error('Not enough cards to evaluate a hand');
    let best = null;
    for (const cards of candidates) {
      const evaluated = evaluateFive(cards, shortDeck);
      if (!best || compareScores(evaluated.score, best.score) > 0) best = evaluated;
    }
    return best;
  }

  function buildSidePots(players) {
    const levels = [...new Set(players.map((player) => player.totalBet).filter((bet) => bet > 0))].sort((a, b) => a - b);
    const pots = [];
    let previous = 0;
    for (const level of levels) {
      const contributors = players.filter((player) => player.totalBet >= level);
      const amount = (level - previous) * contributors.length;
      pots.push({
        amount,
        cap: level,
        contributors: contributors.map((player) => player.id),
        eligible: contributors.filter((player) => !player.folded).map((player) => player.id),
      });
      previous = level;
    }
    return pots;
  }

  function settlePots(players, board, options = {}) {
    const winnings = Object.fromEntries(players.map((player) => [player.id, 0]));
    const pots = buildSidePots(players).map((pot) => {
      if (!pot.eligible.length) {
        const share = Math.floor(pot.amount / pot.contributors.length);
        let remainder = pot.amount - share * pot.contributors.length;
        for (const id of pot.contributors) {
          winnings[id] += share + (remainder > 0 ? 1 : 0);
          remainder -= 1;
        }
        return { ...pot, winners: pot.contributors, refund: true, evaluated: [] };
      }
      const evaluated = pot.eligible.map((id) => {
        const player = players.find((entry) => entry.id === id);
        return { id, evaluation: evaluateBest(player.holeCards, board, options) };
      });
      let winners = [];
      let best = null;
      for (const entry of evaluated) {
        const comparison = best ? compareScores(entry.evaluation.score, best) : 1;
        if (comparison > 0) {
          best = entry.evaluation.score;
          winners = [entry.id];
        } else if (comparison === 0) {
          winners.push(entry.id);
        }
      }
      if (winners.length) {
        const share = Math.floor(pot.amount / winners.length);
        let remainder = pot.amount - share * winners.length;
        for (const id of winners) {
          winnings[id] += share + (remainder > 0 ? 1 : 0);
          remainder -= 1;
        }
      }
      return { ...pot, winners, evaluated };
    });
    return { pots, winnings };
  }

  function getPotTotal(state) {
    return state.players.reduce((total, player) => total + player.totalBet, 0);
  }

  function nextPlayerIndex(state, start, predicate) {
    for (let offset = 1; offset <= state.players.length; offset += 1) {
      const index = (start + offset) % state.players.length;
      if (predicate(state.players[index])) return index;
    }
    return null;
  }

  function commitChips(player, amount) {
    const committed = Math.min(amount, player.chips);
    player.chips -= committed;
    player.roundBet += committed;
    player.totalBet += committed;
    if (player.chips === 0) player.allIn = true;
    return committed;
  }

  function startHand(playerConfigs, options = {}) {
    if (!Array.isArray(playerConfigs) || playerConfigs.length < 2) throw new Error('At least two players are required');
    const variant = options.variant || 'holdem';
    const shortDeck = variant === 'shortdeck';
    const holeCount = variant === 'omaha' ? 4 : variant === 'plo5' ? 5 : variant === 'plo6' ? 6 : 2;
    const deck = shuffle(createDeck(shortDeck), options.rng || Math.random);
    const players = playerConfigs.map((player, index) => ({
      id: player.id || `player-${index}`,
      name: player.name || `Player ${index + 1}`,
      chips: Math.max(0, Math.floor(player.chips)),
      isBot: Boolean(player.isBot),
      holeCards: [],
      folded: false,
      allIn: false,
      totalBet: 0,
      roundBet: 0,
      acted: false,
    }));
    for (let card = 0; card < holeCount; card += 1) {
      for (const player of players) player.holeCards.push(deck.pop());
    }
    const dealer = options.dealerIndex == null ? 0 : options.dealerIndex % players.length;
    const smallBlindIndex = players.length === 2 ? dealer : nextPlayerIndex({ players }, dealer, () => true);
    const bigBlindIndex = nextPlayerIndex({ players }, smallBlindIndex, () => true);
    const smallBlind = options.smallBlind || 10;
    const bigBlind = options.bigBlind || 20;
    commitChips(players[smallBlindIndex], smallBlind);
    commitChips(players[bigBlindIndex], bigBlind);
    const actingIndex = nextPlayerIndex({ players }, bigBlindIndex, (player) => !player.allIn);
    return {
      handId: options.handId || `hand-${Date.now()}`,
      variant,
      format: options.format || 'standard',
      smallBlind,
      bigBlind,
      deck,
      board: [],
      players,
      dealer,
      smallBlindIndex,
      bigBlindIndex,
      currentBet: bigBlind,
      minRaise: bigBlind,
      actingIndex,
      handActor: actingIndex,
      street: 'preflop',
      pots: [],
      winnings: {},
      log: [{ type: 'blinds', smallBlindIndex, bigBlindIndex, smallBlind, bigBlind }],
    };
  }

  function getLegalActions(state, playerIndex) {
    const player = state.players[playerIndex];
    const active = player && state.actingIndex === playerIndex && !player.folded && !player.allIn && state.street !== 'complete';
    const callAmount = active ? Math.max(0, state.currentBet - player.roundBet) : 0;
    const maximum = active ? player.roundBet + player.chips : 0;
    const minimum = active ? Math.min(maximum, state.currentBet + state.minRaise) : 0;
    return {
      active: Boolean(active),
      canFold: Boolean(active),
      canCheck: Boolean(active && callAmount === 0),
      canCall: Boolean(active && callAmount > 0),
      callAmount,
      canBet: Boolean(active && state.currentBet === 0 && player.chips > 0),
      canRaise: Boolean(active && maximum > state.currentBet),
      minRaiseTo: minimum,
      maxRaiseTo: maximum,
      canAllIn: Boolean(active && player.chips > 0),
    };
  }

  function roundComplete(state) {
    const contenders = state.players.filter((player) => !player.folded);
    const ableToAct = contenders.filter((player) => !player.allIn);
    if (!ableToAct.length) return true;
    return ableToAct.every((player) => player.acted && player.roundBet === state.currentBet);
  }

  function awardFoldWin(state) {
    const winner = state.players.find((player) => !player.folded);
    const amount = getPotTotal(state);
    winner.chips += amount;
    state.winnings = { [winner.id]: amount };
    state.pots = [{ amount, eligible: [winner.id], winners: [winner.id], evaluated: [] }];
    state.street = 'complete';
    state.actingIndex = null;
    state.log.push({ type: 'fold-win', winner: winner.id, amount });
  }

  function showdown(state) {
    const result = settlePots(state.players, state.board, { variant: state.variant });
    for (const player of state.players) player.chips += result.winnings[player.id] || 0;
    state.pots = result.pots;
    state.winnings = result.winnings;
    state.street = 'complete';
    state.actingIndex = null;
    state.log.push({ type: 'showdown', pots: result.pots });
  }

  function advanceStreet(state) {
    for (const player of state.players) {
      player.roundBet = 0;
      player.acted = false;
    }
    state.currentBet = 0;
    state.minRaise = state.bigBlind;
    const sequence = ['preflop', 'flop', 'turn', 'river'];
    do {
      const current = sequence.indexOf(state.street);
      if (current < 0 || current === sequence.length - 1) {
        showdown(state);
        return;
      }
      state.street = sequence[current + 1];
      const count = state.street === 'flop' ? 3 : 1;
      for (let index = 0; index < count; index += 1) state.board.push(state.deck.pop());
      state.log.push({ type: 'street', street: state.street, board: state.board.slice() });
    } while (state.players.filter((player) => !player.folded && !player.allIn).length === 0);
    state.actingIndex = nextPlayerIndex(state, state.dealer, (player) => !player.folded && !player.allIn);
  }

  function applyAction(inputState, action) {
    const state = typeof structuredClone === 'function'
      ? structuredClone(inputState)
      : JSON.parse(JSON.stringify(inputState));
    const playerIndex = state.actingIndex;
    const legal = getLegalActions(state, playerIndex);
    if (!legal.active) throw new Error('The selected player cannot act now');
    const player = state.players[playerIndex];
    state.handActor = playerIndex;
    if (action.type === 'fold') {
      player.folded = true;
      player.acted = true;
      state.log.push({ type: 'fold', player: player.id, street: state.street });
    } else if (action.type === 'check') {
      if (!legal.canCheck) throw new Error('Check is unavailable when a call is required');
      player.acted = true;
      state.log.push({ type: 'check', player: player.id, street: state.street });
    } else if (action.type === 'call') {
      if (!legal.canCall) throw new Error('There is no bet to call');
      commitChips(player, legal.callAmount);
      player.acted = true;
      state.log.push({ type: 'call', player: player.id, amount: legal.callAmount, street: state.street });
    } else if (action.type === 'raise' || action.type === 'allin') {
      const target = action.type === 'allin' ? legal.maxRaiseTo : Math.floor(Number(action.amount));
      if (!Number.isFinite(target)) throw new Error('Raise amount must be a number');
      if (action.type === 'raise' && target <= state.currentBet) throw new Error('Raise must exceed the current bet');
      if (action.type === 'raise' && target < legal.minRaiseTo) throw new Error(`Raise must be at least ${legal.minRaiseTo}`);
      if (target > legal.maxRaiseTo) throw new Error('Raise exceeds the player stack');
      if (target <= state.currentBet && action.type === 'allin') {
        commitChips(player, legal.callAmount);
        player.acted = true;
        state.log.push({ type: 'call-all-in', player: player.id, street: state.street });
      } else {
        const previousBet = state.currentBet;
        const increase = target - previousBet;
        commitChips(player, target - player.roundBet);
        state.currentBet = target;
        if (increase >= state.minRaise) state.minRaise = increase;
        for (const other of state.players) other.acted = false;
        player.acted = true;
        state.log.push({ type: player.allIn ? 'all-in' : 'raise', player: player.id, amount: target, street: state.street });
      }
    } else {
      throw new Error(`Unsupported action: ${action.type}`);
    }

    if (state.players.filter((entry) => !entry.folded).length === 1) {
      awardFoldWin(state);
      return state;
    }
    if (roundComplete(state)) {
      advanceStreet(state);
      return state;
    }
    state.actingIndex = nextPlayerIndex(state, playerIndex, (entry) => !entry.folded && !entry.allIn);
    return state;
  }

  function blackjackScore(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      const rank = rankOf(card);
      if (rank === 14) {
        total += 11;
        aces += 1;
      } else {
        total += Math.min(rank, 10);
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return { total, soft: aces > 0 };
  }

  function roulettePayout(bet, number) {
    if (!Number.isInteger(number) || number < 0 || number > 36) throw new Error('Invalid roulette number');
    if (bet.type === 'number') return Number(bet.value) === number ? 36 : 0;
    if (number === 0) return 0;
    if (bet.type === 'red') return RED_NUMBERS.has(number) ? 2 : 0;
    if (bet.type === 'black') return !RED_NUMBERS.has(number) ? 2 : 0;
    if (bet.type === 'even') return number % 2 === 0 ? 2 : 0;
    if (bet.type === 'odd') return number % 2 === 1 ? 2 : 0;
    if (bet.type === 'low') return number <= 18 ? 2 : 0;
    if (bet.type === 'high') return number >= 19 ? 2 : 0;
    if (bet.type === 'dozen') return Math.ceil(number / 12) === Number(bet.value) ? 3 : 0;
    if (bet.type === 'column') return (number % 3 || 3) === Number(bet.value) ? 3 : 0;
    throw new Error(`Unsupported roulette bet: ${bet.type}`);
  }

  function evaluateSlots(symbols, bet) {
    if (!Array.isArray(symbols) || symbols.length !== 3) throw new Error('Three slot symbols are required');
    const payouts = { seven: 50, diamond: 25, bell: 15, spade: 10, heart: 8, club: 5 };
    if (symbols.every((symbol) => symbol === symbols[0])) return bet * (payouts[symbols[0]] || 3);
    if (new Set(symbols).size === 2) return bet * 2;
    return 0;
  }

  function dealBaccarat(rng = Math.random) {
    const deck = shuffle(createDeck(), rng);
    const value = (card) => rankOf(card) === 14 ? 1 : Math.min(rankOf(card), 10) % 10;
    const score = (cards) => cards.reduce((total, card) => total + value(card), 0) % 10;
    const player = [deck.pop(), deck.pop()];
    const banker = [deck.pop(), deck.pop()];
    let playerThird = null;
    if (score(player) < 8 && score(banker) < 8) {
      if (score(player) <= 5) {
        playerThird = deck.pop();
        player.push(playerThird);
      }
      const bankerScore = score(banker);
      const thirdValue = playerThird ? value(playerThird) : null;
      const bankerDraws = playerThird === null
        ? bankerScore <= 5
        : bankerScore <= 2
          || (bankerScore === 3 && thirdValue !== 8)
          || (bankerScore === 4 && thirdValue >= 2 && thirdValue <= 7)
          || (bankerScore === 5 && thirdValue >= 4 && thirdValue <= 7)
          || (bankerScore === 6 && thirdValue >= 6 && thirdValue <= 7);
      if (bankerDraws) banker.push(deck.pop());
    }
    const playerScore = score(player);
    const bankerScore = score(banker);
    const winner = playerScore === bankerScore ? 'tie' : playerScore > bankerScore ? 'player' : 'banker';
    return { player, banker, playerScore, bankerScore, winner };
  }

  function adjustWallet(balance, delta) {
    if (!Number.isInteger(delta)) throw new Error('Chip adjustments must be whole numbers');
    if (balance + delta < 0) throw new Error('Insufficient play chips');
    return balance + delta;
  }

  return {
    SUITS,
    RANK_CODES,
    RED_NUMBERS,
    rankOf,
    suitOf,
    createDeck,
    shuffle,
    combinations,
    evaluateFive,
    evaluateBest,
    compareScores,
    buildSidePots,
    settlePots,
    startHand,
    getLegalActions,
    applyAction,
    getPotTotal,
    blackjackScore,
    roulettePayout,
    evaluateSlots,
    dealBaccarat,
    adjustWallet,
  };
});
