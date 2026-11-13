/* Inside the Machine v5.1 — student layer: progress tracking, sidebar state, search palette,
   study toolkit (glossary, RISC-V card, encoder/decoder, number lab, formulas, flashcards).
   Loaded after app.js. Everything here is additive: it only reads the DOM app.js built. */
(function (global) {
  'use strict';
  if (typeof document === 'undefined') return;
  const D = global.ITM_STUDENT_DATA, COURSE = global.ITM_COURSE_DATA, QZ = global.ITM_EXPERIMENTS_QUIZZES;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MODS = ['mod1', 'mod2', 'mod3', 'mod4', 'mod5', 'mod6'];
  const MOD_MIN = { mod1: 45, mod2: 60, mod3: 55, mod4: 40, mod5: 75, mod6: 50 };
  const SECTION_ORDER = ['sec-home', ...MODS.map(m => 'sec-' + m), 'sec-cpu-lab', 'sec-logic-lab', 'sec-hw-explorer', 'sec-experiments', 'sec-quizzes', 'sec-toolkit'];
  const SECTION_TITLES = {
    'sec-home': 'Home & learning path', 'sec-cpu-lab': 'CPU architecture lab', 'sec-logic-lab': 'Digital logic lab', 'sec-hw-explorer': '3D hardware explorer',
    'sec-experiments': 'Practical experiments', 'sec-quizzes': 'Quizzes', 'sec-toolkit': 'Study toolkit'
  };
  MODS.forEach(m => { SECTION_TITLES['sec-' + m] = COURSE.MODULES[m].title.replace(/^Introduction to /, ''); });

  // ───────────────── store (localStorage, never throws) ─────────────────
  const KEY = 'itm_v5_student';
  let S = { checks: {}, last: 'sec-home', cards: {}, seen: {} };
  try { const raw = global.localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function quizAnswered() {
    try { const p = JSON.parse(global.localStorage.getItem('itm_v4_progress') || '{}'); return new Set(p.answered || []); } catch (e) { return new Set(); }
  }
  function modStats(m) {
    const obj = COURSE.MODULES[m].objectives.length;
    const qs = (QZ ? QZ.QUIZ_QUESTIONS : []).filter(q => q.module === m);
    const ans = quizAnswered();
    const ticked = (S.checks[m] || []).filter(i => i < obj).length;
    const answered = qs.filter(q => ans.has(q.id)).length;
    const total = obj + qs.length;
    const done = ticked + answered;
    return { obj, ticked, qs: qs.length, answered, total, done, pct: total ? Math.round(100 * done / total) : 0 };
  }
  const stateOf = st => (st.pct >= 100 ? 'done' : st.pct > 0 ? 'part' : 'none');
  function overall() {
    const all = MODS.map(modStats);
    const tot = all.reduce((a, s) => a + s.total, 0), dn = all.reduce((a, s) => a + s.done, 0);
    return tot ? Math.round(100 * dn / tot) : 0;
  }
  function nextModule() {
    const first = MODS.find(m => modStats(m).pct < 100);
    return first || null;
  }
  const activeSection = () => (document.querySelector('.itm-section.active') || {}).id || 'sec-home';
  function go(sec) {
    const btn = document.querySelector(`.itm-nav-item[data-section="${sec}"]`);
    if (btn) btn.click();
  }

  // ───────────────── refresh: sidebar, header, dashboard, footers ─────────────────
  function setRing(el, pct) { if (el) el.setAttribute('stroke-dasharray', `${pct} 100`); }
  function refresh() {
    MODS.forEach(m => {
      const st = modStats(m);
      const btn = document.querySelector(`.itm-nav-item[data-section="sec-${m}"] .nav-state`);
      if (btn) { btn.className = 'nav-state ' + stateOf(st); btn.style.setProperty('--p', st.pct + '%'); btn.title = `${st.pct}% · ${st.done}/${st.total} items`; }
      document.querySelectorAll(`[data-meter="${m}"]`).forEach(el => { el.style.width = st.pct + '%'; });
      document.querySelectorAll(`[data-meter-txt="${m}"]`).forEach(el => { el.textContent = `${st.ticked}/${st.obj} objectives · ${st.answered}/${st.qs} quiz questions`; });
    });
    const qs = QZ ? QZ.QUIZ_QUESTIONS : [], ans = quizAnswered();
    const qn = $('quizNavState'); if (qn) { const n = qs.filter(q => ans.has(q.id)).length; qn.className = 'nav-state ' + (n === qs.length && n ? 'done' : n ? 'part' : 'none'); qn.style.setProperty('--p', (qs.length ? 100 * n / qs.length : 0) + '%'); qn.title = `${n}/${qs.length} answered`; }
    const pct = overall();
    setRing($('overallRing'), pct); const op = $('overallPct'); if (op) op.textContent = pct + '%';
    renderHome();
  }

  // ───────────────── home dashboard ─────────────────
  function renderHome() {
    const host = $('homePath'); if (!host) return;
    const pct = overall(), nxt = nextModule();
    const lastSec = S.last && S.last !== 'sec-home' ? S.last : null;
    const steps = MODS.map((m, i) => {
      const st = modStats(m), cls = st.pct >= 100 ? 'done' : st.pct > 0 ? 'part' : '';
      const isNext = m === nxt ? ' next' : '';
      const mod = COURSE.MODULES[m];
      return `<button type="button" class="path-step ${cls}${isNext}" data-go="sec-${m}">
        <span class="dot">${st.pct >= 100 ? '✓' : i + 1}</span>
        <span class="t"><b>${esc(SECTION_TITLES['sec-' + m])}</b><small>~${MOD_MIN[m]} min · ${esc(mod.subtitle.split(',').slice(0, 3).join(' ·').replace(/ ·$/, ''))}</small></span>
        <span class="bar"><i style="width:${st.pct}%"></i></span><span class="go">${st.pct ? 'Continue' : 'Start'} →</span></button>`;
    }).join('');
    host.innerHTML = `
      <div class="eyebrow" style="margin-bottom:8px">YOUR LEARNING PATH</div>
      <div class="path-wrap">
        <div class="card path-hero">
          <div class="path-big"><svg viewBox="0 0 36 36" class="ring" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15.5"/><circle class="ring-fg" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="${pct} 100"/></svg>
            <div><b>${pct}%</b><span>of the course complete</span></div></div>
          <div><h3>${nxt ? (pct ? 'Pick up where you left off' : 'Start here') : 'You finished the course 🎉'}</h3>
          <p>${nxt ? `Next up: <b>${esc(SECTION_TITLES['sec-' + nxt])}</b>. Read the lesson, play with its interactive lab, tick the objectives you can explain, then answer its quiz questions.` : 'Every module is complete. Revise with the flashcards, or run a program in the CPU Lab.'}</p></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${nxt ? `<button type="button" class="itm-btn primary" data-go="sec-${nxt}">${pct ? 'Continue' : 'Start'} Module ${nxt.slice(3)} →</button>` : `<button type="button" class="itm-btn primary" data-go="sec-toolkit" data-tk="flash">Revise with flashcards →</button>`}
            ${lastSec && lastSec !== 'sec-' + nxt ? `<button type="button" class="itm-btn" data-go="${lastSec}">Resume: ${esc(SECTION_TITLES[lastSec] || '')}</button>` : ''}
          </div>
        </div>
        <div class="card path-steps">${steps}</div>
      </div>
      <div class="quick-grid">
        <button type="button" class="quick" data-go="sec-toolkit" data-tk="riscv"><span class="ico">📇</span><b>RISC-V reference card</b><small>All 37 RV32I instructions, formats and encodings. Printable.</small></button>
        <button type="button" class="quick" data-go="sec-toolkit" data-tk="codec"><span class="ico">🧮</span><b>Encode &amp; decode</b><small>Type assembly, see the 32-bit word with colour-coded fields.</small></button>
        <button type="button" class="quick" data-go="sec-toolkit" data-tk="flash"><span class="ico">🧠</span><b>Flashcards</b><small>${D.GLOSSARY.length} terms with spaced repetition. Saved locally.</small></button>
        <button type="button" class="quick" data-go="sec-cpu-lab"><span class="ico">⚡</span><b>Run a program</b><small>Step through ADD x3,x1,x2 on the live 3D datapath.</small></button>
      </div>`;
  }

  // ───────────────── module chrome: sticky bar + checklist footer ─────────────────
  function decorateModules() {
    MODS.forEach((m, i) => {
      const sec = $('sec-' + m), host = $(m + 'Content');
      if (!sec || !host || sec.dataset.decorated) return;
      sec.dataset.decorated = '1';
      const mod = COURSE.MODULES[m];
      const prev = i > 0 ? 'sec-' + MODS[i - 1] : 'sec-home', next = i < 5 ? 'sec-' + MODS[i + 1] : 'sec-cpu-lab';
      const bar = document.createElement('div'); bar.className = 'sticky-bar';
      bar.innerHTML = `<b>Module ${i + 1}</b><span>${esc(SECTION_TITLES['sec-' + m])}</span><span class="meter"><i data-meter="${m}"></i></span><span class="sp"></span><span>~${MOD_MIN[m]} min</span>`;
      sec.insertBefore(bar, sec.firstChild);
      const foot = document.createElement('div'); foot.className = 'mod-foot';
      foot.innerHTML = `
        <div class="card"><div class="eyebrow">CHECK YOUR UNDERSTANDING</div>
          <h3 class="card-title">Tick each objective you could explain to a friend</h3>
          <ul class="check-list">${mod.objectives.map((o, k) => `<li><label><input type="checkbox" data-mod="${m}" data-i="${k}" ${(S.checks[m] || []).includes(k) ? 'checked' : ''}><span>${esc(o)}</span></label></li>`).join('')}</ul>
          <div class="meter"><i data-meter="${m}"></i></div>
          <small style="color:var(--text-muted);font-size:12px;display:block;margin-top:6px" data-meter-txt="${m}"></small></div>
        <div class="card next-card"><div><div class="eyebrow">WHAT NEXT</div>
          <h3 class="card-title">Lock it in</h3>
          <p class="card-body" style="margin:6px 0 0">Answer this module's quiz questions, then look the key terms up in the glossary or flip the flashcards.</p></div>
          <div class="nav-pair">
            <button type="button" class="itm-btn" data-go="sec-quizzes">Module quiz →</button>
            <button type="button" class="itm-btn" data-go="sec-toolkit" data-tk="flash" data-fmod="${m}">Flashcards</button>
          </div>
          <div class="nav-pair">
            <button type="button" class="itm-btn" data-go="${prev}">← ${i > 0 ? 'Module ' + i : 'Home'}</button>
            <button type="button" class="itm-btn primary" data-go="${next}">${i < 5 ? 'Module ' + (i + 2) + ' →' : 'CPU Lab →'}</button>
          </div></div>`;
      host.appendChild(foot);
    });
    document.addEventListener('change', e => {
      const t = e.target; if (!t.matches || !t.matches('input[data-mod]')) return;
      const m = t.dataset.mod, i = Number(t.dataset.i), set = new Set(S.checks[m] || []);
      if (t.checked) set.add(i); else set.delete(i);
      S.checks[m] = Array.from(set).sort((a, b) => a - b); save(); refresh();
      if (modStats(m).pct >= 100) toast(`Module ${m.slice(3)} complete 🎉`);
    });
  }
  function toast(msg) { const t = $('itmToast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }

  // generic delegated navigation for any [data-go] we render
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-go]'); if (!b) return;
    const sec = b.dataset.go; go(sec);
    if (b.dataset.tk) openTab(b.dataset.tk, b.dataset.fmod);
    closeDrawer();
  });

  // ───────────────── section change observer ─────────────────
  function onSectionChange() {
    const id = activeSection();
    S.last = id; save();
    document.body.classList.remove('side-open'); const mb = $('btnMenu'); if (mb) mb.setAttribute('aria-expanded', 'false');
    const main = document.querySelector('.itm-main'); if (main) main.scrollTo({ top: 0, behavior: 'auto' });
    try { if (global.location.hash.slice(1) !== id) global.history.replaceState(null, '', '#' + id); } catch (e) {}
    const act = document.querySelector('.itm-nav-item.active'); if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
    document.title = (id === 'sec-home' ? 'Inside the Machine — a 3D computer you can take apart' : (SECTION_TITLES[id] || '') + ' · Inside the Machine');
    refresh();
  }

  // ───────────────── drawer / sidebar ─────────────────
  function closeDrawer() { document.body.classList.remove('side-open'); const mb = $('btnMenu'); if (mb) mb.setAttribute('aria-expanded', 'false'); }
  function toggleSide() {
    if (global.matchMedia('(max-width: 900px)').matches) {
      const open = document.body.classList.toggle('side-open'); $('btnMenu').setAttribute('aria-expanded', String(open));
    } else {
      document.body.classList.toggle('side-collapsed');
      try { global.localStorage.setItem('itm_side', document.body.classList.contains('side-collapsed') ? '0' : '1'); } catch (e) {}
      setTimeout(() => global.dispatchEvent(new Event('resize')), 280);
    }
  }

  // ───────────────── search palette ─────────────────
  let palIndex = null;
  function buildIndex() {
    const idx = [];
    SECTION_ORDER.forEach(s => idx.push({ k: 'Go to', t: SECTION_TITLES[s], s: '', go: s, hay: SECTION_TITLES[s] }));
    MODS.forEach(m => COURSE.MODULES[m].topics.forEach(t => idx.push({ k: 'M' + m.slice(3), t: t.replace(/^\d+\.\s*/, ''), s: 'Module ' + m.slice(3) + ' · ' + SECTION_TITLES['sec-' + m], go: 'sec-' + m, hay: t })));
    D.GLOSSARY.forEach(g => idx.push({ k: 'Term', t: g.term, s: g.def, go: 'sec-toolkit', tk: 'glossary', q: g.term, hay: g.term + ' ' + g.def }));
    D.INSTRUCTIONS.forEach(i => idx.push({ k: 'Instr', t: i.mnemonic + ' — ' + i.syntax, s: i.meaning, go: 'sec-toolkit', tk: 'riscv', q: i.mnemonic, hay: i.mnemonic + ' ' + i.syntax + ' ' + i.meaning + ' ' + i.fmt + '-type' }));
    D.FORMULAS.forEach(f => idx.push({ k: 'Formula', t: f.name, s: f.expr, go: 'sec-toolkit', tk: 'formulas', hay: f.name + ' ' + f.expr }));
    [['Open flashcards', 'flash'], ['Encode / decode an instruction', 'codec'], ['Number base converter', 'numbers']].forEach(([t, tk]) => idx.push({ k: 'Tool', t, s: 'Study toolkit', go: 'sec-toolkit', tk, hay: t }));
    return idx;
  }
  function score(item, terms) {
    const t = item.t.toLowerCase(), h = item.hay.toLowerCase(); let sc = 0;
    for (const w of terms) {
      if (t === w) sc += 12; else if (t.startsWith(w)) sc += 8; else if (t.includes(w)) sc += 5; else if (h.includes(w)) sc += 2; else return 0;
    }
    return sc + (item.k === 'Go to' ? 1 : 0);
  }
  let palSel = 0, palRes = [];
  function palRender() {
    const q = $('palInput').value.trim().toLowerCase(), terms = q.split(/\s+/).filter(Boolean);
    palRes = (terms.length ? palIndex.map(i => [score(i, terms), i]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).map(x => x[1]) : palIndex.filter(i => i.k === 'Go to' || i.k === 'Tool')).slice(0, 40);
    palSel = Math.min(palSel, Math.max(0, palRes.length - 1));
    $('palList').innerHTML = palRes.length ? palRes.map((r, i) => `<button type="button" class="pal-item${i === palSel ? ' sel' : ''}" data-i="${i}"><span class="k">${esc(r.k)}</span><span class="tt">${esc(r.t)}${r.s ? `<small>${esc(r.s)}</small>` : ''}</span></button>`).join('') : '<div class="pal-empty">No matches. Try a term like “carry”, “BEQ” or “pipeline”.</div>';
    const sel = $('palList').querySelector('.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function palPick(i) {
    const r = palRes[i]; if (!r) return; closePal(); go(r.go);
    if (r.tk) { openTab(r.tk); if (r.q) { const inp = document.querySelector(`#tk-${r.tk} input[type=search]`); if (inp) { inp.value = r.q; inp.dispatchEvent(new Event('input')); } } }
  }
  function openPal() { if (!palIndex) palIndex = buildIndex(); $('palBack').classList.add('open'); $('palInput').value = ''; palSel = 0; palRender(); setTimeout(() => $('palInput').focus(), 30); }
  function closePal() { $('palBack').classList.remove('open'); $('scBack').classList.remove('open'); }
  function buildPalette() {
    const pal = document.createElement('div');
    pal.innerHTML = `
      <div class="pal-back" id="palBack" role="dialog" aria-modal="true" aria-label="Search"><div class="pal">
        <input id="palInput" type="text" placeholder="Search lessons, terms, instructions, formulas…" autocomplete="off" aria-label="Search">
        <div class="pal-list" id="palList"></div>
        <div class="pal-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div></div>
      <div class="pal-back" id="scBack" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"><div class="pal">
        <div class="sc-title">Keyboard shortcuts</div>
        <div class="sc-grid"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd></span><span>Search everything</span>
          <span><kbd>[</kbd> / <kbd>]</kbd></span><span>Previous / next section</span>
          <span><kbd>\\</kbd></span><span>Show or hide the sidebar</span>
          <span><kbd>?</kbd></span><span>This help</span><span><kbd>Esc</kbd></span><span>Close dialogs</span>
          <span>Flashcards: <kbd>Space</kbd> <kbd>←</kbd> <kbd>→</kbd></span><span>Flip · need review · got it</span></div></div></div>`;
    document.body.appendChild(pal);
    $('palBack').addEventListener('mousedown', e => { if (e.target.id === 'palBack') closePal(); });
    $('scBack').addEventListener('mousedown', e => { if (e.target.id === 'scBack') closePal(); });
    $('palInput').addEventListener('input', () => { palSel = 0; palRender(); });
    $('palList').addEventListener('click', e => { const b = e.target.closest('.pal-item'); if (b) palPick(Number(b.dataset.i)); });
    $('palInput').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { palSel = Math.min(palRes.length - 1, palSel + 1); palRender(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); palRender(); e.preventDefault(); }
      else if (e.key === 'Enter') { palPick(palSel); e.preventDefault(); }
    });
  }

  function onKey(e) {
    const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPal(); return; }
    if (e.key === 'Escape') { closePal(); closeDrawer(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); openPal(); }
    else if (e.key === '?') { $('scBack').classList.add('open'); }
    else if (e.key === '\\') toggleSide();
    else if (e.key === '[' || e.key === ']') { const i = SECTION_ORDER.indexOf(activeSection()), j = Math.max(0, Math.min(SECTION_ORDER.length - 1, i + (e.key === ']' ? 1 : -1))); if (j !== i) go(SECTION_ORDER[j]); }
    else if (activeSection() === 'sec-toolkit' && document.querySelector('#tk-flash.active')) {
      if (e.key === ' ') { e.preventDefault(); flashFlip(); } else if (e.key === 'ArrowRight') flashRate(true); else if (e.key === 'ArrowLeft') flashRate(false);
    }
  }

  // ───────────────── toolkit: tabs ─────────────────
  const built = {};
  function openTab(name, modFilter) {
    document.querySelectorAll('.tk-tab').forEach(t => { t.classList.toggle('active', t.dataset.tk === name); t.setAttribute('aria-selected', String(t.dataset.tk === name)); });
    document.querySelectorAll('.tk-pane').forEach(p => p.classList.toggle('active', p.id === 'tk-' + name));
    if (!built[name]) { built[name] = true; ({ glossary: buildGlossary, riscv: buildRiscv, codec: buildCodec, numbers: buildNumbers, formulas: buildFormulas, flash: buildFlash })[name](); }
    if (name === 'flash' && modFilter) { flashMod = modFilter; buildFlash(); }
  }

  // ----- glossary
  function buildGlossary() {
    const pane = $('tk-glossary'); let mod = 'all';
    pane.innerHTML = `<div class="tk-bar"><input class="input-field" type="search" placeholder="Search ${D.GLOSSARY.length} terms…" aria-label="Search glossary">
      <button type="button" class="chip on" data-m="all">All</button>${MODS.map(m => `<button type="button" class="chip" data-m="${m}">Module ${m.slice(3)}</button>`).join('')}</div><div class="gl-grid" id="glGrid"></div>`;
    const inp = pane.querySelector('input'), grid = $('glGrid');
    function draw() {
      const q = inp.value.trim().toLowerCase();
      const items = D.GLOSSARY.filter(g => (mod === 'all' || g.module === mod) && (!q || (g.term + ' ' + g.def).toLowerCase().includes(q)));
      grid.innerHTML = items.length ? items.map(g => `<div class="gl-item"><h4>${esc(g.term)}<small data-go="sec-${g.module}" title="Open Module ${g.module.slice(3)}">M${g.module.slice(3)}</small></h4><p>${esc(g.def)}</p></div>`).join('') : '<div class="pal-empty">No terms match.</div>';
    }
    inp.addEventListener('input', draw);
    pane.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { mod = c.dataset.m; pane.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); draw(); }));
    draw();
  }

  // ----- RISC-V card
  function buildRiscv() {
    const pane = $('tk-riscv'); let fmt = 'all', labOnly = false;
    const layouts = Object.entries(D.FORMAT_LAYOUT).map(([f, fields]) => `<div style="margin-bottom:6px"><span class="fmt fmt-${f}">${f}</span>
      <div class="field-row">${fields.map(([n, w], i) => `<div class="f f-${i % 6}" style="flex:${w}"><span>${w}</span><small>${esc(n)}</small></div>`).join('')}</div></div>`).join('');
    pane.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="eyebrow">RV32I INSTRUCTION FORMATS · bit 31 on the left, bit 0 on the right</div><div style="margin-top:10px">${layouts}</div></div>
      <div class="tk-bar"><input class="input-field" type="search" placeholder="Filter: add, load, branch, shift…" aria-label="Filter instructions">
        ${['all', ...Object.keys(D.FORMAT_LAYOUT)].map(f => `<button type="button" class="chip${f === 'all' ? ' on' : ''}" data-f="${f}">${f === 'all' ? 'All' : f + '-type'}</button>`).join('')}
        <button type="button" class="chip" id="rvLab" title="Only the instructions the in-app assembler and 3D CPU Lab run">Runs in CPU Lab</button>
        <span style="flex:1"></span><button type="button" class="itm-btn" id="rvPrint">🖨 Print card</button></div>
      <div class="rv-table-wrap"><table class="rv-table"><thead><tr><th>Instr</th><th>Fmt</th><th>opcode</th><th>funct3</th><th>funct7</th><th>Syntax</th><th>Meaning</th><th></th></tr></thead><tbody id="rvBody"></tbody></table></div>
      <p style="font-size:12.5px;color:var(--text-muted);margin-top:10px">Registers: x0 = zero (always 0), x1 = ra, x2 = sp, x5–x7 = t0–t2, x10–x17 = a0–a7, x8–x9 = s0–s1. Branch and JAL offsets are in bytes and always even.</p>`;
    const inp = pane.querySelector('input'), body = $('rvBody');
    function draw() {
      const q = inp.value.trim().toLowerCase();
      body.innerHTML = D.INSTRUCTIONS.filter(i => (fmt === 'all' || i.fmt === fmt) && (!labOnly || i.lab) && (!q || (i.mnemonic + ' ' + i.syntax + ' ' + i.meaning + ' ' + i.fmt).toLowerCase().includes(q)))
        .map(i => `<tr><td class="mn">${i.mnemonic}</td><td><span class="fmt fmt-${i.fmt}">${i.fmt}</span></td><td class="bits">${i.opcode}</td><td class="bits">${i.funct3 || '—'}</td><td class="bits">${i.funct7 || '—'}</td><td class="sy">${esc(i.syntax)}</td><td>${esc(i.meaning)}</td><td>${i.lab ? '<span class="lab-tag">LAB</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="pal-empty">No instructions match.</td></tr>';
    }
    inp.addEventListener('input', draw);
    pane.querySelectorAll('.chip[data-f]').forEach(c => c.addEventListener('click', () => { fmt = c.dataset.f; pane.querySelectorAll('.chip[data-f]').forEach(x => x.classList.toggle('on', x === c)); draw(); }));
    $('rvLab').addEventListener('click', e => { labOnly = !labOnly; e.currentTarget.classList.toggle('on', labOnly); draw(); });
    $('rvPrint').addEventListener('click', () => printPane('riscv'));
    draw();
  }
  function printPane(name) { document.querySelectorAll('.tk-pane').forEach(p => p.classList.remove('printing')); $('tk-' + name).classList.add('printing'); global.print(); }

  // ----- encoder / decoder
  function fieldRow(d) {
    const layout = D.FORMAT_LAYOUT[d.fmt]; let pos = 0;
    return `<div class="field-row">${layout.map(([n, w], i) => { const b = d.bits.slice(pos, pos + w); pos += w; return `<div class="f f-${i % 6}" style="flex:${w}"><span>${b}</span><small>${esc(n)}</small></div>`; }).join('')}</div>`;
  }
  function buildCodec() {
    const pane = $('tk-codec');
    pane.innerHTML = `<div class="codec-grid">
      <div class="card"><div class="eyebrow">ASSEMBLY → MACHINE CODE</div><h3 class="card-title">Type RV32I assembly</h3>
        <textarea class="input-field" id="cdAsm" spellcheck="false">addi x1, x0, 10
addi x2, x0, 20
add  x3, x1, x2</textarea>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="itm-btn primary" id="cdSend">Run in CPU Lab →</button><span class="err" id="cdErr"></span></div>
        <div id="cdOut"></div></div>
      <div class="card"><div class="eyebrow">MACHINE CODE → ASSEMBLY</div><h3 class="card-title">Paste a 32-bit word</h3>
        <input class="input-field" id="cdHex" value="0x002081B3" spellcheck="false" style="font-size:15px;padding:11px 12px" aria-label="Instruction word in hex, decimal or binary">
        <div id="cdDec" style="margin-top:6px"></div></div></div>`;
    const asm = $('cdAsm');
    function encode() {
      $('cdErr').textContent = '';
      try {
        const r = global.ITM_RISCV.assembleProgram(asm.value);
        $('cdOut').innerHTML = r.instructions.map(i => { const d = D.decodeWord(i.word); return `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b class="sy" style="font:700 13px var(--font-mono)">${esc(i.asm)}</b><code style="font:700 13px var(--font-mono);color:#aef4ff">${i.hex} · ${i.format}</code></div>${d.fmt ? fieldRow(d) : ''}</div>`; }).join('') || '<p class="card-body">Nothing to assemble yet.</p>';
      } catch (err) { $('cdErr').textContent = err.message; $('cdOut').innerHTML = ''; }
    }
    function decode() {
      const n = D.parseNumber($('cdHex').value), out = $('cdDec');
      if (n === null) { out.innerHTML = '<span class="err">Enter a hex (0x…), binary (0b…) or decimal number up to 32 bits.</span>'; return; }
      const d = D.decodeWord(n);
      if (!d.fmt) { out.innerHTML = `<span class="err">Opcode ${d.opcode} is not an RV32I base opcode.</span>`; return; }
      const regs = d.fmt === 'R' ? `rd=x${d.rd}, rs1=x${d.rs1}, rs2=x${d.rs2}` : d.fmt === 'I' ? `rd=x${d.rd}, rs1=x${d.rs1}, imm=${d.imm}` : d.fmt === 'S' ? `rs1=x${d.rs1}, rs2=x${d.rs2}, imm=${d.imm}` : d.fmt === 'B' ? `rs1=x${d.rs1}, rs2=x${d.rs2}, offset=${d.imm}` : `rd=x${d.rd}, imm=${d.imm}`;
      out.innerHTML = `<div style="margin:6px 0 2px"><span class="fmt fmt-${d.fmt}">${d.fmt}</span> <b style="font:800 18px var(--font-mono);margin-left:6px">${d.mnemonic || 'unknown'}</b></div>${fieldRow(d)}<div class="mono-readout">${esc(regs)}\n${d.info ? esc(d.info.meaning) : 'No matching funct3/funct7 in RV32I base.'}</div>`;
    }
    asm.addEventListener('input', encode); $('cdHex').addEventListener('input', decode);
    $('cdSend').addEventListener('click', () => { const t = $('cpuCustomAsm'); if (!t) return; t.value = asm.value; go('sec-cpu-lab'); const b = $('cpuAssembleLoadBtn'); if (b) setTimeout(() => b.click(), 50); });
    encode(); decode();
  }

  // ----- number lab
  function buildNumbers() {
    const pane = $('tk-numbers'); let val = 0xF3 >>> 0;
    pane.innerHTML = `<div class="grid-2"><div class="card"><div class="eyebrow">32-BIT WORD</div><h3 class="card-title">Click bits to flip them</h3>
      <div id="nbGrid"></div>
      <div class="tk-bar" style="margin:10px 0 0"><button type="button" class="chip" data-op="neg">Negate (~x+1)</button><button type="button" class="chip" data-op="not">Invert</button><button type="button" class="chip" data-op="shl">&lt;&lt; 1</button><button type="button" class="chip" data-op="shr">&gt;&gt; 1</button><button type="button" class="chip" data-op="clr">Clear</button></div></div>
      <div class="card"><div class="eyebrow">TYPE A NUMBER</div><h3 class="card-title">Decimal, 0x hex or 0b binary</h3>
        <input class="input-field" id="nbIn" value="243" spellcheck="false" style="font-size:16px;padding:11px 12px" aria-label="Number">
        <div class="num-out" id="nbOut"></div>
        <p class="card-body" style="margin:12px 0 0">The pink bit is the sign bit. As a signed 32-bit number it decides whether the value is negative. Try 0xFFFFFFF3: it is 4 294 967 283 unsigned but −13 signed.</p></div></div>`;
    function draw(skipInput) {
      const bits = val.toString(2).padStart(32, '0');
      $('nbGrid').innerHTML = [0, 1, 2, 3].map(r => `<div class="bit-grid">${[...Array(8)].map((_, c) => { const i = r * 8 + c, p = 31 - i; return `<div class="bit${bits[i] === '1' ? ' on' : ''}${p === 31 ? ' sign' : ''}" data-p="${p}" role="button" tabindex="0" aria-label="bit ${p}"><small>${p}</small>${bits[i]}</div>`; }).join('')}</div>`).join('');
      const d = D.describeWord(val);
      $('nbOut').innerHTML = [['Unsigned', d.unsigned], ['Signed (two\'s complement)', d.signed], ['Hex', d.hex], ['Octal', d.octal], ['Binary', d.binary], ['As 4 ASCII bytes', d.ascii]].map(([k, v]) => `<div><small>${k}</small><code>${esc(v)}</code></div>`).join('');
      if (!skipInput) $('nbIn').value = String(d.unsigned);
    }
    $('nbGrid').addEventListener('click', e => { const b = e.target.closest('.bit'); if (!b) return; val = (val ^ (1 << Number(b.dataset.p))) >>> 0; draw(); });
    $('nbGrid').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('bit')) { e.preventDefault(); e.target.click(); } });
    $('nbIn').addEventListener('input', () => { const n = D.parseNumber($('nbIn').value); if (n !== null) { val = D.toU32(n); draw(true); } });
    pane.querySelectorAll('[data-op]').forEach(c => c.addEventListener('click', () => { const o = c.dataset.op; val = (o === 'neg' ? (~val + 1) : o === 'not' ? ~val : o === 'shl' ? val << 1 : o === 'shr' ? val >>> 1 : 0) >>> 0; draw(); }));
    draw();
  }

  // ----- formulas
  function buildFormulas() {
    $('tk-formulas').innerHTML = `<div class="tk-bar"><span style="flex:1;color:var(--text-muted);font-size:13px">The equations the exam questions keep coming back to.</span><button type="button" class="itm-btn" id="fmPrint">🖨 Print sheet</button></div>
      <div class="fm-list">${D.FORMULAS.map(f => `<div class="fm"><b>${esc(f.name)}</b><code>${esc(f.expr)}</code>${f.note ? `<small>${esc(f.note)}</small>` : ''}<small style="margin-top:6px"><a href="#sec-${f.module}" data-go="sec-${f.module}">Module ${f.module.slice(3)} →</a></small></div>`).join('')}</div>`;
    $('fmPrint').addEventListener('click', () => printPane('formulas'));
  }

  // ----- flashcards (Leitner boxes 1..4)
  let flashMod = 'all', flashCur = null, flashShown = false;
  const cardKey = g => g.term;
  const boxOf = g => S.cards[cardKey(g)] || 1;
  function flashPool() { return D.GLOSSARY.filter(g => flashMod === 'all' || g.module === flashMod); }
  function flashPick() {
    const pool = flashPool(); if (!pool.length) return null;
    const min = Math.min(...pool.map(boxOf));
    const cands = pool.filter(g => boxOf(g) === min && g !== flashCur);
    const arr = cands.length ? cands : pool;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function buildFlash() {
    const pane = $('tk-flash');
    pane.innerHTML = `<div class="flash-stage"><div class="tk-bar" style="justify-content:center"><button type="button" class="chip${flashMod === 'all' ? ' on' : ''}" data-m="all">All terms</button>${MODS.map(m => `<button type="button" class="chip${flashMod === m ? ' on' : ''}" data-m="${m}">M${m.slice(3)}</button>`).join('')}</div>
      <div class="flash-meta"><span id="flInfo"></span><button type="button" class="chip" id="flReset">Reset deck</button></div>
      <button type="button" class="flash-card" id="flCard" aria-live="polite"></button>
      <div class="flash-actions"><button type="button" class="itm-btn" id="flAgain">← Need review</button><button type="button" class="itm-btn primary" id="flGot">Got it →</button></div>
      <div class="boxes" id="flBoxes"></div></div>`;
    pane.querySelectorAll('.chip[data-m]').forEach(c => c.addEventListener('click', () => { flashMod = c.dataset.m; buildFlash(); }));
    $('flCard').addEventListener('click', flashFlip);
    $('flAgain').addEventListener('click', () => flashRate(false)); $('flGot').addEventListener('click', () => flashRate(true));
    $('flReset').addEventListener('click', () => { flashPool().forEach(g => delete S.cards[cardKey(g)]); save(); flashCur = null; buildFlash(); });
    flashCur = flashPick(); flashShown = false; flashDraw();
  }
  function flashDraw() {
    const c = $('flCard'); if (!c) return;
    if (!flashCur) { c.innerHTML = '<div class="q">No cards</div>'; return; }
    c.innerHTML = flashShown ? `<span class="hint">Definition</span><div class="q" style="font-size:20px">${esc(flashCur.term)}</div><div class="a">${esc(flashCur.def)}</div>` : `<span class="hint">Module ${flashCur.module.slice(3)} · tap to reveal</span><div class="q">${esc(flashCur.term)}</div><span class="hint">What does it mean?</span>`;
    const pool = flashPool(), counts = [1, 2, 3, 4].map(b => pool.filter(g => boxOf(g) === b).length);
    $('flBoxes').innerHTML = counts.map((n, i) => `<span>${['New / again', 'Learning', 'Good', 'Mastered'][i]}: <b>${n}</b></span>`).join('');
    $('flInfo').textContent = `${pool.length} cards · ${counts[3]} mastered`;
  }
  function flashFlip() { if (!flashCur) return; flashShown = !flashShown; flashDraw(); }
  function flashRate(ok) {
    if (!flashCur) return;
    S.cards[cardKey(flashCur)] = ok ? Math.min(4, boxOf(flashCur) + 1) : 1; save();
    flashCur = flashPick(); flashShown = false; flashDraw();
  }

  // ───────────────── boot ─────────────────
  function init() {
    try { if (global.localStorage.getItem('itm_side') === '0' && !global.matchMedia('(max-width: 900px)').matches) document.body.classList.add('side-collapsed'); } catch (e) {}
    buildPalette(); decorateModules();
    $('btnSearch').addEventListener('click', openPal);
    $('btnMenu').addEventListener('click', toggleSide);
    $('sideScrim').addEventListener('click', closeDrawer);
    $('btnShortcuts').addEventListener('click', () => $('scBack').classList.add('open'));
    $('btnResetStudy').addEventListener('click', () => {
      if (!global.confirm('Reset your checklist ticks, flashcard boxes and quiz answers saved in this browser?')) return;
      try { global.localStorage.removeItem(KEY); global.localStorage.removeItem('itm_v4_progress'); } catch (e) {}
      global.location.reload();
    });
    document.querySelectorAll('.tk-tab').forEach(t => t.addEventListener('click', () => openTab(t.dataset.tk)));
    openTab('glossary');
    document.addEventListener('keydown', onKey);
    const obs = new MutationObserver(() => onSectionChange());
    document.querySelectorAll('.itm-section').forEach(s => obs.observe(s, { attributes: true, attributeFilter: ['class'] }));
    const banner = $('quizScoreBanner'); if (banner) new MutationObserver(refresh).observe(banner, { childList: true, characterData: true, subtree: true });
    // returning students land where they stopped (unless a deep link was used)
    if (!global.location.hash && S.last && S.last !== 'sec-home' && $(S.last)) go(S.last);
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
