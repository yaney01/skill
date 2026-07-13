(() => {
  'use strict';

  class HtmlPptDeck {
    constructor(root = document) {
      this.root = root;
      this.stage = root.getElementById('deckStage') || root.querySelector('.deck-stage');
      this.slides = Array.from(root.querySelectorAll('.slide'));
      this.index = this.readInitialIndex();
      this.touchStartX = null;
      this.wheelLocked = false;
      this.presenterWindow = null;
      this.presenterChannel = null;
      this.presenterManifest = null;
      this.overview = null;

      if (!this.stage || this.slides.length === 0) {
        console.warn('[HTML PPT] Missing .deck-stage or .slide elements.');
        return;
      }

      this.bind();
      this.scaleStage();
      this.show(this.index, { updateHash: false });
      this.initPresenterChannel();
    }

    readInitialIndex() {
      const hash = window.location.hash.match(/^#slide-(\d+)$/);
      if (!hash) return 0;
      return Math.max(0, Number(hash[1]) - 1);
    }

    bind() {
      window.addEventListener('resize', () => this.scaleStage(), { passive: true });
      window.addEventListener('hashchange', () => {
        const next = this.readInitialIndex();
        if (next !== this.index) this.show(next, { updateHash: false });
      });
      window.addEventListener('message', (event) => this.onPresenterMessage(event.data));
      document.addEventListener('keydown', (event) => this.onKeydown(event));
      document.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
      document.addEventListener('touchstart', (event) => this.onTouchStart(event), { passive: true });
      document.addEventListener('touchend', (event) => this.onTouchEnd(event), { passive: true });
    }

    isTypingTarget(target) {
      return Boolean(target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName));
    }

    onKeydown(event) {
      if (this.isTypingTarget(event.target)) return;
      const nextKeys = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
      const prevKeys = ['ArrowLeft', 'ArrowUp', 'PageUp'];

      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        this.next();
      } else if (prevKeys.includes(event.key)) {
        event.preventDefault();
        this.previous();
      } else if (event.key === 'Home') {
        event.preventDefault();
        this.show(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        this.show(this.slides.length - 1);
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        this.openPresenter();
      } else if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        const value = window.prompt(`Go to slide (1–${this.slides.length})`);
        if (value) this.show(Number(value) - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.toggleOverview();
      }
    }

    onWheel(event) {
      if (this.isTypingTarget(event.target) || this.wheelLocked || Math.abs(event.deltaY) < 24) return;
      event.preventDefault();
      this.wheelLocked = true;
      event.deltaY > 0 ? this.next() : this.previous();
      window.setTimeout(() => { this.wheelLocked = false; }, 450);
    }

    onTouchStart(event) {
      this.touchStartX = event.changedTouches?.[0]?.clientX ?? null;
    }

    onTouchEnd(event) {
      if (this.touchStartX === null) return;
      const endX = event.changedTouches?.[0]?.clientX ?? this.touchStartX;
      const delta = endX - this.touchStartX;
      this.touchStartX = null;
      if (Math.abs(delta) < 48) return;
      delta < 0 ? this.next() : this.previous();
    }

    scaleStage() {
      if (!this.stage) return;
      const factor = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      const x = (window.innerWidth - 1920 * factor) / 2;
      const y = (window.innerHeight - 1080 * factor) / 2;
      this.stage.style.transform = `translate(${x}px, ${y}px) scale(${factor})`;
      document.documentElement.style.setProperty('--deck-scale', String(factor));
    }

    show(index, { updateHash = true } = {}) {
      if (this.slides.length === 0) return;
      this.index = Math.max(0, Math.min(index, this.slides.length - 1));
      this.slides.forEach((slide, slideIndex) => {
        const current = slideIndex === this.index;
        slide.classList.toggle('active', current);
        slide.classList.toggle('visible', current);
        slide.setAttribute('aria-hidden', String(!current));
      });

      document.documentElement.style.setProperty('--slide-index', `"${this.index + 1}"`);
      document.documentElement.style.setProperty('--slide-count', `"${this.slides.length}"`);
      document.dispatchEvent(new CustomEvent('htmlppt:slidechange', {
        detail: { index: this.index, count: this.slides.length, slide: this.slides[this.index] }
      }));
      this.broadcastPresenterState();

      if (updateHash) history.replaceState(null, '', `#slide-${this.index + 1}`);
    }

    next() { this.show(this.index + 1); }
    previous() { this.show(this.index - 1); }

    deckId() {
      return document.querySelector('[data-deck-id]')?.getAttribute('data-deck-id') || 'html-ppt';
    }

    async loadPresenterManifest() {
      if (this.presenterManifest) return this.presenterManifest;
      const inline = document.getElementById('deckManifest');
      try {
        const response = await fetch('deck.json', { cache: 'no-store' });
        if (response.ok) this.presenterManifest = await response.json();
      } catch {}
      if (!this.presenterManifest && inline) {
        try { this.presenterManifest = JSON.parse(inline.textContent || '{}'); } catch {}
      }
      this.presenterManifest ||= { slides: [] };
      return this.presenterManifest;
    }

    slideInfo(index) {
      const slide = this.slides[index];
      const record = this.presenterManifest?.slides?.find((item) => item.id === slide?.dataset.slideId) || this.presenterManifest?.slides?.[index] || {};
      const notes = typeof record.notes === 'string' ? record.notes : record.notes?.speaker || '';
      return {
        index,
        count: this.slides.length,
        id: slide?.dataset.slideId || `slide-${index + 1}`,
        headline: record.headline || slide?.querySelector('h1,h2,h3')?.textContent?.trim() || '',
        notes,
        durationSeconds: Number.isFinite(record.notes?.durationSeconds) ? record.notes.durationSeconds : null,
      };
    }

    presenterState() {
      return {
        type: 'state',
        deckId: this.deckId(),
        current: this.slideInfo(this.index),
        next: this.slideInfo(Math.min(this.index + 1, this.slides.length - 1)),
      };
    }

    initPresenterChannel() {
      if (!('BroadcastChannel' in window)) return;
      this.presenterChannel = new BroadcastChannel(`htmlppt-presenter:${this.deckId()}`);
      this.presenterChannel.onmessage = (event) => this.onPresenterMessage(event.data);
    }

    onPresenterMessage(message) {
      if (!message) return;
      if (message.type === 'request-state') this.broadcastPresenterState();
      if (message.type !== 'command') return;
      if (message.command === 'next') this.next();
      if (message.command === 'previous') this.previous();
      if (message.command === 'goto' && Number.isFinite(message.value)) this.show(message.value);
    }

    broadcastPresenterState() {
      if (!this.presenterManifest) return;
      const payload = this.presenterState();
      this.presenterChannel?.postMessage(payload);
      if (this.presenterWindow && !this.presenterWindow.closed) this.presenterWindow.postMessage(payload, '*');
    }

    previewUrl(index) {
      const url = new URL(location.href);
      url.searchParams.set('htmlppt-presenter-preview', '1');
      url.hash = `slide-${index + 1}`;
      return url.href;
    }

    presenterHtml() {
      const basePreview = JSON.stringify(this.previewUrl(0));
      return `<!doctype html><html><head><meta charset="utf-8"><title>Presenter</title><style>:root{color-scheme:dark;font-family:system-ui;background:#101114;color:#f5f5f5}*{box-sizing:border-box}body{margin:0;display:grid;grid-template-rows:auto 1fr;height:100vh}.bar{display:flex;gap:10px;align-items:center;padding:12px 16px;background:#191b20}.bar button{padding:8px 12px;background:#2b2f38;color:#fff;border:1px solid #4a5160;border-radius:7px}.spacer{flex:1}.grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;padding:16px;min-height:0}.previews{display:grid;grid-template-rows:2fr 1fr;gap:16px;min-height:0}.panel{background:#17191e;border:1px solid #30343d;border-radius:10px;overflow:hidden;min-height:0}.panel h2{font-size:13px;margin:0;padding:9px 12px;background:#20232a}.panel iframe{width:100%;height:calc(100% - 35px);border:0}.notes{padding:20px;overflow:auto;font-size:21px;line-height:1.55}.timer{font-variant-numeric:tabular-nums;font-size:22px}</style></head><body><div class="bar"><button data-c="previous">←</button><button data-c="next">→</button><button data-c="goto">Go to</button><button data-c="timer">Reset timer</button><div class="spacer"></div><strong id="position"></strong><span class="timer" id="timer">00:00</span></div><div class="grid"><div class="previews"><section class="panel"><h2>Current</h2><iframe id="currentFrame"></iframe></section><section class="panel"><h2>Next</h2><iframe id="nextFrame"></iframe></section></div><section class="panel notes"><h1 id="headline"></h1><div id="duration"></div><p id="notes"></p></section></div><script>(()=>{const channel=new BroadcastChannel('htmlppt-presenter:${this.deckId()}');let started=Date.now();const send=(command,value)=>channel.postMessage({type:'command',command,value});document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const c=b.dataset.c;if(c==='goto'){const v=prompt('Slide number');if(v)send('goto',Number(v)-1)}else if(c==='timer')started=Date.now();else send(c)});channel.onmessage=e=>{const p=e.data;if(p?.type!=='state')return;const c=p.current,n=p.next;position.textContent=(c.index+1)+' / '+c.count;headline.textContent=c.headline||'';notes.textContent=c.notes||'No speaker notes.';duration.textContent=c.durationSeconds?'Planned: '+c.durationSeconds+' sec':'';currentFrame.src=${basePreview}.replace(/#slide-\d+$/,'#slide-'+(c.index+1));nextFrame.src=${basePreview}.replace(/#slide-\d+$/,'#slide-'+(n.index+1))};setInterval(()=>{const s=Math.floor((Date.now()-started)/1000);timer.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},250);channel.postMessage({type:'request-state'})})();<\/script></body></html>`;
    }

    async openPresenter() {
      await this.loadPresenterManifest();
      const popup = window.open('', `htmlppt-presenter-${this.deckId()}`, 'popup,width=1500,height=900');
      if (!popup) {
        window.alert('Presenter window was blocked. Allow pop-ups, then press P again.');
        document.dispatchEvent(new CustomEvent('htmlppt:presenterblocked'));
        return;
      }
      this.presenterWindow = popup;
      popup.document.open();
      popup.document.write(this.presenterHtml());
      popup.document.close();
      window.setTimeout(() => this.broadcastPresenterState(), 100);
    }

    closeOverview() {
      this.overview?.remove();
      this.overview = null;
    }

    async toggleOverview() {
      if (this.overview) return this.closeOverview();
      await this.loadPresenterManifest();
      const overlay = document.createElement('div');
      overlay.dataset.presenterOverview = 'true';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(10,11,14,.96);display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:28px;overflow:auto;color:white;font:16px system-ui';
      this.slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.style.cssText = 'min-height:130px;padding:18px;text-align:left;background:#20232a;color:white;border:1px solid #454b57;border-radius:10px';
        button.textContent = `${index + 1}. ${this.slideInfo(index).headline || slide.dataset.slideId || ''}`;
        button.onclick = () => { this.show(index); this.closeOverview(); };
        overlay.append(button);
      });
      overlay.onclick = (event) => { if (event.target === overlay) this.closeOverview(); };
      document.body.append(overlay);
      this.overview = overlay;
    }
  }

  window.HtmlPptDeck = HtmlPptDeck;
  window.addEventListener('DOMContentLoaded', () => {
    if (new URLSearchParams(location.search).has('htmlppt-presenter-preview')) return;
    window.htmlPptDeck = new HtmlPptDeck(document);
  }, { once: true });
})();
