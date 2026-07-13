(() => {
  'use strict';

  const PREVIEW_PARAM = 'htmlppt-presenter-preview';
  if (new URLSearchParams(location.search).has(PREVIEW_PARAM)) return;

  const state = {
    manifest: null,
    popup: null,
    channel: null,
    overview: null,
  };

  function deckId() {
    return document.querySelector('[data-deck-id]')?.getAttribute('data-deck-id') || 'html-ppt';
  }

  function inlineManifest() {
    const node = document.getElementById('deckManifest');
    if (!node) return null;
    try { return JSON.parse(node.textContent || '{}'); } catch { return null; }
  }

  async function loadManifest() {
    if (state.manifest) return state.manifest;
    try {
      const response = await fetch('deck.json', { cache: 'no-store' });
      if (response.ok) state.manifest = await response.json();
    } catch {}
    state.manifest ||= inlineManifest() || { slides: [] };
    return state.manifest;
  }

  function slideInfo(index) {
    const slides = window.htmlPptDeck?.slides || [];
    const slide = slides[index];
    const manifestSlide = state.manifest?.slides?.find((item) => item.id === slide?.dataset.slideId) || state.manifest?.slides?.[index] || {};
    const notesValue = manifestSlide.notes;
    const notes = typeof notesValue === 'string' ? notesValue : notesValue?.speaker || '';
    const durationSeconds = typeof notesValue === 'object' && Number.isFinite(notesValue?.durationSeconds) ? notesValue.durationSeconds : null;
    return {
      index,
      count: slides.length,
      id: slide?.dataset.slideId || `slide-${index + 1}`,
      headline: manifestSlide.headline || slide?.querySelector('h1,h2,h3')?.textContent?.trim() || '',
      notes,
      durationSeconds,
    };
  }

  function currentState() {
    const index = window.htmlPptDeck?.index || 0;
    return { type: 'state', deckId: deckId(), current: slideInfo(index), next: slideInfo(Math.min(index + 1, (window.htmlPptDeck?.slides.length || 1) - 1)) };
  }

  function broadcast() {
    const payload = currentState();
    state.channel?.postMessage(payload);
    if (state.popup && !state.popup.closed) state.popup.postMessage(payload, '*');
  }

  function previewUrl(index) {
    const url = new URL(location.href);
    url.searchParams.set(PREVIEW_PARAM, '1');
    url.hash = `slide-${index + 1}`;
    return url.href;
  }

  function presenterHtml() {
    const title = (state.manifest?.title || document.title || 'Presenter').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title} — Presenter</title><style>
      :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#101114;color:#f5f5f5}*{box-sizing:border-box}body{margin:0;display:grid;grid-template-rows:auto 1fr;height:100vh}.bar{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#191b20;border-bottom:1px solid #333}.bar button{background:#2b2f38;color:#fff;border:1px solid #494f5c;border-radius:8px;padding:8px 14px;cursor:pointer}.bar .spacer{flex:1}.timer{font-variant-numeric:tabular-nums;font-size:22px}.grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(320px,1fr);gap:16px;padding:16px;min-height:0}.previews{display:grid;grid-template-rows:2fr 1fr;gap:16px;min-height:0}.panel{background:#17191e;border:1px solid #30343d;border-radius:12px;overflow:hidden;min-height:0}.panel h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0;padding:10px 12px;background:#20232a}.panel iframe{width:100%;height:calc(100% - 38px);border:0;background:#000}.notes{padding:20px;overflow:auto;font-size:22px;line-height:1.55}.notes h1{font-size:26px;margin:0 0 18px}.notes .meta{font-size:14px;color:#aeb5c2;margin-bottom:18px}.empty{color:#8b929f}</style></head><body>
      <div class="bar"><button data-command="previous">← Previous</button><button data-command="next">Next →</button><button data-command="goto">Go to…</button><button data-command="reset-timer">Reset timer</button><div class="spacer"></div><strong id="position">1 / 1</strong><span class="timer" id="timer">00:00</span></div>
      <div class="grid"><div class="previews"><section class="panel"><h2>Current</h2><iframe id="currentFrame"></iframe></section><section class="panel"><h2>Next</h2><iframe id="nextFrame"></iframe></section></div><section class="panel notes"><h1 id="headline"></h1><div class="meta" id="duration"></div><div id="notes"></div></section></div>
      <script>(()=>{const channel=new BroadcastChannel('htmlppt-presenter:${deckId()}');let started=Date.now();const send=(command,value)=>{channel.postMessage({type:'command',command,value});opener?.postMessage({type:'htmlppt-presenter-command',command,value},'*')};document.querySelectorAll('[data-command]').forEach(button=>button.onclick=()=>{const command=button.dataset.command;if(command==='goto'){const value=prompt('Slide number');if(value)send('goto',Number(value)-1)}else if(command==='reset-timer'){started=Date.now()}else send(command)});addEventListener('keydown',event=>{if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();send('next')}else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();send('previous')}});function render(payload){if(payload?.type!=='state')return;const c=payload.current,n=payload.next;position.textContent=(c.index+1)+' / '+c.count;headline.textContent=c.headline||'';notes.textContent=c.notes||'No speaker notes.';notes.className=c.notes?'':'empty';duration.textContent=c.durationSeconds?'Planned: '+c.durationSeconds+' sec':'';currentFrame.src=${JSON.stringify(previewUrl(0))}.replace(/#slide-\d+$/,'#slide-'+(c.index+1));nextFrame.src=${JSON.stringify(previewUrl(0))}.replace(/#slide-\d+$/,'#slide-'+(n.index+1))}channel.onmessage=e=>render(e.data);addEventListener('message',e=>render(e.data));setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);timer.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')},250);channel.postMessage({type:'request-state'});opener?.postMessage({type:'htmlppt-presenter-request-state'},'*')})();<\/script></body></html>`;
  }

  async function openPresenter() {
    await loadManifest();
    const popup = window.open('', `htmlppt-presenter-${deckId()}`, 'popup,width=1500,height=900');
    if (!popup) {
      window.alert('Presenter window was blocked. Allow pop-ups for this file or site, then press P again.');
      document.dispatchEvent(new CustomEvent('htmlppt:presenterblocked'));
      return;
    }
    state.popup = popup;
    popup.document.open();
    popup.document.write(presenterHtml());
    popup.document.close();
    window.setTimeout(broadcast, 150);
  }

  function closeOverview() {
    state.overview?.remove();
    state.overview = null;
  }

  async function toggleOverview() {
    if (state.overview) return closeOverview();
    await loadManifest();
    const overlay = document.createElement('div');
    overlay.dataset.presenterOverview = 'true';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(10,11,14,.96);display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:28px;overflow:auto;color:white;font:16px system-ui';
    (window.htmlPptDeck?.slides || []).forEach((slide, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.style.cssText = 'min-height:130px;padding:18px;text-align:left;background:#20232a;color:white;border:1px solid #454b57;border-radius:10px;cursor:pointer';
      button.textContent = `${index + 1}. ${slideInfo(index).headline || slide.dataset.slideId || ''}`;
      button.onclick = () => { window.htmlPptDeck?.show(index); closeOverview(); };
      overlay.append(button);
    });
    overlay.onclick = (event) => { if (event.target === overlay) closeOverview(); };
    document.body.append(overlay);
    state.overview = overlay;
  }

  function command(command, value) {
    const deck = window.htmlPptDeck;
    if (!deck) return;
    if (command === 'next') deck.next();
    else if (command === 'previous') deck.previous();
    else if (command === 'goto' && Number.isFinite(value)) deck.show(value);
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'htmlppt-presenter-command') command(event.data.command, event.data.value);
    if (event.data?.type === 'htmlppt-presenter-request-state') broadcast();
  });

  window.addEventListener('DOMContentLoaded', () => {
    state.channel = new BroadcastChannel(`htmlppt-presenter:${deckId()}`);
    state.channel.onmessage = (event) => {
      if (event.data?.type === 'command') command(event.data.command, event.data.value);
      if (event.data?.type === 'request-state') broadcast();
    };
    document.addEventListener('htmlppt:slidechange', broadcast);
    document.addEventListener('keydown', (event) => {
      if (window.htmlPptDeck?.isTypingTarget?.(event.target)) return;
      if (event.key.toLowerCase() === 'p') { event.preventDefault(); openPresenter(); }
      else if (event.key === 'Escape') { event.preventDefault(); toggleOverview(); }
      else if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        const value = window.prompt(`Go to slide (1–${window.htmlPptDeck?.slides.length || 1})`);
        if (value) window.htmlPptDeck?.show(Number(value) - 1);
      }
    });
    loadManifest().then(broadcast);
  }, { once: true });
})();
