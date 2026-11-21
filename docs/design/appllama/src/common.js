// Inline icons + status bar for the mockups (not app code).
const S = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  mic: S('<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>'),
  micFill: S('<rect x="8.5" y="2.5" width="7" height="12.5" rx="3.5" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>'),
  image: S('<rect x="3" y="4" width="18" height="16" rx="4"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 15.5l-5-5L5 20"/>'),
  camera: S('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.5-2h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="12.5" r="3.6"/>'),
  flip: S('<path d="M4 9a8 8 0 0 1 14-3l2 2M20 4v4h-4M20 15a8 8 0 0 1-14 3l-2-2M4 20v-4h4"/>'),
  replay: S('<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>'),
  speaker: S('<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  share: S('<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  map: S('<path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  compass: S('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor"/>'),
  sparkle: S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" stroke="none"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor" stroke="none"/>'),
  chevron: S('<path d="M9 6l6 6-6 6"/>'),
  down: S('<path d="M6 9l6 6 6-6"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  bookmark: S('<path d="M6 4h12v17l-6-4-6 4z"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  walk: S('<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M8 12l2-4 4 1 2 4M12 15l-1-4"/>'),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.4"'),
};
document.querySelectorAll('[data-i]').forEach((e) => { e.innerHTML = I[e.dataset.i] || ''; });
document.querySelectorAll('.status').forEach((e) => {
  e.innerHTML = `<span>9:41</span><span class="si">
    <svg width="18" height="11" viewBox="0 0 18 11" fill="#fff"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
    <svg width="16" height="11" viewBox="0 0 16 11" fill="#fff"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .5 10.2 10.2 0 0 0 .8 3.4L2 4.6a8.5 8.5 0 0 1 6-2.4zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 3.9a6.8 6.8 0 0 0-4.8 1.9L4.4 7A5.1 5.1 0 0 1 8 5.6zm0 3.4L6 11h4z"/></svg>
    <svg width="27" height="12" viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".4"/><rect x="2" y="2" width="18" height="8" rx="2" fill="#fff"/><rect x="24.5" y="4" width="1.5" height="4" rx=".75" fill="#fff" fill-opacity=".4"/></svg>
  </span>`;
});
