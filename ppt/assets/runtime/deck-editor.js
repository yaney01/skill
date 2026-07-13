(() => {
  'use strict';

  const STATE_VERSION = 2;
  const HISTORY_LIMIT = 80;
  const FOCUS_OPTIONS = [
    ['', 'Theme default'],
    ['0% 0%', 'Top left'],
    ['50% 0%', 'Top'],
    ['100% 0%', 'Top right'],
    ['0% 50%', 'Left'],
    ['50% 50%', 'Center'],
    ['100% 50%', 'Right'],
    ['0% 100%', 'Bottom left'],
    ['50% 100%', 'Bottom'],
    ['100% 100%', 'Bottom right'],
  ];

  class HtmlPptEditor {
    constructor(root = document) {
      this.root = root;
      this.stage = root.getElementById('deckStage') || root.querySelector('.deck-stage');
      this.deckId = this.stage?.dataset.deckId || location.pathname || 'html-ppt';
      this.storageKey = `html-ppt:${this.deckId}:edits`;
      this.stateVersion = STATE_VERSION;
      this.isActive = false;
      this.saveTimer = null;
      this.selected = null;
      this.imageInput = null;
      this.stateInput = null;
      this.history = [];
      this.historyIndex = -1;
      this.applying = false;
      this.presenterPreview = new URLSearchParams(location.search).has('htmlppt-presenter-preview');

      if (!this.stage || this.presenterPreview) return;
      this.originals = new Map(this.editableElements().map((element) => [element.dataset.elementId, this.captureElement(element)]).filter(([id]) => id));
      this.buildUi();
      this.restore();
      this.history = [this.snapshotElements()];
      this.historyIndex = 0;
      this.bind();
      this.updateUi();
    }

    editableElements(scope = this.stage) {
      return Array.from(scope?.querySelectorAll?.('[data-editable][data-element-id]') || []);
    }

    captureElement(element) {
      if (element.dataset.editable === 'text') {
        return { type: 'text', html: element.innerHTML };
      }
      return {
        type: 'image',
        src: element.getAttribute('src') || '',
        alt: element.getAttribute('alt') || '',
        fit: element.dataset.fit || element.style.objectFit || '',
        focus: element.dataset.focus || element.style.objectPosition || '',
      };
    }

    snapshotElements() {
      const elements = {};
      this.editableElements().forEach((element) => {
        elements[element.dataset.elementId] = this.captureElement(element);
      });
      return elements;
    }

    envelope(elements = this.snapshotElements()) {
      return {
        version: STATE_VERSION,
        deckId: this.deckId,
        updatedAt: new Date().toISOString(),
        elements,
      };
    }

    buildUi() {
      const ui = document.createElement('div');
      ui.className = 'editor-ui deck-ui';
      ui.innerHTML = `
        <div class="editor-hotzone" aria-hidden="true"></div>
        <div class="editor-toolbar" role="toolbar" aria-label="Presentation editor">
          <button type="button" data-editor-action="toggle">Edit</button>
          <span class="editor-group editor-history">
            <button type="button" data-editor-action="undo" title="Undo (Ctrl/Cmd+Z)" disabled>Undo</button>
            <button type="button" data-editor-action="redo" title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)" disabled>Redo</button>
          </span>
          <span class="editor-group editor-reset-group">
            <button type="button" data-editor-action="reset-element" disabled>Reset element</button>
            <button type="button" data-editor-action="reset-slide">Reset slide</button>
          </span>
          <span class="editor-group editor-state-group">
            <button type="button" data-editor-action="export-state">Export edits</button>
            <button type="button" data-editor-action="import-state">Import edits</button>
          </span>
          <button type="button" data-editor-action="download">Download HTML</button>
          <button type="button" data-editor-action="reset">Reset all</button>
          <output class="editor-status" aria-live="polite"></output>
        </div>
        <div class="editor-properties" aria-label="Selected element properties" hidden>
          <strong data-editor-selection>No selection</strong>
          <div data-editor-image-properties hidden>
            <button type="button" data-editor-action="replace-image">Replace image</button>
            <label>Fit
              <select data-editor-property="fit">
                <option value="">Theme default</option>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
            <label>Focus
              <select data-editor-property="focus">
                ${FOCUS_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
              </select>
            </label>
            <button type="button" data-editor-action="edit-alt">Alt text</button>
          </div>
        </div>
        <input type="file" accept="image/*" data-editor-image-input hidden>
        <input type="file" accept="application/json,.json" data-editor-state-input hidden>
      `;
      document.body.appendChild(ui);
      this.ui = ui;
      this.toolbar = ui.querySelector('.editor-toolbar');
      this.properties = ui.querySelector('.editor-properties');
      this.imageProperties = ui.querySelector('[data-editor-image-properties]');
      this.imageInput = ui.querySelector('[data-editor-image-input]');
      this.stateInput = ui.querySelector('[data-editor-state-input]');
      this.status = ui.querySelector('.editor-status');

      const style = document.createElement('style');
      style.dataset.editorRuntime = 'true';
      style.textContent = `
        .editor-hotzone { position: fixed; inset: 0 auto auto 0; width: 82px; height: 82px; z-index: 10001; }
        .editor-toolbar { position: fixed; top: 16px; left: 16px; right: 16px; z-index: 10002; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; width: max-content; max-width: calc(100vw - 32px); padding: 8px; border: 1px solid rgb(255 255 255 / .18); border-radius: 12px; background: rgb(15 15 17 / .9); box-shadow: 0 10px 32px rgb(0 0 0 / .28); opacity: 0; pointer-events: none; transform: translateY(-6px); transition: opacity .18s ease, transform .18s ease; backdrop-filter: blur(14px); }
        .editor-toolbar.show, .editor-toolbar.active { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .editor-group { display: inline-flex; gap: 5px; padding-left: 7px; border-left: 1px solid rgb(255 255 255 / .16); }
        .editor-toolbar button, .editor-properties button, .editor-properties select { appearance: none; border: 0; border-radius: 8px; padding: 8px 10px; color: #fff; background: rgb(255 255 255 / .12); cursor: pointer; font: 600 13px/1 ui-sans-serif, system-ui, sans-serif; }
        .editor-toolbar button:hover, .editor-properties button:hover, .editor-properties select:hover { background: rgb(255 255 255 / .2); }
        .editor-toolbar button:disabled { opacity: .38; cursor: default; }
        .editor-status { min-width: 7em; color: rgb(255 255 255 / .68); font: 500 12px/1.2 ui-sans-serif, system-ui, sans-serif; }
        .editor-properties { position: fixed; top: 70px; left: 16px; z-index: 10002; display: grid; gap: 8px; min-width: 300px; max-width: min(560px, calc(100vw - 32px)); padding: 10px; border: 1px solid rgb(255 255 255 / .18); border-radius: 12px; color: #fff; background: rgb(15 15 17 / .92); box-shadow: 0 10px 32px rgb(0 0 0 / .28); font: 600 13px/1.2 ui-sans-serif, system-ui, sans-serif; backdrop-filter: blur(14px); }
        .editor-properties[hidden] { display: none; }
        .editor-properties [data-editor-image-properties] { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .editor-properties [data-editor-image-properties][hidden] { display: none; }
        .editor-properties label { display: inline-flex; align-items: center; gap: 5px; color: rgb(255 255 255 / .72); }
        html.html-ppt-editing [data-editable="text"] { outline: 2px dashed rgb(50 130 255 / .72); outline-offset: 3px; cursor: text; }
        html.html-ppt-editing [data-editable="image"] { outline: 2px dashed rgb(255 120 40 / .82); outline-offset: 3px; cursor: pointer; }
        html.html-ppt-editing [data-editable]:focus, html.html-ppt-editing .html-ppt-selected { outline-style: solid; box-shadow: 0 0 0 5px rgb(255 255 255 / .16); }
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
      this.toolbar.addEventListener('click', (event) => this.onAction(event));
      this.properties.addEventListener('click', (event) => this.onAction(event));
      this.properties.addEventListener('change', (event) => this.onPropertyChange(event));

      document.addEventListener('keydown', (event) => this.onKeydown(event));
      document.addEventListener('htmlppt:slidechange', () => {
        if (this.selected && !this.selected.closest('.slide')?.classList.contains('active')) this.select(null);
      });

      this.stage.addEventListener('focusin', (event) => {
        if (!this.isActive) return;
        const editable = event.target.closest?.('[data-editable][data-element-id]');
        if (editable && this.stage.contains(editable)) this.select(editable);
      });
      this.stage.addEventListener('input', (event) => {
        if (!event.target.matches('[data-editable="text"]')) return;
        this.select(event.target);
        this.queueCommit('Text saved');
      });
      this.stage.addEventListener('click', (event) => {
        if (!this.isActive) return;
        const editable = event.target.closest?.('[data-editable][data-element-id]');
        if (!editable || !this.stage.contains(editable)) {
          this.select(null);
          return;
        }
        this.select(editable);
        if (editable.dataset.editable === 'image') {
          event.preventDefault();
          event.stopPropagation();
        }
      });
      this.stage.addEventListener('dblclick', (event) => {
        const image = event.target.closest?.('[data-editable="image"][data-element-id]');
        if (!this.isActive || !image) return;
        event.preventDefault();
        this.select(image);
        this.imageInput.click();
      });

      this.imageInput.addEventListener('change', () => this.replaceImage());
      this.stateInput.addEventListener('change', () => this.importState());
    }

    onAction(event) {
      const action = event.target.closest('[data-editor-action]')?.dataset.editorAction;
      if (!action) return;
      if (action === 'toggle') this.toggle();
      if (action === 'undo') this.undo();
      if (action === 'redo') this.redo();
      if (action === 'reset-element') this.resetSelected();
      if (action === 'reset-slide') this.resetSlide();
      if (action === 'export-state') this.exportState();
      if (action === 'import-state') this.stateInput.click();
      if (action === 'replace-image' && this.selected?.dataset.editable === 'image') this.imageInput.click();
      if (action === 'edit-alt') this.editAlt();
      if (action === 'download') this.download();
      if (action === 'reset') this.resetAll();
    }

    onPropertyChange(event) {
      if (!this.selected || this.selected.dataset.editable !== 'image') return;
      const property = event.target.dataset.editorProperty;
      if (property === 'fit') this.setImageFit(event.target.value);
      if (property === 'focus') this.setImageFocus(event.target.value);
    }

    onKeydown(event) {
      const typing = event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName);
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (command && key === 's') {
        event.preventDefault();
        this.download();
        return;
      }
      if (this.isActive && command && key === 'z') {
        event.preventDefault();
        event.shiftKey ? this.redo() : this.undo();
        return;
      }
      if (this.isActive && event.ctrlKey && key === 'y') {
        event.preventDefault();
        this.redo();
        return;
      }
      if (!typing && key === 'e') {
        event.preventDefault();
        this.toggle();
      } else if (event.key === 'Escape') {
        if (typing) event.target.blur();
        else if (this.isActive) this.toggle(false);
      }
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
        this.select(null);
        this.commit();
      }
      this.updateUi();
    }

    select(element) {
      this.selected?.classList.remove('html-ppt-selected');
      this.selected = element || null;
      this.selected?.classList.add('html-ppt-selected');
      this.updateUi();
    }

    queueCommit(message) {
      clearTimeout(this.saveTimer);
      this.saveTimer = window.setTimeout(() => this.commit(message), 250);
    }

    commit(message = '') {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      const elements = this.snapshotElements();
      const serialized = JSON.stringify(elements);
      const current = this.history[this.historyIndex];
      if (serialized !== JSON.stringify(current)) {
        this.history.splice(this.historyIndex + 1);
        this.history.push(elements);
        if (this.history.length > HISTORY_LIMIT) this.history.shift();
        this.historyIndex = this.history.length - 1;
      }
      this.save(elements);
      this.updateUi();
      if (message) this.setStatus(message);
      return elements;
    }

    undo() {
      this.commit();
      if (this.historyIndex <= 0) return;
      this.applyHistory(this.historyIndex - 1, 'Undone');
    }

    redo() {
      this.commit();
      if (this.historyIndex >= this.history.length - 1) return;
      this.applyHistory(this.historyIndex + 1, 'Redone');
    }

    applyHistory(index, message) {
      this.historyIndex = index;
      this.applyElements(this.history[index]);
      this.save(this.history[index]);
      this.updateUi();
      this.setStatus(message);
    }

    save(elements = this.snapshotElements()) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.envelope(elements)));
      } catch (error) {
        console.warn('[HTML PPT] Could not save edits to localStorage.', error);
        this.setStatus('Save failed');
      }
    }

    restore() {
      let raw;
      try {
        raw = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      } catch {
        raw = null;
      }
      if (!raw) return;
      const legacy = !raw.version && raw && typeof raw === 'object';
      const elements = this.normalizeElements(legacy ? raw : raw.elements, { imported: false });
      this.applyElements({ ...this.snapshotElements(), ...elements });
      if (legacy) this.save();
    }

    normalizeElements(value, { imported = false } = {}) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      const normalized = {};
      for (const [id, edit] of Object.entries(value)) {
        const element = this.stage.querySelector(`[data-element-id="${CSS.escape(id)}"]`);
        if (!element || !edit || typeof edit !== 'object') continue;
        if (edit.type === 'text' && element.dataset.editable === 'text' && typeof edit.html === 'string') {
          normalized[id] = { type: 'text', html: imported ? this.sanitizeHtml(edit.html) : edit.html };
        }
        if (edit.type === 'image' && element.dataset.editable === 'image' && typeof edit.src === 'string' && this.safeImageSource(edit.src)) {
          const current = this.captureElement(element);
          const fit = typeof edit.fit === 'string' && ['cover', 'contain', ''].includes(edit.fit) ? edit.fit : current.fit;
          const focus = typeof edit.focus === 'string' && edit.focus.length <= 64 && !/[;{}]/.test(edit.focus) ? edit.focus : current.focus;
          normalized[id] = {
            type: 'image',
            src: edit.src,
            alt: typeof edit.alt === 'string' ? edit.alt.slice(0, 2000) : current.alt,
            fit,
            focus,
          };
        }
      }
      return normalized;
    }

    sanitizeHtml(html) {
      const template = document.createElement('template');
      template.innerHTML = html;
      template.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((element) => element.remove());
      template.content.querySelectorAll('*').forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
          if (/^on/i.test(attribute.name) || attribute.name === 'srcdoc') element.removeAttribute(attribute.name);
          if (/^(?:href|src)$/i.test(attribute.name) && /^\s*javascript:/i.test(attribute.value)) element.removeAttribute(attribute.name);
        });
      });
      return template.innerHTML;
    }

    safeImageSource(source) {
      return !/^\s*(?:javascript|vbscript):/i.test(source) && !/^\s*data:(?!image\/)/i.test(source);
    }

    applyElements(elements) {
      this.applying = true;
      this.editableElements().forEach((element) => {
        const edit = elements[element.dataset.elementId];
        if (!edit) return;
        if (edit.type === 'text' && element.dataset.editable === 'text') element.innerHTML = edit.html;
        if (edit.type === 'image' && element.dataset.editable === 'image') {
          element.setAttribute('src', edit.src || '');
          element.setAttribute('alt', edit.alt || '');
          if (edit.fit) {
            element.dataset.fit = edit.fit;
            element.style.objectFit = edit.fit;
          } else {
            delete element.dataset.fit;
            element.style.removeProperty('object-fit');
          }
          if (edit.focus) {
            element.dataset.focus = edit.focus;
            element.style.objectPosition = edit.focus;
          } else {
            delete element.dataset.focus;
            element.style.removeProperty('object-position');
          }
        }
      });
      this.applying = false;
      this.updateUi();
    }

    replaceImage() {
      const file = this.imageInput.files?.[0];
      const image = this.selected?.dataset.editable === 'image' ? this.selected : null;
      if (!file || !image) {
        this.imageInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        image.setAttribute('src', String(reader.result));
        this.imageInput.value = '';
        this.commit('Image replaced');
      }, { once: true });
      reader.readAsDataURL(file);
    }

    setImageFit(value) {
      if (!this.selected || this.selected.dataset.editable !== 'image') return;
      if (value) {
        this.selected.dataset.fit = value;
        this.selected.style.objectFit = value;
      } else {
        delete this.selected.dataset.fit;
        this.selected.style.removeProperty('object-fit');
      }
      this.commit('Image fit updated');
    }

    setImageFocus(value) {
      if (!this.selected || this.selected.dataset.editable !== 'image') return;
      if (value) {
        this.selected.dataset.focus = value;
        this.selected.style.objectPosition = value;
      } else {
        delete this.selected.dataset.focus;
        this.selected.style.removeProperty('object-position');
      }
      this.commit('Image focus updated');
    }

    editAlt() {
      if (!this.selected || this.selected.dataset.editable !== 'image') return;
      const value = window.prompt('Alternative text for this image', this.selected.getAttribute('alt') || '');
      if (value === null) return;
      this.selected.setAttribute('alt', value.trim());
      this.commit('Alt text updated');
    }

    resetSelected() {
      const id = this.selected?.dataset.elementId;
      const original = id && this.originals.get(id);
      if (!id || !original) return;
      this.applyElements({ [id]: original });
      this.commit('Element reset');
    }

    resetSlide() {
      const slide = this.selected?.closest('.slide') || this.stage.querySelector('.slide.active');
      if (!slide) return;
      const originals = {};
      this.editableElements(slide).forEach((element) => {
        const original = this.originals.get(element.dataset.elementId);
        if (original) originals[element.dataset.elementId] = original;
      });
      this.applyElements(originals);
      this.commit('Slide reset');
    }

    resetAll() {
      if (!window.confirm('Reset all local edits for this deck?')) return;
      localStorage.removeItem(this.storageKey);
      window.location.reload();
    }

    exportState() {
      const state = this.envelope(this.commit());
      const blob = new Blob([`${JSON.stringify(state, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.safeFilename(document.title || this.deckId)}-edits.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.setStatus('Edit state exported');
    }

    async importState() {
      const file = this.stateInput.files?.[0];
      this.stateInput.value = '';
      if (!file) return;
      try {
        const raw = JSON.parse(await file.text());
        if (raw.version !== STATE_VERSION || !raw.elements || typeof raw.elements !== 'object') throw new Error(`Expected edit-state version ${STATE_VERSION}.`);
        if (raw.deckId && raw.deckId !== this.deckId) throw new Error(`Edit state belongs to a different deck: ${raw.deckId}`);
        const imported = this.normalizeElements(raw.elements, { imported: true });
        if (!Object.keys(imported).length) throw new Error('No compatible editable elements were found.');
        this.applyElements({ ...this.snapshotElements(), ...imported });
        this.commit('Edit state imported');
      } catch (error) {
        console.warn('[HTML PPT] Could not import edit state.', error);
        this.setStatus(error.message || 'Import failed');
      }
    }

    updateUi() {
      if (!this.ui) return;
      this.toolbar.querySelector('[data-editor-action="undo"]').disabled = this.historyIndex <= 0;
      this.toolbar.querySelector('[data-editor-action="redo"]').disabled = this.historyIndex >= this.history.length - 1;
      this.toolbar.querySelector('[data-editor-action="reset-element"]').disabled = !this.selected;
      this.properties.hidden = !this.isActive || !this.selected;
      if (!this.selected) return;
      const id = this.selected.dataset.elementId || 'element';
      this.properties.querySelector('[data-editor-selection]').textContent = `${this.selected.dataset.editable === 'image' ? 'Image' : 'Text'} · ${id}`;
      const image = this.selected.dataset.editable === 'image';
      this.imageProperties.hidden = !image;
      if (image) {
        const fit = this.selected.dataset.fit || this.selected.style.objectFit || '';
        const focus = this.selected.dataset.focus || this.selected.style.objectPosition || '';
        this.properties.querySelector('[data-editor-property="fit"]').value = ['cover', 'contain'].includes(fit) ? fit : '';
        const focusSelect = this.properties.querySelector('[data-editor-property="focus"]');
        if (![...focusSelect.options].some((option) => option.value === focus)) {
          const option = document.createElement('option');
          option.value = focus;
          option.textContent = focus || 'Theme default';
          focusSelect.append(option);
        }
        focusSelect.value = focus;
      }
    }

    setStatus(message) {
      if (!this.status) return;
      this.status.textContent = message;
      window.clearTimeout(this.statusTimer);
      this.statusTimer = window.setTimeout(() => {
        if (this.status.textContent === message) this.status.textContent = '';
      }, 1800);
    }

    safeFilename(value) {
      return String(value).trim().replace(/[^\p{L}\p{N}._-]+/gu, '-') || 'presentation';
    }

    download() {
      this.commit();
      const clone = document.documentElement.cloneNode(true);
      clone.classList.remove('html-ppt-editing');
      clone.querySelectorAll('[contenteditable]').forEach((element) => element.removeAttribute('contenteditable'));
      clone.querySelectorAll('[spellcheck]').forEach((element) => element.removeAttribute('spellcheck'));
      clone.querySelectorAll('.html-ppt-selected').forEach((element) => element.classList.remove('html-ppt-selected'));
      clone.querySelectorAll('.editor-ui, style[data-editor-runtime], [data-presenter-overview]').forEach((element) => element.remove());
      clone.querySelectorAll('.slide').forEach((slide, index) => {
        slide.classList.toggle('active', index === 0);
        slide.classList.toggle('visible', index === 0);
        slide.setAttribute('aria-hidden', String(index !== 0));
      });
      const html = '<!DOCTYPE html>\n' + clone.outerHTML;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.safeFilename(document.title)}-edited.html`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  window.HtmlPptEditor = HtmlPptEditor;
  window.addEventListener('DOMContentLoaded', () => {
    window.htmlPptEditor = new HtmlPptEditor(document);
  }, { once: true });
})();
