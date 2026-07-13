(() => {
  'use strict';

  const PRESENTER_PARAM = 'presenter';
  const MANIFEST_ID = 'htmlPptManifest';
  const MESSAGE_MARKER = 'html-ppt-presenter-v1';
  const NAV_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'ArrowLeft', 'ArrowUp', 'PageUp', 'Home', 'End']);

  class HtmlPptPresenter {
    constructor(root = document) {
      this.root = root;
      this.deck = window.htmlPptDeck;
      this.stage = this.deck?.stage || root.getElementById('deckStage') || root.querySelector('.deck-stage');
      this.slides = this.deck?.slides || Array.from(root.querySelectorAll('.slide'));
      this.deckId = this.stage?.dataset.deckId || location.pathname || 'html-ppt';
      this.isPresenterWindow = new URL(location.href).searchParams.get(PRESENTER_PARAM) === '1';
      this.instanceId = `${this.isPresenterWindow ? 'presenter' : 'audience'}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.currentIndex = this.deck?.index || 0;
      this.manifest = null;
      this.manifestById = new Map();
      this.channel = null;
      this.presenterWindow = null;
      this.messageSequence = 0;
      this.seenMessages = new Set();
      this.timerStartedAt = performance.now();
      this.timerInterval = null;
      this.heartbeat = null;

      if (!this.stage || this.slides.length === 0) {
        console.warn('[HTML PPT] Presenter mode requires .deck-stage and .slide elements.');
        return;
      }

      this.setupTransport();
      this.bindSharedEvents();
      this.ready = this.loadManifest().then((manifest) => {
        this.manifest = manifest;
        this.manifestById = new Map((manifest?.slides || []).map((slide) => [slide.id, slide]));
        if (this.isPresenterWindow) this.buildPresenterView();
        else this.buildAudienceTools();
        return this;
      });
    }

    async loadManifest() {
      const embedded = this.root.getElementById(MANIFEST_ID);
      if (embedded?.textContent?.trim()) {
        try { return JSON.parse(embedded.textContent); }
        catch (error) { console.warn('[HTML PPT] Embedded deck manifest is invalid.', error); }
      }

      try {
        const response = await fetch(new URL('deck.json', document.baseURI), { cache: 'no-store' });
        if (response.ok) return await response.json();
      } catch (error) {
        if (location.protocol !== 'file:') console.warn('[HTML PPT] Could not load deck.json for presenter notes.', error);
      }

      return {
        id: this.deckId,
        title: document.title,
        slides: this.slides.map((slide, index) => ({
          id: slide.dataset.slideId || `slide-${String(index + 1).padStart(2, '0')}`,
          headline: slide.querySelector('h1,h2,h3')?.textContent?.trim() || `Slide ${index + 1}`,
        })),
      };
    }

    setupTransport() {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(`html-ppt-presenter:${this.deckId}`);
        this.channel.addEventListener('message', (event) => this.receiveMessage(event.data));
      }
      window.addEventListener('message', (event) => this.receiveMessage(event.data));
    }

    bindSharedEvents() {
      document.addEventListener('htmlppt:slidechange', (event) => {
        if (this.isPresenterWindow) return;
        this.currentIndex = event.detail.index;
        this.sendState();
        this.updateOverviewSelection();
      });

      document.addEventListener('keydown', (event) => this.onKeydownCapture(event), true);
      window.addEventListener('resize', () => this.scalePresenterCanvases(), { passive: true });
      window.addEventListener('beforeunload', () => {
        this.channel?.close?.();
        clearInterval(this.timerInterval);
        clearInterval(this.heartbeat);
      });
    }

    onKeydownCapture(event) {
      if (this.isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (this.isPresenterWindow) {
        if (NAV_KEYS.has(event.key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) this.commandShow(this.currentIndex + 1);
          else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) this.commandShow(this.currentIndex - 1);
          else if (event.key === 'Home') this.commandShow(0);
          else if (event.key === 'End') this.commandShow(this.slides.length - 1);
          return;
        }
        if (key === 't') {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.resetTimer();
        } else if (key === 'g') {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.openJumpDialog();
        } else if (key === 'p') {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.opener?.focus?.();
        }
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.openPresenterWindow();
        return;
      }

      if (document.documentElement.classList.contains('html-ppt-editing')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.toggleOverview();
      } else if (key === 'g') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.openJumpDialog();
      } else if (this.overview?.classList.contains('open') && NAV_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    isTypingTarget(target) {
      return Boolean(target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName));
    }

    createMessage(type, payload = {}) {
      this.messageSequence += 1;
      return {
        marker: MESSAGE_MARKER,
        deckId: this.deckId,
        sender: this.instanceId,
        id: `${this.instanceId}:${this.messageSequence}`,
        type,
        ...payload,
      };
    }

    send(type, payload = {}) {
      const message = this.createMessage(type, payload);
      this.channel?.postMessage(message);
      if (this.isPresenterWindow && window.opener && !window.opener.closed) window.opener.postMessage(message, '*');
      if (!this.isPresenterWindow && this.presenterWindow && !this.presenterWindow.closed) this.presenterWindow.postMessage(message, '*');
    }

    receiveMessage(message) {
      if (!message || message.marker !== MESSAGE_MARKER || message.deckId !== this.deckId || message.sender === this.instanceId) return;
      if (message.id && this.seenMessages.has(message.id)) return;
      if (message.id) {
        this.seenMessages.add(message.id);
        if (this.seenMessages.size > 200) this.seenMessages.delete(this.seenMessages.values().next().value);
      }

      if (message.type === 'hello' && !this.isPresenterWindow) {
        this.sendState();
      } else if (message.type === 'command:show' && !this.isPresenterWindow) {
        this.deck?.show?.(Number(message.index) || 0);
      } else if (message.type === 'state' && this.isPresenterWindow) {
        this.currentIndex = this.clampIndex(message.index);
        this.renderPresenterView();
        this.setConnectionStatus('Connected');
      }
    }

    sendState() {
      this.send('state', { index: this.deck?.index || 0, count: this.slides.length });
    }

    clampIndex(index) {
      return Math.max(0, Math.min(Number(index) || 0, this.slides.length - 1));
    }

    commandShow(index) {
      this.currentIndex = this.clampIndex(index);
      this.renderPresenterView();
      this.send('command:show', { index: this.currentIndex });
    }

    openPresenterWindow() {
      const url = new URL(location.href);
      url.searchParams.set(PRESENTER_PARAM, '1');
      url.hash = `slide-${(this.deck?.index || 0) + 1}`;
      const popup = window.open(url.href, `html-ppt-presenter-${this.deckId}`, 'popup,width=1480,height=920,resizable=yes,scrollbars=no');
      if (!popup) {
        this.showToast('Presenter window was blocked. Allow pop-ups for this file or site, then press P again.');
        return;
      }
      this.presenterWindow = popup;
      popup.focus();
      window.setTimeout(() => this.sendState(), 350);
    }

    buildAudienceTools() {
      this.buildOverview();
      this.buildJumpDialog();
      this.buildToast();
    }

    buildOverview() {
      const overlay = document.createElement('div');
      overlay.className = 'html-ppt-overview';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = '<div class="html-ppt-overview__header"><strong>Slide overview</strong><span>Click a slide · Esc to close · G to jump</span></div><div class="html-ppt-overview__grid"></div>';
      const grid = overlay.querySelector('.html-ppt-overview__grid');
      this.slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'html-ppt-overview__item';
        button.dataset.index = String(index);
        button.setAttribute('aria-label', `Go to slide ${index + 1}`);
        const preview = document.createElement('span');
        preview.className = 'html-ppt-overview__preview';
        const canvas = document.createElement('span');
        canvas.className = 'html-ppt-preview-canvas';
        canvas.appendChild(this.cloneSlide(index));
        preview.appendChild(canvas);
        const label = document.createElement('span');
        label.className = 'html-ppt-overview__label';
        label.textContent = `${String(index + 1).padStart(2, '0')} · ${this.slideHeadline(index)}`;
        button.append(preview, label);
        button.addEventListener('click', () => {
          this.deck?.show?.(index);
          this.toggleOverview(false);
        });
        grid.appendChild(button);
      });
      document.body.appendChild(overlay);
      this.overview = overlay;
      this.installPresenterStyles();
      this.updateOverviewSelection();
    }

    toggleOverview(force) {
      if (!this.overview) return;
      const open = typeof force === 'boolean' ? force : !this.overview.classList.contains('open');
      this.overview.classList.toggle('open', open);
      this.overview.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('html-ppt-overview-open', open);
      if (open) {
        this.updateOverviewSelection();
        this.scalePresenterCanvases();
        this.overview.querySelector('.html-ppt-overview__item.current')?.focus();
      }
    }

    updateOverviewSelection() {
      if (!this.overview) return;
      const current = this.deck?.index || 0;
      this.overview.querySelectorAll('.html-ppt-overview__item').forEach((item, index) => item.classList.toggle('current', index === current));
    }

    buildJumpDialog() {
      const dialog = document.createElement('dialog');
      dialog.className = 'html-ppt-jump';
      dialog.innerHTML = `
        <form method="dialog">
          <label>Go to slide <span>1–${this.slides.length}</span></label>
          <input type="number" min="1" max="${this.slides.length}" inputmode="numeric" required>
          <div><button value="cancel">Cancel</button><button value="go">Go</button></div>
        </form>`;
      dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'go') return;
        const value = Number(dialog.querySelector('input').value);
        if (!Number.isInteger(value)) return;
        if (this.isPresenterWindow) this.commandShow(value - 1);
        else this.deck?.show?.(value - 1);
      });
      document.body.appendChild(dialog);
      this.jumpDialog = dialog;
      this.installPresenterStyles();
    }

    openJumpDialog() {
      if (!this.jumpDialog) this.buildJumpDialog();
      const input = this.jumpDialog.querySelector('input');
      input.value = String((this.isPresenterWindow ? this.currentIndex : this.deck?.index || 0) + 1);
      this.jumpDialog.showModal();
      window.setTimeout(() => input.select(), 0);
    }

    buildToast() {
      const toast = document.createElement('div');
      toast.className = 'html-ppt-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
      this.toast = toast;
      this.installPresenterStyles();
    }

    showToast(message) {
      if (!this.toast) this.buildToast();
      this.toast.textContent = message;
      this.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => this.toast.classList.remove('show'), 5200);
    }

    buildPresenterView() {
      document.documentElement.classList.add('html-ppt-presenter');
      this.installPresenterStyles();
      const root = document.createElement('main');
      root.className = 'html-ppt-presenter-ui';
      root.innerHTML = `
        <header class="html-ppt-presenter__header">
          <div><strong data-presenter-title></strong><span data-presenter-status>Connecting…</span></div>
          <div class="html-ppt-presenter__timer"><span data-presenter-timer>00:00</span><small data-presenter-target></small></div>
        </header>
        <section class="html-ppt-presenter__previews">
          <article><h2>Current</h2><div class="html-ppt-presenter__preview" data-presenter-current></div></article>
          <article><h2>Next</h2><div class="html-ppt-presenter__preview" data-presenter-next></div></article>
        </section>
        <section class="html-ppt-presenter__notes">
          <div><span data-presenter-counter></span><strong data-presenter-headline></strong></div>
          <p data-presenter-notes>No speaker notes.</p>
        </section>
        <footer class="html-ppt-presenter__controls">
          <button type="button" data-presenter-action="previous">Previous</button>
          <button type="button" data-presenter-action="next">Next</button>
          <button type="button" data-presenter-action="jump">Go to slide</button>
          <button type="button" data-presenter-action="reset-timer">Reset timer</button>
        </footer>`;
      document.body.appendChild(root);
      this.presenterUi = root;
      this.buildJumpDialog();
      root.querySelector('[data-presenter-title]').textContent = this.manifest?.title || document.title;
      root.addEventListener('click', (event) => {
        const action = event.target.closest('[data-presenter-action]')?.dataset.presenterAction;
        if (action === 'previous') this.commandShow(this.currentIndex - 1);
        if (action === 'next') this.commandShow(this.currentIndex + 1);
        if (action === 'jump') this.openJumpDialog();
        if (action === 'reset-timer') this.resetTimer();
      });
      this.resetTimer();
      this.timerInterval = window.setInterval(() => this.updateTimer(), 250);
      this.heartbeat = window.setInterval(() => this.send('hello'), 2500);
      this.renderPresenterView();
      this.send('hello');
    }

    renderPresenterView() {
      if (!this.presenterUi) return;
      const current = this.presenterUi.querySelector('[data-presenter-current]');
      const next = this.presenterUi.querySelector('[data-presenter-next]');
      this.renderSlidePreview(current, this.currentIndex);
      this.renderSlidePreview(next, this.currentIndex + 1);
      this.presenterUi.querySelector('[data-presenter-counter]').textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
      this.presenterUi.querySelector('[data-presenter-headline]').textContent = this.slideHeadline(this.currentIndex);
      const notes = this.slideNotes(this.currentIndex);
      this.presenterUi.querySelector('[data-presenter-notes]').textContent = notes.speaker || 'No speaker notes.';
      this.presenterUi.querySelector('[data-presenter-target]').textContent = notes.durationSeconds ? `Target ${this.formatTime(notes.durationSeconds)}` : '';
      this.scalePresenterCanvases();
    }

    renderSlidePreview(container, index) {
      container.replaceChildren();
      if (index >= this.slides.length) {
        const end = document.createElement('div');
        end.className = 'html-ppt-presenter__end';
        end.textContent = 'End of deck';
        container.appendChild(end);
        return;
      }
      const canvas = document.createElement('div');
      canvas.className = 'html-ppt-preview-canvas';
      canvas.appendChild(this.cloneSlide(index));
      container.appendChild(canvas);
    }

    cloneSlide(index) {
      const source = this.slides[index];
      const clone = source.cloneNode(true);
      clone.classList.add('active', 'visible');
      clone.setAttribute('aria-hidden', 'false');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      clone.querySelectorAll('[contenteditable]').forEach((element) => element.removeAttribute('contenteditable'));
      return clone;
    }

    slideHeadline(index) {
      const slide = this.slides[index];
      if (!slide) return '';
      const id = slide.dataset.slideId || '';
      return this.manifestById.get(id)?.headline || slide.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g, ' ').trim() || `Slide ${index + 1}`;
    }

    slideNotes(index) {
      const slide = this.slides[index];
      const raw = this.manifestById.get(slide?.dataset.slideId || '')?.notes;
      if (typeof raw === 'string') return { speaker: raw, durationSeconds: null, private: true };
      if (raw && typeof raw === 'object') {
        const seconds = Number(raw.durationSeconds);
        return {
          speaker: String(raw.speaker || raw.text || ''),
          durationSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null,
          private: raw.private !== false,
        };
      }
      return { speaker: '', durationSeconds: null, private: true };
    }

    scalePresenterCanvases() {
      document.querySelectorAll('.html-ppt-presenter__preview, .html-ppt-overview__preview').forEach((container) => {
        const canvas = container.querySelector('.html-ppt-preview-canvas');
        if (!canvas || !container.clientWidth) return;
        canvas.style.transform = `scale(${container.clientWidth / 1920})`;
      });
    }

    resetTimer() {
      this.timerStartedAt = performance.now();
      this.updateTimer();
    }

    updateTimer() {
      const timer = this.presenterUi?.querySelector('[data-presenter-timer]');
      if (!timer) return;
      timer.textContent = this.formatTime((performance.now() - this.timerStartedAt) / 1000);
    }

    formatTime(seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const minutes = Math.floor(total / 60);
      return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }

    setConnectionStatus(value) {
      const status = this.presenterUi?.querySelector('[data-presenter-status]');
      if (status) status.textContent = value;
    }

    installPresenterStyles() {
      if (document.querySelector('style[data-presenter-runtime]')) return;
      const style = document.createElement('style');
      style.dataset.presenterRuntime = 'true';
      style.textContent = `
        .html-ppt-toast{position:fixed;left:50%;bottom:28px;z-index:12020;max-width:min(720px,calc(100vw - 32px));padding:13px 18px;border-radius:10px;background:#15171bcc;color:#fff;font:600 14px/1.45 ui-sans-serif,system-ui,sans-serif;opacity:0;transform:translate(-50%,12px);pointer-events:none;transition:.18s ease;backdrop-filter:blur(12px)}
        .html-ppt-toast.show{opacity:1;transform:translate(-50%,0)}
        .html-ppt-overview{position:fixed;inset:0;z-index:12000;display:none;padding:26px 30px 42px;overflow:auto;background:#0c0e12f2;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;backdrop-filter:blur(18px)}
        .html-ppt-overview.open{display:block}.html-ppt-overview__header{position:sticky;top:-26px;z-index:2;display:flex;justify-content:space-between;align-items:center;margin:-26px -30px 24px;padding:22px 30px;background:#0c0e12e8;border-bottom:1px solid #ffffff24}.html-ppt-overview__header strong{font-size:22px}.html-ppt-overview__header span{color:#aeb5c1;font-size:13px}
        .html-ppt-overview__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}.html-ppt-overview__item{min-width:0;padding:0;border:1px solid #ffffff2d;border-radius:10px;overflow:hidden;background:#171a20;color:#fff;text-align:left;cursor:pointer}.html-ppt-overview__item:hover,.html-ppt-overview__item:focus-visible,.html-ppt-overview__item.current{border-color:#fff;outline:none;box-shadow:0 0 0 2px #ffffff30}.html-ppt-overview__preview{position:relative;display:block;width:100%;aspect-ratio:16/9;overflow:hidden;background:#000}.html-ppt-overview__label{display:block;padding:11px 13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:600 13px/1.3 ui-sans-serif,system-ui,sans-serif}
        .html-ppt-preview-canvas{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}.html-ppt-preview-canvas .slide{pointer-events:none!important}
        .html-ppt-jump{width:min(420px,calc(100vw - 32px));padding:0;border:1px solid #ffffff29;border-radius:14px;background:#17191f;color:#fff;box-shadow:0 30px 90px #0009}.html-ppt-jump::backdrop{background:#000a;backdrop-filter:blur(8px)}.html-ppt-jump form{display:grid;gap:18px;padding:24px}.html-ppt-jump label{display:flex;justify-content:space-between;font:700 16px/1 ui-sans-serif,system-ui,sans-serif}.html-ppt-jump label span{color:#aeb5c1;font-weight:500}.html-ppt-jump input{width:100%;padding:13px;border:1px solid #ffffff38;border-radius:9px;background:#0d0f13;color:#fff;font:700 22px/1 ui-sans-serif,system-ui,sans-serif}.html-ppt-jump form>div{display:flex;justify-content:flex-end;gap:8px}.html-ppt-jump button,.html-ppt-presenter__controls button{padding:10px 14px;border:0;border-radius:8px;background:#ffffff16;color:#fff;font:700 13px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}.html-ppt-jump button[value=go],.html-ppt-presenter__controls button[data-presenter-action=next]{background:#fff;color:#111}
        html.html-ppt-presenter,html.html-ppt-presenter body{overflow:auto;background:#0d0f14}.html-ppt-presenter .deck-viewport,.html-ppt-presenter .deck-ui,.html-ppt-presenter .editor-ui{display:none!important}.html-ppt-presenter-ui{min-height:100vh;padding:22px 26px 26px;color:#f4f6fa;background:#0d0f14;font-family:ui-sans-serif,system-ui,sans-serif}.html-ppt-presenter__header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:18px}.html-ppt-presenter__header>div:first-child{display:grid;gap:5px}.html-ppt-presenter__header strong{font-size:20px}.html-ppt-presenter__header span{color:#8e96a4;font-size:13px}.html-ppt-presenter__timer{display:grid;text-align:right}.html-ppt-presenter__timer span{color:#fff;font:750 30px/1 ui-monospace,SFMono-Regular,monospace}.html-ppt-presenter__timer small{min-height:16px;margin-top:5px;color:#8e96a4}.html-ppt-presenter__previews{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,.85fr);gap:20px;align-items:start}.html-ppt-presenter__previews article{min-width:0}.html-ppt-presenter__previews h2{margin:0 0 8px;color:#8e96a4;font:700 12px/1 ui-sans-serif,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.1em}.html-ppt-presenter__preview{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border:1px solid #ffffff2b;border-radius:8px;background:#000;box-shadow:0 16px 50px #0007}.html-ppt-presenter__end{display:grid;place-items:center;width:100%;height:100%;color:#7c8491;font-weight:700}.html-ppt-presenter__notes{display:grid;grid-template-columns:250px 1fr;gap:24px;min-height:150px;margin-top:20px;padding:20px 22px;border:1px solid #ffffff20;border-radius:10px;background:#15181e}.html-ppt-presenter__notes>div{display:grid;align-content:start;gap:10px}.html-ppt-presenter__notes span{color:#a3abb8;font-size:13px}.html-ppt-presenter__notes strong{font-size:17px;line-height:1.35}.html-ppt-presenter__notes p{margin:0;color:#edf0f5;font-size:20px;line-height:1.55;white-space:pre-wrap}.html-ppt-presenter__controls{display:flex;gap:9px;margin-top:16px}.html-ppt-presenter__controls button:hover{background:#ffffff26}.html-ppt-presenter__controls button[data-presenter-action=next]:hover{background:#d9dce2}
        @media(max-width:900px){.html-ppt-presenter__previews{grid-template-columns:1fr}.html-ppt-presenter__notes{grid-template-columns:1fr}.html-ppt-presenter__header{align-items:flex-start}.html-ppt-overview__grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}
        @media print{.html-ppt-presenter-ui,.html-ppt-overview,.html-ppt-jump,.html-ppt-toast,style[data-presenter-runtime]{display:none!important}}
      `;
      document.head.appendChild(style);
    }
  }

  window.HtmlPptPresenter = HtmlPptPresenter;
  window.addEventListener('DOMContentLoaded', () => {
    window.htmlPptPresenter = new HtmlPptPresenter(document);
  }, { once: true });
})();
