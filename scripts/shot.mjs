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
  if (el) {
    await el.click();
    return true;
  }
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
await page.screenshot({ path: `${OUT}/01-tutorial.png` });

// skip tutorial
await clickText(page, 'skip');
await sleep(900);
// choose 4 players + the Marked + AI
await page.evaluate(() => {
  const four = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '4');
  four?.click();
});
await sleep(300);
await clickText(page, 'The Marked');
await sleep(200);
await page.screenshot({ path: `${OUT}/02-setup.png` });

// start
await clickText(page, 'Into the Dusk');
await sleep(2000);
await page.screenshot({ path: `${OUT}/03-start.png` });

// dismiss a handoff if shown
await clickText(page, 'reveal my turn');
await sleep(600);
await clickText(page, 'begin');
await sleep(900);
// dismiss the Marked reveal if this seat happens to be the Marked
await clickText(page, 'understand the dark');
await sleep(700);
await page.screenshot({ path: `${OUT}/04-after-handoff.png` });

// if an omen panel is up, screenshot then resolve the first choice
await sleep(400);
await page.screenshot({ path: `${OUT}/05-omen.png` });
// resolve any pending omen(s) by clicking the first narrator choice button
for (let k = 0; k < 3; k++) {
  const clicked = await page.evaluate(() => {
    const b = document.querySelector('button.group');
    if (b) {
      b.click();
      return true;
    }
    return false;
  });
  await sleep(900);
  if (!clicked) break;
}
await page.screenshot({ path: `${OUT}/06-board.png` });

// roll stride
await clickText(page, 'Roll Stride');
await sleep(1600);
await page.screenshot({ path: `${OUT}/07-board-rolled.png` });

await browser.close();
console.log('shots written to', OUT);
