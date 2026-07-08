// Render DaddyBoard to a PNG. Boots nothing itself — point it at a running server.
// Usage: node scripts/shoot.mjs <url> <outPath>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
// Playwright isn't a dep of this repo; resolve it from a sibling install if needed.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const req = createRequire(import.meta.url);
  const pwPath = req.resolve('playwright', {
    paths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
  });
  const mod = await import(pathToFileURL(pwPath).href);
  chromium = mod.chromium || mod.default?.chromium;
}

const url = process.argv[2] || 'http://localhost:4321';
const out = process.argv[3] || 'docs/screenshot-mock.png';
// Optional: force a specific rotating-stage slot active (e.g. stage-gexTicker)
// so a single capture can inspect any stage panel without waiting for rotation.
const stage = process.argv[4] || '';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: 'networkidle' });
// Let panels populate + rotating stage settle.
await page.waitForTimeout(3500);
if (stage) {
  await page.evaluate((id) => {
    document.querySelectorAll('.stage-slot').forEach((el) => {
      el.classList.toggle('is-active', el.id === id);
    });
  }, stage);
  await page.waitForTimeout(600);
}
await page.screenshot({ path: out });
await browser.close();

if (errors.length) {
  console.error(`RENDER HAD ${errors.length} CONSOLE ERRORS:`);
  for (const e of errors.slice(0, 20)) console.error('  -', e);
  process.exit(1);
}
console.log(`OK -> ${out}`);
