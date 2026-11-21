// Capture "before" screens of the current app (mock mode) with headless Chrome over CDP.
// Prereq: `VITE_MOCK_API=true vite --port 5199` running in apps/web.
// Usage: node docs/design/appllama/src/capture-before.mjs [outDir=before]  (e.g. implemented)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', process.argv[2] ?? 'before');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP = process.env.APP_URL ?? 'http://localhost:5199/';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(port, extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'vysta-cdp-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', ...extra, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return { proc, cdp: await connect(page.webSocketDebuggerUrl) };
    } catch {}
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, (d) => d.error ? j(new Error(`${method}: ${d.error.message}`)) : r(d.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, close: () => ws.close() };
}

const evalJs = (cdp, expr) => cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('captured', name);
}
async function goto(cdp, url, wait = 1500) { await cdp.send('Page.navigate', { url }); await sleep(wait); }

// 1) Build a fake camera feed (MJPEG) from the same scene the mockups use, framed so the
//    mock answer box (x380 y300 260x320, normalised 0-1000) lands on the rose window.
const W = 898, H = 1700;
const framePage = join(tmpdir(), 'vysta-frame.html');
writeFileSync(framePage, `<html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#05070a">
<img src="${pathToFileURL(join(HERE, 'scene.svg'))}" style="position:absolute;width:936px;height:2026px;left:-10px;top:-10px"></body></html>`);
{
  const { proc, cdp } = await launch(9341, ['--allow-file-access-from-files']);
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await goto(cdp, pathToFileURL(framePage).href, 1200);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const jpg = Buffer.from(data, 'base64');
  writeFileSync(join(tmpdir(), 'vysta-scene.mjpeg'), Buffer.concat(Array(30).fill(jpg)));
  cdp.close(); proc.kill();
}

// 2) Drive the real app.
const { proc, cdp } = await launch(9342, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  `--use-file-for-fake-video-capture=${join(tmpdir(), 'vysta-scene.mjpeg')}`]);
await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

// Onboarding (fresh storage → welcome sheet, default persona = child).
await goto(cdp, APP, 2500);
await shot(cdp, 'onboarding');

// Live camera + dock as the Architect.
await evalJs(cdp, `localStorage.setItem('vysta.onboarded','1'); localStorage.setItem('vysta.persona','architect'); true`);
await goto(cdp, APP, 3500);
await shot(cdp, 'dock');

// Hold mic → listening → release → thinking → answer.
await evalJs(cdp, `document.querySelector('.mic').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, pointerId:1, isPrimary:true})); true`);
await sleep(1500);
await shot(cdp, 'listening');
await evalJs(cdp, `document.querySelector('.mic').dispatchEvent(new PointerEvent('pointerup', {bubbles:true, pointerId:1, isPrimary:true})); true`);
await sleep(4500);
await shot(cdp, 'answer');

// Two follow-ups add stops to the walk, then the map sheet → "Your walk" → recap.
const clickText = (t) => evalJs(cdp, `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(t)})?.click(); true`);
await clickText('What is it made of?'); await sleep(3500);
await clickText('Who designed it?'); await sleep(3500);
await evalJs(cdp, `(document.querySelector('.place-widget') ?? document.querySelector('.minimap')).click(); true`); await sleep(1200);
await shot(cdp, 'map');
await evalJs(cdp, `document.querySelectorAll('.map-top .seg button')[1].click(); true`); await sleep(800);
await clickText('Recap my walk'); await clickText('See walk recap'); await sleep(2500);
await shot(cdp, 'recap');

cdp.close(); proc.kill();

