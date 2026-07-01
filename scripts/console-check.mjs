// Loads the live game, clicks through to the board, and reports any console
// errors / warnings / page exceptions. DoD: "no console errors".
// Usage: node scripts/console-check.mjs [url]
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'https://gloaming-murex.vercel.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const errors = [];
const warnings = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error') errors.push(m.text());
  else if (t === 'warning') warnings.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText ?? '')));

async function click(text) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button, [role=button]')];
    return els.find((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null;
  }, text);
  const el = h.asElement();
  if (el) { await el.click(); return true; }
  return false;
}

console.log('loading', URL);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
await sleep(1200);
await click('skip');            // dismiss tutorial
await sleep(500);
await click('into the dusk');   // start a 3p (default) game
await sleep(1800);
await click('reveal my turn');  // handoff
await sleep(700);
await click('begin');
await sleep(900);
await click('roll stride');     // exercise a move
await sleep(1600);
// take the first action button if present (Steady is always there)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /steady/i.test(x.textContent));
  b?.click();
});
await sleep(1500);

// ignore benign noise (favicon, the expected keyless /api/narrate 404s)
const benign = /favicon|api\/narrate|net::ERR_ABORTED.*narrate/i;
const realErrors = errors.filter((e) => !benign.test(e));

await browser.close();
console.log(`\nerrors: ${realErrors.length} (filtered ${errors.length - realErrors.length} benign) · warnings: ${warnings.length}`);
for (const e of realErrors.slice(0, 15)) console.log('  ✗', e);
for (const w of warnings.slice(0, 8)) console.log('  ⚠', w);
console.log(realErrors.length === 0 ? '\n✓ no console errors' : '\n✗ console errors present');
process.exit(realErrors.length === 0 ? 0 : 1);
