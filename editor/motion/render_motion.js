// Renderiza una pieza de editorial.html a MOV con alfa (qtrle).
// Uso: node render_motion.js <piece> <dur_s> <out.mov> '<json data>' [fps=25]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const [piece, dur, out, data = '{}', fps = '25'] = process.argv.slice(2);
  const n = Math.round(parseFloat(dur) * parseInt(fps));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const url = 'file://' + path.join(__dirname, 'editorial.html') + '?piece=' + piece + '&data=' + encodeURIComponent(data);
  await p.goto(url); await p.waitForFunction('window.ready === true'); await p.evaluate(() => document.fonts.ready);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.render(t), i / parseInt(fps));
    await p.screenshot({ path: path.join(tmp, `f_${String(i).padStart(4, '0')}.png`), omitBackground: true });
  }
  await b.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', fps, '-i', path.join(tmp, 'f_%04d.png'), '-c:v', 'qtrle', '-pix_fmt', 'argb', out]);
  fs.rmSync(tmp, { recursive: true });
  console.log(`OK ${out} (${n} frames)`);
})();
