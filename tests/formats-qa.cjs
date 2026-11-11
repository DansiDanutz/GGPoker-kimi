const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || (() => { throw new Error('PLAYWRIGHT_MODULE is required'); })());
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const checks = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => localStorage.clear());
  const formats = [
    { id: 'emerald-6max', filter: 'featured', action: 'betting' },
    { id: 'omaha-lake', filter: 'omaha', cards: 4 },
    { id: 'plo5-canyon', filter: 'omaha', cards: 5 },
    { id: 'plo6-summit', filter: 'omaha', cards: 6 },
    { id: 'spin-gold', filter: 'spin', spin: true },
    { id: 'rush-river', filter: 'rush', rush: true },
    { id: 'aof-lightning', filter: 'aof', allIn: true },
    { id: 'flip-go', filter: 'flip', flip: true },
    { id: 'mystery-bounty', filter: 'featured', bounty: true },
  ];

  async function navPoker(filter) {
    await page.locator('.main-nav [data-route="poker"]').click();
    await page.locator(`[data-action="poker-filter"][data-id="${filter}"]`).click();
  }

  async function leaveTable() {
    await page.locator('.table-toolbar [data-action="leave-table"]').click();
    await page.locator('h1').first().waitFor();
  }

  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const key = 'ggpoker-playmoney-v1';
      const profile = JSON.parse(localStorage.getItem(key) || '{}');
      profile.settings = { ...(profile.settings || {}), motion: false, sound: false };
      localStorage.setItem(key, JSON.stringify(profile));
    });
    await page.reload({ waitUntil: 'networkidle' });

    for (const format of formats) {
      await navPoker(format.filter);
      await page.locator(`[data-action="join-table"][data-id="${format.id}"]`).click();
      await page.locator('.table-title h1').waitFor();
      if (format.spin) {
        await page.locator('#spin-dialog[open]').waitFor();
        await page.locator('[data-action="reveal-spin"]').click();
        await page.locator('[data-action="dismiss-spin"]').waitFor({ timeout: 6000 });
        assert.match(await page.locator('.spin-result-copy').textContent(), /play chips/);
        await page.locator('[data-action="dismiss-spin"]').click();
        assert.match(await page.locator('.table-toolbar').textContent(), /Prize ×/);
      }
      if (format.cards) assert.equal(await page.locator('.seat-hero .playing-card').count(), format.cards, `${format.id} hole-card count`);

      if (format.flip) {
        await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').waitFor({ timeout: 20000 });
      } else if (format.rush) {
        await page.locator('[data-action="poker-fold"]').waitFor({ timeout: 20000 });
        await page.locator('[data-action="poker-fold"]').click();
        await page.waitForFunction(() => document.querySelector('.table-title small')?.textContent.includes('Hand 2'), { timeout: 20000 });
      } else if (format.allIn) {
        await page.locator('[data-action="poker-allin"]').first().waitFor({ timeout: 20000 });
        await page.locator('[data-action="poker-allin"]').first().click();
        await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').waitFor({ timeout: 20000 });
      } else if (format.action === 'betting') {
        await page.locator('[data-action="poker-call"]').waitFor({ timeout: 20000 });
        await page.locator('[data-action="poker-call"]').click();
        await page.locator('[data-action="poker-fold"]').waitFor({ timeout: 20000 });
        const fraction = page.locator('[data-action="bet-fraction"][data-value="0.5"]');
        if (await fraction.count()) await fraction.click();
        const raise = page.locator('[data-action="poker-raise"]');
        if (await raise.isEnabled()) await raise.click();
        await page.locator('[data-action="poker-fold"], [data-action="next-hand"], [data-action="rebuy-hand"]').first().waitFor({ timeout: 20000 });
        if (await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').count() === 0) {
          await page.locator('[data-action="poker-fold"]').click();
        }
        await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').waitFor({ timeout: 45000 });
      } else {
        await page.locator('[data-action="poker-fold"]').waitFor({ timeout: 20000 });
        await page.locator('[data-action="poker-fold"]').click();
        await page.locator('[data-action="next-hand"], [data-action="rebuy-hand"]').waitFor({ timeout: 45000 });
      }
      checks.push({ format: format.id, passed: true });
      console.log(`PASS ${format.id}`);
      await leaveTable();
    }

    await page.locator('.main-nav [data-route="history"]').click();
    assert.ok(await page.locator('.data-table tbody tr').count() >= formats.length - 1);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-history"]').first().click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /ggpoker-playmoney-history-.*\.json/);
    checks.push({ format: 'history-export', passed: true });
    console.log('PASS history-export');

    await page.locator('.main-nav [data-route="admin"]').click();
    await page.locator('[data-action="reset-profile"]').click();
    await page.locator('[data-action="confirm-reset"]').click();
    await page.locator('h1').first().waitFor();
    assert.match(await page.locator('h1').first().textContent(), /Spin into your/);
    assert.match(await page.locator('#wallet-button').textContent(), /250,000/);
    checks.push({ format: 'confirmed-local-reset', passed: true });
    console.log('PASS confirmed-local-reset');
    assert.deepEqual(errors, []);
    checks.push({ format: 'zero-console-errors', passed: true });

    fs.writeFileSync('evidence/formats-qa.json', JSON.stringify({ passed: true, timestamp: new Date().toISOString(), checks, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks: checks.length, errors: 0 }, null, 2));
  } catch (error) {
    const tableState = await page.locator('.table-layout').count() ? await page.locator('.table-layout').textContent() : null;
    const toast = await page.locator('#toast-region').textContent();
    await page.screenshot({ path: `qa-output/formats-failure-${Date.now()}.png`, fullPage: true }).catch(() => {});
    fs.writeFileSync('evidence/formats-qa.json', JSON.stringify({ passed: false, timestamp: new Date().toISOString(), checks, errors, failure: error.stack, tableState, toast }, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
})();
