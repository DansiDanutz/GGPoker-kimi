(function attachIcons(root) {
  const paths = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
    cards: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m12 7-2.5 3.5a2 2 0 1 0 1.5 3.2V17h2v-3.3a2 2 0 1 0 1.5-3.2Z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 3h8m-6-3h4"/>',
    casino: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.3" fill="currentColor" stroke="none"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.5 4.8 5.2 6.5 2.5 10 5.5 12 8Zm9 0c2.5 0 3.5-1.5 2.7-2.8C17.5 2.5 14 5.5 12 8Z"/>',
    chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    shield: '<path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Zm-8 11h4"/>',
    wallet: '<path d="M4 5h14a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12"/><path d="M15 10h7v5h-7a2.5 2.5 0 0 1 0-5Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m1-15a3 3 0 0 1 0 6m2 9a5 5 0 0 0-4-5"/>',
    chip: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    sound: '<path d="M4 10v4h4l5 4V6l-5 4Z"/><path d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>',
    muted: '<path d="M4 10v4h4l5 4V6l-5 4Z"/><path d="m17 9 5 6m0-6-5 6"/>',
    motion: '<path d="M4 8h9m-5 4h12M4 16h9"/><path d="m15 4 5 4-5 4"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    edit: '<path d="m4 16-1 5 5-1L20 8l-4-4Z"/><path d="m14 6 4 4"/>',
    spark: '<path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z"/>',
  };

  function icon(name, size = 20, className = '') {
    return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  }

  function logo(compact = false) {
    return `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M24 5C18 14 8 19 8 28a10 10 0 0 0 14 9c-.7 3-2 5-4 7h12c-2-2-3.3-4-4-7a10 10 0 0 0 14-9c0-9-10-14-16-23Z" fill="currentColor"/><path d="m19 25 5-6 5 6-5 6Z" fill="#0d3229"/></svg></span><span class="brand-copy"><strong>GG<span>POKER</span></strong>${compact ? '' : '<small>PLAY MONEY</small>'}</span>`;
  }

  root.GGIcons = { icon, logo };
})(typeof globalThis !== 'undefined' ? globalThis : this);
