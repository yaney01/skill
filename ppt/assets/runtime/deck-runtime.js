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
      if (!hash) return 0;
      return Math.max(0, Number(hash[1]) - 1);
    }

    bind() {
      window.addEventListener('resize', () => this.scaleStage(), { passive: true });
      window.addEventListener('hashchange', () => {
        const next = this.readInitialIndex();
        if (next !== this.index) this.show(next, { updateHash: false });
      });

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

      if (updateHash) {
        history.replaceState(null, '', `#slide-${this.index + 1}`);
      }
    }

    next() { this.show(this.index + 1); }
    previous() { this.show(this.index - 1); }
  }

  window.HtmlPptDeck = HtmlPptDeck;
  window.addEventListener('DOMContentLoaded', () => {
    window.htmlPptDeck = new HtmlPptDeck(document);
  }, { once: true });
})();
