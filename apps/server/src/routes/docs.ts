import { Request, Response } from 'express';

/** A dependency-free browser harness for testing the local ask endpoint. */
export function docsRouter(_req: Request, res: Response): void {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vysta API test</title>
    <style>
      body { max-width: 720px; margin: 40px auto; padding: 0 20px; font: 16px system-ui, sans-serif; color: #172033; }
      label { display: block; font-weight: 650; margin-top: 18px; }
      input, select, textarea, button { box-sizing: border-box; font: inherit; margin-top: 6px; padding: 9px; width: 100%; }
      textarea { min-height: 85px; resize: vertical; }
      button { background: #3659e3; border: 0; border-radius: 6px; color: white; cursor: pointer; font-weight: 650; }
      button:disabled { opacity: .65; cursor: wait; }
      pre { background: #f4f6fa; border-radius: 6px; overflow: auto; padding: 14px; white-space: pre-wrap; }
      .row { display: flex; gap: 12px; } .row label { flex: 1; }
    </style>
  </head>
  <body>
    <h1>Vysta backend test</h1>
    <p>Upload photos or one short MP4/MOV/WebM clip and send it to <code>POST /api/ask</code>. Later questions can reuse the same Tour ID without uploading again.</p>
    <form id="ask-form">
      <label>Photos or a short video <input id="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" multiple /></label>
      <label>Question <textarea id="question" required>What landmark is this? Tell me its history.</textarea></label>
      <div class="row">
        <label>Persona <select id="persona"><option value="historian" selected>Historian</option><option value="child">Child</option><option value="architect">Architect</option><option value="you">You (custom)</option></select></label>
        <label>Language <select id="language"><option value="auto" selected>Match question language</option><option value="en">English</option><option value="es">Spanish</option><option value="zh">Chinese</option></select></label>
      </div>
      <label>Tour ID <input id="tour-id" value="browser-test" required /></label>
      <button id="submit" type="submit">Ask the guide</button>
    </form>
    <h2>Response</h2>
    <pre id="result">Choose a photo, then select “Ask the guide”.</pre>
    <script>
      const form = document.querySelector('#ask-form');
      const result = document.querySelector('#result');
      const submit = document.querySelector('#submit');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const files = [...document.querySelector('#photo').files];
        submit.disabled = true;
        result.textContent = 'Sending image to the guide…';
        try {
          const frames = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            })));
          const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frame: frames[0],
              frames: frames.slice(1),
              question: document.querySelector('#question').value,
              persona: document.querySelector('#persona').value,
              language: document.querySelector('#language').value,
              tourId: document.querySelector('#tour-id').value,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || data.error || 'Request failed');
          result.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          result.textContent = 'Request failed: ' + (error instanceof Error ? error.message : String(error));
        } finally {
          submit.disabled = false;
        }
      });
    </script>
  </body>
</html>`);
}
