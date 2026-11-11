(function attachScenes(root) {
  const cache = new Map();
  const suits = { s: '♠', h: '♥', d: '♦', c: '♣' };

  function artCard(rank, suit, index, extra = '') {
    const red = suit === 'h' || suit === 'd';
    return `<span class="scene-card ${red ? 'red' : ''} ${extra}" style="--card-index:${index}"><b>${rank}</b><i>${suits[suit]}</i></span>`;
  }

  function fan(cards) {
    return `<div class="scene-fan">${cards.map(([rank, suit], index) => artCard(rank, suit, index)).join('')}</div>`;
  }

  function wheel(multiplier = 25, id = '') {
    const values = [2, 3, 5, 10, 25, 200];
    const paths = values.map((value, index) => {
      const start = (index * 60 - 90) * Math.PI / 180;
      const end = ((index + 1) * 60 - 90) * Math.PI / 180;
      const x1 = 200 + 170 * Math.cos(start);
      const y1 = 200 + 170 * Math.sin(start);
      const x2 = 200 + 170 * Math.cos(end);
      const y2 = 200 + 170 * Math.sin(end);
      const middle = (index * 60 + 30 - 90) * Math.PI / 180;
      const tx = 200 + 113 * Math.cos(middle);
      const ty = 200 + 113 * Math.sin(middle);
      const rotation = index * 60 + 30;
      const fill = index % 2 ? '#7d201d' : '#15191d';
      return `<path d="M200 200 L${x1.toFixed(2)} ${y1.toFixed(2)} A170 170 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${fill}" stroke="#d4a952" stroke-width="2"/><text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" fill="#ffe3a1" font-size="27" font-weight="800" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotation} ${tx.toFixed(2)} ${ty.toFixed(2)})">×${value}</text>`;
    }).join('');
    return `<div class="spin-wheel-wrap" ${id ? `id="${id}"` : ''}><span class="spin-pointer" aria-hidden="true"></span><svg class="spin-wheel" viewBox="0 0 400 400" role="img" aria-label="Prize wheel with multipliers 2, 3, 5, 10, 25 and 200"><defs><radialGradient id="wheel-metal"><stop stop-color="#fff0ad"/><stop offset=".45" stop-color="#b67a26"/><stop offset=".75" stop-color="#f3ce72"/><stop offset="1" stop-color="#5f3512"/></radialGradient><filter id="wheel-shadow"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".7"/></filter></defs><g id="spin-wheel-rotor" style="transform-origin:200px 200px"><circle cx="200" cy="200" r="187" fill="url(#wheel-metal)" filter="url(#wheel-shadow)"/><circle cx="200" cy="200" r="174" fill="#281713"/>${paths}<circle cx="200" cy="200" r="39" fill="url(#wheel-metal)"/><circle cx="200" cy="200" r="27" fill="#171a1d" stroke="#f4cf77" stroke-width="2"/></g></svg><span class="wheel-result" aria-hidden="true">×${multiplier}</span></div>`;
  }

  function format(config) {
    const key = `${config.format}:${config.variant}:${config.accent}`;
    if (cache.has(key)) return cache.get(key);
    const holdem = [['A', 's'], ['K', 'h']];
    const omaha = [['A', 's'], ['K', 'h'], ['Q', 'c'], ['J', 'd']];
    const plo5 = omaha.concat([['T', 's']]);
    const plo6 = plo5.concat([['9', 'h']]);
    const short = [['A', 's'], ['9', 'h']];
    const cards = config.variant === 'omaha' ? omaha : config.variant === 'plo5' ? plo5 : config.variant === 'plo6' ? plo6 : config.variant === 'shortdeck' ? short : holdem;
    let content;
    if (config.format === 'spin') {
      content = `<div class="scene-wheel-crop">${wheel(25)}</div><div class="scene-burst"><span>UP TO</span><strong>×200</strong></div>`;
    } else if (config.format === 'rush') {
      content = `<div class="speed-lines"><i></i><i></i><i></i></div>${fan(cards)}<div class="rush-bolt">RUSH</div>`;
    } else if (config.format === 'aof') {
      content = `<div class="decision-split"><span>FOLD</span><span>ALL IN</span></div>${fan(cards)}<div class="chip-burst">${chipStack(6, 'coral')}${chipStack(5, 'gold')}</div>`;
    } else if (config.format === 'flip') {
      content = `<div class="flip-stage">${fan(cards)}<span class="flip-ring"></span></div><span class="scene-caption">FLIP <b>&</b> GO</span>`;
    } else if (config.format === 'bounty') {
      content = `<div class="bounty-vault"><span class="vault-lock">?</span><i></i><i></i><i></i></div><div class="bounty-glow"></div><span class="scene-caption">MYSTERY <b>BOUNTY</b></span>`;
    } else {
      content = `${fan(cards)}<div class="scene-table-ring"></div><span class="scene-caption">${config.variant === 'shortdeck' ? '6+' : config.variant.toUpperCase()}</span>`;
    }
    const html = `<div class="format-scene scene-${config.format} scene-accent-${config.accent}" aria-hidden="true"><div class="scene-light"></div>${content}</div>`;
    cache.set(key, html);
    return html;
  }

  function hero() {
    return `<div class="hero-cinema" aria-hidden="true"><div class="cinema-rays"></div><div class="cinema-coin coin-one"></div><div class="cinema-coin coin-two"></div><div class="cinema-wheel">${wheel(200)}</div><div class="cinema-cards">${fan([['A', 's'], ['K', 'h']])}</div><div class="cinema-glow"></div></div>`;
  }

  function avatar(bot, index = 0) {
    const variant = index % 5;
    const colors = [bot.color || '#567d70', '#a16654', '#4c7d93', '#a4874c', '#74639b'];
    const color = colors[variant];
    const accessories = [
      '<path d="M23 29c5-10 29-10 34 0l-4 5H27Z" fill="#17231f"/><path d="M20 30h40" stroke="#e4bc67" stroke-width="3"/>',
      '<path d="M22 27c8-8 28-8 36 0v6H22Z" fill="#22262a"/><path d="M26 25h28" stroke="#ddd" stroke-width="2"/>',
      '<path d="M20 30c4-12 36-12 40 0l-5 3H25Z" fill="#253f36"/>',
      '<path d="M24 25h32v9H24Z" fill="#301d1a"/><path d="M22 32h36" stroke="#d5ad60" stroke-width="2"/>',
      '<path d="M21 28c7-9 31-9 38 0l-4 5H25Z" fill="#1c2228"/><circle cx="51" cy="22" r="4" fill="#e4bc67"/>',
    ];
    return `<svg class="portrait" viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="portrait-bg-${variant}" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#101a17"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#portrait-bg-${variant})"/><circle cx="40" cy="35" r="16" fill="#c99879"/><path d="M18 74c2-18 12-25 22-25s20 7 22 25" fill="#202c28"/><path d="M31 35h5m8 0h5" stroke="#211c19" stroke-width="2.4" stroke-linecap="round"/><path d="M35 44c3 2 7 2 10 0" stroke="#7a4f3d" stroke-width="2" stroke-linecap="round"/>${accessories[variant]}<rect x="1" y="1" width="78" height="78" rx="39" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/></svg>`;
  }

  function chipStack(count = 4, tone = 'gold') {
    return `<span class="chip-stack chip-${tone}" aria-hidden="true">${Array.from({ length: Math.min(8, count) }, (_, index) => `<i style="--chip-index:${index}"></i>`).join('')}</span>`;
  }

  root.GGScenes = { format, hero, wheel, avatar, chipStack };
})(typeof globalThis !== 'undefined' ? globalThis : this);
