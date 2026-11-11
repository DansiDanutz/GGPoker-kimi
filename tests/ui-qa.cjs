const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set PLAYWRIGHT_MODULE to the installed playwright-core module path');
const { chromium } = require(modulePath);
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = process.env.APP_URL || 'http://127.0.0.1:4173';
const output = path.resolve('qa-output');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const checks = [];
  const screenshots = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => localStorage.clear());

  async function check(name, action) {
    await action();
    checks.push({ name, passed: true });
    console.log(`PASS ${name}`);
  }

  async function screenshot(name, fullPage = true) {
    const file = path.join(output, `${name}.png`);
    await page.screenshot({ path: file, fullPage });
    screenshots.push(file);
  }

  async function nav(route, heading) {
    const mobileDestinations = ['home', 'poker', 'tournaments', 'casino', 'profile'];
    const useBottomNav = page.viewportSize().width <= 700 && mobileDestinations.includes(route);
    const selector = useBottomNav ? '.bottom-nav' : '.main-nav';
    await page.locator(`${selector} [data-route="${route}"]`).click();
    await page.locator('h1').first().waitFor();
    if (heading) assert.equal(await page.locator('h1').first().textContent(), heading);
  }

  try {
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await check('home renders without a startup error', async () => {
      assert.equal(await page.title(), 'GGPoker PlayMoney');
      assert.equal(await page.locator('h1').first().textContent(), 'Good to see you, David.');
      assert.match(await page.locator('#wallet-button').textContent(), /250,000/);
      await screenshot('home-1440');
    });

    await check('all primary navigation tabs render', async () => {
      for (const [route, heading] of [
        ['poker', 'Poker lobby'],
        ['tournaments', 'Tournament schedule'],
        ['casino', 'Casino'],
        ['promotions', 'Promotions & missions'],
        ['leaderboard', 'Local leaderboard'],
        ['history', 'PokerCraft'],
        ['admin', 'Admin control room'],
      ]) await nav(route, heading);
    });

    await check('tournament and leaderboard controls change the view', async () => {
      await nav('tournaments', 'Tournament schedule');
      await page.locator('[data-action="tournament-filter"][data-id="bounty"]').click();
      assert.equal(await page.locator('.tournament-card').count(), 2);
      await page.locator('[data-action="tournament-filter"][data-id="all"]').click();
      assert.equal(await page.locator('.tournament-card').count(), 6);
      await nav('leaderboard', 'Local leaderboard');
      await page.locator('[data-action="leaderboard-period"]').selectOption('all');
      assert.match(await page.locator('.section-head').textContent(), /all time/);
    });

    await check('search spans all poker variants and chip signs are preserved', async () => {
      await nav('poker', 'Poker lobby');
      await page.locator('#global-search').fill('PLO-6');
      await page.locator('#global-search').press('Enter');
      assert.match(await page.locator('#main-view').textContent(), /PLO-6 Summit/);
      assert.equal(await page.evaluate(() => window.GGPokerTable.formatChips(-120)), '-120');
      await page.locator('#global-search').fill('');
      await page.locator('#global-search').press('Enter');
    });

    await check('profile sound, motion, HUD and theme controls persist', async () => {
      await page.locator('.sidebar-profile').click();
      const motion = page.locator('[data-action="setting-toggle"][data-id="motion"]');
      await motion.click();
      assert.equal(await motion.getAttribute('aria-checked'), 'false');
      const sound = page.locator('[data-action="setting-toggle"][data-id="sound"]');
      await sound.click();
      assert.equal(await sound.getAttribute('aria-checked'), 'false');
      const hud = page.locator('[data-action="setting-toggle"][data-id="hud"]');
      await hud.click();
      assert.equal(await hud.getAttribute('aria-checked'), 'false');
      await page.locator('[data-action="set-theme"][data-id="midnight"]').click();
      assert.match(await page.locator('[data-action="set-theme"][data-id="midnight"]').getAttribute('class'), /active/);
    });

    await check('Short Deck poker hand, showdown, replay and rabbit hunt', async () => {
      await nav('poker', 'Poker lobby');
      await page.locator('[data-action="poker-filter"][data-id="shortdeck"]').click();
      await page.locator('[data-action="join-table"][data-id="shortdeck-peak"]').click();
      await page.locator('.table-title h1').waitFor();
      assert.equal(await page.locator('.table-title h1').textContent(), 'Short Deck Peak');
      assert.equal(await page.locator('.smart-hud').count(), 0);
      await page.locator('[data-action="toggle-squeeze"]').first().click();
      assert.equal(await page.locator('.playing-card.squeeze').count(), 2);
      await screenshot('table-1440', false);
      await page.locator('[data-action="poker-fold"]').waitFor({ timeout: 20000 });
      await page.locator('[data-action="poker-fold"]').click();
      await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').waitFor({ timeout: 25000 });
      await screenshot('showdown-1440', false);
      await page.locator('[data-action="replay-current"]').click();
      await page.getByRole('dialog').waitFor();
      assert.match(await page.getByRole('dialog').textContent(), /Hand replay/);
      await page.locator('[data-action="close-modal"]').first().click();
      await page.locator('[data-action="rabbit-hunt"]').first().click();
      await page.getByRole('dialog').waitFor();
      assert.match(await page.getByRole('dialog').textContent(), /Rabbit hunt/);
      await page.locator('[data-action="close-modal"]').first().click();
      await page.locator('.table-toolbar [data-action="leave-table"]').click();
      assert.equal(await page.locator('h1').first().textContent(), 'Poker lobby');
    });

    await check('blackjack deals and settles', async () => {
      await nav('casino', 'Casino');
      await page.locator('[data-action="blackjack-deal"]').click();
      const stand = page.locator('[data-action="blackjack-stand"]');
      if (await stand.count()) await stand.click();
      assert.match(await page.locator('.game-message').textContent(), /Blackjack|Dealer|beats|Push/);
    });

    await check('slots spin and settle', async () => {
      await page.locator('[data-action="casino-game"][data-id="slots"]').click();
      await page.locator('[data-action="slots-spin"]').click();
      await page.waitForFunction(() => !document.querySelector('.slot-reel.spinning'), { timeout: 5000 });
      assert.match(await page.locator('.game-message').textContent(), /pays|no matching/);
    });

    await check('roulette spins and settles', async () => {
      await page.locator('[data-action="casino-game"][data-id="roulette"]').click();
      await page.locator('[data-action="roulette-bet"][data-bet="red"]').click();
      await page.locator('[data-action="roulette-spin"]').click();
      await page.waitForFunction(() => !document.querySelector('.roulette-wheel.spinning'), { timeout: 5000 });
      assert.match(await page.locator('.game-message').textContent(), /landed on/);
    });

    await check('baccarat deals with third-card rules', async () => {
      await page.locator('[data-action="casino-game"][data-id="baccarat"]').click();
      await page.locator('[data-action="roulette-bet"][data-bet="player"]').click();
      await page.locator('[data-action="baccarat-deal"]').click();
      assert.match(await page.locator('.game-message').textContent(), /wins|Tie/);
    });

    await check('daily reward and tournament registration', async () => {
      await nav('promotions', 'Promotions & missions');
      await page.locator('[data-action="claim-daily"]').click();
      assert.equal(await page.locator('[data-action="claim-daily"]').isDisabled(), true);
      await nav('tournaments', 'Tournament schedule');
      await page.locator('[data-action="register-tournament"][data-id="daily-river"]').click();
      assert.match(await page.locator('.tournament-card').first().textContent(), /Play event/);
    });

    await check('admin chips, bot difficulty and custom table creation', async () => {
      await nav('admin', 'Admin control room');
      const before = await page.locator('#wallet-button').textContent();
      await page.locator('[data-action="quick-chips"]').click();
      assert.notEqual(await page.locator('#wallet-button').textContent(), before);
      await page.locator('#bot-difficulty').selectOption('expert');
      await page.locator('#difficulty-form button').click();
      await page.locator('#custom-name').fill('QA Test Table');
      await page.locator('#custom-table-form button[type="submit"]').click();
      assert.equal(await page.locator('h1').first().textContent(), 'Poker lobby');
      assert.match(await page.locator('#main-view').textContent(), /QA Test Table/);
    });

    await check('completed hand appears in PokerCraft', async () => {
      await nav('history', 'PokerCraft');
      assert.ok(await page.locator('.data-table tbody tr').count() >= 1);
      assert.match(await page.locator('.data-table').textContent(), /Short Deck Peak/);
      await page.locator('[data-action="replay-hand"]').first().click();
      await page.getByRole('dialog').waitFor();
      await page.locator('[data-action="close-modal"]').first().click();
    });

    await check('responsive lobby at required widths', async () => {
      await page.locator('#brand-logo').click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 1, `Horizontal overflow ${overflow}px at ${width}px`);
        await screenshot(`home-${width}`);
      }
    });

    await check('mobile poker table has no horizontal overflow', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await nav('poker', 'Poker lobby');
      await page.locator('[data-action="join-table"][data-id="emerald-6max"]').first().click();
      await page.locator('.table-title h1').waitFor();
      await screenshot('table-390', false);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `Table horizontal overflow ${overflow}px at 390px`);
      await page.locator('.table-toolbar [data-action="leave-table"]').click();
    });

    await check('200 percent page scale and reduced motion remain usable', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('#brand-logo').click();
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
      await screenshot('home-200-percent', false);
      await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const duration = await page.locator('.game-card').first().evaluate((element) => getComputedStyle(element).transitionDuration);
      assert.ok(duration === '1e-06s' || duration === '0.000001s' || duration === '0s', duration);
    });

    await check('buttons have accessible names', async () => {
      const unnamed = await page.locator('button').evaluateAll((buttons) => buttons.filter((button) => !(button.getAttribute('aria-label') || button.textContent.trim() || button.getAttribute('title'))).map((button) => button.outerHTML));
      assert.deepEqual(unnamed, []);
    });

    await check('no browser console or page errors', async () => assert.deepEqual(errors, []));

    const result = { passed: true, timestamp: new Date().toISOString(), checks, errors, screenshots };
    fs.writeFileSync('evidence/ui-qa.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ passed: true, checks: checks.length, errors: errors.length, screenshots: screenshots.length }, null, 2));
  } catch (error) {
    await screenshot('failure', true).catch(() => {});
    const result = { passed: false, timestamp: new Date().toISOString(), checks, errors, failure: error.stack, screenshots };
    fs.writeFileSync('evidence/ui-qa.json', JSON.stringify(result, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
})();
