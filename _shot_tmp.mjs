import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = process.argv[3];
const URL = process.argv[2] || 'http://localhost:5174/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, text) {
  try {
    const h = await page.evaluateHandle((t) => {
      const els = [...document.querySelectorAll('button, [role=button]')];
      return els.find((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null;
    }, text);
    const el = h.asElement();
    if (el) { await el.click(); return true; }
  } catch {}
  return false;
}
async function has(page, text) {
  try { return await page.evaluate((t) => [...document.querySelectorAll('button')].some((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase())), text); } catch { return false; }
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-prefers-reduced-motion=0', '--hide-scrollbars'], defaultViewport: { width: 1440, height: 980, deviceScaleFactor: 1 } });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
await sleep(1200);
await clickText(page, 'skip'); await sleep(900);
await clickText(page, 'skip'); await sleep(600);
await clickText(page, 'into the dusk'); await sleep(900);
await clickText(page, 'the swift'); await sleep(400);
await clickText(page, 'the ember-hearted'); await sleep(500);
await clickText(page, 'into the dusk'); await sleep(1800);
await clickText(page, 'reveal my turn'); await sleep(700);
await clickText(page, 'begin'); await sleep(900);
for (let t = 0; t < 80; t++) {
  if (await has(page, 'play again')) break;
  await clickText(page, 'roll to move'); await sleep(320);
  await page.evaluate(() => { const ns = [...document.querySelectorAll('svg [role=button]')]; if (ns.length) ns[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); }).catch(() => {});
  await sleep(280);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /end turn/i.test(x.textContent.trim())); b?.click(); }).catch(() => {});
  await sleep(280);
  await clickText(page, 'reveal my turn'); await sleep(220);
  await clickText(page, 'begin'); await sleep(220);
}
try { await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /play again/i.test(b.textContent)), { timeout: 10000 }); } catch {}
await sleep(2000); // let the recap bloom in
await page.screenshot({ path: `${OUT}/ws6-matchstory.png` });
console.log('gameover=' + (await has(page, 'play again')));
await browser.close();
