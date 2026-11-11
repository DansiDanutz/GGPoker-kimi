(function attachData(root) {
  const tables = [
    { id: 'emerald-6max', name: 'Emerald 6-Max', variant: 'holdem', format: 'standard', blinds: '10 / 20', smallBlind: 10, bigBlind: 20, buyIn: 2000, players: 4, max: 6, speed: 'Classic', category: ['featured', 'holdem'], accent: 'emerald', description: 'Classic no-limit Hold’em with six seats and full betting control.' },
    { id: 'rush-river', name: 'Rush River', variant: 'holdem', format: 'rush', blinds: '25 / 50', smallBlind: 25, bigBlind: 50, buyIn: 5000, players: 5, max: 6, speed: 'Fast-fold', category: ['featured', 'holdem', 'rush'], accent: 'cyan', description: 'Fold and immediately receive a fresh hand at a new simulated table.' },
    { id: 'spin-gold', name: 'Spin & Gold', variant: 'holdem', format: 'spin', blinds: '20 / 40', smallBlind: 20, bigBlind: 40, buyIn: 1000, players: 2, max: 3, speed: 'Hyper-turbo', category: ['featured', 'holdem', 'spin'], accent: 'gold', description: 'Three-player Sit & Go with a randomly drawn play-chip prize multiplier.' },
    { id: 'aof-lightning', name: 'All-In or Fold', variant: 'holdem', format: 'aof', blinds: '50 / 100', smallBlind: 50, bigBlind: 100, buyIn: 800, players: 3, max: 4, speed: 'Instant', category: ['holdem', 'aof'], accent: 'coral', description: 'Short-stack Hold’em with one decision: push your stack or fold.' },
    { id: 'omaha-lake', name: 'Omaha Lake', variant: 'omaha', format: 'standard', blinds: '10 / 20', smallBlind: 10, bigBlind: 20, buyIn: 3000, players: 3, max: 6, speed: 'Classic', category: ['featured', 'omaha'], accent: 'violet', description: 'Four hole cards. Use exactly two with three community cards.' },
    { id: 'plo5-canyon', name: 'PLO-5 Canyon', variant: 'plo5', format: 'standard', blinds: '25 / 50', smallBlind: 25, bigBlind: 50, buyIn: 5000, players: 4, max: 6, speed: 'Classic', category: ['omaha'], accent: 'violet', description: 'Five-card Omaha with deeper combinations and pot-limit-style action.' },
    { id: 'plo6-summit', name: 'PLO-6 Summit', variant: 'plo6', format: 'standard', blinds: '25 / 50', smallBlind: 25, bigBlind: 50, buyIn: 6000, players: 2, max: 6, speed: 'Classic', category: ['omaha'], accent: 'violet', description: 'Six hole cards and exactly two required in every showdown hand.' },
    { id: 'shortdeck-peak', name: 'Short Deck Peak', variant: 'shortdeck', format: 'standard', blinds: '20 / 40', smallBlind: 20, bigBlind: 40, buyIn: 4000, players: 4, max: 6, speed: 'Classic', category: ['featured', 'shortdeck'], accent: 'coral', description: 'A 36-card deck where flushes beat full houses and aces play low.' },
    { id: 'flip-go', name: 'Flip & Go Arena', variant: 'holdem', format: 'flip', blinds: '15 / 30', smallBlind: 15, bigBlind: 30, buyIn: 1500, players: 5, max: 6, speed: 'Flip stage', category: ['holdem', 'flip'], accent: 'gold', description: 'An automatic all-in flip followed by standard play for the survivors.' },
    { id: 'mystery-bounty', name: 'Mystery Battle', variant: 'holdem', format: 'bounty', blinds: '25 / 50', smallBlind: 25, bigBlind: 50, buyIn: 2500, players: 5, max: 6, speed: 'Bounty', category: ['featured', 'holdem', 'tournaments'], accent: 'gold', description: 'Eliminate simulated rivals and reveal randomized play-chip bounties.' },
  ];

  const tournaments = [
    { id: 'daily-river', name: 'Daily River Championship', type: 'Progressive bounty', buyIn: 1000, prize: 50000, players: 86, max: 180, starts: '15 min', variant: 'Hold’em', tableId: 'mystery-bounty', featured: true },
    { id: 'masters-freezeout', name: 'Masters Freezeout', type: 'Freezeout', buyIn: 2500, prize: 125000, players: 142, max: 300, starts: '42 min', variant: 'Hold’em', tableId: 'emerald-6max', featured: true },
    { id: 'omaha-orbit', name: 'Omaha Orbit', type: '6-max tournament', buyIn: 750, prize: 25000, players: 54, max: 120, starts: '1 h 08 min', variant: 'PLO', tableId: 'omaha-lake', featured: false },
    { id: 'shortdeck-clash', name: 'Short Deck Clash', type: 'Bounty tournament', buyIn: 1200, prize: 40000, players: 67, max: 144, starts: '1 h 30 min', variant: 'Short Deck', tableId: 'shortdeck-peak', featured: false },
    { id: 'spin-sprint', name: 'Spin Sprint Series', type: 'Hyper-turbo', buyIn: 500, prize: 10000, players: 29, max: 90, starts: '2 h 05 min', variant: 'Hold’em', tableId: 'spin-gold', featured: false },
    { id: 'flip-festival', name: 'Flip Festival', type: 'Flip & Go', buyIn: 800, prize: 30000, players: 96, max: 240, starts: '2 h 40 min', variant: 'Hold’em', tableId: 'flip-go', featured: false },
  ];

  const leaderboard = [
    { name: 'RiverRook', points: 9840, hands: 412, trend: 2 },
    { name: 'David', points: 9215, hands: 388, trend: 4, hero: true },
    { name: 'AceNova', points: 8760, hands: 355, trend: -1 },
    { name: 'Mosaic', points: 8105, hands: 402, trend: 1 },
    { name: 'GoldenDeal', points: 7640, hands: 301, trend: -2 },
    { name: 'QuietStorm', points: 7010, hands: 290, trend: 3 },
    { name: 'ChipTheory', points: 6585, hands: 275, trend: 0 },
    { name: 'DeltaNine', points: 6020, hands: 261, trend: 5 },
  ];

  const bots = [
    { id: 'nova', name: 'AceNova', initials: 'AN', color: '#7968e8', vpip: 31, pfr: 22 },
    { id: 'rook', name: 'RiverRook', initials: 'RR', color: '#d66b57', vpip: 24, pfr: 18 },
    { id: 'mosaic', name: 'Mosaic', initials: 'MO', color: '#318ca2', vpip: 42, pfr: 16 },
    { id: 'storm', name: 'QuietStorm', initials: 'QS', color: '#9a7a45', vpip: 19, pfr: 12 },
    { id: 'delta', name: 'DeltaNine', initials: 'D9', color: '#4f9a72', vpip: 36, pfr: 25 },
  ];

  const missions = [
    { id: 'hands', title: 'Take a seat', description: 'Complete 10 poker hands', current: 6, target: 10, reward: 1000 },
    { id: 'showdown', title: 'Show your cards', description: 'Reach 3 showdowns', current: 1, target: 3, reward: 1500 },
    { id: 'variants', title: 'Explore the lobby', description: 'Play 2 different variants', current: 1, target: 2, reward: 2000 },
  ];

  root.GGData = { tables, tournaments, leaderboard, bots, missions };
})(typeof globalThis !== 'undefined' ? globalThis : this);
