(() => {
  'use strict';

  class HtmlPptEditor {
    constructor(root = document) {
      this.root = root;
      this.stage = root.getElementById('deckStage') || root.querySelector('.deck-stage');
      this.deckId = this.stage?.dataset.deckId || location.pathname || 'html-ppt';
      this.storageKey = `html-ppt:${this.deckId}:edits`;
      this.isActive = false;
      this.saveTimer = null;
      this.imageInput = null;
      this.activeImage = null;

      if (!this.stage) return;
      this.buildUi();
      this.restore();
      this.bind();
    }

    editableElements() {
      return Array.from(this.root.querySelectorAll('[data-editable]'));
    }

    buildUi() {
      const ui = document.createElement('div');
      ui.className = 'editor-ui deck-ui';
      ui.innerHTML = `
        <div class="editor-hotzone" aria-hidden="true"></div>
        <div class="editor-toolbar" role="toolbar" aria-label="Presentation editor">
          <button type="button" data-editor-action="toggle">Edit</button>
          <button type="button" data-editor-action="download">Download HTML</button>
          <button type="button" data-editor-action="reset">Reset</button>
        </div>
        <input type="file" accept="image/*" data-editor-image-input hidden>
      `;
      document.body.appendChild(ui);
      this.ui = ui;
      this.toolbar = ui.querySelector('.editor-toolbar');
      this.imageInput = ui.querySelector('[data-editor-image-input]');

      const style = document.createElement('style');
      style.dataset.editorRuntime = 'true';
      style.textContent = `
        .editor-hotzone { position: fixed; inset: 0 auto auto 0; width: 82px; height: 82px; z-index: 10001; }
        .editor-toolbar { position: fixed; top: 16px; left: 16px; z-index: 10002; display: flex; gap: 8px; padding: 8px; border: 1px solid rgb(255 255 255 / .18); border-radius: 12px; background: rgb(15 15 17 / .88); box-shadow: 0 10px 32px rgb(0 0 0 / .28); opacity: 0; pointer-events: none; transform: translateY(-6px); transition: opacity .18s ease, transform .18s ease; backdrop-filter: blur(14px); }
        .editor-toolbar.show, .editor-toolbar.active { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .editor-toolbar button { appearance: none; border: 0; border-radius: 8px; padding: 8px 11px; color: #fff; background: rgb(255 255 255 / .12); cursor: pointer; font: 600 13px/1 ui-sans-serif, system-ui, sans-serif; }
        .editor-toolbar button:hover { background: rgb(255 255 255 / .2); }
        html.html-ppt-editing [data-editable="text"] { outline: 2px dashed rgb(50 130 255 / .72); outline-offset: 3px; cursor: text; }
        html.html-ppt-editing [data-editable="image"] { outline: 2px dashed rgb(255 120 40 / .82); outline-offset: 3px; cursor: pointer; }
        html.html-ppt-editing [data-editable="text"]:focus { outline-style: solid; }
        @media print { .editor-ui { display: none !important; } }
      `;
      document.head.appendChild(style);
    }

    bind() {
      let hideTimer = null;
      const hotzone = this.ui.querySelector('.editor-hotzone');
      const show = () => {
        clearTimeout(hideTimer);
        this.toolbar.classList.add('show');
      };
      const hide = () => {
        hideTimer = window.setTimeout(() => {
          if (!this.isActive) this.toolbar.classList.remove('show');
        }, 400);
      };

      hotzone.addEventListener('mouseenter', show);
      hotzone.addEventListener('mouseleave', hide);
      hotzone.addEventListener('click', () => this.toggle());
      this.toolbar.addEventListener('mouseenter', show);
      this.toolbar.addEventListener('mouseleave', hide);
      this.toolbar.addEventListener('click', (event) => {
        const action = event.target.closest('[data-editor-action]')?.dataset.editorAction;
        if (action === 'toggle') this.toggle();
        if (action === 'download') this.download();
        if (action === 'reset') this.reset();
      });

      document.addEventListener('keydown', (event) => {
        const typing = event.target?.isContentEditable || /^(INPUT|TEXTAREA)$/.test(event.target?.tagName);
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          this.download();
          return;
        }
        if (!typing && event.key.toLowerCase() === 'e') {
          event.preventDefault();
          this.toggle();
        } else if (event.key === 'Escape') {
          if (typing) event.target.blur();
          else if (this.isActive) this.toggle(false);
        }
      });

      this.stage.addEventListener('input', (event) => {
        if (event.target.matches('[data-editable="text"]')) this.queueSave();
      });

      this.stage.addEventListener('click', (event) => {
        const image = event.target.closest('[data-editable="image"]');
        if (!this.isActive || !image) return;
        event.preventDefault();
        event.stopPropagation();
        this.activeImage = image;
        this.imageInput.click();
      });

      this.imageInput.addEventListener('change', () => this.replaceImage());
    }

    toggle(force) {
      this.isActive = typeof force === 'boolean' ? force : !this.isActive;
      document.documentElement.classList.toggle('html-ppt-editing', this.isActive);
      this.toolbar.classList.toggle('active', this.isActive);
      this.toolbar.classList.toggle('show', this.isActive);
      this.toolbar.querySelector('[data-editor-action="toggle"]').textContent = this.isActive ? 'Done' : 'Edit';

      this.editableElements().forEach((element) => {
        if (element.dataset.editable === 'text') {
          element.contentEditable = this.isActive ? 'true' : 'false';
          element.spellcheck = this.isActive;
        }
      });

      if (!this.isActive) {
        this.root.activeElement?.blur?.();
        this.save();
      }
    }

    queueSave() {
      clearTimeout(this.saveTimer);
      this.saveTimer = window.setTimeout(() => this.save(), 250);
    }

    snapshot() {
      const edits = {};
      this.editableElements().forEach((element) => {
        const id = element.dataset.elementId;
        if (!id) return;
        if (element.dataset.editable === 'text') edits[id] = { type: 'text', html: element.innerHTML };
        if (element.dataset.editable === 'image') edits[id] = { type: 'image', src: element.getAttribute('src') || '' };
      });
      return edits;
    }

    save() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.snapshot()));
      } catch (error) {
        console.warn('[HTML PPT] Could not save edits to localStorage.', error);
      }
    }

    restore() {
      let edits;
      try {
        edits = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      } catch {
        edits = {};
      }
      this.editableElements().forEach((element) => {
        const edit = edits[element.dataset.elementId];
        if (!edit) return;
        if (edit.type === 'text' && element.dataset.editable === 'text') element.innerHTML = edit.html;
        if (edit.type === 'image' && element.dataset.editable === 'image') element.setAttribute('src', edit.src);
      });
    }

    replaceImage() {
      const file = this.imageInput.files?.[0];
      if (!file || !this.activeImage) return;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        this.activeImage.setAttribute('src', String(reader.result));
        this.imageInput.value = '';
        this.activeImage = null;
        this.save();
      }, { once: true });
      reader.readAsDataURL(file);
    }

    reset() {
      if (!window.confirm('Reset all local edits for this deck?')) return;
      localStorage.removeItem(this.storageKey);
      window.location.reload();
    }

    download() {
      this.save();
      const clone = document.documentElement.cloneNode(true);
      clone.classList.remove('html-ppt-editing');
      clone.querySelectorAll('[contenteditable]').forEach((element) => element.removeAttribute('contenteditable'));
      clone.querySelectorAll('.editor-ui, style[data-editor-runtime]').forEach((element) => element.remove());
      clone.querySelectorAll('.active, .visible').forEach((element, index) => {
        if (!element.classList.contains('slide')) return;
        element.classList.toggle('active', index === 0);
        element.classList.toggle('visible', index === 0);
      });
      const html = '<!DOCTYPE html>\n' + clone.outerHTML;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const base = (document.title || 'presentation').trim().replace(/[^\p{L}\p{N}._-]+/gu, '-');
      link.href = url;
      link.download = `${base || 'presentation'}-edited.html`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  window.HtmlPptEditor = HtmlPptEditor;
  window.addEventListener('DOMContentLoaded', () => {
    window.htmlPptEditor = new HtmlPptEditor(document);
  }, { once: true });
})();
