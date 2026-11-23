/* ClassKit — teacher app.
   Everything is kept in this browser (localStorage). Nothing leaves the device
   unless you press "Publish", and what is published is encrypted per student. */
(function () {
  'use strict';
  const { esc, fmt, computeGrades, randomCode, qrSvg, shuffle, seeded } = CK;
  const KEY = 'classkit.v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toISOString().slice(0, 10);

  // ───────────────────────── state ─────────────────────────
  const blank = () => ({
    v: 1,
    settings: {
      teacher: '', school: '', year: '2026/2027', subject: 'SVT',
      maxPart: 5, maxAbs: 5, maxCahier: 5, maxTravail: 5, absPenalty: 0.5, weightTests: 0.75, cahierChecks: 1, travailCount: 1, step: 0.5,
      portalUrl: '', gh: { owner: '', repo: '', branch: '', path: 'classkit/data/portal.json', token: '' },
      blurNames: false,
    },
    classes: [], grades: {}, log: {}, absences: {}, cardSessions: [], quizzes: [], quizResults: {},
    ui: { cls: null, tab: 'seating', seatMode: 'attendance', date: today() },
    nextCard: 1, published: null,
  });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = blank(); }
  S.settings = Object.assign(blank().settings, S.settings);
  S.ui.date = S.ui.date || today();
  // v2: one column each for cahier and travail à rédiger (the earlier default was two, averaged).
  S.classes.forEach(c => { if (!c.tests) c.tests = /2\s*BAC.*SVT/i.test(c.name) ? 3 : 2; });
  if (!S.settings.oneColumnEach) { S.settings.cahierChecks = 1; S.settings.travailCount = 1; S.settings.oneColumnEach = true; }
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save: storage full?'); }
    }, 150);
  }
  window.addEventListener('beforeunload', () => { clearTimeout(saveT); localStorage.setItem(KEY, JSON.stringify(S)); });

  const cls = () => S.classes.find(c => c.id === S.ui.cls) || S.classes[0];
  const stuById = id => { for (const c of S.classes) { const s = c.students.find(x => x.id === id); if (s) return s; } return null; };
  const name = s => `${s.first} ${s.last}`.trim();
  function gr(sid) {
    if (!S.grades[sid]) S.grades[sid] = { part: 0, absAdj: 0, cb1: 0, cb2: 0, tr1: 0, tr2: 0, note: '', t1: '', t2: '', t3: '' };
    return S.grades[sid];
  }
  function absentOn(c, date) { return ((S.absences[c.id] || {})[date]) || []; }
  function setAbsent(c, sid, on, date) {
    date = date || S.ui.date;
    const a = (S.absences[c.id] = S.absences[c.id] || {});
    const list = new Set(a[date] || []);
    on ? list.add(sid) : list.delete(sid);
    a[date] = Array.from(list);
    if (!a[date].length) delete a[date];
    save();
  }

  // Activités intégrées (SVT): participation, absence, organisation du cahier, travail à rédiger.
  const FIELDS = {
    part: { label: 'Participation', get max() { return S.settings.maxPart; } },
    absAdj: { label: 'Absence (ajustement)', get max() { return S.settings.maxAbs; }, get min() { return -S.settings.maxAbs; } },
    cb1: { label: 'Organisation du cahier', get max() { return S.settings.maxCahier; } },
    cb2: { label: 'Organisation du cahier (2e contrôle)', get max() { return S.settings.maxCahier; } },
    tr1: { label: 'Travail à rédiger 1', get max() { return S.settings.maxTravail; } },
    tr2: { label: 'Travail à rédiger 2', get max() { return S.settings.maxTravail; } },
    t1: { label: 'Contrôle 1', max: 20 }, t2: { label: 'Contrôle 2', max: 20 }, t3: { label: 'Contrôle 3', max: 20 },
  };
  /** Number of sessions a student was marked absent (from the seating plan / gradebook). */
  function absCount(sid) {
    const c = S.classes.find(k => k.students.some(x => x.id === sid));
    return c ? Object.values(S.absences[c.id] || {}).filter(l => l.includes(sid)).length : 0;
  }
  const classOf = sid => S.classes.find(k => k.students.some(x => x.id === sid));
  /** Contrôles per semester: 3 in 2BAC SVT, 2 elsewhere (changeable per class in Students & PINs). */
  const defaultTests = name => (/2\s*BAC.*SVT/i.test(name) ? 3 : 2);
  const nTestsOf = c => (c && c.tests) || 2;
  const grades = sid => computeGrades(gr(sid), Object.assign({}, S.settings, { nTests: nTestsOf(classOf(sid)) }), absCount(sid));
  function bump(sid, f, delta, why) {
    const g = gr(sid);
    const old = +g[f] || 0;
    const nv = Math.round(CK.clamp(old + delta, FIELDS[f].min || 0, FIELDS[f].max) * 100) / 100;
    if (nv === old) return false;
    g[f] = nv;
    (S.log[sid] = S.log[sid] || []).push({ t: Date.now(), f, d: Math.round((nv - old) * 100) / 100, v: nv, why: why || '' });
    save();
    return true;
  }
  function setScore(sid, f, val) {
    const g = gr(sid);
    const v = val === '' ? '' : CK.clamp(+val, 0, FIELDS[f].max);
    if (String(g[f]) === String(v)) return;
    g[f] = v;
    (S.log[sid] = S.log[sid] || []).push({ t: Date.now(), f, set: v, v });
    save();
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  function dialog(html, onMount) {
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="dialog">${html}</div>`;
    o.addEventListener('click', e => { if (e.target === o) close(); });
    function close() { o.remove(); render(); }
    document.body.appendChild(o);
    onMount && onMount(o.firstElementChild, close);
    return close;
  }

  // ───────────────────────── roster import ─────────────────────────
  function importRoster(data, replace) {
    if (replace) { S.classes = []; }
    for (const c of data.classes || []) {
      let k = S.classes.find(x => x.name === c.name);
      if (!k) { k = { id: uid(), name: c.name, official: c.official || '', rows: 6, cols: 8, tests: defaultTests(c.name), students: [] }; S.classes.push(k); }
      for (const s of c.students) {
        if (k.students.some(x => x.n === s.n && x.code === s.code)) continue;
        k.students.push({ id: uid(), n: s.n, code: s.code || '', first: s.first || '', last: s.last || '', g: s.g || '', pin: randomCode(6), card: S.nextCard++, seat: null });
      }
      k.students.sort((a, b) => a.n - b.n);
      const need = Math.ceil(k.students.length / k.cols);
      if (need > k.rows) k.rows = need;
    }
    if (data.school && !S.settings.school) S.settings.school = data.school;
    S.ui.cls = S.ui.cls || (S.classes[0] && S.classes[0].id);
    save(); render();
  }
  /** Paste from Excel / Massar: "n<TAB>code<TAB>last<TAB>first<TAB>gender" or "n last first". */
  function parsePaste(text) {
    const out = [];
    text.split(/\r?\n/).forEach(line => {
      const p = line.split(/\t|;|,/).map(x => x.trim()).filter(Boolean);
      if (!p.length || !/^\d+$/.test(p[0])) return;
      const n = +p[0];
      let code = '', rest = p.slice(1);
      if (rest[0] && /^[A-Z]\d{6,}$/i.test(rest[0])) code = rest.shift();
      const gtok = rest.findIndex(x => /^(ذكر|أنثى|انثى|M|F|Boy|Girl)$/i.test(x));
      let g = '';
      if (gtok >= 0) { g = /أنثى|انثى|F|Girl/i.test(rest[gtok]) ? 'F' : 'M'; rest.splice(gtok, 1); }
      out.push({ n, code, last: rest[0] || '', first: rest.slice(1).join(' '), g });
    });
    return out;
  }

  // ───────────────────────── chrome ─────────────────────────
  const TABS = [['seating', 'Seating'], ['grades', 'Gradebook'], ['cards', 'QR cards'], ['quiz', 'Phone quiz'], ['students', 'Students & PINs'], ['publish', 'Publish'], ['settings', 'Settings']];
  function chrome() {
    $('#classpick').innerHTML = S.classes.map(c => `<button data-c="${c.id}" class="${c === cls() ? 'on' : ''}">${esc(c.name)}</button>`).join('');
    $$('#classpick button').forEach(b => b.onclick = () => { S.ui.cls = b.dataset.c; save(); render(); });
    $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab ${S.ui.tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('');
    $$('#tabs .tab').forEach(b => b.onclick = () => { stopScan(); S.ui.tab = b.dataset.t; save(); render(); });
  }

  let lastView = '';
  function render() {
    chrome();
    const v = $('#view');
    v.classList.remove('enter');
    if (!S.classes.length && !['settings'].includes(S.ui.tab)) renderWelcome(v);
    else ({ seating: renderSeating, grades: renderGrades, cards: renderCards, quiz: renderQuiz, students: renderStudents, publish: renderPublish, settings: renderSettings }[S.ui.tab] || renderSeating)(v);
    // Entrance animation only when the screen really changes (tab, class or editor), not on every tap.
    const key = S.ui.tab + '|' + S.ui.cls + '|' + (editing ? editing.id : '');
    if (key !== lastView) {
      lastView = key;
      void v.offsetWidth;
      v.classList.add('enter');
      $$('.seats .seat', v).forEach((el, i) => el.style.setProperty('--i', i));
    }
  }
  /** Briefly flash a value green (+) or red (−), or pop it (no direction). */
  function flash(el, up) {
    if (!el) return;
    el.classList.remove('up', 'down', 'bump');
    void el.offsetWidth;
    el.classList.add(up == null ? 'bump' : up ? 'up' : 'down');
  }

  function renderWelcome(v) {
    v.innerHTML = `<div class="panel" style="max-width:720px;margin:30px auto">
      <h2>Welcome to ClassKit</h2>
      <p>Start by loading your classes. Your lists stay in this browser only.</p>
      <div class="row"><button class="btn pri" id="tryfile">Load my 5 classes (roster file)</button>
      <label class="btn">Choose roster / backup file…<input type="file" id="rf" accept=".json" hidden></label></div>
      <p class="small muted">The roster extracted from your PDF is <span class="mono">classkit/private/roster-2026-2027.json</span> (kept out of git so names are never published).</p>
      <h3>…or paste a list from Excel / Massar</h3>
      <div class="row"><input type="text" id="pcn" placeholder="Class name, e.g. TCS1"></div>
      <textarea id="paste" rows="6" placeholder="1	D151034228	لغمير	محمد	ذكر"></textarea>
      <div class="row" style="margin-top:8px"><button class="btn acc" id="pgo">Add class</button></div></div>`;
    $('#tryfile').onclick = async () => {
      try { const r = await fetch('private/roster-2026-2027.json', { cache: 'no-store' }); if (!r.ok) throw 0; importRoster(await r.json()); toast('Classes loaded'); }
      catch (e) { toast('Not found next to the app — use "Choose file…"'); }
    };
    $('#rf').onchange = e => readJsonFile(e.target.files[0], d => d.v && d.settings ? restore(d) : importRoster(d));
    $('#pgo').onclick = () => {
      const rows = parsePaste($('#paste').value);
      if (!rows.length || !$('#pcn').value.trim()) return toast('Class name and at least one line needed');
      importRoster({ classes: [{ name: $('#pcn').value.trim(), students: rows }] });
    };
  }
  function readJsonFile(f, cb) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { cb(JSON.parse(r.result)); } catch (e) { toast('Not a valid JSON file'); } };
    r.readAsText(f);
  }

  // ───────────────────────── seating ─────────────────────────
  let picked = null;
  function renderSeating(v) {
    const c = cls();
    const abs = new Set(absentOn(c, S.ui.date));
    const bySeat = {};
    c.students.forEach(s => { if (s.seat) bySeat[s.seat] = s; });
    const unseated = c.students.filter(s => !s.seat);
    const mode = S.ui.seatMode;
    let cells = '';
    // Row 1 is the back of the room; the front (board) is drawn under the grid.
    for (let r = 1; r <= c.rows; r++) for (let k = 1; k <= c.cols; k++) {
      const key = r + '-' + k, s = bySeat[key];
      if (!s) { cells += `<div class="seat empty ${picked === key ? 'pick' : ''}" data-seat="${key}">${mode === 'arrange' ? '+' : ''}</div>`; continue; }
      const isAbs = abs.has(s.id), g = gr(s.id);
      cells += `<div class="seat ${isAbs ? 'abs' : ''} ${picked === s.id ? 'pick' : ''}" data-sid="${s.id}" data-seat="${key}">
        ${mode === 'points' ? `<span class="pts">${fmt(grades(s.id).act, 1)}</span>` : ''}
        <div class="num">${s.n}</div><div class="nm ar">${esc(name(s))}</div>
        <div class="st">${isAbs ? 'Absent' : 'Present'} · ${s.g === 'F' ? 'Girl' : 'Boy'}</div></div>`;
    }
    const absNums = c.students.filter(s => abs.has(s.id)).map(s => s.n).sort((a, b) => a - b);
    v.innerHTML = `
      <div class="row noprint" style="margin-bottom:12px">
        <div class="seg" id="modes">${[['attendance', 'Attendance'], ['points', 'Points'], ['arrange', 'Arrange']].map(([k, l]) => `<button data-m="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <input type="date" id="date" value="${S.ui.date}">
        <span class="spacer"></span>
        <label class="row small"><input type="checkbox" id="blur" ${S.settings.blurNames ? 'checked' : ''}> blur names (projector)</label>
        <button class="btn sm" id="layout">Room ${c.rows}×${c.cols}</button>
        ${mode === 'arrange' ? `<button class="btn sm" id="auto">Seat in list order</button><button class="btn sm danger" id="clear">Clear seats</button>` : ''}
      </div>
      <p class="small muted noprint">${{
        attendance: 'Tap a seat to switch it between present and absent (red). An empty table = an absent student.',
        points: 'Tap a student to add or remove points (participation, cahier, travail à rédiger). Students see every change in their portal.',
        arrange: 'Tap a student, then tap an empty seat (move) or another student (swap). Tap a seated student then "Unseated" to remove.',
      }[mode]}</p>
      <div class="seats ${S.settings.blurNames ? 'blur' : ''}" style="grid-template-columns:repeat(${c.cols},minmax(0,1fr))">${cells}</div>
      <div class="front">FRONT OF CLASSROOM</div>
      <div class="panel">
        <div class="row"><strong>Unseated students</strong><span class="spacer"></span><span class="small muted">${unseated.length ? '' : 'All students are seated.'}</span></div>
        <div class="unseated" id="unseated" style="margin-top:8px;min-height:20px">${unseated.map(s => `<div class="seat ${picked === s.id ? 'pick' : ''} ${abs.has(s.id) ? 'abs' : ''}" data-sid="${s.id}"><div class="num">${s.n}</div><div class="nm ar">${esc(name(s))}</div></div>`).join('')}</div>
      </div>
      <div class="panel row">
        <strong>Absent student numbers</strong><span class="muted small">· ${new Date(S.ui.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <div class="chips">${absNums.map(n => `<span class="chip">${n}</span>`).join('') || '<span class="muted">none</span>'}</div>
        <span class="spacer"></span>
        <button class="btn sm" id="copyabs" ${absNums.length ? '' : 'disabled'}>Copy numbers</button>
        <span class="small muted">${c.students.length - absNums.length}/${c.students.length} present</span>
      </div>`;

    $$('#modes button').forEach(b => b.onclick = () => { S.ui.seatMode = b.dataset.m; picked = null; save(); render(); });
    $('#date').onchange = e => { S.ui.date = e.target.value || today(); save(); render(); };
    $('#blur').onchange = e => { S.settings.blurNames = e.target.checked; save(); render(); };
    $('#copyabs').onclick = () => { navigator.clipboard.writeText(absNums.join(' - ')).then(() => toast('Copied: ' + absNums.join(' - '))); };
    $('#layout').onclick = () => dialog(`<h3>Room layout</h3><div class="row"><label class="f">Rows<input type="number" id="lr" min="1" max="12" value="${c.rows}"></label><label class="f">Tables per row<input type="number" id="lc" min="1" max="12" value="${c.cols}"></label></div><p class="small muted">Students on seats outside the new size become unseated.</p><div class="row"><span class="spacer"></span><button class="btn pri" id="lok">Save</button></div>`, (d, close) => {
      $('#lok', d).onclick = () => {
        c.rows = CK.clamp(+$('#lr', d).value || 6, 1, 12); c.cols = CK.clamp(+$('#lc', d).value || 8, 1, 12);
        c.students.forEach(s => { if (s.seat) { const [r, k] = s.seat.split('-').map(Number); if (r > c.rows || k > c.cols) s.seat = null; } });
        save(); close();
      };
    });
    if ($('#auto')) $('#auto').onclick = () => {
      let i = 0;
      // fill from the front row backwards
      const order = [];
      for (let r = c.rows; r >= 1; r--) for (let k = 1; k <= c.cols; k++) order.push(r + '-' + k);
      c.students.forEach(s => { s.seat = order[i++] || null; });
      save(); render();
    };
    if ($('#clear')) $('#clear').onclick = () => { if (confirm('Remove everybody from their seat?')) { c.students.forEach(s => s.seat = null); save(); render(); } };

    $$('.seats .seat, #unseated .seat').forEach(el => el.onclick = () => seatClick(c, el));
    $('#unseated').parentElement.onclick = e => {
      if (mode === 'arrange' && picked && e.target.closest('.panel') && !e.target.closest('.seat')) {
        const s = stuById(picked); if (s) { s.seat = null; picked = null; save(); render(); }
      }
    };
  }
  function seatClick(c, el) {
    const sid = el.dataset.sid, seat = el.dataset.seat, mode = S.ui.seatMode;
    if (mode === 'attendance') {
      if (!sid) return;
      setAbsent(c, sid, !absentOn(c, S.ui.date).includes(sid));
      return render();
    }
    if (mode === 'points') { if (sid) pointsDialog(sid); return; }
    // arrange
    if (!picked) { picked = sid || null; if (!sid) return; return render(); }
    const a = stuById(picked);
    if (sid === picked) { picked = null; return render(); }
    if (sid) { const b = stuById(sid); const t = a.seat; a.seat = b.seat; b.seat = t; }
    else if (seat) { a.seat = seat; }
    picked = null; save(); render();
  }

  const REASONS = {
    part: ['Bonne réponse', 'Participation spontanée', 'Passage au tableau', 'Aide un camarade', 'Devoir fait', 'Bavardage', 'Pas de participation', 'Retard', 'Téléphone', 'Perturbe la classe'],
    cb1: ['Cahier bien organisé', 'Cours complet', 'Cours incomplet', 'Cahier absent', 'Cahier mal tenu'],
    tr1: ['Travail rendu', 'Travail soigné', 'Travail incomplet', 'Travail non rendu', 'Travail copié'],
  };
  function pointsDialog(sid) {
    const s = stuById(sid);
    const st = S.settings;
    const draw = () => {
      const g = gr(sid), cg = grades(sid);
      const recent = (S.log[sid] || []).slice(-4).reverse();
      return `<h3><span class="ar">${esc(name(s))}</span> <span class="muted">· No. ${s.n}</span></h3>
        <div class="quick"><span>Participation /${st.maxPart}</span>${stepper('part', g.part)}</div>
        <div class="reasons">${REASONS.part.map(r => `<button>${r}</button>`).join('')}</div>
        <div class="quick"><span>Organisation du cahier /${st.maxCahier}</span>${stepper('cb1', g.cb1)}</div>
        <div class="reasons">${REASONS.cb1.map(r => `<button>${r}</button>`).join('')}</div>
        <div class="quick"><span>Travail à rédiger /${st.maxTravail}</span>${stepper('tr1', g.tr1)}</div>
        <div class="reasons">${REASONS.tr1.map(r => `<button>${r}</button>`).join('')}</div>
        <p class="small muted">Tap a reason first to attach it to the next +/−. Absence: <b>${fmt(cg.absence)}/${st.maxAbs}</b> (${cg.nAbs} séance(s)) · Activités intégrées: <b>${fmt(cg.act)}/20</b></p>
        <div class="small">${recent.map(logLine).join('<br>') || '<span class="muted">No changes yet.</span>'}</div>
        <div class="row" style="margin-top:12px"><span class="spacer"></span><button class="btn pri" id="pd">Done</button></div>`;
    };
    let reason = '', last = null;
    dialog('', (d, close) => {
      const mount = () => {
        d.innerHTML = draw();
        if (last) flash($('.step[data-f="' + last.f + '"] span', d), last.up);
        $$('.step button', d).forEach(b => b.onclick = () => {
          const f = b.closest('.step').dataset.f;
          bump(sid, f, (b.classList.contains('p') ? 1 : -1) * S.settings.step, reason);
          last = { f, up: b.classList.contains('p') };
          reason = ''; mount();
        });
        $$('.reasons button', d).forEach(b => b.onclick = () => {
          reason = b.textContent;
          $$('.reasons button', d).forEach(x => x.style.background = '');
          b.style.background = '#e3e9f8';
        });
        $('#pd', d).onclick = close;
      };
      mount();
    });
  }
  function stepper(f, v, shown) {
    return `<span class="step" data-f="${f}"><button class="m" aria-label="minus">−</button><span>${fmt(shown != null ? shown : (+v || 0))}</span><button class="p" aria-label="plus">+</button></span>`;
  }
  function logLine(e) {
    const when = new Date(e.t).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const what = e.set !== undefined ? `= ${e.set === '' ? '—' : e.set}` : `${e.d > 0 ? '+' : ''}${e.d}`;
    return `<span class="muted">${when}</span> · ${FIELDS[e.f] ? FIELDS[e.f].label : esc(e.f)} <b style="color:${e.d < 0 ? 'var(--bad)' : 'var(--ok)'}">${what}</b>${e.why ? ' — ' + esc(e.why) : ''}`;
  }

  // ───────────────────────── gradebook ─────────────────────────
  function renderGrades(v) {
    const c = cls();
    const st = S.settings;
    const abs = new Set(absentOn(c, S.ui.date));
    const dlabel = new Date(S.ui.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    const cb2 = st.cahierChecks === 2, tr2 = st.travailCount === 2;
    const nCols = 2 + (cb2 ? 2 : 1) + (tr2 ? 2 : 1);
    const nT = nTestsOf(c);
    v.innerHTML = `
      <div class="row noprint" style="margin-bottom:10px">
        <input type="date" id="date" value="${S.ui.date}">
        <input type="text" id="q" placeholder="Search name or number" style="width:200px">
        <span class="spacer"></span>
        <button class="btn sm" id="csv">Export CSV</button>
        <button class="btn sm" id="print">Print</button>
      </div>
      <div class="tablewrap"><table class="gb"><thead>
        <tr><th rowspan="2">Élève</th><th rowspan="2">Absent<br><span class="small" style="font-weight:400">${dlabel}</span></th>
          <th colspan="${nCols}">Activités intégrées · /20</th><th rowspan="2">Remarque (visible par l’élève)</th><th rowspan="2">Activités<br>/20</th>
          ${Array.from({ length: nT }, (_, i) => `<th rowspan="2">Contrôle ${i + 1}<br>/20</th>`).join('')}<th rowspan="2">Note finale<br>/20</th></tr>
        <tr><th>Participation · /${st.maxPart}</th><th>Absence · /${st.maxAbs}</th>
          ${cb2 ? `<th>Cahier (1) · /${st.maxCahier}</th><th>Cahier (2) · /${st.maxCahier}</th>` : `<th>Organisation du cahier · /${st.maxCahier}</th>`}
          ${tr2 ? `<th>Travail à rédiger 1 · /${st.maxTravail}</th><th>Travail à rédiger 2 · /${st.maxTravail}</th>` : `<th>Travail à rédiger · /${st.maxTravail}</th>`}</tr>
      </thead><tbody>${c.students.map(s => gradeRow(s, abs.has(s.id), cb2, tr2, nT)).join('')}</tbody></table></div>
      <p class="small muted">Activités intégrées = participation + absence + organisation du cahier${cb2 ? ' (moyenne des 2 contrôles)' : ''} + travail à rédiger${tr2 ? ' (moyenne des 2 travaux)' : ''}${st.maxPart + st.maxAbs + st.maxCahier + st.maxTravail !== 20 ? ', ramené sur 20' : ''}.
        Absence = ${st.maxAbs} − ${st.absPenalty} par séance d’absence non justifiée (± ajustement avec les boutons, ex. absence justifiée). Note générale = moyenne des ${nT} contrôles × ${Math.round(st.weightTests * 100)} % + Activités × ${Math.round((1 - st.weightTests) * 100)} %. ${nT} contrôles par semestre pour cette classe (modifiable dans Students &amp; PINs). Barème modifiable dans Settings.</p>`;

    $('#date').onchange = e => { S.ui.date = e.target.value || today(); save(); render(); };
    $('#q').oninput = e => {
      const q = e.target.value.trim().toLowerCase();
      $$('tbody tr', v).forEach(tr => { tr.style.display = !q || tr.dataset.k.includes(q) ? '' : 'none'; });
    };
    $('#print').onclick = () => window.print();
    $('#csv').onclick = () => exportCsv(c);
    const tb = $('tbody', v);
    tb.addEventListener('click', e => {
      const b = e.target.closest('.step button');
      const tr = e.target.closest('tr');
      if (b) {
        const f = b.closest('.step').dataset.f;
        const why = f === 'absAdj' ? (b.classList.contains('p') ? 'Absence justifiée / régularisée' : 'Ajustement absence') : '';
        bump(tr.dataset.sid, f, (b.classList.contains('p') ? 1 : -1) * S.settings.step, why);
        refreshRow(tr);
        flash($('span', b.closest('.step')), b.classList.contains('p'));
        flash($('[data-o]', tr));
        return;
      }
      if (e.target.closest('[data-act=hist]')) historyDialog(tr.dataset.sid);
    });
    tb.addEventListener('change', e => {
      const tr = e.target.closest('tr'), sid = tr.dataset.sid;
      if (e.target.matches('.absbox')) { setAbsent(c, sid, e.target.checked); tr.classList.toggle('isabs', e.target.checked); refreshRow(tr); }
      if (e.target.matches('input.score')) { setScore(sid, e.target.dataset.f, e.target.value); refreshRow(tr); }
    });
    tb.addEventListener('input', e => {
      if (e.target.matches('textarea')) { gr(e.target.closest('tr').dataset.sid).note = e.target.value; save(); }
    });
  }
  function gradeRow(s, isAbs, cb2, tr2, nT) {
    const g = gr(s.id), cg = grades(s.id);
    return `<tr data-sid="${s.id}" data-k="${esc((s.n + ' ' + name(s)).toLowerCase())}" class="${isAbs ? 'isabs' : ''}">
      <td class="name"><button class="btn sm" data-act="hist" title="Historique">⏱</button> <span class="n">${s.n}</span> <span class="ar">${esc(name(s))}</span></td>
      <td><input type="checkbox" class="absbox" ${isAbs ? 'checked' : ''}></td>
      <td>${stepper('part', g.part)}</td>
      <td>${stepper('absAdj', g.absAdj, cg.absence)}<div class="bonus" data-na>${cg.nAbs} abs.</div></td>
      <td>${stepper('cb1', g.cb1)}</td>${cb2 ? `<td>${stepper('cb2', g.cb2)}</td>` : ''}
      <td>${stepper('tr1', g.tr1)}</td>${tr2 ? `<td>${stepper('tr2', g.tr2)}</td>` : ''}
      <td><textarea placeholder="Ajouter une remarque">${esc(g.note)}</textarea></td>
      <td><span class="oral ${cg.act >= 10 ? 'good' : ''}" data-o>${fmt(cg.act)}</span></td>
      ${Array.from({ length: nT }, (_, i) => `<td><input class="score" data-f="t${i + 1}" type="number" min="0" max="20" step="0.25" placeholder="/20" value="${g['t' + (i + 1)] == null ? '' : g['t' + (i + 1)]}"></td>`).join('')}
      <td class="final" data-fin>${fmt(cg.final)}</td></tr>`;
  }
  function refreshRow(tr) {
    const g = gr(tr.dataset.sid), cg = grades(tr.dataset.sid);
    $$('.step', tr).forEach(st => { $('span', st).textContent = fmt(st.dataset.f === 'absAdj' ? cg.absence : (+g[st.dataset.f] || 0)); });
    $('[data-na]', tr).textContent = cg.nAbs + ' abs.';
    const o = $('[data-o]', tr); o.textContent = fmt(cg.act); o.classList.toggle('good', cg.act >= 10);
    $('[data-fin]', tr).textContent = fmt(cg.final);
  }
  function historyDialog(sid) {
    const s = stuById(sid);
    const l = (S.log[sid] || []).slice().reverse();
    dialog(`<h3><span class="ar">${esc(name(s))}</span> · historique</h3><div class="small" style="line-height:1.9">${l.map(logLine).join('<br>') || '<span class="muted">Rien pour l’instant.</span>'}</div>
      <div class="row" style="margin-top:12px"><span class="spacer"></span><button class="btn pri" id="hx">Close</button></div>`, (d, close) => { $('#hx', d).onclick = close; });
  }
  function exportCsv(c) {
    const nT = nTestsOf(c);
    const head = ['N°', 'Code Massar', 'Nom', 'Participation', 'Absences (séances)', 'Absence', 'Cahier', 'Travail à rédiger', 'Activités /20', ...Array.from({ length: nT }, (_, i) => 'Contrôle ' + (i + 1)), 'Note finale', 'Remarque'];
    const lines = c.students.map(s => {
      const g = gr(s.id), cg = grades(s.id);
      return [s.n, s.code, name(s), g.part, cg.nAbs, fmt(cg.absence), fmt(cg.cahier), fmt(cg.travail), fmt(cg.act), ...Array.from({ length: nT }, (_, i) => g['t' + (i + 1)]), fmt(cg.final), g.note];
    });
    download(`${c.name}-notes.csv`, '﻿' + [head, ...lines].map(r => r.map(x => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv');
  }
  function download(fname, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ───────────────────────── QR answer cards ─────────────────────────
  let scan = null, live = null;
  function stopScan() { if (scan) { scan.stop(); scan = null; } }
  function cardMap() { const m = {}; S.classes.forEach(c => c.students.forEach(s => m['CK' + s.card] = s)); return m; }

  function renderCards(v) {
    const c = cls();
    if (!live || live.classId !== c.id) live = { classId: c.id, q: '', correct: '', answers: {}, reveal: false, award: 0 };
    v.innerHTML = `
      <div class="grid2" style="grid-template-columns:minmax(300px,1.4fr) minmax(280px,1fr)">
        <div>
          <div class="panel">
            <div class="row"><input type="text" id="cq" placeholder="Question (optional, shown on screen)" value="${esc(live.q)}" style="flex:1">
              <label class="f">Correct<select id="cc"><option value="">?</option>${'ABCD'.split('').map(l => `<option ${live.correct === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
            <div class="row" style="margin-top:8px"><select id="cbank" style="flex:1"><option value="">— Banque de questions SVT —</option>${(window.CK_BANKS || []).map(b => `<option value="${b.id}" ${live.bank === b.id ? 'selected' : ''}>${esc(b.level + ' · ' + b.title)} (${b.questions.length})</option>`).join('')}</select>
              <button class="btn sm" id="cnext">Question suivante ▸</button></div>
            <div class="bigq ar" id="bq"></div><div id="bch" class="ar" style="display:grid;gap:6px;max-width:720px;margin:0 auto 8px;font-size:19px"></div>
            <div class="scanwrap hidden" id="sw"><video id="vid"></video><canvas id="ov"></canvas></div>
            <div class="row" style="margin-top:10px">
              <button class="btn acc" id="cam">📷 Start scanning</button>
              <button class="btn" id="rev"></button>
              <button class="btn" id="reset">New question</button>
              <span class="spacer"></span>
              <button class="btn pri" id="savec">Save result</button>
            </div>
            <p class="small muted">Students hold their card with their answer letter on top. Point the camera at the class and sweep slowly — several cards are read at once. A student can change their answer: the last reading counts.</p>
          </div>
          <div class="panel" id="ansPanel"></div>
        </div>
        <div>
          <div class="panel" id="barPanel"></div>
          <div class="panel"><label class="row small">Reward correct answers with <input type="number" id="aw" min="0" max="2" step="0.5" value="${live.award}" style="width:64px"> participation point(s) when saving</label></div>
          <div class="panel"><div class="row"><strong>Printable cards</strong><span class="spacer"></span>
            <select id="per"><option value="1">1 per A4 page</option><option value="4">4 per page</option></select>
            <button class="btn sm" id="pcards">Print ${esc(c.name)} cards</button></div>
            <p class="small muted">Each card is a unique QR code with A/B/C/D on its four sides, the student's number and name. Print once, use all year (laminate if you can).</p></div>
          <div class="panel"><strong>Past questions</strong>
            <table class="list" style="margin-top:6px"><tbody>${S.cardSessions.filter(x => x.classId === c.id).slice().reverse().slice(0, 15).map(x => {
              const n = Object.keys(x.answers).length, ok = x.correct ? Object.values(x.answers).filter(a => a === x.correct).length : null;
              return `<tr><td class="small">${x.date}</td><td class="ar">${esc(x.q || '—')}</td><td>${x.correct || '?'}</td><td>${ok == null || !n ? n : Math.round(ok / n * 100) + '%'}</td><td><button class="btn sm danger" data-del="${x.id}">✕</button></td></tr>`;
            }).join('') || '<tr><td class="muted">None yet</td></tr>'}</tbody></table></div>
        </div>
      </div>`;
    drawLive(c);
    $('#cq').oninput = e => { live.q = e.target.value; live.choices = null; drawLive(c); };
    $('#cbank').onchange = e => { live.bank = e.target.value; live.bankPos = -1; };
    $('#cnext').onclick = () => {
      const b = (window.CK_BANKS || []).find(x => x.id === $('#cbank').value);
      if (!b) return toast('Choose a question bank first');
      if (live.bank !== b.id) { live.bank = b.id; live.bankPos = -1; }
      if (Object.keys(live.answers).length && !confirm('Start the next question? Answers of the current one are not saved yet (Save result).')) return;
      live.bankPos = ((live.bankPos == null ? -1 : live.bankPos) + 1) % b.questions.length;
      const q = b.questions[live.bankPos];
      // QR cards have 4 sides: keep at most 4 choices
      Object.assign(live, { q: q.q, choices: q.c.slice(0, 4), correct: 'ABCD'[q.a] || '', answers: {}, reveal: false });
      $('#cq').value = q.q; $('#cc').value = live.correct; drawLive(c);
    };
    $('#cc').onchange = e => { live.correct = e.target.value; drawLive(c); };
    $('#aw').onchange = e => { live.award = +e.target.value || 0; };
    $('#rev').onclick = () => { live.reveal = !live.reveal; drawLive(c); };
    $('#reset').onclick = () => { live = { classId: c.id, q: '', correct: '', answers: {}, reveal: false, award: live.award }; $('#cq').value = ''; $('#cc').value = ''; drawLive(c); };
    $('#pcards').onclick = () => printCards(c, +$('#per').value);
    $$('[data-del]').forEach(b => b.onclick = () => { S.cardSessions = S.cardSessions.filter(x => x.id !== b.dataset.del); save(); render(); });
    $('#savec').onclick = () => {
      if (!Object.keys(live.answers).length) return toast('No answer scanned yet');
      S.cardSessions.push({ id: uid(), classId: c.id, date: today(), q: live.q, correct: live.correct, answers: live.answers });
      if (live.award && live.correct) Object.entries(live.answers).forEach(([sid, a]) => { if (a === live.correct) bump(sid, 'part', live.award, 'Cartes QR : bonne réponse'); });
      save(); toast('Saved');
      // keep the camera running and the bank position, ready for the next question
      Object.assign(live, { answers: {}, reveal: false });
      drawLive(c);
    };
    $('#cam').onclick = async () => {
      const btn = $('#cam');
      if (scan) { stopScan(); $('#sw').classList.add('hidden'); btn.textContent = '📷 Start scanning'; btn.className = 'btn acc'; return; }
      const map = cardMap();
      let pending = 0;
      try {
        $('#sw').classList.remove('hidden');
        scan = await CKScanner.start({
          video: $('#vid'), overlay: $('#ov'),
          label: (t, side) => map[t] ? `${map[t].n} · ${live.reveal ? side : '✓'}` : '?',
          onCode: (t, side) => {
            const s = map[t];
            if (!s || !c.students.includes(s) || live.answers[s.id] === side) return;
            live.answers[s.id] = side;
            if (navigator.vibrate) navigator.vibrate(30);
            clearTimeout(pending); pending = setTimeout(() => drawLive(c), 100);
          },
        });
        btn.textContent = 'Stop camera'; btn.className = 'btn danger';
      } catch (e) { scan = null; toast('Camera not available: ' + (e.message || e)); $('#sw').classList.add('hidden'); }
    };
  }
  function drawLive(c) {
    if (!$('#ansPanel')) return;
    const abs = new Set(absentOn(c, today()));
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(live.answers).forEach(a => counts[a]++);
    const total = Object.keys(live.answers).length;
    $('#bq').textContent = live.q;
    $('#bch').innerHTML = (live.choices || []).map((t, i) => `<div><b>${'ABCD'[i]}.</b> ${esc(t)}</div>`).join('');
    $('#rev').textContent = live.reveal ? 'Hide answers' : 'Reveal answers';
    $('#ansPanel').innerHTML = `<div class="row"><strong>${total}/${c.students.length - abs.size} answered</strong><span class="spacer"></span><span class="small muted">numbers turn green when read</span></div>
      <div class="answered" style="margin-top:8px">${c.students.map(s => {
        const a = live.answers[s.id];
        let k = a ? 'done' : '';
        if (a && !(live.shown || (live.shown = new Set())).has(s.id)) { k += ' new'; live.shown.add(s.id); }
        if (a && live.reveal && live.correct) k = a === live.correct ? 'right' : 'wrong';
        return `<div class="${k} ${abs.has(s.id) ? 'absent' : ''}" title="${esc(name(s))}">${s.n}${a && live.reveal ? '<sup>' + a + '</sup>' : ''}</div>`;
      }).join('')}</div>`;
    $('#barPanel').innerHTML = `<strong>Answers</strong>
      <div class="bars" style="margin-top:10px">${'ABCD'.split('').map(l => `<div class="bar ${live.reveal && live.correct === l ? 'correct' : ''}"><span>${l}</span><span class="t"><i style="width:${live.reveal && total ? counts[l] / total * 100 : 0}%"></i></span><span>${live.reveal ? counts[l] : '·'}</span></div>`).join('')}</div>
      ${live.reveal && live.correct && total ? `<p><b>${Math.round(counts[live.correct] / total * 100)}%</b> correct</p>` : '<p class="small muted">Results stay hidden until you press Reveal, so the class cannot copy from the screen.</p>'}`;
  }

  function printWindow(title, css, body) {
    const w = window.open('', '_blank');
    if (!w) return toast('Allow pop-ups to print');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page{size:A4;margin:0} *{box-sizing:border-box} body{margin:0;font-family:Inter,"Segoe UI",system-ui,"Noto Sans Arabic",Tahoma,sans-serif;color:#222} .ar{unicode-bidi:plaintext}
      ${css}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);
    w.document.close();
  }
  function printCards(c, per) {
    const lg = CK.logo();
    const card = s => `<div class="card"><div class="hd"><b>No. ${s.n}</b><span class="ar">${esc(name(s))}</span><b>${esc(c.name)}</b></div>
      <div class="L t">A</div><div class="L r">B</div><div class="L b">C</div><div class="L l">D</div>
      <div class="q">${qrSvg('CK' + s.card, { ec: 'M', mode: 'Alphanumeric', margin: 0 })}</div>
      <div class="ft"><span>${esc(c.name)}</span><span class="lg">${lg}</span><span>Card ${s.card}</span></div></div>`;
    const css = per === 4
      ? `.pg{width:210mm;height:297mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;page-break-after:always}
         .card{position:relative;border:1px dashed #bbb;padding:10mm 9mm}.q svg{width:70mm;height:70mm;display:block;margin:12mm auto 0}
         .hd,.ft{display:flex;justify-content:space-between;font-size:11pt;color:#444}.ft{position:absolute;bottom:7mm;left:9mm;right:9mm;font-size:9pt;color:#888;align-items:center}.lg svg{width:9mm;height:9mm;display:block;color:#bbb}.mk .fl{fill:currentColor}
         .L{position:absolute;font-weight:800;color:#999;font-size:12pt}`
      : `.pg{width:210mm;height:297mm;page-break-after:always}.card{position:relative;height:297mm;padding:26mm 22mm}
         .q svg{width:150mm;height:150mm;display:block;margin:28mm auto 0}.hd,.ft{display:flex;justify-content:space-between;font-size:18pt;color:#444}
         .ft{position:absolute;bottom:30mm;left:22mm;right:22mm;font-size:14pt;color:#888;align-items:center}.lg svg{width:16mm;height:16mm;display:block;color:#bbb}.mk .fl{fill:currentColor}.L{position:absolute;font-weight:800;color:#999;font-size:16pt}`;
    const pos = `.L.t{top:${per === 4 ? '19mm' : '40mm'};left:50%;transform:translateX(-50%)}
      .L.b{bottom:${per === 4 ? '16mm' : '52mm'};left:50%;transform:translateX(-50%) rotate(180deg)}
      .L.r{right:${per === 4 ? '3mm' : '6mm'};top:50%;transform:translateY(-50%) rotate(90deg)}
      .L.l{left:${per === 4 ? '3mm' : '6mm'};top:50%;transform:translateY(-50%) rotate(-90deg)}`;
    const list = c.students;
    let body = '';
    for (let i = 0; i < list.length; i += per) body += `<div class="pg">${list.slice(i, i + per).map(card).join('')}</div>`;
    printWindow(`${c.name} cards`, css + pos, body);
  }

  // ───────────────────────── phone quiz ─────────────────────────
  let editing = null;
  function renderQuiz(v) {
    const c = cls();
    if (editing) return renderQuizEditor(v, editing);
    const list = S.quizzes.filter(q => q.classIds.includes(c.id)).slice().reverse();
    v.innerHTML = `<div class="row"><h2>Phone quizzes · ${esc(c.name)}</h2><span class="spacer"></span><button class="btn acc" id="newq">+ New quiz</button></div>
      <div class="panel"><table class="list"><thead><tr><th>Title</th><th>Questions</th><th>Code</th><th>Status</th><th>Results</th><th></th></tr></thead><tbody>
      ${list.map(q => {
        const res = S.quizResults[q.id] || {};
        const n = c.students.filter(s => res[s.id]).length;
        return `<tr><td><b>${esc(q.title)}</b></td><td>${q.perStudent || q.questions.length}/${q.questions.length}</td><td class="mono">${q.code}</td>
          <td>${q.open ? '<span class="pill ok">open</span>' : '<span class="pill">closed</span>'}</td><td>${n}/${c.students.length}</td>
          <td class="row"><button class="btn sm" data-e="${q.id}">Edit</button><button class="btn sm" data-r="${q.id}">Results</button><button class="btn sm" data-o="${q.id}">${q.open ? 'Close' : 'Open'}</button></td></tr>`;
      }).join('') || '<tr><td colspan="6" class="muted">No quiz yet for this class.</td></tr>'}</tbody></table></div>
      <div class="panel small">
        <b>How it works.</b> 1) Write the quiz, set a code. 2) <b>Open</b> it and <b>Publish</b>. 3) Students open <span class="mono">quiz.html</span>, enter their class, number and PIN, then the code you write on the board.
        Each student gets the questions and the answer choices in a different order (like the driving-licence test). Leaving the page, switching app, split screen, translating the page or long-pressing for Google Lens removes them immediately, with the score they had.
        4) At the end every phone shows a result QR code: scan them all from <b>Results</b> (or type the short code).</div>`;
    $('#newq').onclick = () => { editing = { id: uid(), title: '', classIds: [c.id], code: randomCode(5), secret: randomCode(10), questions: [], perStudent: 0, minutes: 15, aiGuard: 'ja', open: false, outOf: 20, _new: true }; render(); };
    $$('[data-e]').forEach(b => b.onclick = () => { editing = JSON.parse(JSON.stringify(S.quizzes.find(q => q.id === b.dataset.e))); render(); });
    $$('[data-o]').forEach(b => b.onclick = () => { const q = S.quizzes.find(x => x.id === b.dataset.o); q.open = !q.open; save(); render(); if (q.open) toast('Now press Publish so phones can see it'); });
    $$('[data-r]').forEach(b => b.onclick = () => quizResults(S.quizzes.find(q => q.id === b.dataset.r)));
  }
  function qToText(qs) { return qs.map(q => [q.q, ...q.c.map((o, i) => (i === q.a ? '*' : '') + o)].join('\n')).join('\n\n'); }
  function textToQ(t) {
    return t.split(/\n\s*\n/).map(b => b.split('\n').map(x => x.trim()).filter(Boolean)).filter(b => b.length >= 3).map(b => {
      const opts = b.slice(1);
      let a = opts.findIndex(o => o.startsWith('*'));
      return { q: b[0], c: opts.map(o => o.replace(/^\*\s*/, '')), a: a < 0 ? 0 : a };
    });
  }
  function renderQuizEditor(v, q) {
    v.innerHTML = `<div class="row"><h2>${q._new ? 'New quiz' : 'Edit quiz'}</h2><span class="spacer"></span><button class="btn" id="qx">Cancel</button>${q._new ? '' : '<button class="btn danger" id="qdel">Delete</button>'}<button class="btn pri" id="qs">Save</button></div>
      <div class="panel grid2">
        <label class="f">Title<input type="text" id="qt" value="${esc(q.title)}" placeholder="Unit 2 – Vocabulary check"></label>
        <label class="f">Code students type (write it on the board)<input type="text" id="qc" class="mono" value="${esc(q.code)}"></label>
        <label class="f">Questions per student (0 = all)<input type="number" id="qp" min="0" value="${q.perStudent}"></label>
        <label class="f">Time limit (minutes)<input type="number" id="qm" min="1" value="${q.minutes}"></label>
        <label class="f">Score out of<input type="number" id="qo" min="1" value="${q.outOf}"></label>
        <label class="f">Anti-AI sentence under each question<select id="qa"><option value="">None</option><option value="ja" ${q.aiGuard === 'ja' ? 'selected' : ''}>Japanese</option><option value="zh" ${q.aiGuard === 'zh' ? 'selected' : ''}>Chinese</option></select></label>
        <label class="f">Classes<span class="row">${S.classes.map(k => `<label class="row small"><input type="checkbox" class="qcl" value="${k.id}" ${q.classIds.includes(k.id) ? 'checked' : ''}>${esc(k.name)}</label>`).join('')}</span></label>
      </div>
      <div class="panel"><strong>Questions</strong>
        <p class="small muted">One block per question, separated by an empty line. First line = the question, next lines = choices. Put <b>*</b> before the correct choice.</p>
        <textarea id="qq" rows="16" class="ar" placeholder="Choose the correct word: She ___ to school every day.\n*goes\ngo\ngoing\ngone\n\nThe opposite of 'cheap' is:\nfree\n*expensive\nsmall\neasy">${esc(qToText(q.questions))}</textarea>
        <p class="small" id="qn"></p>
        <div class="row"><select id="qbank"><option value="">— Banque de questions SVT —</option>${(window.CK_BANKS || []).map(b => `<option value="${b.id}">${esc(b.level + ' · ' + b.title)} (${b.questions.length})</option>`).join('')}</select>
          <button class="btn sm" id="qbadd">Add these questions</button><span class="spacer"></span>
          <button class="btn sm" id="qpaper">Print paper version (with anti-AI line)</button></div>
      </div>`;
    const count = () => { const n = textToQ($('#qq').value).length; $('#qn').textContent = n + ' question(s) detected'; };
    $('#qq').oninput = count; count();
    $('#qbadd').onclick = () => {
      const b = (window.CK_BANKS || []).find(x => x.id === $('#qbank').value);
      if (!b) return toast('Choose a bank');
      const cur = $('#qq').value.trim();
      $('#qq').value = (cur ? cur + '\n\n' : '') + qToText(b.questions);
      if (!$('#qt').value.trim()) $('#qt').value = b.title.replace(/^.*— /, '');
      count();
    };
    const collect = () => {
      q.title = $('#qt').value.trim() || 'Quiz'; q.code = CK.normSecret($('#qc').value) || randomCode(5);
      q.perStudent = +$('#qp').value || 0; q.minutes = +$('#qm').value || 15; q.outOf = +$('#qo').value || 20; q.aiGuard = $('#qa').value;
      q.classIds = $$('.qcl:checked').map(x => x.value); if (!q.classIds.length) q.classIds = [cls().id];
      q.questions = textToQ($('#qq').value);
    };
    $('#qx').onclick = () => { editing = null; render(); };
    if ($('#qdel')) $('#qdel').onclick = () => { if (confirm('Delete this quiz and its results?')) { S.quizzes = S.quizzes.filter(x => x.id !== q.id); delete S.quizResults[q.id]; editing = null; save(); render(); } };
    $('#qs').onclick = () => {
      collect();
      if (!q.questions.length) return toast('Add at least one question');
      delete q._new;
      const i = S.quizzes.findIndex(x => x.id === q.id);
      i >= 0 ? (S.quizzes[i] = q) : S.quizzes.push(q);
      editing = null; save(); render(); toast('Saved');
    };
    $('#qpaper').onclick = () => {
      collect();
      const guard = q.aiGuard ? CK.AI_GUARD[q.aiGuard] : '';
      printWindow(q.title, `@page{size:A4;margin:16mm} .qq{margin:0 0 14px;page-break-inside:avoid}.g{font-size:7.5pt;color:#777;margin-top:3px}h1{font-size:18pt}`,
        `<h1>${esc(q.title)}</h1><p>Name: ____________________ &nbsp; Class: ________ &nbsp; No.: ____</p>` +
        q.questions.map((x, i) => `<div class="qq"><b>${i + 1}. <span class="ar">${esc(x.q)}</span></b><br>${x.c.map((o, j) => `<span style="margin-inline-end:22px">☐ ${'abcd'[j] || j + 1}) <span class="ar">${esc(o)}</span></span>`).join(' ')}${guard ? `<div class="g">${guard}</div>` : ''}</div>`).join(''));
    };
  }
  function quizResults(q) {
    const c = cls();
    const res = (S.quizResults[q.id] = S.quizResults[q.id] || {});
    const draw = () => `<h3>${esc(q.title)} · results</h3>
      <div class="scanwrap hidden" id="rsw"><video id="rvid"></video><canvas id="rov"></canvas></div>
      <div class="row" style="margin:8px 0"><button class="btn acc" id="rcam">${scan ? 'Stop camera' : '📷 Scan result codes'}</button>
        <input type="text" id="rcode" class="mono" placeholder="or type code" style="width:150px"><button class="btn" id="radd">Add</button></div>
      <table class="list"><tbody>${c.students.map(s => {
        const r = res[s.id];
        return `<tr><td>${s.n}</td><td class="ar">${esc(name(s))}</td><td>${r ? `<b>${fmt(r.score)}</b>/${q.outOf}` : '—'}</td><td>${r ? (r.status === 'done' ? '<span class="pill ok">finished</span>' : r.status === 'timeup' ? '<span class="pill warn">time up</span>' : `<span class="pill bad">removed${r.reason ? ': ' + esc(r.reason) : ''}</span>`) : '<span class="pill">no result</span>'}</td></tr>`;
      }).join('')}</tbody></table>
      <div class="row" style="margin-top:10px"><label class="small row">Copy scores into <select id="rto"><option value="">—</option>${Array.from({ length: nTestsOf(c) }, (_, i) => `<option value="t${i + 1}">Contrôle ${i + 1}</option>`).join('')}</select></label><button class="btn sm" id="rcopy">Copy</button><span class="spacer"></span><button class="btn pri" id="rx">Close</button></div>`;
    dialog('', (d, close) => {
      const mount = () => {
        d.innerHTML = draw();
        const add = async text => {
          const r = await parseResult(text, q);
          if (!r) return false;
          const prev = res[r.sid];
          if (!prev || prev.at !== r.at) { res[r.sid] = r; save(); mount(); if (scan) { $('#rsw', d).classList.remove('hidden'); } }
          return true;
        };
        $('#radd', d).onclick = async () => { if (!(await add($('#rcode', d).value))) toast('Code not valid for this quiz'); };
        $('#rcam', d).onclick = async () => {
          if (scan) { stopScan(); return mount(); }
          $('#rsw', d).classList.remove('hidden');
          try {
            scan = await CKScanner.start({ video: $('#rvid', d), overlay: $('#rov', d), onCode: t => { add(t); } });
            $('#rcam', d).textContent = 'Stop camera';
          } catch (e) { toast('Camera not available'); }
        };
        $('#rcopy', d).onclick = () => {
          const f = $('#rto', d).value; if (!f) return;
          c.students.forEach(s => { if (res[s.id]) setScore(s.id, f, Math.round(res[s.id].score / q.outOf * 20 * 4) / 4); });
          toast('Scores copied to ' + FIELDS[f].label);
        };
        $('#rx', d).onclick = () => { stopScan(); close(); };
      };
      mount();
    });
  }
  // Result code: R1.<quizId>.<card>.<correct>.<total>.<status>.<reason>.<time36>.<sig>
  async function parseResult(text, q) {
    const p = String(text).trim().toUpperCase().split('.');
    if (p[0] !== 'R1' || p.length !== 9) return null;
    const [, qid, card, ok, tot, st, rs, t36, sig] = p;
    if (qid !== q.id.toUpperCase()) return null;
    const body = p.slice(0, 8).join('.');
    if ((await CK.sign(body, q.secret)) !== sig) return null;
    const s = cardMap()['CK' + card];
    if (!s) return null;
    const reasons = { L: 'left the page', T: 'translation', R: 'split screen / resize', C: 'copy / long-press', S: 'screenshot key', '-': '' };
    return { sid: s.id, correct: +ok, total: +tot, score: (+ok / +tot) * q.outOf, status: { D: 'done', X: 'removed', T: 'timeup' }[st] || 'removed', reason: reasons[rs] || '', at: t36 };
  }

  // ───────────────────────── students & PINs ─────────────────────────
  function renderStudents(v) {
    const c = cls();
    v.innerHTML = `<div class="row"><h2>${esc(c.name)} <span class="muted small">${esc(c.official || '')} · ${c.students.length} students</span></h2><span class="spacer"></span>
        <button class="btn sm" id="addst">+ Student</button><button class="btn sm" id="slips">Print PIN slips</button><label class="small row">Contrôles / semestre <select id="ntests">${[1, 2, 3, 4].map(n => `<option ${nTestsOf(c) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn sm" id="rename">Rename class</button><button class="btn sm danger" id="delc">Delete class</button></div>
      <div class="panel" style="overflow:auto"><table class="list"><thead><tr><th>No.</th><th>Last name</th><th>First name</th><th>G</th><th>Massar</th><th>PIN</th><th>Card</th><th></th></tr></thead><tbody>
      ${c.students.map(s => `<tr data-sid="${s.id}"><td><input type="number" data-k="n" value="${s.n}" style="width:60px"></td>
        <td><input type="text" data-k="last" class="ar" value="${esc(s.last)}"></td><td><input type="text" data-k="first" class="ar" value="${esc(s.first)}"></td>
        <td><select data-k="g"><option value="M" ${s.g !== 'F' ? 'selected' : ''}>Boy</option><option value="F" ${s.g === 'F' ? 'selected' : ''}>Girl</option></select></td>
        <td class="mono small">${esc(s.code)}</td><td class="mono"><b>${s.pin}</b></td><td>${s.card}</td>
        <td class="row"><button class="btn sm" data-pin>New PIN</button><button class="btn sm danger" data-del>✕</button></td></tr>`).join('')}</tbody></table></div>
      <div class="panel"><strong>Add students from Excel / Massar</strong><textarea id="paste" rows="4" placeholder="37	D148099972	تقريوت	نورالدين	ذكر"></textarea><div class="row" style="margin-top:6px"><button class="btn sm acc" id="pgo">Add</button></div></div>`;
    const tb = $('tbody', v);
    tb.addEventListener('change', e => {
      const s = stuById(e.target.closest('tr').dataset.sid), k = e.target.dataset.k;
      if (!k) return;
      s[k] = k === 'n' ? +e.target.value : e.target.value; if (k === 'n') c.students.sort((a, b) => a.n - b.n);
      save();
    });
    tb.addEventListener('click', e => {
      const tr = e.target.closest('tr'); if (!tr) return;
      const s = stuById(tr.dataset.sid);
      if (e.target.matches('[data-pin]') && confirm(`Give ${name(s)} a new PIN? The old one stops working after the next Publish.`)) { s.pin = randomCode(6); save(); render(); }
      if (e.target.matches('[data-del]') && confirm(`Remove ${name(s)} from ${c.name}? Their grades are deleted too.`)) {
        c.students = c.students.filter(x => x !== s); delete S.grades[s.id]; delete S.log[s.id]; save(); render();
      }
    });
    $('#addst').onclick = () => { const n = Math.max(0, ...c.students.map(s => s.n)) + 1; c.students.push({ id: uid(), n, code: '', first: '', last: 'New student', g: 'M', pin: randomCode(6), card: S.nextCard++, seat: null }); save(); render(); };
    $('#pgo').onclick = () => { const rows = parsePaste($('#paste').value); if (!rows.length) return toast('Nothing recognised'); importRoster({ classes: [{ name: c.name, students: rows }] }); };
    $('#ntests').onchange = e => { c.tests = +e.target.value; save(); toast(`${c.name}: ${c.tests} contrôles par semestre`); };
    $('#rename').onclick = () => { const n = prompt('Class name', c.name); if (n) { c.name = n.trim(); save(); render(); } };
    $('#delc').onclick = () => {
      if (!confirm(`Delete ${c.name} and all its data?`)) return;
      c.students.forEach(s => { delete S.grades[s.id]; delete S.log[s.id]; });
      S.classes = S.classes.filter(x => x !== c); delete S.absences[c.id]; S.ui.cls = S.classes[0] && S.classes[0].id; save(); render();
    };
    $('#slips').onclick = () => {
      const base = portalBase();
      printWindow(`${c.name} PINs`, `@page{size:A4;margin:10mm}.w{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0}.s{border:1px dashed #aaa;padding:8px 10px;font-size:10.5pt;height:42mm;page-break-inside:avoid;display:grid;grid-template-columns:1fr 26mm;gap:6px;align-items:center}.p{font:700 16pt ui-monospace,monospace;letter-spacing:.12em}.lg svg{width:7mm;height:7mm;display:inline-block;vertical-align:middle;margin-right:2mm}.mk .fl{fill:currentColor}.u{font-size:7.5pt;color:#555;word-break:break-all}svg{width:26mm;height:26mm}`,
        `<div class="w">${c.students.map(s => `<div class="s"><div><span class="lg">${CK.logo()}</span><b class="ar">${esc(name(s))}</b><br>${esc(c.name)} · No. ${s.n}<br>PIN: <span class="p">${s.pin}</span><div class="u">${esc(base || 'portal.html')}</div></div>${base ? qrSvg(base + 'portal.html', { ec: 'L' }) : ''}</div>`).join('')}</div>`);
    };
  }
  function portalBase() {
    let u = S.settings.portalUrl.trim();
    if (!u && /^https?:/.test(location.href)) u = location.href.replace(/[^/]*([?#].*)?$/, '');
    if (u && !u.endsWith('/')) u += '/';
    return u;
  }

  // ───────────────────────── publish ─────────────────────────
  async function buildBundle(progress) {
    const out = { v: 1, updated: new Date().toISOString(), teacher: S.settings.teacher, school: S.settings.school, subject: S.settings.subject, year: S.settings.year, classes: [], records: {}, quizzes: [] };
    const all = [];
    S.classes.forEach(c => { out.classes.push({ id: c.id, name: c.name, size: c.students.length }); c.students.forEach(s => all.push([c, s])); });
    let i = 0;
    for (const [c, s] of all) {
      const g = gr(s.id);
      const absDates = Object.entries(S.absences[c.id] || {}).filter(([, l]) => l.includes(s.id)).map(([d]) => d).sort();
      const cards = S.cardSessions.filter(x => x.classId === c.id).map(x => ({ date: x.date, q: x.q, a: x.answers[s.id] || null, ok: x.correct || null }));
      const quizzes = S.quizzes.filter(q => q.classIds.includes(c.id) && (S.quizResults[q.id] || {})[s.id]).map(q => { const r = S.quizResults[q.id][s.id]; return { title: q.title, score: r.score, outOf: q.outOf, status: r.status, reason: r.reason }; });
      const rec = { name: name(s), n: s.n, cls: c.name, card: s.card, g, comp: grades(s.id), cfg: { nTests: nTestsOf(c), weightTests: S.settings.weightTests, maxPart: S.settings.maxPart, maxAbs: S.settings.maxAbs, maxCahier: S.settings.maxCahier, maxTravail: S.settings.maxTravail, absPenalty: S.settings.absPenalty, cahierChecks: S.settings.cahierChecks, travailCount: S.settings.travailCount }, log: (S.log[s.id] || []).slice(-300), abs: absDates, cards, quizzes };
      out.records[c.id + ':' + s.n] = await CK.seal(rec, s.pin);
      progress && progress(++i, all.length);
    }
    for (const q of S.quizzes.filter(x => x.open)) {
      const payload = { id: q.id, title: q.title, secret: q.secret, questions: q.questions, perStudent: q.perStudent, minutes: q.minutes, outOf: q.outOf, aiGuard: q.aiGuard ? CK.AI_GUARD[q.aiGuard] : '' };
      out.quizzes.push({ id: q.id, title: q.title, classIds: q.classIds, box: await CK.seal(payload, q.code) });
    }
    return out;
  }
  function renderPublish(v) {
    const gh = S.settings.gh;
    v.innerHTML = `<h2>Publish for students</h2>
      <div class="panel"><p>Publishing creates <span class="mono">data/portal.json</span>: every student's grades, history and feedback, <b>each encrypted with that student's PIN</b>, plus the open phone quizzes (encrypted with their code). Names never appear in clear text in the file.</p>
        <p class="small muted">Last published: ${S.published ? new Date(S.published).toLocaleString('en-GB') : 'never'}</p>
        <div class="row"><button class="btn pri" id="dl">Build &amp; download portal.json</button><button class="btn acc" id="gh" ${gh.owner && gh.repo && gh.token ? '' : 'disabled'}>Build &amp; push to GitHub</button><span id="prog" class="small muted"></span></div>
        <p class="small muted">After downloading, upload the file to <span class="mono">classkit/data/portal.json</span> in your GitHub repository (Add file → Upload files). GitHub Pages updates in about a minute.</p></div>
      <div class="panel"><strong>One-click publishing to GitHub (optional)</strong>
        <p class="small muted">Create a fine-grained token on github.com → Settings → Developer settings → Personal access tokens, limited to this one repository with "Contents: Read and write". It is stored only in this browser.</p>
        <div class="grid2"><label class="f">Owner<input type="text" id="go" value="${esc(gh.owner)}" placeholder="omarimohamad06-eng"></label><label class="f">Repository<input type="text" id="gr" value="${esc(gh.repo)}" placeholder="-2026-2027-"></label>
        <label class="f">Branch served by GitHub Pages<input type="text" id="gb" value="${esc(gh.branch)}" placeholder="main"></label><label class="f">File path<input type="text" id="gp" value="${esc(gh.path)}"></label>
        <label class="f">Token<input type="password" id="gt" value="${esc(gh.token)}" placeholder="github_pat_…"></label>
        <label class="f">Public address of ClassKit (for PIN slips)<input type="url" id="pu" value="${esc(S.settings.portalUrl)}" placeholder="https://omarimohamad06-eng.github.io/-2026-2027-/classkit/"></label></div>
        <div class="row" style="margin-top:8px"><button class="btn sm" id="gsave">Save</button></div></div>
      <div class="panel small"><b>Links to share with students:</b> ${portalBase() ? `<a href="${esc(portalBase())}portal.html" target="_blank">${esc(portalBase())}portal.html</a> (grades) · <a href="${esc(portalBase())}quiz.html" target="_blank">${esc(portalBase())}quiz.html</a> (quiz)` : 'set the public address above.'}</div>`;
    const prog = (i, n) => { $('#prog').textContent = `Encrypting ${i}/${n}…`; };
    $('#dl').onclick = async () => {
      const b = await buildBundle(prog); download('portal.json', JSON.stringify(b)); S.published = Date.now(); save(); $('#prog').textContent = 'Done ✓';
    };
    $('#gsave').onclick = () => {
      Object.assign(gh, { owner: $('#go').value.trim(), repo: $('#gr').value.trim(), branch: $('#gb').value.trim(), path: $('#gp').value.trim() || 'classkit/data/portal.json', token: $('#gt').value.trim() });
      S.settings.portalUrl = $('#pu').value.trim(); save(); render(); toast('Saved');
    };
    $('#gh').onclick = async () => {
      try {
        const b = await buildBundle(prog);
        $('#prog').textContent = 'Uploading…';
        const api = `https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/contents/${gh.path.split('/').map(encodeURIComponent).join('/')}`;
        const headers = { Authorization: 'Bearer ' + gh.token, Accept: 'application/vnd.github+json' };
        let sha;
        const cur = await fetch(api + (gh.branch ? '?ref=' + encodeURIComponent(gh.branch) : ''), { headers });
        if (cur.ok) sha = (await cur.json()).sha;
        const body = { message: 'ClassKit: update portal data', content: CK.b64.from(new TextEncoder().encode(JSON.stringify(b))), sha };
        if (gh.branch) body.branch = gh.branch;
        const r = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!r.ok) throw new Error((await r.json()).message || r.status);
        S.published = Date.now(); save(); $('#prog').textContent = 'Published ✓ (live in about a minute)';
      } catch (e) { $('#prog').textContent = 'Failed: ' + e.message; }
    };
  }

  // ───────────────────────── settings & backup ─────────────────────────
  function restore(d) { S = Object.assign(blank(), d); S.settings = Object.assign(blank().settings, d.settings); save(); render(); toast('Backup restored'); }
  function renderSettings(v) {
    const st = S.settings;
    v.innerHTML = `<h2>Settings</h2>
      <div class="panel grid2">
        <label class="f">Teacher<input type="text" id="s_teacher" value="${esc(st.teacher)}"></label>
        <label class="f">School<input type="text" id="s_school" class="ar" value="${esc(st.school)}"></label>
        <label class="f">Subject<input type="text" id="s_subject" value="${esc(st.subject)}"></label>
        <label class="f">School year<input type="text" id="s_year" value="${esc(st.year)}"></label>
        <label class="f">+/− step<input type="number" id="s_step" min="0.25" max="2" step="0.25" value="${st.step}"></label>
      </div>
      <div class="panel"><strong>Barème des activités intégrées</strong>
        <p class="small muted">Si le total des maxima n’est pas 20, la note des activités est ramenée sur 20 automatiquement.</p>
        <div class="grid2">
        <label class="f">Participation — max<input type="number" id="s_maxPart" min="1" max="20" step="0.5" value="${st.maxPart}"></label>
        <label class="f">Absence — max<input type="number" id="s_maxAbs" min="1" max="20" step="0.5" value="${st.maxAbs}"></label>
        <label class="f">Part des contrôles dans la note générale (0.75 = 75 %, activités = le reste)<input type="number" id="s_weightTests" min="0" max="1" step="0.05" value="${st.weightTests}"></label>
        <label class="f">Points retirés par séance d’absence<input type="number" id="s_absPenalty" min="0" max="5" step="0.25" value="${st.absPenalty}"></label>
        <label class="f">Organisation du cahier — max<input type="number" id="s_maxCahier" min="1" max="20" step="0.5" value="${st.maxCahier}"></label>
        <label class="f">Contrôles du cahier<select id="s_cahierChecks"><option value="2" ${st.cahierChecks === 2 ? 'selected' : ''}>2 contrôles (moyenne)</option><option value="1" ${st.cahierChecks === 1 ? 'selected' : ''}>1 contrôle</option></select></label>
        <label class="f">Travail à rédiger — max<input type="number" id="s_maxTravail" min="1" max="20" step="0.5" value="${st.maxTravail}"></label>
        <label class="f">Nombre de travaux à rédiger<select id="s_travailCount"><option value="2" ${st.travailCount === 2 ? 'selected' : ''}>2 travaux (moyenne)</option><option value="1" ${st.travailCount === 1 ? 'selected' : ''}>1 travail</option></select></label>
        </div>
      </div>
      <div class="panel"><strong>Backup</strong><p class="small muted">Everything lives in this browser. Download a backup every week (USB key, e-mail to yourself…). The backup contains names and PINs: keep it private.</p>
        <div class="row"><button class="btn pri" id="bk">Download backup</button><label class="btn">Restore backup…<input type="file" id="rs" accept=".json" hidden></label>
        <label class="btn">Import roster file…<input type="file" id="rf" accept=".json" hidden></label>
        <span class="spacer"></span><button class="btn danger" id="wipe">Erase all data</button></div></div>`;
    $$('[id^=s_]', v).forEach(el => el.onchange = () => {
      const k = el.id.slice(2);
      st[k] = el.type === 'number' || el.tagName === 'SELECT' ? +el.value : el.value; save();
    });
    $('#bk').onclick = () => download(`classkit-backup-${today()}.json`, JSON.stringify(S));
    $('#rs').onchange = e => readJsonFile(e.target.files[0], d => { if (d.v && d.classes && confirm('Replace everything in this browser with this backup?')) restore(d); });
    $('#rf').onchange = e => readJsonFile(e.target.files[0], d => importRoster(d));
    $('#wipe').onclick = () => { if (confirm('Erase ALL classes, grades and quizzes from this browser?') && confirm('Really? Download a backup first if unsure.')) { S = blank(); save(); render(); } };
  }

  // expose a few things for tests
  window.ClassKit = { get state() { return S; }, importRoster, parseResult, buildBundle, render };
  if (!S.ui.cls && S.classes[0]) S.ui.cls = S.classes[0].id;
  render();
})();
