const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || (() => { throw new Error('PLAYWRIGHT_MODULE is required'); })());
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = 'qa-output/redesign-details';
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const checks = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('qa-initialized')) {
      localStorage.clear();
      sessionStorage.setItem('qa-initialized', 'true');
    }
    let timestamp = 1767225600000;
    const NativeDate = Date;
    Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [timestamp])); }
      static now() { timestamp += 1000; return timestamp; }
    };
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });

  async function check(name, action) {
    await action();
    checks.push({ name, passed: true });
    console.log(`PASS ${name}`);
  }

  async function nav(route) {
    const mobile = page.viewportSize().width <= 700;
    const selector = mobile && ['home', 'poker', 'tournaments', 'casino', 'profile'].includes(route) ? '.bottom-nav' : '.main-nav';
    await page.locator(`${selector} [data-route="${route}"]`).click();
  }

  async function join(id) {
    await page.locator(`[data-action="join-table"][data-id="${id}"]`).first().click();
    await page.locator('.table-title h1').waitFor();
  }

  async function leave() {
    await page.locator('.table-toolbar [data-action="leave-table"]').click();
  }

  async function capture(name) {
    await page.locator('#toast-region').evaluate((element) => { element.innerHTML = ''; });
    await page.waitForTimeout(450);
    const { width, height } = page.viewportSize();
    const motion = await page.locator('body').getAttribute('data-motion');
    const theme = await page.evaluate(() => (document.querySelector('.table-stage')?.style.getPropertyValue('--table-felt') || 'noir-gold').replace('#', ''));
    await page.screenshot({ path: `${output}/${name}-${width}x${height}-${motion}-${theme}.png`, fullPage: false });
  }

  async function assertSceneFits() {
    const result = await page.evaluate(() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const stage = document.querySelector('.table-stage').getBoundingClientRect();
      const sceneProblems = [...document.querySelectorAll('.seat, .seat-cards, .pot-display, .community-cards')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { className: element.className, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }).filter((rect) => rect.left < stage.left - 1 || rect.right > stage.right + 1 || rect.top < stage.top - 1 || rect.bottom > stage.bottom + 1);
      const chromeProblems = [...document.querySelectorAll('.action-dock, .table-toolbar')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { className: element.className, left: rect.left, right: rect.right };
      }).filter((rect) => rect.left < -1 || rect.right > viewport.width + 1);
      return { viewport, stage: { left: stage.left, right: stage.right, top: stage.top, bottom: stage.bottom }, documentWidth: document.documentElement.scrollWidth, sceneProblems, chromeProblems };
    });
    assert.ok(result.documentWidth <= result.viewport.width + 1, `Document overflows ${result.viewport.width}px`);
    assert.deepEqual(result.sceneProblems, [], `Scene elements clipped at ${result.viewport.width}x${result.viewport.height}`);
    assert.deepEqual(result.chromeProblems, [], `Controls clipped at ${result.viewport.width}x${result.viewport.height}`);
  }

  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await check('Noir & Gold home has one H1, compact rail and original format scenes', async () => {
      assert.equal(await page.locator('h1').count(), 1);
      assert.match(await page.locator('h1').textContent(), /Spin into your/);
      assert.equal(await page.locator('.format-scene').count(), 3);
      assert.ok(await page.locator('.hero-cinema .spin-wheel-wrap').count());
      assert.equal(await page.locator('.sidebar').evaluate((element) => Math.round(element.getBoundingClientRect().width)), 84);
      await capture('home-noir-1440');
    });

    await check('Spin & Gold has three seats and a deterministic reveal', async () => {
      await join('spin-gold');
      assert.equal(await page.locator('.seat').count(), 3);
      await page.locator('#spin-dialog[open]').waitFor();
      assert.equal(await page.locator('#spin-dialog').getAttribute('data-stage'), 'awaiting');
      await page.locator('[data-action="reveal-spin"]').click();
      assert.equal(await page.locator('#spin-dialog').getAttribute('data-stage'), 'revealing');
      await page.locator('[data-action="dismiss-spin"]').waitFor({ timeout: 6000 });
      assert.match(await page.locator('#spin-wheel-rotor').getAttribute('style'), /rotate\(/);
      assert.equal(await page.locator('#spin-dialog').getAttribute('data-stage'), 'revealed');
      await capture('spin-revealed-1440');
      await page.locator('[data-action="dismiss-spin"]').click();
      assert.equal(await page.locator('#spin-dialog[open]').count(), 0);
      assert.equal(await page.locator('#main-view').getAttribute('aria-labelledby'), 'route-title');
      assert.equal(await page.locator('.table-title h1').getAttribute('id'), 'route-title');
      const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, action: document.activeElement.dataset.action }));
      assert.ok(focus.tag === 'BUTTON' || focus.tag === 'H1', JSON.stringify(focus));
    });

    await check('seat, pot, navigation, announcer and action-region identities survive updates', async () => {
      const handles = await page.evaluateHandle(() => ({
        seat: document.querySelector('.seat'),
        pot: document.querySelector('[data-pot-value]'),
        nav: document.querySelector('#main-nav'),
        announcer: document.querySelector('.last-action'),
        actions: document.querySelector('[data-action-region]'),
      }));
      await page.locator('[data-action="poker-call"]').click();
      await page.locator('.seat-action').first().waitFor({ timeout: 12000 });
      const same = await page.evaluate((elements) => ({
        seat: elements.seat === document.querySelector('.seat'),
        pot: elements.pot === document.querySelector('[data-pot-value]'),
        nav: elements.nav === document.querySelector('#main-nav'),
        announcer: elements.announcer === document.querySelector('.last-action'),
        actions: elements.actions === document.querySelector('[data-action-region]'),
      }), handles);
      assert.deepEqual(same, { seat: true, pot: true, nav: true, announcer: true, actions: true });
    });

    await check('focus remains usable after the hero folds', async () => {
      if (await page.locator('[data-action="next-hand"]').count()) {
        await page.locator('[data-action="next-hand"]').click();
        await page.locator('[data-action="dismiss-spin"]').click();
      }
      await page.locator('[data-action="poker-fold"]').waitFor({ timeout: 20000 });
      await page.locator('[data-action="poker-fold"]').focus();
      await page.locator('[data-action="poker-fold"]').click();
      const focused = await page.evaluate(() => ({ tag: document.activeElement.tagName, action: document.activeElement.dataset.action || null }));
      assert.ok(focused.tag === 'BUTTON' || focused.tag === 'H1', JSON.stringify(focused));
      await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').waitFor({ timeout: 45000 });
      await capture('spin-complete-1440');
      await page.locator('[data-action="table-settings"]').click();
      await capture('table-settings-1440');
      await page.locator('#app-dialog [data-action="close-modal"]').first().click();
      await page.locator('[data-action="replay-current"]').click();
      await capture('hand-replay-1440');
      await page.locator('#app-dialog [data-action="close-modal"]').first().click();
      await page.locator('[data-action="rabbit-hunt"]').first().click();
      await capture('rabbit-hunt-1440');
      await page.locator('#app-dialog [data-action="close-modal"]').first().click();
      await leave();
    });

    await check('PokerCraft handles PLO variants, all periods and neutral break-even results', async () => {
      await page.evaluate(() => {
        const key = 'ggpoker-playmoney-v1';
        const profile = JSON.parse(localStorage.getItem(key));
        const base = profile.history[0];
        profile.history = Array.from({ length: 12 }, (_, index) => ({
          ...base,
          id: `fixture-${index}`,
          variant: ['PLO-5', 'PLO-6', 'No-Limit Hold’em'][index % 3],
          net: index % 4 === 0 ? 0 : index % 2 ? 100 : -50,
        }));
        localStorage.setItem(key, JSON.stringify(profile));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await nav('history');
      await page.locator('#history-variant').selectOption('omaha');
      assert.equal(await page.locator('.data-table tbody tr').count(), 8);
      assert.ok(await page.locator('.outcome-chart').count());
      assert.match(await page.locator('.chart-card').textContent(), /broke even/);
      await page.locator('#history-variant').selectOption('all');
      await page.locator('#history-period').selectOption('recent10');
      assert.equal(await page.locator('.data-table tbody tr').count(), 10);
      assert.doesNotMatch(await page.locator('.outcome-chart').textContent(), /H11/);
      await page.locator('#history-period').selectOption('all');
      assert.equal(await page.locator('.data-table tbody tr').count(), 12);
      assert.match(await page.locator('.outcome-chart').textContent(), /H12/);
      await page.locator('#history-variant').selectOption('shortdeck');
      assert.equal(await page.locator('.outcome-chart').count(), 0);
      assert.match(await page.locator('.chart-empty').textContent(), /No matching outcomes/);
      await page.locator('#history-variant').selectOption('all');
      assert.equal(await page.locator('.data-table tbody tr').count(), 12);
      assert.match(await page.locator('.outcome-chart').textContent(), /H12/);
      await capture('pokercraft-1440');
    });

    await check('responsive home scenes fit every required width', async () => {
      await nav('home');
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await capture(`home-noir-${width}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Home overflows ${width}`);
      }
    });

    await check('mobile and desktop table elements stay inside the scene', async () => {
      for (const [width, height] of [[320, 568], [390, 844], [700, 800], [701, 800], [768, 900], [900, 900], [901, 900], [1024, 1000], [1180, 1000], [1181, 1000], [1440, 1000], [1500, 1000], [844, 390]]) {
        await page.setViewportSize({ width, height });
        await nav('poker');
        await page.locator('[data-action="poker-filter"][data-id="omaha"]').click();
        await join('plo6-summit');
        await assertSceneFits();
        await capture(`table-plo6-${width}`);
        await leave();
      }
    });

    await check('two and four-seat scenes cover all hole-card configurations', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const scenario of [
        { id: 'emerald-6max', seats: 4, cards: 2, filter: 'featured' },
        { id: 'omaha-lake', seats: 3, cards: 4, filter: 'omaha' },
        { id: 'plo5-canyon', seats: 4, cards: 5, filter: 'omaha' },
        { id: 'plo6-summit', seats: 2, cards: 6, filter: 'omaha' },
      ]) {
        await nav('poker');
        await page.locator(`[data-action="poker-filter"][data-id="${scenario.filter}"]`).click();
        await join(scenario.id);
        assert.equal(await page.locator('.seat').count(), scenario.seats, scenario.id);
        assert.equal(await page.locator('.seat-hero .playing-card').count(), scenario.cards, scenario.id);
        await assertSceneFits();
        await capture(`table-${scenario.id}-390`);
        await leave();
      }
    });

    await check('reduced motion immediately exposes the final wheel state', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await nav('poker');
      await page.locator('[data-action="poker-filter"][data-id="spin"]').click();
      await join('spin-gold');
      await page.locator('[data-action="reveal-spin"]').click();
      await page.locator('[data-action="dismiss-spin"]').waitFor({ timeout: 1000 });
      assert.equal(await page.locator('#spin-dialog').getAttribute('data-stage'), 'revealed');
      await page.locator('[data-action="dismiss-spin"]').click();
      await leave();
    });

    await check('mobile drawer traps focus and restores the trigger on Escape', async () => {
      await nav('home');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#mobile-menu-button').click();
      assert.equal(await page.locator('.workspace').evaluate((element) => element.inert), true);
      await page.locator('#sidebar-profile').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'brand-logo');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebar-profile');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.workspace').evaluate((element) => element.inert), false);
      assert.equal(await page.locator('#mobile-menu-button').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'mobile-menu-button');
    });

    await check('interactive controls meet 44px targets and mobile labels remain visible', async () => {
      await nav('home');
      await page.setViewportSize({ width: 390, height: 844 });
      const tooSmall = await page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { name: button.getAttribute('aria-label') || button.textContent.trim(), width: rect.width, height: rect.height };
      }).filter((rect) => rect.width < 43.5 || rect.height < 43.5));
      assert.deepEqual(tooSmall, []);
      assert.ok(await page.locator('.bottom-nav .nav-button span').first().isVisible());
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const selector of ['.top-avatar', '#global-search']) {
        const rect = await page.locator(selector).boundingBox();
        assert.ok(rect.width >= 43.5 && rect.height >= 43.5, `${selector} is ${rect.width}x${rect.height}`);
      }
    });

    await check('no browser errors during the redesign scenarios', async () => assert.deepEqual(errors, []));

    fs.writeFileSync('evidence/redesign-qa.json', JSON.stringify({ passed: true, timestamp: new Date().toISOString(), checks, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks: checks.length, errors: 0 }, null, 2));
  } catch (error) {
    await page.screenshot({ path: `${output}/failure-${Date.now()}.png`, fullPage: true }).catch(() => {});
    fs.writeFileSync('evidence/redesign-qa.json', JSON.stringify({ passed: false, timestamp: new Date().toISOString(), checks, errors, failure: error.stack }, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
})();
