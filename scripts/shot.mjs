// Headless screenshots of the running app, so we can SEE and refine the UI.
// Usage: dev server on :5173, then `node scripts/shot.mjs`
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = process.env.SHOT_DIR || '.shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button, [role=button]')];
    return els.find((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null;
  }, text);
  const el = handle.asElement();
  if (el) { await el.click(); return true; }
  return false;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--force-prefers-reduced-motion=0', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(1400);
await page.screenshot({ path: `${OUT}/01-splash.png` });

await clickText(page, 'skip'); // dismiss the SHV splash
await sleep(900);
await clickText(page, 'skip'); // dismiss the how-to tutorial
await sleep(700);
await page.screenshot({ path: `${OUT}/02-setup.png` });

await clickText(page, 'Into the Dusk');
await sleep(1800);
await page.screenshot({ path: `${OUT}/03-handoff.png` });

await clickText(page, 'reveal my turn');
await sleep(500);
await clickText(page, 'begin');
await sleep(1000);
await clickText(page, 'understand the dark'); // dismiss Marked reveal if present
await sleep(700);
await page.screenshot({ path: `${OUT}/04-board.png` });

// play many full turns so the dark eats deep, the nightmare walks, events flip
for (let t = 0; t < 16; t++) {
  await clickText(page, 'roll to move');
  await sleep(700);
  // tap a reachable tile (a role=button node on the svg)
  await page.evaluate(() => {
    const n = document.querySelector('svg [role=button]');
    if (n) n.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(700);
  if (t === 2) await page.screenshot({ path: `${OUT}/05-midturn.png` });
  // take the ③ action (grab/deliver/warm/end) then any handoff
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /^③|end turn|grab|deliver|warm|relight|step through/i.test(x.textContent.trim()));
    b?.click();
  });
  await sleep(800);
  await clickText(page, 'reveal my turn');
  await sleep(300);
  await clickText(page, 'begin');
  await sleep(500);
}
await page.screenshot({ path: `${OUT}/06-later.png` });

await browser.close();
console.log('shots written to', OUT);
