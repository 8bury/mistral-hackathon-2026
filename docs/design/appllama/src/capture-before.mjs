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
// --enable-unsafe-swiftshader: software WebGL so the MapLibre street map can render headless.
const { proc, cdp } = await launch(9342, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--enable-unsafe-swiftshader',
  `--use-file-for-fake-video-capture=${join(tmpdir(), 'vysta-scene.mjpeg')}`]);
await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// Fake GPS at the Temple Bar dragon boundary marker (Fleet Street), so the live map, the
// nearest-landmark widget and the mock answer (the dragon) all agree.
await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'], origin: new URL(APP).origin }).catch(() => {});
await cdp.send('Emulation.setGeolocationOverride', { latitude: 51.5136, longitude: -0.1115, accuracy: 20 });

/** Screenshot one element (padded), e.g. a guide figurine for the deck. */
async function shotEl(selector, index, name, pad = 6) {
  const expr = `(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
    if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`;
  const b = (await evalJs(cdp, expr)).result.value;
  if (!b) return;
  const clip = { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, scale: 1 };
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('captured', name);
}

// Onboarding (fresh storage → welcome sheet, default persona = child).
await goto(cdp, APP, 2500);
await shot(cdp, 'onboarding');

// One image per guide figurine, for the deck's persona slide.
for (const [i, id] of ['child', 'architect', 'historian', 'you'].entries()) await shotEl('.guides .guide__avatar', i, `fig-${id}`);

// The 'You' guide (if this build has it): select it and write a style.
const youCard = `[...document.querySelectorAll('.guide')].find((g) => /Your Guide/.test(g.textContent))`;
if ((await evalJs(cdp, `!!${youCard}`)).result.value) {
  await evalJs(cdp, `${youCard}.click(); true`);
  await sleep(600);
  await evalJs(cdp, `(() => {
    const t = document.querySelector('.you-style textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Explain it like a football commentator: short, dramatic, one fun fact.');
    t.dispatchEvent(new Event('input', { bubbles: true }));
    return true; })()`);
  await sleep(500);
  await shot(cdp, 'onboarding-you');
}

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
const tapChip = () => evalJs(cdp, `document.querySelector('.chips .chip')?.click(); true`);
await tapChip(); await sleep(3500);
await tapChip(); await sleep(3500);
await evalJs(cdp, `(document.querySelector('.place-widget') ?? document.querySelector('.minimap')).click(); true`);
await sleep(6000); // let the street tiles load
await shot(cdp, 'map');
await evalJs(cdp, `document.querySelectorAll('.map-top .seg button')[1].click(); true`); await sleep(800);
await clickText('Recap my walk'); await clickText('See walk recap'); await sleep(6000);
await shot(cdp, 'recap');

cdp.close(); proc.kill();

