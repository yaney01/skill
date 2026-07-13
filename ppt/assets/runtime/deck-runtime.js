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
      if (!this.stage || this.slides.length === 0) {
        console.warn('[HTML PPT] Missing .deck-stage or .slide elements.');
        return;
      }
      this.bind();
      this.scaleStage();
      this.show(this.index, { updateHash: false });
    }
    readInitialIndex() {
      const hash = window.location.hash.match(/^#slide-(\d+)$/);
      return hash ? Math.max(0, Number(hash[1]) - 1) : 0;
    }
    bind() {
      window.addEventListener('resize', () => this.scaleStage(), { passive: true });
      window.addEventListener('hashchange', () => {
        const next = this.readInitialIndex();
        if (next !== this.index) this.show(next, { updateHash: false });
      });
      document.addEventListener('keydown', (event) => this.onKeydown(event));
      document.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
      document.addEventListener('touchstart', (event) => { this.touchStartX = event.changedTouches?.[0]?.clientX ?? null; }, { passive: true });
      document.addEventListener('touchend', (event) => this.onTouchEnd(event), { passive: true });
    }
    isTypingTarget(target) { return Boolean(target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName)); }
    onKeydown(event) {
      if (this.isTypingTarget(event.target)) return;
      const nextKeys = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
      const prevKeys = ['ArrowLeft', 'ArrowUp', 'PageUp'];
      if (nextKeys.includes(event.key)) { event.preventDefault(); this.next(); }
      else if (prevKeys.includes(event.key)) { event.preventDefault(); this.previous(); }
      else if (event.key === 'Home') { event.preventDefault(); this.show(0); }
      else if (event.key === 'End') { event.preventDefault(); this.show(this.slides.length - 1); }
    }
    onWheel(event) {
      if (this.isTypingTarget(event.target) || this.wheelLocked || Math.abs(event.deltaY) < 24) return;
      event.preventDefault();
      this.wheelLocked = true;
      event.deltaY > 0 ? this.next() : this.previous();
      window.setTimeout(() => { this.wheelLocked = false; }, 450);
    }
    onTouchEnd(event) {
      if (this.touchStartX === null) return;
      const delta = (event.changedTouches?.[0]?.clientX ?? this.touchStartX) - this.touchStartX;
      this.touchStartX = null;
      if (Math.abs(delta) >= 48) delta < 0 ? this.next() : this.previous();
    }
    scaleStage() {
      if (!this.stage) return;
      const factor = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      this.stage.style.transform = `translate(${(window.innerWidth - 1920 * factor) / 2}px, ${(window.innerHeight - 1080 * factor) / 2}px) scale(${factor})`;
      document.documentElement.style.setProperty('--deck-scale', String(factor));
    }
    show(index, { updateHash = true } = {}) {
      if (!this.slides.length) return;
      this.index = Math.max(0, Math.min(Number(index) || 0, this.slides.length - 1));
      this.slides.forEach((slide, slideIndex) => {
        const current = slideIndex === this.index;
        slide.classList.toggle('active', current);
        slide.classList.toggle('visible', current);
        slide.setAttribute('aria-hidden', String(!current));
      });
      document.documentElement.style.setProperty('--slide-index', `"${this.index + 1}"`);
      document.documentElement.style.setProperty('--slide-count', `"${this.slides.length}"`);
      document.dispatchEvent(new CustomEvent('htmlppt:slidechange', { detail: { index: this.index, count: this.slides.length, slide: this.slides[this.index] } }));
      if (updateHash) history.replaceState(null, '', `#slide-${this.index + 1}`);
    }
    next() { this.show(this.index + 1); }
    previous() { this.show(this.index - 1); }
  }

  class HtmlPptPresenter {
    constructor(root = document) {
      this.root = root;
      this.deck = window.htmlPptDeck;
      this.slides = this.deck?.slides || [];
      this.stage = this.deck?.stage;
      this.deckId = this.stage?.dataset.deckId || location.pathname || 'html-ppt';
      this.presenter = new URL(location.href).searchParams.get('presenter') === '1';
      this.index = this.deck?.index || 0;
      this.startedAt = performance.now();
      this.manifest = null;
      this.byId = new Map();
      this.timer = null;
      this.heartbeat = null;
      if (!this.stage || !this.slides.length) return;
      this.channel = 'BroadcastChannel' in window ? new BroadcastChannel(`html-ppt-presenter:${this.deckId}`) : null;
      this.channel?.addEventListener('message', (event) => this.receive(event.data));
      window.addEventListener('message', (event) => this.receive(event.data));
      document.addEventListener('htmlppt:slidechange', (event) => {
        if (!this.presenter) this.send({ type: 'state', index: event.detail.index });
        this.selectOverview(event.detail.index);
      });
      document.addEventListener('keydown', (event) => this.onKey(event), true);
      window.addEventListener('resize', () => this.scalePreviews(), { passive: true });
      window.addEventListener('beforeunload', () => {
        this.channel?.close?.();
        window.clearInterval(this.timer);
        window.clearInterval(this.heartbeat);
      });
      this.ready = this.loadManifest().then((manifest) => {
        this.manifest = manifest;
        this.byId = new Map((manifest?.slides || []).map((slide) => [slide.id, slide]));
        this.presenter ? this.buildPresenter() : this.buildOverview();
        return this;
      });
    }
    async loadManifest() {
      const embedded = document.getElementById('htmlPptManifest');
      if (embedded?.textContent?.trim()) {
        try { return JSON.parse(embedded.textContent); } catch (error) { console.warn('[HTML PPT] Invalid embedded manifest.', error); }
      }
      try {
        const response = await fetch(new URL('deck.json', document.baseURI), { cache: 'no-store' });
        if (response.ok) return await response.json();
      } catch {}
      return { title: document.title, slides: this.slides.map((slide, index) => ({ id: slide.dataset.slideId, headline: this.domHeadline(index) })) };
    }
    onKey(event) {
      if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)) return;
      const key = event.key.toLowerCase();
      if (this.presenter) {
        const navigation = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'ArrowLeft', 'ArrowUp', 'PageUp', 'Home', 'End'];
        if (navigation.includes(event.key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) this.command(this.index + 1);
          else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) this.command(this.index - 1);
          else this.command(event.key === 'Home' ? 0 : this.slides.length - 1);
        } else if (key === 't') {
          event.preventDefault();
          this.startedAt = performance.now();
          this.updateTimer();
        } else if (key === 'g') {
          event.preventDefault();
          this.jump();
        }
        return;
      }
      if (key === 'p') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.open();
      } else if (!document.documentElement.classList.contains('html-ppt-editing') && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.toggleOverview();
      } else if (!document.documentElement.classList.contains('html-ppt-editing') && key === 'g') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.jump();
      }
    }
    send(message) {
      const payload = { htmlPptPresenter: true, deckId: this.deckId, sender: this.presenter ? 'presenter' : 'audience', ...message };
      this.channel?.postMessage(payload);
      if (this.presenter && window.opener && !window.opener.closed) window.opener.postMessage(payload, '*');
      if (!this.presenter && this.popup && !this.popup.closed) this.popup.postMessage(payload, '*');
    }
    receive(message) {
      if (!message?.htmlPptPresenter || message.deckId !== this.deckId || message.sender === (this.presenter ? 'presenter' : 'audience')) return;
      if (message.type === 'hello' && !this.presenter) this.send({ type: 'state', index: this.deck.index });
      if (message.type === 'show' && !this.presenter) this.deck.show(message.index);
      if (message.type === 'state' && this.presenter) {
        this.index = this.clamp(message.index);
        this.renderPresenter();
      }
    }
    clamp(index) { return Math.max(0, Math.min(Number(index) || 0, this.slides.length - 1)); }
    command(index) {
      this.index = this.clamp(index);
      this.renderPresenter();
      this.send({ type: 'show', index: this.index });
    }
    open() {
      const url = new URL(location.href);
      url.searchParams.set('presenter', '1');
      url.hash = `slide-${this.deck.index + 1}`;
      this.popup = window.open(url.href, `html-ppt-presenter-${this.deckId}`, 'popup,width=1440,height=900,resizable=yes');
      if (!this.popup) window.alert('Presenter window was blocked. Allow pop-ups, then press P again.');
      else {
        this.popup.focus();
        window.setTimeout(() => this.send({ type: 'state', index: this.deck.index }), 300);
      }
    }
    jump() {
      const value = Number(window.prompt(`Go to slide (1–${this.slides.length})`, String((this.presenter ? this.index : this.deck.index) + 1)));
      if (!Number.isInteger(value)) return;
      this.presenter ? this.command(value - 1) : this.deck.show(value - 1);
    }
    buildOverview() {
      this.addStyles();
      const overlay = document.createElement('div');
      overlay.className = 'html-ppt-overview';
      const header = document.createElement('header');
      const title = document.createElement('strong');
      title.textContent = 'Slide overview';
      const hint = document.createElement('span');
      hint.textContent = 'Esc to close · G to jump';
      header.append(title, hint);
      const grid = document.createElement('div');
      grid.className = 'html-ppt-overview-grid';
      overlay.append(header, grid);
      this.slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.index = String(index);
        const preview = document.createElement('span');
        preview.className = 'html-ppt-preview';
        const canvas = document.createElement('span');
        canvas.className = 'html-ppt-preview-canvas';
        canvas.appendChild(this.clone(index));
        preview.appendChild(canvas);
        const label = document.createElement('b');
        label.textContent = `${String(index + 1).padStart(2, '0')} · ${this.domHeadline(index)}`;
        button.append(preview, label);
        button.addEventListener('click', () => {
          this.deck.show(index);
          this.toggleOverview(false);
        });
        grid.appendChild(button);
      });
      document.body.appendChild(overlay);
      this.overview = overlay;
      this.selectOverview(this.deck.index);
    }
    toggleOverview(force) {
      if (!this.overview) return;
      const open = typeof force === 'boolean' ? force : !this.overview.classList.contains('open');
      this.overview.classList.toggle('open', open);
      if (open) {
        this.scalePreviews();
        this.overview.querySelector('button.current')?.focus();
      }
    }
    selectOverview(index) {
      this.overview?.querySelectorAll('button').forEach((button, itemIndex) => button.classList.toggle('current', itemIndex === index));
    }
    buildPresenter() {
      this.addStyles();
      document.documentElement.classList.add('html-ppt-presenter');
      const ui = document.createElement('main');
      ui.className = 'html-ppt-presenter-ui';
      ui.innerHTML = '<header><div><strong></strong><span>Presenter view</span></div><time>00:00</time></header><section class="html-ppt-presenter-previews"><article><h2>Current</h2><div class="html-ppt-presenter-preview current"></div></article><article><h2>Next</h2><div class="html-ppt-presenter-preview next"></div></article></section><section class="html-ppt-presenter-notes"><div><span class="counter"></span><strong class="headline"></strong></div><p></p></section><footer><button data-action="previous">Previous</button><button data-action="next">Next</button><button data-action="jump">Go to slide</button><button data-action="timer">Reset timer</button></footer>';
      ui.querySelector('header strong').textContent = this.manifest?.title || document.title;
      ui.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'previous') this.command(this.index - 1);
        if (action === 'next') this.command(this.index + 1);
        if (action === 'jump') this.jump();
        if (action === 'timer') {
          this.startedAt = performance.now();
          this.updateTimer();
        }
      });
      document.body.appendChild(ui);
      this.ui = ui;
      this.renderPresenter();
      this.timer = window.setInterval(() => this.updateTimer(), 250);
      this.heartbeat = window.setInterval(() => this.send({ type: 'hello' }), 2000);
      this.send({ type: 'hello' });
    }
    renderPresenter() {
      if (!this.ui) return;
      this.preview(this.ui.querySelector('.current'), this.index);
      this.preview(this.ui.querySelector('.next'), this.index + 1);
      this.ui.querySelector('.counter').textContent = `${this.index + 1} / ${this.slides.length}`;
      this.ui.querySelector('.headline').textContent = this.headline(this.index);
      const notes = this.notes(this.index);
      this.ui.querySelector('.html-ppt-presenter-notes p').textContent = notes.speaker || 'No speaker notes.';
      this.scalePreviews();
    }
    preview(container, index) {
      container.replaceChildren();
      if (index >= this.slides.length) {
        container.textContent = 'End of deck';
        return;
      }
      const canvas = document.createElement('div');
      canvas.className = 'html-ppt-preview-canvas';
      canvas.appendChild(this.clone(index));
      container.appendChild(canvas);
    }
    clone(index) {
      const clone = this.slides[index].cloneNode(true);
      clone.classList.add('active', 'visible');
      clone.setAttribute('aria-hidden', 'false');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      return clone;
    }
    domHeadline(index) {
      return this.slides[index]?.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g, ' ').trim() || `Slide ${index + 1}`;
    }
    headline(index) {
      const id = this.slides[index]?.dataset.slideId;
      return this.byId.get(id)?.headline || this.domHeadline(index);
    }
    notes(index) {
      const id = this.slides[index]?.dataset.slideId;
      const raw = this.byId.get(id)?.notes;
      if (typeof raw === 'string') return { speaker: raw };
      return raw && typeof raw === 'object' ? { speaker: String(raw.speaker || raw.text || '') } : { speaker: '' };
    }
    updateTimer() {
      const timer = this.ui?.querySelector('time');
      if (!timer) return;
      const total = Math.floor((performance.now() - this.startedAt) / 1000);
      timer.textContent = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    scalePreviews() {
      document.querySelectorAll('.html-ppt-preview,.html-ppt-presenter-preview').forEach((container) => {
        const canvas = container.querySelector('.html-ppt-preview-canvas');
        if (canvas && container.clientWidth) canvas.style.transform = `scale(${container.clientWidth / 1920})`;
      });
    }
    addStyles() {
      if (document.querySelector('style[data-presenter-runtime]')) return;
      const style = document.createElement('style');
      style.dataset.presenterRuntime = 'true';
      style.textContent = `.html-ppt-overview{position:fixed;inset:0;z-index:12000;display:none;padding:24px;overflow:auto;background:#0c0e12f2;color:#fff;font-family:system-ui,sans-serif}.html-ppt-overview.open{display:block}.html-ppt-overview>header{position:sticky;top:-24px;z-index:2;display:flex;justify-content:space-between;margin:-24px -24px 20px;padding:20px 24px;background:#0c0e12e8}.html-ppt-overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}.html-ppt-overview button{padding:0;overflow:hidden;border:1px solid #ffffff30;border-radius:8px;background:#171a20;color:#fff;text-align:left;cursor:pointer}.html-ppt-overview button.current{border-color:#fff;box-shadow:0 0 0 2px #ffffff30}.html-ppt-overview b{display:block;padding:10px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.html-ppt-preview,.html-ppt-presenter-preview{position:relative;display:block;width:100%;aspect-ratio:16/9;overflow:hidden;background:#000}.html-ppt-preview-canvas{position:absolute;inset:0;width:1920px;height:1080px;transform-origin:0 0}.html-ppt-preview-canvas .slide{pointer-events:none!important}html.html-ppt-presenter,html.html-ppt-presenter body{overflow:auto;background:#0d0f14}.html-ppt-presenter .deck-viewport,.html-ppt-presenter .deck-ui,.html-ppt-presenter .editor-ui{display:none!important}.html-ppt-presenter-ui{min-height:100vh;padding:22px;color:#f5f7fa;background:#0d0f14;font-family:system-ui,sans-serif}.html-ppt-presenter-ui>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.html-ppt-presenter-ui>header div{display:grid;gap:4px}.html-ppt-presenter-ui>header span{color:#929aa7;font-size:13px}.html-ppt-presenter-ui time{font:700 30px/1 ui-monospace,monospace}.html-ppt-presenter-previews{display:grid;grid-template-columns:1.5fr .85fr;gap:18px}.html-ppt-presenter-previews h2{margin:0 0 7px;color:#929aa7;font:700 12px/1 system-ui,sans-serif;text-transform:uppercase}.html-ppt-presenter-preview{border:1px solid #ffffff30;border-radius:8px}.html-ppt-presenter-notes{display:grid;grid-template-columns:230px 1fr;gap:22px;min-height:140px;margin-top:18px;padding:19px;border:1px solid #ffffff20;border-radius:9px;background:#171a20}.html-ppt-presenter-notes div{display:grid;align-content:start;gap:10px}.html-ppt-presenter-notes p{margin:0;font-size:20px;line-height:1.55;white-space:pre-wrap}.html-ppt-presenter-ui footer{display:flex;gap:8px;margin-top:14px}.html-ppt-presenter-ui button{padding:10px 14px;border:0;border-radius:7px;background:#ffffff18;color:#fff;font-weight:700;cursor:pointer}.html-ppt-presenter-ui button[data-action=next]{background:#fff;color:#111}@media(max-width:850px){.html-ppt-presenter-previews,.html-ppt-presenter-notes{grid-template-columns:1fr}}@media print{.html-ppt-overview,.html-ppt-presenter-ui,style[data-presenter-runtime]{display:none!important}}`;
      document.head.appendChild(style);
    }
  }

  window.HtmlPptDeck = HtmlPptDeck;
  window.HtmlPptPresenter = HtmlPptPresenter;
  window.addEventListener('DOMContentLoaded', () => {
    window.htmlPptDeck = new HtmlPptDeck(document);
    window.htmlPptPresenter = new HtmlPptPresenter(document);
  }, { once: true });
})();
