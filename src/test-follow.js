const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
function rnd(seed){ return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const r = rnd(7);
const seq = (a, b, d) => { const o = []; for (let i = a; i <= b; i++) o.push({ ev: i, dur: typeof d === 'function' ? d() : d }); return o; };
const SC = {
  steady: seq(0, 15, 2.0),
  variable: (() => { const p = seq(0, 15, () => 1.2 + r() * 2.3); p.splice(6, 0, { name: 'Am', dur: 0.6, truth: 5 }); return p; })(),
  longHold: [...seq(0, 1, 2), { ev: 2, dur: 5 }, ...seq(3, 3, 2), { ev: 4, dur: 2 }, { ev: 5, dur: 4.5 }, ...seq(6, 9, 2)],
  repeatBack: [...seq(0, 7, 2), ...seq(4, 7, 2), ...seq(8, 11, 2)],
};
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [name, plan] of Object.entries(SC)) {
    const pg = await b.newPage();
    await pg.goto('file://' + require('path').join(__dirname, '..', 'index.html'));
    await pg.evaluate((plan) => window.__sointu.startDemo(plan), plan);
    const t0 = Date.now(); const total = plan.reduce((a, s) => a + s.dur, 0) + 1;
    const samples = [];
    while ((Date.now() - t0) / 1000 < total) { await pg.waitForTimeout(100); samples.push([(Date.now() - t0) / 1000, await pg.evaluate(() => window.__sointu.pos)]); }
    // truth timeline
    const bounds = []; let t = 0.25; let last = 0;
    for (const s of plan) { const tr = s.ev ?? s.truth; bounds.push([t, tr]); t += s.dur; }
    const truthAt = (x) => { let v = bounds[0][1]; for (const [bt, tr] of bounds) if (x >= bt) v = tr; return v; };
    let ok = 0, ahead = 0, behind = 0, n = 0;
    for (const [x, p] of samples) {
      const tr = truthAt(x), trLag = truthAt(x - 0.7); // allow 0.7 s reaction
      n++; if (p === tr || p === trLag) ok++; else if (p > tr) ahead++; else behind++;
    }
    const changes = []; let prev = -1; for (const [x, p] of samples) { if (p !== prev) { changes.push(x.toFixed(1) + '→' + p); prev = p; } }
    console.log(`${name}: ok ${(100*ok/n).toFixed(0)}% ahead ${(100*ahead/n).toFixed(0)}% behind ${(100*behind/n).toFixed(0)}%`);
    console.log('  shown:', changes.join(' '));
    console.log('  truth:', bounds.map(([bt, tr]) => bt.toFixed(1) + '→' + tr).join(' '));
    await pg.close();
  }
  await b.close();
})();
