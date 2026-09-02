/** ⭐ سجل الشهر — la grille mensuelle de présence (cœur de l'application). */
import { h, toast, clear, download } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app } from '../app.js';
import { classSelect, moisSelect, emptyState } from '../components/pickers.js';
import { renderCurrent } from '../router.js';
import { STATES, CYCLE, nextState } from '../../core/attendance.js';
import { statsMois } from '../../core/stats.js';
import { moisLabel, todayISO, spansConges } from '../../core/schoolCalendar.js';
import { toCSV } from '../../utils/csv.js';
import { imprimerMois } from '../../export/print.js';
import { telechargerPdfMois } from '../../export/pdf.js';

let brush = 'a';                 // état appliqué au clic (le « pinceau »)
let saveTimer = null;

export async function renderRegister() {
  if (!app.classes.length) {
    return emptyState('🏫', 'مرحبا بك', 'أنشئ قسمك الأول ثم أضف التلاميذ لبدء تعبئة السجل.',
      h('a.btn.btn-primary', { href: '#/classes' }, 'إنشاء قسم'));
  }

  const cal = app.calendar;
  const students = await repo.listStudents(app.classId);
  const reg = await repo.getRegister(app.classId, app.mois);
  const cls = app.classes.find(c => c.id === app.classId);

  const wrap = h('div');

  /* ------- barre d'outils ------- */
  const barre = h('div.card', {},
    h('div.row', {},
      h('div', { style: { flex: '1 1 220px' } }, classSelect(() => renderCurrent())),
      h('div', { style: { flex: '1 1 160px' } }, moisSelect(() => renderCurrent())),
      h('span.spacer', { style: { marginInlineStart: 'auto' } }),
      h('button.btn', { onclick: () => imprimerMois({ settings: app.settings, cls, cal, mois: app.mois, students, reg }) }, '🖨 طباعة'),
      ' ',
      h('button.btn.btn-gold', { onclick: async () => {
        toast('جارٍ إنشاء ملف PDF…');
        try { await telechargerPdfMois({ settings: app.settings, cls, cal, mois: [app.mois], students, regs: { [app.mois]: reg } }); }
        catch (e) { console.error(e); toast('تعذر إنشاء PDF: ' + e.message, 'err'); }
      } }, '⬇ PDF'),
      ' ',
      h('button.btn', { onclick: () => exporterCSV(cal, cls, app.mois, students, reg) }, '⬇ CSV'),
    ));

  /* ------- palette de saisie ------- */
  const boutonsBrush = CYCLE.map(code => {
    const st = STATES[code];
    const btn = h('button', {
      class: code === brush ? 'on' : '',
      title: st.label,
      onclick: () => { brush = code; [...boutonsBrush].forEach(b => b.classList.toggle('on', b.dataset.code === brush)); },
      dataset: { code },
    }, h('span.chip', { style: { background: st.couleur } }), st.label || 'مسح');
    return btn;
  });
  const palette = h('div.card', { style: { paddingBlock: '.6rem' } },
    h('div.brush', {},
      h('strong.small', { style: { marginInlineEnd: '.4rem' } }, 'أداة التعليم:'),
      ...boutonsBrush,
      h('span.muted.small', { style: { marginInlineStart: 'auto' } },
        'نقرة = تطبيق الأداة · نقرة ثانية = مسح · الأسهم للتنقل · مفاتيح 1‑5')));

  if (!students.length) {
    wrap.append(barre, emptyState('👥', 'لا يوجد تلاميذ',
      'أضف تلاميذ هذا القسم لتظهر شبكة الحضور.',
      h('a.btn.btn-primary', { href: '#/students' }, 'إضافة التلاميذ')));
    return wrap;
  }

  /* ------- grille ------- */
  const sumRefs = new Map();     // studentId -> { etude, abs, pres, taux }
  const footRefs = {};
  const s0 = statsMois(cal, app.mois, students, reg, app.settings);
  const days = s0.days;
  const spans = spansConges(days);
  const labelParJour = {};
  for (const sp of spans) if (sp.day.periode) labelParJour[sp.day.jour] = sp.day.periode.libelle;
  const today = todayISO();

  const thead = h('thead', {}, h('tr', {},
    h('th.col-rt', {}, 'ر.ت'),
    h('th.col-nom', {}, 'الاسم والنسب'),
    days.map(d => h('th', {
      class: 'day' + (d.capacite <= 0 ? ' off' : '') + (d.date === today ? ' today' : ''),
      title: `${d.nom} ${d.jour} — ${d.periode ? d.periode.libelle : (d.kind === 'weekend' ? 'عطلة نهاية الأسبوع' : d.kind === 'hors' ? 'خارج السنة الدراسية' : (d.capacite === 1 ? 'نصف يوم' : 'يوم دراسي'))}`,
    },
      h('span.dnum', {}, String(d.jour)),
      h('span.dab', {}, d.ab),
      labelParJour[d.jour] ? h('span.vlabel', {}, labelParJour[d.jour]) : null)),
    h('th.sum', {}, 'أنصاف أيام الدراسة'),
    h('th.sum', {}, 'أنصاف أيام الغياب'),
    h('th.sum', {}, 'أنصاف أيام الحضور'),
    h('th.sum', {}, 'النسبة %'),
    h('th.note', {}, 'ملاحظات')));

  const tbody = h('tbody', {}, s0.rows.map((row, ri) => {
    const st = row.student;
    const cells = days.map(d => {
      const hors = (st.dateInscription && d.date < st.dateInscription) ||
                   (st.dateRadiation && d.date > st.dateRadiation);
      const code = reg.cells?.[st.id]?.[String(d.jour)] || '';
      const td = h('td', {
        class: 'cell' + (d.capacite <= 0 ? ' off' : hors ? ' out' : '') + (code ? ' s-' + code : ''),
        tabIndex: d.capacite > 0 && !hors ? 0 : -1,
        dataset: { sid: st.id, jour: d.jour, ri, ci: d.jour },
        title: d.capacite <= 0 ? (d.periode?.libelle || 'يوم غير دراسي') : `${st.nom} — ${d.jour}`,
      }, STATES[code]?.court || '');
      if (d.capacite > 0 && !hors) {
        td.addEventListener('click', () => appliquer(td, st.id, d.jour));
        td.addEventListener('keydown', e => clavier(e, td, st.id, d.jour));
      }
      return td;
    });

    const refs = {
      etude: h('td.sum', {}, String(row.etude)),
      abs:   h('td.sum', {}, String(row.absence)),
      pres:  h('td.sum', {}, String(row.presence)),
      taux:  h('td', { class: 'sum taux' + (row.alerte ? ' bad' : '') }, row.etude ? row.taux.toFixed(2) : '—'),
    };
    sumRefs.set(st.id, refs);

    return h('tr', {},
      h('td.col-rt', {}, String(st.rt)),
      h('td.col-nom', { title: st.nom }, st.nom),
      cells, refs.etude, refs.abs, refs.pres, refs.taux,
      h('td.note', {}, h('input', {
        value: row.note, placeholder: '…',
        onchange: e => {
          reg.notes = reg.notes || {};
          const v = e.target.value.trim();
          if (v) reg.notes[st.id] = v; else delete reg.notes[st.id];
          planifierSauvegarde();
        },
      })));
  }));

  footRefs.taux = h('td.taux-global', { colSpan: 2 }, s0.totals.taux.toFixed(2) + ' %');
  const tfoot = h('tfoot', {}, h('tr', {},
    h('td', { colSpan: 2 + days.length }, 'نسبة المواظبة الشهرية بـ %'),
    footRefs.etude = h('td', {}, String(s0.totals.etude)),
    footRefs.abs = h('td', {}, String(s0.totals.absence)),
    footRefs.taux,
    h('td', {}, '')));

  const table = h('table.register', {}, thead, tbody, tfoot);
  const grille = h('div.card', {},
    h('div.card-head', {},
      h('h2', {}, `${cls.nom}${cls.fawj ? ' — ' + cls.fawj : ''} · ${moisLabel(app.mois)}`),
      h('span.spacer'),
      h('span.muted.small', {}, `${s0.totals.joursOuvres} يوم دراسي · ${students.length} تلميذ(ة)`)),
    h('div.register-wrap', {}, table));

  /* ------- interactions ------- */
  function ecrire(sid, jour, code) {
    reg.cells = reg.cells || {};
    const ligne = reg.cells[sid] || (reg.cells[sid] = {});
    if (code) ligne[String(jour)] = code; else delete ligne[String(jour)];
    if (!Object.keys(ligne).length) delete reg.cells[sid];
  }

  function peindre(td, code) {
    for (const c of CYCLE) td.classList.remove('s-' + c);
    if (code) td.classList.add('s-' + code);
    td.textContent = STATES[code]?.court || '';
  }

  function appliquer(td, sid, jour, force = null) {
    const actuel = reg.cells?.[sid]?.[String(jour)] || '';
    const code = force !== null ? force : (actuel === brush ? '' : brush);
    ecrire(sid, jour, code);
    peindre(td, code);
    recalculer();
    planifierSauvegarde();
  }

  function clavier(e, td, sid, jour) {
    const map = { '1': 'a', '2': 'am', '3': 'pm', '4': 'aj', '5': 'r', '0': '', 'Delete': '', 'Backspace': '' };
    if (e.key in map) { e.preventDefault(); appliquer(td, sid, jour, map[e.key]); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      appliquer(td, sid, jour, nextState(reg.cells?.[sid]?.[String(jour)] || ''));
      return;
    }
    const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowRight: [0, -1], ArrowLeft: [0, 1] };
    if (e.key in dirs) {
      e.preventDefault();
      const [dr, dc] = dirs[e.key];
      const ri = Number(td.dataset.ri), ci = Number(td.dataset.ci);
      for (let k = 1; k <= 45; k++) {
        const next = table.querySelector(
          `td.cell[data-ri="${ri + dr * k}"][data-ci="${ci + dc * k}"]`);
        if (!next) break;
        if (next.tabIndex === 0) { next.focus(); return; }
      }
    }
  }

  function recalculer() {
    const s = statsMois(cal, app.mois, students, reg, app.settings);
    for (const row of s.rows) {
      const r = sumRefs.get(row.student.id);
      if (!r) continue;
      r.etude.textContent = String(row.etude);
      r.abs.textContent = String(row.absence);
      r.pres.textContent = String(row.presence);
      r.taux.textContent = row.etude ? row.taux.toFixed(2) : '—';
      r.taux.classList.toggle('bad', row.alerte);
    }
    footRefs.etude.textContent = String(s.totals.etude);
    footRefs.abs.textContent = String(s.totals.absence);
    footRefs.taux.textContent = s.totals.taux.toFixed(2) + ' %';
  }

  function planifierSauvegarde() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await repo.saveRegister(reg);
      toast('تم الحفظ تلقائيا ✓');
    }, 500);
  }

  const legende = h('p.small.muted', {},
    'الخانات الرمادية = عطلة أو نهاية أسبوع (غير قابلة للتعليم) · الخانات المخططة = خارج فترة تسجيل التلميذ · الخانة الفارغة = حاضر.');

  wrap.append(barre, palette, grille, legende);
  return wrap;
}

function exporterCSV(cal, cls, mois, students, reg) {
  const s = statsMois(cal, mois, students, reg, app.settings);
  const entete = ['ر.ت', 'الاسم والنسب', ...s.days.map(d => `${d.jour} ${d.ab}`),
    'أنصاف أيام الدراسة', 'أنصاف أيام الغياب', 'أنصاف أيام الحضور', 'نسبة المواظبة %', 'ملاحظات'];
  const lignes = s.rows.map(r => [
    r.student.rt, r.student.nom,
    ...s.days.map(d => {
      if (d.capacite <= 0) return '—';
      return STATES[reg.cells?.[r.student.id]?.[String(d.jour)] || '']?.court || '';
    }),
    r.etude, r.absence, r.presence, r.etude ? r.taux.toFixed(2) : '', r.note,
  ]);
  download(`سجل-${cls.nom}-${mois}.csv`, toCSV([entete, ...lignes]), 'text/csv');
}
