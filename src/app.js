(function attachApp(root) {
  const Engine = root.GGEngine;
  const Data = root.GGData;
  const { icon, logo } = root.GGIcons;
  const Table = root.GGPokerTable;
  const Casino = root.GGCasino;
  const { escapeHTML, formatChips } = Table;
  const STORAGE_KEY = 'ggpoker-playmoney-v1';
  const view = document.getElementById('main-view');
  const modalRoot = document.getElementById('modal-root');
  const navItems = [
    ['home', 'Home', 'home'],
    ['poker', 'Poker', 'cards'],
    ['tournaments', 'Tournaments', 'trophy'],
    ['casino', 'Casino', 'casino'],
    ['promotions', 'Promotions', 'gift'],
    ['leaderboard', 'Leaderboard', 'chart'],
    ['history', 'PokerCraft', 'history'],
    ['admin', 'Admin', 'shield'],
  ];
  const bottomItems = ['home', 'poker', 'tournaments', 'casino', 'profile'];
  const accents = { emerald: '#267c59', cyan: '#24788d', gold: '#9a7339', coral: '#9d4e45', violet: '#69588e' };
  const defaults = {
    name: 'David',
    role: 'Administrator',
    balance: 250000,
    level: 12,
    xp: 62,
    points: 9215,
    settings: { sound: true, volume: 0.45, motion: true, theme: 'emerald', hud: true, difficulty: 'balanced' },
    stats: { hands: 0, wins: 0, showdowns: 0, bestWin: 0, tournaments: 0 },
    history: [],
    registered: [],
    customTables: [],
    audit: [],
    lastDaily: null,
  };

  function loadProfile() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || typeof stored !== 'object') return structuredClone(defaults);
      return {
        ...structuredClone(defaults),
        ...stored,
        settings: { ...defaults.settings, ...(stored.settings || {}) },
        stats: { ...defaults.stats, ...(stored.stats || {}) },
        history: Array.isArray(stored.history) ? stored.history.slice(0, 100) : [],
        registered: Array.isArray(stored.registered) ? stored.registered : [],
        customTables: Array.isArray(stored.customTables) ? stored.customTables : [],
        audit: Array.isArray(stored.audit) ? stored.audit.slice(0, 40) : [],
      };
    } catch {
      return structuredClone(defaults);
    }
  }

  let profile = loadProfile();
  const validRoutes = new Set([...navItems.map((item) => item[0]), 'profile', 'table', 'replay']);
  const requestedRoute = location.hash.replace('#/', '');
  const ui = {
    route: validRoutes.has(requestedRoute) ? requestedRoute : 'home',
    pokerFilter: 'featured',
    tournamentFilter: 'all',
    leaderboardPeriod: 'week',
    search: '',
    tableSession: null,
    casinoSession: Casino.createSession('blackjack'),
    casinoTimer: null,
    tableTimer: null,
    replayHand: null,
    lastFocus: null,
  };

  function saveProfile() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch { /* Local storage may be unavailable in a private file context. */ }
    renderChrome();
  }

  function audit(title, detail) {
    profile.audit.unshift({ title, detail, at: new Date().toISOString() });
    profile.audit = profile.audit.slice(0, 40);
  }

  function addChips(amount, reason) {
    profile.balance = Engine.adjustWallet(profile.balance, amount);
    if (reason) audit(reason, `${amount >= 0 ? '+' : ''}${formatChips(amount)} play chips`);
    saveProfile();
  }

  function pageHead(title, description, actions = '') {
    return `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div><div class="page-actions">${actions}</div></div>`;
  }

  function sectionHead(title, action = '') {
    return `<div class="section-head"><h2>${title}</h2>${action}</div>`;
  }

  function statCard(iconName, label, value, detail = '') {
    return `<article class="card stat-card"><span class="stat-icon">${icon(iconName, 20)}</span><div class="stat-copy"><small>${label}</small><strong>${value}${detail ? `<span class="delta">${detail}</span>` : ''}</strong></div></article>`;
  }

  function gameCard(config) {
    const variantCards = config.variant === 'holdem' || config.variant === 'shortdeck' ? ['A♠', 'K♥'] : ['A♠', 'K♥', 'Q♣', 'J♦'];
    return `<article class="card game-card" style="--accent:${accents[config.accent] || accents.emerald}">
      <div class="game-card-visual"><span class="tag format-pill ${config.format === 'spin' ? 'tag-gold' : ''}">${Table.formatNames[config.format]}</span><div class="mini-cards">${variantCards.map((card, index) => `<span class="mini-card ${index % 2 ? 'red' : ''}">${card}</span>`).join('')}</div></div>
      <div class="game-card-body"><div class="game-title-row"><h3>${escapeHTML(config.name)}</h3><span class="tag">${config.max} max</span></div><p>${escapeHTML(config.description)}</p><div class="game-meta"><span>${icon('chip', 13)} ${config.blinds}</span><span>${icon('users', 13)} ${config.players}/${config.max}</span><span>${icon('motion', 13)} ${config.speed}</span></div><div class="game-card-footer"><div><small>Table buy-in</small><strong class="chip-label">${icon('chip', 14)} ${formatChips(config.buyIn)}</strong></div><button class="button button-primary button-small" data-action="join-table" data-id="${config.id}">${icon('play', 14)} Play now</button></div></div>
    </article>`;
  }

  function homeView() {
    const featured = allTables().filter((table) => table.category.includes('featured')).slice(0, 3);
    const winRate = profile.stats.hands ? Math.round(profile.stats.wins / profile.stats.hands * 100) : 0;
    return `${pageHead('Good to see you, David.', 'Your offline poker room is ready. Every chip is free and has no cash value.', `<button class="button button-secondary" data-route="history">${icon('history', 17)} Hand history</button>`)}
      <section class="hero" aria-labelledby="hero-title"><div class="hero-content"><span class="eyebrow">Your table · your rules</span><h1 id="hero-title">Play the river.<br><span>Own the moment.</span></h1><p>Six-max Hold’em, fast-fold action, Omaha, Short Deck and more — with smart simulated opponents and unlimited offline play chips.</p><div class="hero-actions"><button class="button button-primary" data-action="join-table" data-id="emerald-6max">${icon('play', 18)} Take a seat</button><button class="button button-secondary" data-route="tournaments">${icon('trophy', 18)} Browse tournaments</button></div></div><div class="hero-art" aria-hidden="true"><div class="hero-card left">A<span>♠</span></div><div class="hero-chip"><div><strong>GG</strong><small>PLAY CHIPS</small></div></div><div class="hero-card right">K<span>♥</span></div></div><span class="hero-note">Original offline simulation · no real money</span></section>
      <div class="stats-grid">${statCard('wallet', 'Play-chip balance', formatChips(profile.balance), 'free')}${statCard('cards', 'Hands played', formatChips(profile.stats.hands), 'local')}${statCard('trophy', 'Hands won', formatChips(profile.stats.wins), `${winRate}%`)}${statCard('chart', 'League points', formatChips(profile.points), `Lv ${profile.level}`)}</div>
      ${sectionHead('Jump back in', `<button class="text-button" data-route="poker">View all games ${icon('arrow', 15)}</button>`)}<div class="game-grid">${featured.map(gameCard).join('')}</div>
      <div class="split-layout" style="margin-top:26px"><section>${sectionHead('Featured tournaments', `<button class="text-button" data-route="tournaments">Full schedule ${icon('arrow', 15)}</button>`)}<div class="tournament-grid">${Data.tournaments.filter((item) => item.featured).map(tournamentCard).join('')}</div></section><aside>${sectionHead('Daily missions')}<div class="stack">${Data.missions.slice(0, 2).map(missionCard).join('')}</div></aside></div>`;
  }

  function allTables() {
    return Data.tables.concat(profile.customTables);
  }

  function pokerView() {
    const filters = [['featured', 'Featured'], ['holdem', 'Hold’em'], ['omaha', 'Omaha'], ['shortdeck', 'Short Deck'], ['spin', 'Spin & Gold'], ['rush', 'Rush & Cash'], ['aof', 'All-in or Fold'], ['flip', 'Flip & Go']];
    const query = ui.search.trim().toLowerCase();
    const tables = allTables().filter((table) => (query || (ui.pokerFilter === 'featured' ? table.category.includes('featured') : table.category.includes(ui.pokerFilter))) && (!query || `${table.name} ${table.description} ${table.variant} ${table.format}`.toLowerCase().includes(query)));
    return `${pageHead('Poker lobby', 'Choose a local table. Simulated opponents, real poker rules, zero cash risk.', `<button class="button button-secondary" data-route="admin">${icon('plus', 17)} <span class="button-label-mobile">Create table</span></button>`)}<div class="filter-row" role="tablist" aria-label="Poker formats">${filters.map(([id, label]) => `<button class="filter-chip ${ui.pokerFilter === id ? 'active' : ''}" data-action="poker-filter" data-id="${id}" role="tab" aria-selected="${ui.pokerFilter === id}">${label}</button>`).join('')}</div><div class="lobby-toolbar"><span class="result-count">${tables.length} local ${tables.length === 1 ? 'table' : 'tables'} available</span><span class="tag tag-green">No waiting lists</span></div>${tables.length ? `<div class="game-grid">${tables.map(gameCard).join('')}</div>` : `<section class="card empty-state"><span class="empty-icon">${icon('search', 25)}</span><h2>No tables found</h2><p>Try another format or clear your search. You can also create a custom local table in Admin.</p><button class="button button-secondary" data-action="clear-search">Clear search</button></section>`}`;
  }

  function tournamentCard(tournament) {
    const registered = profile.registered.includes(tournament.id);
    return `<article class="card tournament-card ${tournament.featured ? 'featured' : ''}"><div class="tournament-top"><div><span class="eyebrow">${tournament.type}</span><h3>${tournament.name}</h3><small>${tournament.variant} · ${tournament.players}/${tournament.max} registered</small></div><span class="tag ${registered ? 'tag-green' : 'tag-gold'}">${registered ? 'Registered' : `Starts in ${tournament.starts}`}</span></div><div class="tournament-meta"><div><small>Prize pool</small><strong class="gold">${formatChips(tournament.prize)}</strong></div><div><small>Buy-in</small><strong>${formatChips(tournament.buyIn)}</strong></div><div><small>Starting in</small><strong>${tournament.starts}</strong></div></div><div class="tournament-footer"><span class="chip-label">${icon('chip', 15)} Play chips</span>${registered ? `<button class="button button-primary button-small" data-action="join-table" data-id="${tournament.tableId}">${icon('play', 14)} Play event</button>` : `<button class="button button-secondary button-small" data-action="register-tournament" data-id="${tournament.id}">${icon('plus', 14)} Register</button>`}</div></article>`;
  }

  function tournamentsView() {
    const filters = [['all', 'All events'], ['bounty', 'Bounty'], ['freezeout', 'Freezeout'], ['turbo', 'Hyper-turbo']];
    const events = Data.tournaments.filter((tournament) => ui.tournamentFilter === 'all' || tournament.type.toLowerCase().includes(ui.tournamentFilter));
    return `${pageHead('Tournament schedule', 'Local freezeouts, bounties and fast formats. Registration uses play chips only.', `<span class="tag tag-green">${profile.registered.length} registered</span>`)}<div class="filter-row" role="tablist" aria-label="Tournament formats">${filters.map(([id, label]) => `<button class="filter-chip ${ui.tournamentFilter === id ? 'active' : ''}" data-action="tournament-filter" data-id="${id}" role="tab" aria-selected="${ui.tournamentFilter === id}">${label}</button>`).join('')}</div><div class="tournament-grid">${events.map(tournamentCard).join('')}</div><section class="card card-pad" style="margin-top:18px"><div class="admin-banner" style="margin:0">${icon('info', 20)}<p><strong>Simulated schedule.</strong> Events start immediately when you enter their table. Opponents, rankings, bounties and prize pools are generated locally.</p></div></section>`;
  }

  function casinoView() {
    const games = [['blackjack', 'Blackjack', 'cards'], ['slots', 'River Slots', 'casino'], ['roulette', 'Roulette', 'chip'], ['baccarat', 'Baccarat', 'spark']];
    return `${pageHead('Casino', 'Classic games with transparent local rules and no cash conversion.', `<span class="tag tag-green">Single-player offline</span>`)}<div class="casino-layout"><nav class="card casino-menu" aria-label="Casino games">${games.map(([id, label, iconName]) => `<button class="nav-button ${ui.casinoSession.game === id ? 'active' : ''}" data-action="casino-game" data-id="${id}">${icon(iconName, 19)}<span>${label}</span></button>`).join('')}</nav><section class="card casino-game" aria-label="${ui.casinoSession.game} game">${Casino.render(ui.casinoSession)}</section></div>`;
  }

  function missionCard(mission) {
    const variants = new Set(profile.history.map((hand) => hand.variant)).size;
    const current = Math.min(mission.target, mission.id === 'hands' ? profile.stats.hands : mission.id === 'showdown' ? profile.stats.showdowns : variants);
    const percent = Math.min(100, Math.round(current / mission.target * 100));
    return `<article class="card mission-item"><div class="mission-item-top"><div><h3>${mission.title}</h3><p>${mission.description}</p></div><span class="chip-label">+${formatChips(mission.reward)}</span></div><div class="progress-track"><span style="width:${percent}%"></span></div><small>${current}/${mission.target} complete</small></article>`;
  }

  function promotionsView() {
    const today = new Date().toISOString().slice(0, 10);
    const claimed = profile.lastDaily === today;
    const variantCount = Math.min(3, new Set(profile.history.map((hand) => hand.variant)).size);
    return `${pageHead('Promotions & missions', 'Free play-chip rewards for exploring the app. No purchases or wagering requirements.')}<div class="split-layout"><section class="stack"><div class="card reward-card"><span class="reward-icon">${icon('gift', 32)}</span><span class="eyebrow">Daily river reward</span><h2>2,500 free chips</h2><p>Come back each day to keep your local streak alive.</p><div class="streak-row">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => `<div class="streak-day ${index < 4 || claimed && index === 4 ? 'done' : ''}"><span>${index < 4 || claimed && index === 4 ? icon('check', 13) : index + 1}</span>${day}</div>`).join('')}</div><button class="button button-gold" data-action="claim-daily" ${claimed ? 'disabled' : ''}>${icon(claimed ? 'check' : 'gift', 18)} ${claimed ? 'Claimed today' : 'Claim 2,500 chips'}</button></div><div>${sectionHead('Your missions')}<div class="mission-list">${Data.missions.map(missionCard).join('')}</div></div></section><aside class="stack"><article class="card card-pad"><span class="eyebrow">River Club</span><h2>Level ${profile.level} · Explorer</h2><p>Earn experience from every completed hand. Your level and rewards stay on this Mac.</p><div class="progress-track"><span style="width:${profile.xp}%"></span></div><small>${profile.xp}% to level ${profile.level + 1}</small></article><article class="card card-pad"><span class="eyebrow">Weekend chip rush</span><h3>Play three different formats</h3><p>Explore Hold’em, Omaha and Short Deck to earn a 5,000-chip local badge.</p><span class="tag tag-gold">${variantCount} of 3 complete</span></article><article class="card card-pad"><span class="eyebrow">Fair by design</span><h3>No cash. No cashier.</h3><p>Promotions never unlock purchases, withdrawals, prizes with monetary value, or real-money play.</p></article></aside></div>`;
  }

  function leaderboardView() {
    const rows = Data.leaderboard.map((entry) => entry.hero ? { ...entry, points: profile.points } : entry).sort((a, b) => b.points - a.points);
    const periodLabel = ui.leaderboardPeriod === 'all' ? 'all time' : 'this week';
    return `${pageHead('Local leaderboard', 'A simulated local league based on hands completed on this Mac.', `<select class="select" aria-label="Leaderboard period" data-action="leaderboard-period"><option value="week" ${ui.leaderboardPeriod === 'week' ? 'selected' : ''}>This week</option><option value="all" ${ui.leaderboardPeriod === 'all' ? 'selected' : ''}>All time</option></select>`)}<div class="stats-grid">${statCard('trophy', 'Your league', 'River', 'local')}${statCard('chart', 'Your points', formatChips(profile.points))}${statCard('cards', 'Ranked hands', formatChips(profile.stats.hands))}${statCard('spark', 'Current position', `#${rows.findIndex((entry) => entry.hero) + 1}`)}</div>${sectionHead(`River League · ${periodLabel}`)}<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Hands</th><th>Trend</th></tr></thead><tbody>${rows.map((entry, index) => `<tr class="${entry.hero ? 'hero-row' : ''}"><td><span class="rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="player-cell"><span class="avatar">${entry.name.slice(0, 2).toUpperCase()}</span>${entry.name}${entry.hero ? ' · You' : ''}</div></td><td>${formatChips(entry.points)}</td><td>${entry.hero ? profile.stats.hands : entry.hands}</td><td class="${entry.trend >= 0 ? 'trend-up' : 'trend-down'}">${entry.trend > 0 ? '↑' : entry.trend < 0 ? '↓' : '—'} ${Math.abs(entry.trend) || ''}</td></tr>`).join('')}</tbody></table></div><p style="margin-top:12px"><small>Simulated opponents are shown for context. Only David’s results are measured locally.</small></p>`;
  }

  function historyView() {
    const recent = profile.history.slice(0, 7).reverse();
    const values = recent.length ? recent.map((hand) => Math.max(5, Math.min(100, 50 + hand.net / 100))) : [8, 8, 8, 8, 8, 8, 8];
    const labels = recent.length ? recent.map((_, index) => `H${index + 1}`) : ['—', '—', '—', '—', '—', '—', '—'];
    return `${pageHead('PokerCraft', 'Review local results, statistics and every completed hand.', `<button class="button button-secondary" data-action="export-history">${icon('download', 17)} Export JSON</button>`)}<div class="stats-grid">${statCard('cards', 'Total hands', formatChips(profile.stats.hands))}${statCard('trophy', 'Win rate', `${profile.stats.hands ? Math.round(profile.stats.wins / profile.stats.hands * 100) : 0}%`)}${statCard('eye', 'Showdowns', formatChips(profile.stats.showdowns))}${statCard('chip', 'Best hand result', `+${formatChips(profile.stats.bestWin)}`)}</div><div class="split-layout" style="margin-top:16px"><section class="card chart-card"><div class="section-head" style="margin-top:0"><div><h2>Recent hand outcomes</h2><small>Relative result per completed hand · play chips</small></div></div><div class="bar-chart">${values.map((value, index) => `<div class="bar-column"><div class="bar" style="height:${value}%" title="${recent[index] ? `${recent[index].net} chips` : 'No hand data'}"></div><small>${labels[index]}</small></div>`).join('')}</div><div class="legend-row"><span><i class="legend-dot"></i>Outcome scaled around break-even</span><span>Latest ${recent.length} hands</span></div></section><article class="card card-pad"><span class="eyebrow">Your table profile</span><h2>Balanced explorer</h2><p>Statistics accumulate only when a hand reaches a result. Incomplete hands are not counted.</p><div class="mission-item"><div class="mission-item-top"><span>Hands won</span><strong>${profile.stats.wins}</strong></div><div class="mission-item-top"><span>Showdown rate</span><strong>${profile.stats.hands ? Math.round(profile.stats.showdowns / profile.stats.hands * 100) : 0}%</strong></div><div class="mission-item-top"><span>Tournaments entered</span><strong>${profile.registered.length}</strong></div></div></article></div>${sectionHead('Hand history', `<span class="tag">${profile.history.length} saved locally</span>`)}${profile.history.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Hand</th><th>Game</th><th>Your cards</th><th>Result</th><th>Pot</th><th></th></tr></thead><tbody>${profile.history.map((hand) => `<tr><td><strong>${hand.id}</strong><br><small>${new Date(hand.at).toLocaleString()}</small></td><td>${escapeHTML(hand.table)}<br><small>${hand.variant} · ${hand.format}</small></td><td>${hand.heroCards.join(' ')}</td><td class="${hand.net >= 0 ? 'trend-up' : 'trend-down'}">${hand.net >= 0 ? '+' : ''}${formatChips(hand.net)}</td><td>${formatChips(hand.pot)}</td><td><button class="button button-ghost button-small" data-action="replay-hand" data-id="${hand.id}">${icon('play', 14)} Replay</button></td></tr>`).join('')}</tbody></table></div>` : `<section class="card empty-state"><span class="empty-icon">${icon('history', 25)}</span><h2>No completed hands yet</h2><p>Take a seat at any poker table. Your completed hand will appear here with cards, actions and a replay.</p><button class="button button-primary" data-route="poker">Find a table</button></section>`}`;
  }

  function settingRow(iconName, title, description, control) {
    return `<div class="setting-row"><span class="setting-icon">${icon(iconName, 20)}</span><div class="setting-copy"><strong>${title}</strong><small>${description}</small></div>${control}</div>`;
  }

  function switchControl(key, value, label) {
    return `<button class="switch ${value ? 'on' : ''}" role="switch" aria-checked="${value}" aria-label="${label}" data-action="setting-toggle" data-id="${key}"></button>`;
  }

  function profileView() {
    return `${pageHead('Profile & settings', 'Personalize your local table, audio and motion experience.', `<span class="tag tag-gold">${icon('shield', 13)} Administrator</span>`)}<section class="card profile-hero"><span class="avatar avatar-hero">D</span><div><h2>David</h2><p>Local administrator · River Club member</p><span class="tag tag-green">Offline profile</span></div><div class="profile-level"><div class="mission-item-top"><span>Level ${profile.level}</span><strong class="gold">${profile.xp}%</strong></div><div class="progress-track"><span style="width:${profile.xp}%"></span></div><small>${formatChips(profile.points)} league points</small></div></section><div class="split-layout" style="margin-top:16px"><section class="card settings-list"><div class="card-pad" style="padding-bottom:6px"><h2>Experience</h2><p>Settings save automatically on this Mac.</p></div>${settingRow('sound', 'Sound effects', 'Generated card, chip, action and win sounds.', switchControl('sound', profile.settings.sound, 'Sound effects'))}${settingRow('motion', 'Motion effects', 'Card dealing, panel transitions and result animation.', switchControl('motion', profile.settings.motion, 'Motion effects'))}${settingRow('eye', 'Smart HUD', 'Show simulated opponent statistics at the table.', switchControl('hud', profile.settings.hud, 'Smart HUD'))}${settingRow('sound', 'Sound volume', 'Applied immediately to generated effects.', `<input class="range" type="range" min="0" max="100" value="${Math.round(profile.settings.volume * 100)}" data-action="volume" aria-label="Sound volume">`)}</section><section class="card settings-list"><div class="card-pad" style="padding-bottom:6px"><h2>Table appearance</h2><p>Choose an original felt color.</p></div>${settingRow('spark', 'Felt theme', 'Used for your next table and updated immediately during play.', `<div class="theme-options">${[['emerald', '#116044'], ['midnight', '#193f67'], ['graphite', '#3c4842'], ['ruby', '#68352f']].map(([id, color]) => `<button class="theme-option ${profile.settings.theme === id ? 'active' : ''}" style="--theme-color:${color}" data-action="set-theme" data-id="${id}" aria-label="${id} felt theme" aria-pressed="${profile.settings.theme === id}"><span></span></button>`).join('')}</div>`)}${settingRow('shield', 'Play-money protection', 'No cashier, remote accounts or payment integrations are present.', '<span class="tag tag-green">Always on</span>')}${settingRow('user', 'Local administrator', 'Chip adjustments, custom tables and data controls.', `<button class="button button-secondary button-small" data-route="admin">Open admin</button>`)}</section></div>`;
  }

  function adminView() {
    return `${pageHead('Admin control room', 'Manage David’s offline profile, play chips and simulated tables.', `<span class="tag tag-gold">${icon('shield', 13)} Full local access</span>`)}<div class="admin-banner">${icon('shield', 22)}<p><strong>Local-only controls.</strong> Changes affect this browser/app profile only. They cannot alter GGPoker, another account, or any remote service.</p></div><div class="stats-grid">${statCard('user', 'Local profiles', '1', 'David')}${statCard('wallet', 'Chip balance', formatChips(profile.balance))}${statCard('cards', 'Custom tables', profile.customTables.length)}${statCard('history', 'Audit events', profile.audit.length)}</div><div class="admin-grid" style="margin-top:16px"><section class="card card-pad admin-card"><h2>Adjust play-chip wallet</h2><p>Add chips for testing or remove chips down to a zero balance. No transaction has monetary value.</p><form id="chip-adjust-form" class="inline-form"><div class="field"><label for="chip-adjustment">Whole-chip adjustment</label><input class="input" id="chip-adjustment" name="amount" type="number" step="1" value="10000" required><small>Use a negative value to remove chips.</small></div><button class="button button-primary" type="submit">${icon('check', 17)} Apply</button></form><div class="admin-actions"><button class="button button-secondary button-small" data-action="quick-chips" data-value="25000">+25,000 test chips</button><button class="button button-ghost button-small" data-route="promotions">Daily reward</button></div></section><section class="card card-pad admin-card"><h2>Simulated opponents</h2><p>Set the default decision profile for new and active tables.</p><form id="difficulty-form" class="inline-form"><div class="field"><label for="bot-difficulty">Bot difficulty</label><select class="select" id="bot-difficulty" name="difficulty"><option value="casual" ${profile.settings.difficulty === 'casual' ? 'selected' : ''}>Casual · more calls and loose play</option><option value="balanced" ${profile.settings.difficulty === 'balanced' ? 'selected' : ''}>Balanced · mixed strategy</option><option value="expert" ${profile.settings.difficulty === 'expert' ? 'selected' : ''}>Expert · tighter and more assertive</option></select></div><button class="button button-secondary" type="submit">Save</button></form></section><section class="card card-pad admin-card"><h2>Create a custom table</h2><p>Configure a local game and add it to the Featured poker lobby.</p><form id="custom-table-form" class="form-grid"><div class="field full"><label for="custom-name">Table name</label><input class="input" id="custom-name" name="name" value="David’s Table" maxlength="32" required></div><div class="field"><label for="custom-variant">Variant</label><select class="select" id="custom-variant" name="variant"><option value="holdem">Hold’em</option><option value="omaha">Omaha</option><option value="plo5">PLO-5</option><option value="plo6">PLO-6</option><option value="shortdeck">Short Deck</option></select></div><div class="field"><label for="custom-format">Format</label><select class="select" id="custom-format" name="format"><option value="standard">Classic</option><option value="rush">Rush & Cash</option><option value="aof">All-in or Fold</option><option value="spin">Spin & Gold</option><option value="bounty">Mystery Bounty</option></select></div><div class="field"><label for="custom-buyin">Buy-in</label><input class="input" id="custom-buyin" name="buyIn" type="number" min="200" step="100" value="2000" required></div><div class="field"><label for="custom-players">Seats</label><select class="select" id="custom-players" name="players"><option value="2">2 players</option><option value="4" selected>4 players</option><option value="6">6 players</option></select></div><div class="field"><label for="custom-small">Small blind</label><input class="input" id="custom-small" name="smallBlind" type="number" min="5" value="10" required></div><div class="field"><label for="custom-big">Big blind</label><input class="input" id="custom-big" name="bigBlind" type="number" min="10" value="20" required></div><div class="field full"><button class="button button-primary" type="submit">${icon('plus', 17)} Create table</button></div></form></section><section class="card card-pad admin-card"><h2>Data & audit</h2><p>Review recent local changes or export your complete hand history.</p><ul class="audit-list">${profile.audit.length ? profile.audit.slice(0, 6).map((entry) => `<li>${icon('check', 14)}<div><strong>${escapeHTML(entry.title)}</strong><br><span>${escapeHTML(entry.detail)} · ${new Date(entry.at).toLocaleString()}</span></div></li>`).join('') : '<li>No admin changes recorded yet.</li>'}</ul><div class="admin-actions"><button class="button button-secondary button-small" data-action="export-history">${icon('download', 15)} Export history</button><button class="button button-danger button-small" data-action="reset-profile">${icon('close', 15)} Reset local data</button></div></section></div>`;
  }

  function renderChrome() {
    document.getElementById('brand-logo').innerHTML = logo();
    document.getElementById('search-icon').innerHTML = icon('search', 17);
    document.getElementById('mobile-menu-button').innerHTML = icon('menu', 21);
    document.getElementById('notification-button').insertAdjacentHTML('afterbegin', icon('bell', 19));
    const notificationButton = document.getElementById('notification-button');
    notificationButton.querySelectorAll('svg:not(:first-child)').forEach((element) => element.remove());
    document.getElementById('sound-button').innerHTML = icon(profile.settings.sound ? 'sound' : 'muted', 19);
    document.getElementById('sound-button').setAttribute('aria-pressed', String(profile.settings.sound));
    document.getElementById('wallet-button').innerHTML = `${icon('chip', 17)}<span>${formatChips(profile.balance)}</span>`;
    document.getElementById('sidebar-profile').innerHTML = `<span class="avatar avatar-hero">D</span><span class="profile-copy"><strong>David</strong><small>Administrator</small></span>${icon('chevron', 15)}`;
    document.getElementById('daily-mission-label').textContent = 'Daily mission';
    const dailyHands = Math.min(10, profile.stats.hands);
    document.querySelector('.sidebar-mission .progress-track span').style.width = `${dailyHands * 10}%`;
    document.querySelector('.sidebar-mission small').textContent = `${dailyHands} of 10 hands`;
    const navHTML = navItems.map(([route, label, iconName]) => `<button class="nav-button ${ui.route === route ? 'active' : ''}" data-route="${route}" ${ui.route === route ? 'aria-current="page"' : ''}>${icon(iconName, 19)}<span>${label}</span>${route === 'promotions' ? '<span class="nav-badge">1</span>' : ''}</button>`).join('');
    document.getElementById('main-nav').innerHTML = navHTML;
    document.getElementById('bottom-nav').innerHTML = bottomItems.map((route) => {
      const item = navItems.find((entry) => entry[0] === route) || ['profile', 'Profile', 'user'];
      return `<button class="nav-button ${ui.route === route ? 'active' : ''}" data-route="${route}" ${ui.route === route ? 'aria-current="page"' : ''}>${icon(item[2], 19)}<span>${item[1]}</span></button>`;
    }).join('');
    document.body.dataset.motion = profile.settings.motion ? 'on' : 'off';
    root.GGAudio.configure(profile.settings);
  }

  function render() {
    renderChrome();
    if (ui.route === 'table' && ui.tableSession) {
      view.innerHTML = Table.render(ui.tableSession);
      return;
    }
    const views = { home: homeView, poker: pokerView, tournaments: tournamentsView, casino: casinoView, promotions: promotionsView, leaderboard: leaderboardView, history: historyView, profile: profileView, admin: adminView };
    view.innerHTML = views[ui.route] ? views[ui.route]() : homeView();
  }

  function navigate(route, options = {}) {
    if (!validRoutes.has(route) || route === 'table' || route === 'replay') return;
    if (ui.tableSession && route !== 'table' && !options.keepTable) leaveTable(false);
    ui.route = route;
    history.replaceState(null, '', `#/${route}`);
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('mobile-menu-button').setAttribute('aria-expanded', 'false');
    render();
    view.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: profile.settings.motion ? 'smooth' : 'auto' });
  }

  function showToast(title, detail = '', error = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${error ? 'error' : ''}`;
    toast.innerHTML = `${icon(error ? 'info' : 'check', 18)}<div><strong>${escapeHTML(title)}</strong>${detail ? `<small>${escapeHTML(detail)}</small>` : ''}</div>`;
    document.getElementById('toast-region').appendChild(toast);
    if (error) root.GGAudio.play('error');
    setTimeout(() => toast.remove(), 4300);
  }

  function openModal(title, body, footer = '', large = false) {
    ui.lastFocus = document.activeElement;
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal ${large ? 'modal-large' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close', 20)}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
    modalRoot.querySelector('[data-action="close-modal"]').focus();
  }

  function closeModal() {
    modalRoot.innerHTML = '';
    if (ui.lastFocus && document.contains(ui.lastFocus)) ui.lastFocus.focus();
  }

  function startTable(id) {
    const config = allTables().find((table) => table.id === id);
    if (!config) return showToast('Table not found', 'Choose another local table.', true);
    if (profile.balance < config.buyIn) return showToast('Not enough play chips', `This table needs ${formatChips(config.buyIn)} chips. Claim a reward or use Admin to add test chips.`, true);
    clearTimeout(ui.tableTimer);
    addChips(-config.buyIn, `Entered ${config.name}`);
    ui.tableSession = Table.createSession(config, { heroChips: config.buyIn, heroName: profile.name, bots: Data.bots, difficulty: profile.settings.difficulty, theme: profile.settings.theme, hud: profile.settings.hud });
    ui.route = 'table';
    history.replaceState(null, '', '#/table');
    render();
    root.GGAudio.play('deal');
    scheduleTable();
  }

  function recordHand() {
    const session = ui.tableSession;
    if (!session || session.recorded || session.state.street !== 'complete') return;
    session.recorded = true;
    const state = session.state;
    const hero = state.players[0];
    const gross = (state.winnings.hero || 0) + session.spinBonus + session.bounty;
    const net = gross - hero.totalBet;
    const hand = {
      id: state.handId,
      at: new Date().toISOString(),
      table: session.config.name,
      variant: Table.variantNames[session.config.variant],
      format: Table.formatNames[session.config.format],
      heroCards: hero.holeCards.slice(),
      board: state.board.slice(),
      players: state.players.map((player) => ({ id: player.id, name: player.name, cards: player.folded ? [] : player.holeCards, folded: player.folded })),
      pot: Engine.getPotTotal(state),
      gross,
      net,
      log: state.log.slice(),
    };
    profile.history.unshift(hand);
    profile.history = profile.history.slice(0, 100);
    profile.stats.hands += 1;
    if (net > 0) profile.stats.wins += 1;
    if (state.board.length === 5) profile.stats.showdowns += 1;
    profile.stats.bestWin = Math.max(profile.stats.bestWin, net);
    profile.points = Math.max(0, profile.points + Math.round(net / 20) + 15);
    profile.xp += 4;
    if (profile.xp >= 100) { profile.level += 1; profile.xp -= 100; }
    saveProfile();
    if (net > 0) root.GGAudio.play('win');
  }

  function scheduleTable() {
    clearTimeout(ui.tableTimer);
    const session = ui.tableSession;
    if (!session || session.showSpin || session.finished || ui.route !== 'table') return;
    if (session.config.format === 'rush' && session.state.players[0].folded && session.state.street !== 'complete') {
      showToast('Fast fold', 'A fresh hand is ready at a new simulated table.');
      ui.tableSession = Table.nextHand(session);
      root.GGAudio.play('deal');
      render();
      scheduleTable();
      return;
    }
    if (session.state.street === 'complete') {
      recordHand();
      if (session.config.format === 'rush' && session.state.players[0].folded) {
        showToast('Fast fold', 'A fresh hand is ready at a new simulated table.');
        ui.tableSession = Table.nextHand(session);
        render();
        scheduleTable();
      }
      return;
    }
    if (session.config.format === 'flip') {
      ui.tableTimer = setTimeout(() => {
        if (!ui.tableSession) return;
        ui.tableSession = Table.apply(ui.tableSession, { type: 'allin' });
        root.GGAudio.play('chip');
        render();
        scheduleTable();
      }, profile.settings.motion ? 420 : 40);
      return;
    }
    const index = session.state.actingIndex;
    if (index > 0) {
      ui.tableTimer = setTimeout(() => {
        if (!ui.tableSession) return;
        const before = ui.tableSession.state.actingIndex;
        ui.tableSession = Table.botAct(ui.tableSession);
        const entry = ui.tableSession.state.log[ui.tableSession.state.log.length - 1];
        root.GGAudio.play(entry.type === 'fold' ? 'fold' : entry.type === 'check' ? 'check' : entry.type === 'street' ? 'flip' : 'chip');
        if (before === 0) root.GGAudio.play('deal');
        render();
        scheduleTable();
      }, profile.settings.motion ? 520 + Math.random() * 380 : 60);
    }
  }

  function leaveTable(notify = true) {
    const session = ui.tableSession;
    if (!session) return;
    clearTimeout(ui.tableTimer);
    recordHand();
    const hero = session.state.players[0];
    const cashout = hero.chips + (session.state.street === 'complete' ? 0 : hero.totalBet);
    addChips(cashout, `Left ${session.config.name}`);
    ui.tableSession = null;
    if (notify) showToast('Chips returned to your wallet', `${formatChips(cashout)} play chips from the table.`);
    ui.route = 'poker';
    history.replaceState(null, '', '#/poker');
    render();
  }

  function performPokerAction(action) {
    const session = ui.tableSession;
    if (!session) return;
    try {
      if (action.type === 'raise') {
        const range = document.getElementById('raise-range');
        action.amount = Number(range ? range.value : 0);
      }
      ui.tableSession = Table.apply(session, action);
      root.GGAudio.play(action.type === 'fold' ? 'fold' : action.type === 'check' ? 'check' : 'chip');
      render();
      scheduleTable();
    } catch (error) {
      showToast('Action unavailable', error.message, true);
    }
  }

  function replayHand(hand) {
    if (!hand) return showToast('Replay unavailable', 'Complete a hand first.', true);
    const body = `<div class="replay-board"><div class="community-cards">${Array.from({ length: 5 }, (_, index) => hand.board[index] ? Table.cardHTML(hand.board[index], { index }) : Table.cardHTML('', { placeholder: true })).join('')}</div><div class="replay-hero-cards">${hand.heroCards.map((card, index) => Table.cardHTML(card, { index })).join('')}</div></div><div class="section-head"><div><h2>${escapeHTML(hand.table)}</h2><small>${hand.variant} · ${hand.format}</small></div><strong class="${hand.net >= 0 ? 'trend-up' : 'trend-down'}">${hand.net >= 0 ? '+' : ''}${formatChips(hand.net)} chips</strong></div><ul class="action-log">${hand.log.filter((entry) => entry.type !== 'blinds').map((entry) => `<li>${escapeHTML(formatLogEntry(entry, hand.players))}</li>`).join('')}</ul>`;
    openModal('Hand replay', body, `<button class="button button-primary" data-action="close-modal">Done</button>`, true);
  }

  function formatLogEntry(entry, players) {
    const player = players.find((item) => item.id === entry.player || item.name === entry.player);
    const name = player ? player.name : entry.player;
    if (entry.type === 'street') return `${entry.street.toUpperCase()}: ${entry.board.join(' ')}`;
    if (entry.type === 'showdown') return 'Showdown and pot settlement';
    if (entry.type === 'fold-win') return `Pot awarded after all other players folded`;
    return `${name || 'Player'} ${entry.type.replaceAll('-', ' ')}${entry.amount ? ` to ${formatChips(entry.amount)}` : ''}`;
  }

  function rabbitHunt() {
    if (!ui.tableSession) return;
    const board = Table.rabbitHunt(ui.tableSession);
    openModal('Rabbit hunt', `<p>Remaining community cards are revealed locally after the hand. They do not change the recorded result.</p><div class="replay-board"><div class="community-cards">${board.map((card, index) => Table.cardHTML(card, { index })).join('')}</div></div>`, `<button class="button button-primary" data-action="close-modal">Close</button>`, true);
  }

  function casinoAction(action, element) {
    const before = ui.casinoSession;
    const context = {
      balance: profile.balance,
      value: element.dataset.value,
      betType: element.dataset.bet,
      debit: (amount) => addChips(-amount, `${before.game} wager`),
      credit: (amount) => addChips(amount, `${before.game} result`),
      notify: showToast,
    };
    ui.casinoSession = Casino.act(before, action, context);
    render();
    if (ui.casinoSession.spinning) {
      clearTimeout(ui.casinoTimer);
      root.GGAudio.play('chip');
      ui.casinoTimer = setTimeout(() => {
        ui.casinoSession = Casino.resolve(ui.casinoSession, context);
        if (ui.casinoSession.payout) root.GGAudio.play('win');
        render();
      }, profile.settings.motion ? 850 : 60);
    } else if (ui.casinoSession.payout && ui.casinoSession.payout > 0) {
      root.GGAudio.play('win');
    }
  }

  function exportHistory() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), mode: 'offline-play-chips', profile: { name: profile.name, balance: profile.balance, stats: profile.stats }, hands: profile.history }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ggpoker-playmoney-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('History exported', `${profile.history.length} hands included. No credentials or payment data.`);
  }

  function tableSettings() {
    if (!ui.tableSession) return;
    openModal('Table settings', `<div class="settings-list">${settingRow('sound', 'Sound effects', 'Card, chip and result sounds.', switchControl('sound', profile.settings.sound, 'Sound effects'))}${settingRow('motion', 'Motion effects', 'Deal and transition animation.', switchControl('motion', profile.settings.motion, 'Motion effects'))}${settingRow('spark', 'Felt theme', 'Update this table immediately.', `<div class="theme-options">${[['emerald', '#116044'], ['midnight', '#193f67'], ['graphite', '#3c4842'], ['ruby', '#68352f']].map(([id, color]) => `<button class="theme-option ${ui.tableSession.theme === id ? 'active' : ''}" style="--theme-color:${color}" data-action="set-table-theme" data-id="${id}" aria-label="${id} table theme"><span></span></button>`).join('')}</div>`)}</div>`, `<button class="button button-primary" data-action="close-modal">Done</button>`);
  }

  document.addEventListener('click', (event) => {
    const routeTarget = event.target.closest('[data-route]');
    if (routeTarget) {
      root.GGAudio.unlock();
      root.GGAudio.play('click');
      navigate(routeTarget.dataset.route);
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    root.GGAudio.unlock();
    if (action !== 'backdrop-close' || event.target === target) root.GGAudio.play('click');
    if (action === 'toggle-nav') {
      const sidebar = document.querySelector('.sidebar');
      sidebar.classList.toggle('open');
      target.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
    } else if (action === 'notifications') {
      openModal('Notifications', `<div class="notification-item">${icon('gift', 20)}<div><strong>Your daily reward is ready</strong><p>Claim 2,500 free play chips in Promotions.</p></div></div><div class="notification-item">${icon('trophy', 20)}<div><strong>River Championship starts soon</strong><p>Register with play chips in the local tournament lobby.</p></div></div><div class="notification-item">${icon('shield', 20)}<div><strong>Offline mode is active</strong><p>No remote account or payment service is connected.</p></div></div>`, `<button class="button button-primary" data-action="close-modal">Mark as read</button>`);
    } else if (action === 'close-modal' || action === 'backdrop-close' && event.target === target) closeModal();
    else if (action === 'toggle-sound') { profile.settings.sound = !profile.settings.sound; saveProfile(); }
    else if (action === 'join-table') startTable(id);
    else if (action === 'poker-filter') { ui.pokerFilter = id; render(); }
    else if (action === 'clear-search') { ui.search = ''; document.getElementById('global-search').value = ''; render(); }
    else if (action === 'casino-game') { clearTimeout(ui.casinoTimer); ui.casinoSession = Casino.createSession(id); render(); }
    else if (action === 'claim-daily') {
      const today = new Date().toISOString().slice(0, 10);
      if (profile.lastDaily !== today) { profile.lastDaily = today; addChips(2500, 'Daily river reward'); root.GGAudio.play('reward'); showToast('2,500 chips claimed', 'Your next daily reward is available tomorrow.'); render(); }
    } else if (action === 'register-tournament') {
      const tournament = Data.tournaments.find((item) => item.id === id);
      if (!tournament || profile.registered.includes(id)) return;
      if (profile.balance < tournament.buyIn) return showToast('Not enough play chips', 'Claim a reward or add test chips in Admin.', true);
      profile.registered.push(id);
      profile.stats.tournaments += 1;
      addChips(-tournament.buyIn, `Registered for ${tournament.name}`);
      showToast('Tournament registered', `${tournament.name} is ready to play now.`);
      render();
    } else if (action === 'tournament-filter') { ui.tournamentFilter = id; render(); }
    else if (action === 'export-history') exportHistory();
    else if (action === 'replay-hand') replayHand(profile.history.find((hand) => hand.id === id));
    else if (action === 'replay-current' && ui.tableSession) replayHand(profile.history.find((hand) => hand.id === ui.tableSession.state.handId));
    else if (action === 'setting-toggle') {
      const key = id;
      profile.settings[key] = !profile.settings[key];
      if (ui.tableSession && key === 'hud') ui.tableSession.hud = profile.settings.hud;
      saveProfile();
      render();
    }
    else if (action === 'set-theme') { profile.settings.theme = id; saveProfile(); render(); }
    else if (action === 'set-table-theme' && ui.tableSession) { ui.tableSession.theme = id; profile.settings.theme = id; saveProfile(); render(); tableSettings(); }
    else if (action === 'quick-chips') { addChips(Number(target.dataset.value), 'Admin test-chip adjustment'); showToast('Test chips added', 'Your new balance is available immediately.'); render(); }
    else if (action === 'reset-profile') openModal('Reset local data?', `<p>This removes play chips, settings, custom tables, registrations and hand history from this app profile. It cannot affect any other app or account.</p><p><strong>This action cannot be undone.</strong></p>`, `<button class="button button-secondary" data-action="close-modal">Cancel</button><button class="button button-danger" data-action="confirm-reset">Reset everything</button>`);
    else if (action === 'confirm-reset') { localStorage.removeItem(STORAGE_KEY); location.hash = '#/home'; location.reload(); }
    else if (action === 'leave-table') leaveTable();
    else if (action === 'poker-fold') performPokerAction({ type: 'fold' });
    else if (action === 'poker-check') performPokerAction({ type: 'check' });
    else if (action === 'poker-call') performPokerAction({ type: 'call' });
    else if (action === 'poker-raise') performPokerAction({ type: 'raise' });
    else if (action === 'poker-allin') performPokerAction({ type: 'allin' });
    else if (action === 'next-hand' && ui.tableSession) { ui.tableSession = Table.nextHand(ui.tableSession); root.GGAudio.play('deal'); render(); scheduleTable(); }
    else if (action === 'rebuy-hand' && ui.tableSession) {
      const config = ui.tableSession.config;
      if (profile.balance < config.buyIn) return showToast('Not enough chips to rebuy', 'Leave the table and use Admin or a daily reward.', true);
      addChips(-config.buyIn, `Rebuy at ${config.name}`);
      ui.tableSession = Table.rebuy(ui.tableSession);
      render(); scheduleTable();
    } else if (action === 'rabbit-hunt') rabbitHunt();
    else if (action === 'dismiss-spin' && ui.tableSession) { ui.tableSession.showSpin = false; root.GGAudio.play('reward'); render(); scheduleTable(); }
    else if (action === 'toggle-squeeze' && ui.tableSession) { ui.tableSession.squeezed = !ui.tableSession.squeezed; root.GGAudio.play('flip'); render(); }
    else if (action === 'table-settings') tableSettings();
    else if (action === 'bet-fraction') {
      const range = document.getElementById('raise-range');
      if (range && ui.tableSession) {
        const legal = Engine.getLegalActions(ui.tableSession.state, 0);
        const pot = Engine.getPotTotal(ui.tableSession.state);
        const value = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, Math.round((ui.tableSession.state.currentBet + pot * Number(target.dataset.value)) / ui.tableSession.config.smallBlind) * ui.tableSession.config.smallBlind));
        range.value = value;
        range.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (['blackjack-deal', 'blackjack-hit', 'blackjack-stand', 'blackjack-double', 'slots-spin', 'roulette-spin', 'roulette-bet', 'baccarat-deal'].includes(action)) casinoAction(action, target);
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'raise-range') {
      const value = formatChips(Number(event.target.value));
      const output = document.getElementById('raise-output');
      const buttonValue = document.getElementById('raise-button-value');
      if (output) output.textContent = value;
      if (buttonValue) buttonValue.textContent = value;
    }
    if (event.target.dataset.action === 'volume') {
      profile.settings.volume = Number(event.target.value) / 100;
      root.GGAudio.configure(profile.settings);
      saveProfile();
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.dataset.action === 'casino-wager') {
      ui.casinoSession = Casino.act(ui.casinoSession, 'set-wager', { value: event.target.value });
      render();
    } else if (event.target.dataset.action === 'leaderboard-period') {
      ui.leaderboardPeriod = event.target.value;
      render();
    }
  });

  document.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'search-form') {
      ui.search = document.getElementById('global-search').value;
      ui.pokerFilter = 'featured';
      navigate('poker');
    } else if (event.target.id === 'chip-adjust-form') {
      const data = new FormData(event.target);
      try { const amount = Number(data.get('amount')); addChips(amount, 'Admin wallet adjustment'); showToast('Wallet updated', `${amount >= 0 ? '+' : ''}${formatChips(amount)} play chips applied.`); render(); } catch (error) { showToast('Adjustment rejected', error.message, true); }
    } else if (event.target.id === 'difficulty-form') {
      profile.settings.difficulty = new FormData(event.target).get('difficulty');
      if (ui.tableSession) ui.tableSession.difficulty = profile.settings.difficulty;
      audit('Bot difficulty updated', profile.settings.difficulty);
      saveProfile();
      showToast('Opponent profile saved', 'The new difficulty applies to active and future tables.');
      render();
    } else if (event.target.id === 'custom-table-form') {
      const data = new FormData(event.target);
      const smallBlind = Math.max(1, Number(data.get('smallBlind')));
      const bigBlind = Math.max(smallBlind * 2, Number(data.get('bigBlind')));
      const variant = data.get('variant');
      const format = data.get('format');
      const config = {
        id: `custom-${Date.now()}`,
        name: String(data.get('name') || 'Custom Table').slice(0, 32),
        variant,
        format,
        blinds: `${smallBlind} / ${bigBlind}`,
        smallBlind,
        bigBlind,
        buyIn: Math.max(200, Number(data.get('buyIn'))),
        players: Number(data.get('players')),
        max: 6,
        speed: Table.formatNames[format],
        category: ['featured', variant, format],
        accent: 'emerald',
        description: `Custom ${Table.variantNames[variant]} table created by David. Local simulated opponents.`,
      };
      profile.customTables.push(config);
      audit('Custom table created', config.name);
      saveProfile();
      showToast('Custom table created', 'It is now available in the Featured poker lobby.');
      ui.pokerFilter = 'featured';
      navigate('poker');
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.getElementById('global-search').focus();
    }
    if (event.key === 'Escape') {
      if (modalRoot.innerHTML) closeModal();
      document.querySelector('.sidebar').classList.remove('open');
    }
  });

  render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
