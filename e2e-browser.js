'use strict';
/* Optional end-to-end check (needs `npm i -D playwright`): boots the app in headless Chromium, verifies WebGL2 renders
 * non-blank frames in all three 3D sections, runs the tour for a few seconds and steps the CPU lab. */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, s) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); s.end(d); }); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://localhost:${srv.address().port}/index.html?capture`);
  const lit = async () => p.evaluate(() => { const c = document.querySelector('.itm3d-canvas'); const t = document.createElement('canvas'); t.width = 64; t.height = 36; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; });
  const sections = ['sec-home', 'sec-hw-explorer', 'sec-cpu-lab'];
  for (const sec of sections) {
    await p.evaluate(s => document.querySelector(`[data-section=${s}]`).click(), sec); await p.waitForTimeout(2500);
    const n = await lit(); console.log(sec, 'lit samples:', n); assert(n > 150, sec + ' rendered a near-blank frame');
  }
  await p.evaluate(() => { for (let i = 0; i < 3; i++) document.getElementById('cpuStepBtn').click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('[data-section=sec-home]').click()); await p.evaluate(() => document.getElementById('btnHomeTour').click()); await p.waitForTimeout(6000);
  assert(await p.evaluate(() => !document.querySelector('.itm3d-caption').hidden), 'tour caption should be visible');
  // student layer: progress persists, toolkit tabs render, search palette opens
  await p.evaluate(() => document.querySelector('[data-section=sec-mod1]').click()); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#mod1Content input[data-mod]').click()); await p.waitForTimeout(200);
  assert(await p.evaluate(() => /part|done/.test(document.querySelector('[data-section=sec-mod1] .nav-state').className)), 'ticking an objective should update the sidebar');
  await p.evaluate(() => document.querySelector('[data-section=sec-toolkit]').click());
  for (const t of ['glossary', 'riscv', 'codec', 'numbers', 'formulas', 'flash']) {
    await p.evaluate(x => document.querySelector(`.tk-tab[data-tk=${x}]`).click(), t);
    assert(await p.evaluate(x => document.getElementById('tk-' + x).innerText.length > 40, t), 'toolkit tab empty: ' + t);
  }
  await p.keyboard.press('Control+k'); await p.waitForTimeout(200);
  assert(await p.evaluate(() => document.getElementById('palBack').classList.contains('open')), 'Ctrl+K should open the search palette');
  await p.keyboard.press('Escape');
  assert.deepStrictEqual(errors.filter(e => !/GPU stall|ReadPixels/.test(e)), [], 'no page errors');
  console.log('E2E OK'); await b.close(); srv.close();
});
