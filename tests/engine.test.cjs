const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDeck,
  shuffle,
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
} = require('../src/engine.js');

const sequence = () => {
  let value = 0;
  return () => {
    value = (value + 0.173) % 1;
    return value;
  };
};

test('standard and Short Decks have the expected membership', () => {
  assert.equal(createDeck().length, 52);
  assert.equal(createDeck(true).length, 36);
  assert.equal(new Set(createDeck()).size, 52);
  assert.equal(createDeck(true).includes('2s'), false);
  assert.equal(createDeck(true).includes('6s'), true);
  assert.notDeepEqual(shuffle(createDeck(), sequence()), createDeck());
});

test('hand evaluator ranks straight flush, wheel, quads and full house', () => {
  assert.equal(evaluateFive(['As', 'Ks', 'Qs', 'Js', 'Ts']).name, 'Royal Flush');
  assert.deepEqual(evaluateFive(['As', '2d', '3c', '4h', '5s']).score, [4, 5]);
  assert.equal(evaluateFive(['9c', '9d', '9h', '9s', '2c']).name, 'Four of a Kind');
  assert.equal(evaluateFive(['8c', '8d', '8h', 'Ks', 'Kd']).name, 'Full House');
  assert.equal(evaluateFive(['Ac', 'Ad', 'Kh', 'Ks', '2c']).name, 'Two Pair');
});

test('Short Deck flushes beat full houses and A-6-7-8-9 is a straight', () => {
  const fullHouse = evaluateFive(['8c', '8d', '8h', 'Ks', 'Kd'], true);
  const flush = evaluateFive(['As', 'Qs', 'Ts', '8s', '6s'], true);
  assert.ok(compareScores(flush.score, fullHouse.score) > 0);
  assert.deepEqual(evaluateFive(['As', '6d', '7c', '8h', '9s'], true).score, [4, 9]);
});

test('best hand searches all available cards', () => {
  const result = evaluateBest(['As', 'Ks'], ['Qs', 'Js', 'Ts', '2d', '3c']);
  assert.equal(result.name, 'Royal Flush');
  assert.equal(result.cards.length, 5);
});

test('Omaha uses exactly two hole cards and three board cards', () => {
  const royal = evaluateBest(
    ['As', 'Ks', 'Qd', '2h'],
    ['Qs', 'Js', 'Ts', '4c', '5d'],
    { variant: 'omaha' },
  );
  assert.equal(royal.name, 'Royal Flush');

  const cannotUseOneHoleCard = evaluateBest(
    ['As', '2d', '3h', '4c'],
    ['Ks', 'Qs', 'Js', 'Ts', '9d'],
    { variant: 'omaha' },
  );
  assert.notEqual(cannotUseOneHoleCard.name, 'Royal Flush');
  assert.notEqual(cannotUseOneHoleCard.name, 'Straight Flush');
});

test('side pots retain folded contributions and eligibility', () => {
  const pots = buildSidePots([
    { id: 'a', totalBet: 50, folded: false },
    { id: 'b', totalBet: 120, folded: false },
    { id: 'c', totalBet: 200, folded: false },
    { id: 'd', totalBet: 80, folded: true },
  ]);
  assert.deepEqual(pots.map((pot) => pot.amount), [200, 90, 80, 80]);
  assert.deepEqual(pots.map((pot) => pot.eligible), [['a', 'b', 'c'], ['b', 'c'], ['b', 'c'], ['c']]);
});

test('showdown awards each side pot and conserves chips', () => {
  const result = settlePots([
    { id: 'a', totalBet: 50, folded: false, holeCards: ['As', 'Ad'] },
    { id: 'b', totalBet: 120, folded: false, holeCards: ['Ks', 'Kd'] },
    { id: 'c', totalBet: 200, folded: false, holeCards: ['Qs', 'Qd'] },
  ], ['2c', '3d', '7h', '8s', '9c']);
  assert.deepEqual(result.pots[0].winners, ['a']);
  assert.deepEqual(result.pots[1].winners, ['b']);
  assert.deepEqual(result.pots[2].winners, ['c']);
  assert.equal(Object.values(result.winnings).reduce((a, b) => a + b, 0), 370);
});

test('a fold ends the hand without revealing cards', () => {
  let state = startHand([
    { id: 'hero', name: 'David', chips: 1000 },
    { id: 'bot', name: 'Bot', chips: 1000 },
  ], { rng: sequence() });
  state = applyAction(state, { type: 'fold' });
  assert.equal(state.street, 'complete');
  assert.equal(state.winnings.bot, 30);
  assert.equal(state.players[0].chips + state.players[1].chips, 2000);
  assert.equal(state.board.length, 0);
});

test('all-in players run out the board and preserve all chips', () => {
  let state = startHand([
    { id: 'hero', name: 'David', chips: 200 },
    { id: 'bot', name: 'Bot', chips: 200 },
  ], { rng: sequence() });
  state = applyAction(state, { type: 'allin' });
  state = applyAction(state, { type: 'allin' });
  assert.equal(state.street, 'complete');
  assert.equal(state.board.length, 5);
  assert.equal(state.players[0].chips + state.players[1].chips, 400);
  assert.equal(getPotTotal(state), 400);
});

test('legal actions and raise accounting follow no-limit rules', () => {
  let state = startHand([
    { id: 'hero', name: 'David', chips: 1000 },
    { id: 'bot', name: 'Bot', chips: 1000 },
    { id: 'bot2', name: 'Bot 2', chips: 1000 },
  ], { rng: sequence() });
  const legal = getLegalActions(state, state.actingIndex);
  assert.equal(legal.callAmount, 20);
  assert.equal(legal.minRaiseTo, 40);
  assert.equal(legal.maxRaiseTo, 1000);
  state = applyAction(state, { type: 'raise', amount: 100 });
  assert.equal(state.currentBet, 100);
  assert.equal(state.players[state.handActor].roundBet, 100);
  assert.throws(() => applyAction(state, { type: 'raise', amount: 101 }), /at least/);
});

test('check and call close a betting round', () => {
  let state = startHand([
    { id: 'hero', name: 'David', chips: 1000 },
    { id: 'bot', name: 'Bot', chips: 1000 },
  ], { rng: sequence() });
  state = applyAction(state, { type: 'call' });
  state = applyAction(state, { type: 'check' });
  assert.equal(state.street, 'flop');
  assert.equal(state.board.length, 3);
  assert.equal(state.currentBet, 0);
});

test('blackjack scores aces correctly', () => {
  assert.equal(blackjackScore(['As', 'Kd']).total, 21);
  assert.equal(blackjackScore(['As', 'Ad', '9d']).total, 21);
  assert.equal(blackjackScore(['As', 'Ad', '9d', 'Kc']).total, 21);
});

test('roulette payouts include stake and zero loses even-money bets', () => {
  assert.equal(roulettePayout({ type: 'red' }, 32), 2);
  assert.equal(roulettePayout({ type: 'number', value: 17 }, 17), 36);
  assert.equal(roulettePayout({ type: 'dozen', value: 2 }, 24), 3);
  assert.equal(roulettePayout({ type: 'red' }, 0), 0);
});

test('slots never return a negative payout', () => {
  assert.ok(evaluateSlots(['seven', 'seven', 'seven'], 10) > 0);
  assert.equal(evaluateSlots(['spade', 'heart', 'club'], 10), 0);
});

test('baccarat deals a settled play-chip result', () => {
  const result = dealBaccarat(sequence());
  assert.ok(['player', 'banker', 'tie'].includes(result.winner));
  assert.ok(result.player.length >= 2 && result.player.length <= 3);
  assert.ok(result.banker.length >= 2 && result.banker.length <= 3);
  assert.equal(roulettePayout({ type: 'number', value: 0 }, 0), 36);
});

test('wallet adjustment cannot create a negative or fractional balance', () => {
  assert.equal(adjustWallet(100, 25), 125);
  assert.equal(adjustWallet(100, -100), 0);
  assert.throws(() => adjustWallet(100, -101), /Insufficient/);
  assert.throws(() => adjustWallet(100, 0.5), /whole/);
});


test('uncalled side-pot excess is refunded to the folded aggressor', () => {
  const result = settlePots([
    { id: 'aggressor', totalBet: 200, folded: true, holeCards: ['As', 'Ad'] },
    { id: 'caller', totalBet: 50, folded: false, holeCards: ['Ks', 'Kd'] },
  ], ['2c', '3d', '7h', '8s', '9c']);
  assert.equal(result.winnings.aggressor, 150);
  assert.equal(result.winnings.caller, 100);
  assert.equal(result.pots[1].refund, true);
  assert.equal(Object.values(result.winnings).reduce((a, b) => a + b, 0), 250);
});
