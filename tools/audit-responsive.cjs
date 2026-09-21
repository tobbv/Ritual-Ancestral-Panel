const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const results = [];
  try {
    for (const width of [1440, 1024, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => {
        const host = new URL(route.request().url()).hostname;
        if (host.endsWith('supabase.co')) return route.abort();
        if (host === 'cdn.jsdelivr.net') return route.fulfill({ body: '', contentType: 'application/javascript' });
        return route.continue();
      });
      await page.goto('http://127.0.0.1:8794/index.html?preview=1', { waitUntil: 'networkidle' });
      if (width === 1440 || width === 390) {
        await page.evaluate(() => mostrarSetup());
        await page.screenshot({ path: `tests/artifacts/audit-login-${width}.png` });
        const login = await page.evaluate(() => ({ overflow: document.body.scrollWidth - innerWidth, email: !!document.querySelector('label[for="loginEmail"]'), password: !!document.querySelector('label[for="loginPassword"]') }));
        console.log('login', width, JSON.stringify(login));
        await page.locator('#loginPassword').focus();
        await page.keyboard.press('Enter');
        if (!await page.locator('#setupMsg').getByText('Completa email y contraseña').isVisible()) throw new Error('El login no muestra validación al pulsar Enter');
        await page.evaluate(() => { document.getElementById('setupScreen').style.display = 'none'; document.getElementById('appMain').style.display = 'flex'; });
      }
      for (const view of ['inicio', 'registro', 'ventasmes', 'stock', 'productos', 'movimientos', 'clientes', 'delivery', 'finanzas', 'config']) {
        await page.evaluate(v => navTo(v), view);
        await page.waitForTimeout(90);
        const dimensions = await page.evaluate(v => {
          const root = document.getElementById('pv-' + v);
          const main = document.getElementById('mainPage');
          const clip = main.getBoundingClientRect();
          const offenders = [...root.querySelectorAll('button,input,select,textarea')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.left > clip.left + 10 && r.right > clip.right + 12 && getComputedStyle(el).position !== 'fixed';
          }).slice(0, 5).map(el => ({ label: (el.textContent || el.getAttribute('aria-label') || el.id).trim().slice(0, 40), right: Math.round(el.getBoundingClientRect().right - clip.right) }));
          return { bodyOverflow: document.body.scrollWidth - innerWidth, pageOverflow: main.scrollWidth - main.clientWidth, rootOverflow: root.scrollWidth - root.clientWidth, offenders };
        }, view);
        results.push({ width, view, ...dimensions });
      }
      if (width === 390) {
        await page.evaluate(() => navTo('config'));
        await page.screenshot({ path: 'tests/artifacts/audit-config-mobile.png' });
      }
      if (width === 320) {
        for (const view of ['inicio', 'delivery']) {
          await page.evaluate(v => navTo(v), view);
          await page.screenshot({ path: `tests/artifacts/audit-${view}-320.png` });
        }
      }
      if (width === 1440) {
        await page.evaluate(() => navTo('config'));
        await page.screenshot({ path: 'tests/artifacts/audit-config-desktop.png' });
        const icons = await page.locator('.cfg-nav-icon img').evaluateAll(nodes => nodes.map(n => ({ complete: n.complete, width: n.naturalWidth, display: getComputedStyle(n).display })));
        console.log('configIcons', JSON.stringify(icons));
      }
      console.log('runtime', width, JSON.stringify(errors));
      await page.close();
      if (width === 1440 || width === 390 || width === 320) {
        const order = await browser.newPage({ viewport: { width, height: 900 } });
        await order.goto('http://127.0.0.1:8794/pedido.html?demo=1', { waitUntil: 'networkidle' });
        const orderState = await order.evaluate(() => ({ overflow: document.body.scrollWidth - innerWidth, cards: document.querySelectorAll('.rp-card').length }));
        const before = await order.locator('.rp-step.current').innerText();
        await order.locator('#rpDemoNext').click();
        if (await order.locator('.rp-step.current').innerText() === before) throw new Error('El demo del pedido no cambia de estado');
        await order.screenshot({ path: `tests/artifacts/audit-pedido-${width}.png` });
        console.log('pedido', width, JSON.stringify(orderState));
        await order.close();
      }
    }
    console.log(JSON.stringify(results.filter(r => r.bodyOverflow > 1 || r.pageOverflow > 1 || r.rootOverflow > 1 || r.offenders.length), null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
