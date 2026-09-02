/** الإحصائيات — synthèse annuelle par classe, graphique et alertes. */
import { h, clear, download, toast } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app } from '../app.js';
import { classSelect, emptyState } from '../components/pickers.js';
import { statsAnnee, statsMois } from '../../core/stats.js';
import { moisLabel } from '../../core/schoolCalendar.js';
import { MOIS_SCOLAIRES } from '../../data/calendar-2026-2027.js';
import { toCSV } from '../../utils/csv.js';
import { imprimerPlusieursMois } from '../../export/print.js';
import { telechargerPdfMois } from '../../export/pdf.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...kids);
  return n;
};

/** Courbe d'évolution de la نسبة المواظبة, mois par mois. */
function graphique(parMois) {
  const W = 720, H = 230, mg = { t: 24, r: 16, b: 34, l: 42 };
  const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
  const pts = parMois.map((m, i) => ({
    x: mg.l + (parMois.length === 1 ? iw / 2 : (i * iw) / (parMois.length - 1)),
    y: mg.t + ih - (Math.max(0, Math.min(100, m.taux)) / 100) * ih,
    m,
  }));
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: 'max-height:260px' });

  for (let v = 0; v <= 100; v += 25) {
    const y = mg.t + ih - (v / 100) * ih;
    svg.append(svgEl('line', { x1: mg.l, x2: W - mg.r, y1: y, y2: y, stroke: '#e3ded0', 'stroke-width': 1 }));
    const t = svgEl('text', { x: mg.l - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#5c6b66' });
    t.textContent = v + '%';
    svg.append(t);
  }

  const actifs = pts.filter(p => p.m.etude > 0);
  if (actifs.length > 1) {
    svg.append(svgEl('polyline', {
      points: actifs.map(p => `${p.x},${p.y}`).join(' '),
      fill: 'none', stroke: '#0d3b2e', 'stroke-width': 2.4, 'stroke-linejoin': 'round',
    }));
  }
  for (const p of pts) {
    if (p.m.etude > 0) {
      svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: '#c9a227', stroke: '#0d3b2e', 'stroke-width': 1.5 }));
      const lab = svgEl('text', { x: p.x, y: p.y - 9, 'text-anchor': 'middle', 'font-size': 9, fill: '#0d3b2e', 'font-weight': '700' });
      lab.textContent = p.m.taux.toFixed(0);
      svg.append(lab);
    }
    const t = svgEl('text', { x: p.x, y: H - 12, 'text-anchor': 'middle', 'font-size': 9.5, fill: '#5c6b66' });
    t.textContent = moisLabel(p.m.mois).split(' ')[0];
    svg.append(t);
  }
  return svg;
}

const badgeTaux = t => t >= 95 ? h('span.badge.ok', {}, t.toFixed(1) + '%')
  : t >= 90 ? h('span.badge.warn', {}, t.toFixed(1) + '%')
  : h('span.badge.bad', {}, t.toFixed(1) + '%');

export async function renderDashboard() {
  if (!app.classes.length) {
    return emptyState('📊', 'لا توجد معطيات', 'أنشئ قسما وأضف تلاميذ لعرض الإحصائيات.',
      h('a.btn.btn-primary', { href: '#/classes' }, 'إنشاء قسم'));
  }

  const wrap = h('div');
  const corps = h('div');

  const dessine = async () => {
    clear(corps);
    const cls = app.classes.find(c => c.id === app.classId);
    const students = await repo.listStudents(app.classId);
    const regs = await repo.registersByMois(app.classId);
    const st = statsAnnee(app.calendar, students, regs, app.settings);

    const tuiles = h('div.grid.grid-3', {},
      h('div.stat', {}, h('div.v', {}, st.global.taux.toFixed(2) + '%'), h('div.l', {}, 'نسبة المواظبة السنوية')),
      h('div.stat', {}, h('div.v', {}, String(st.global.etude)), h('div.l', {}, 'أنصاف أيام الدراسة')),
      h('div.stat', {}, h('div.v', {}, String(st.global.absence)), h('div.l', {}, 'أنصاف أيام الغياب')),
      h('div.stat', {}, h('div.v', {}, String(st.global.enAlerte)), h('div.l', {}, `تلاميذ دون ${app.settings.seuilTauxFaible}%`)),
    );

    const tableau = students.length ? h('div.table-wrap', {}, h('table.data', {},
      h('thead', {}, h('tr', {},
        h('th', { style: { width: '46px' } }, 'ر.ت'),
        h('th', {}, 'الاسم والنسب'),
        h('th', { style: { width: '90px' } }, 'الدراسة'),
        h('th', { style: { width: '90px' } }, 'الغياب'),
        h('th', { style: { width: '90px' } }, 'منه مبرر'),
        h('th', { style: { width: '70px' } }, 'التأخرات'),
        h('th', { style: { width: '110px' } }, 'المواظبة'),
        h('th', { style: { width: '140px' } }, ''))),
      h('tbody', {}, st.eleves.map(e => h('tr', {},
        h('td', {}, String(e.student.rt)),
        h('td', {}, e.student.nom),
        h('td', {}, String(e.etude)),
        h('td', {}, String(e.absence)),
        h('td', {}, String(e.justifiee)),
        h('td', {}, String(e.retards)),
        h('td', {}, e.etude ? badgeTaux(e.taux) : '—'),
        h('td', {}, h('div.bar', {}, h('i', { style: { width: Math.max(0, Math.min(100, e.taux)) + '%' } })))))))
    ) : h('div.empty', {}, h('p.muted', {}, 'لا يوجد تلاميذ في هذا القسم.'));

    const exportAnnuel = () => {
      // Absences mensuelles exprimées en أنصاف الأيام, comme les totaux annuels.
      const absencesParMois = Object.fromEntries(MOIS_SCOLAIRES.map(m => [
        m, new Map(statsMois(app.calendar, m, students, regs[m], app.settings)
          .rows.map(r => [r.student.id, r.absence])),
      ]));
      const entete = ['ر.ت', 'الاسم والنسب',
        ...MOIS_SCOLAIRES.map(m => `${moisLabel(m)} (أنصاف أيام الغياب)`),
        'مجموع أنصاف أيام الدراسة', 'مجموع الغياب', 'منه مبرر', 'التأخرات', 'نسبة المواظبة %'];
      const lignes = st.eleves
        .slice().sort((a, b) => a.student.rt - b.student.rt)
        .map(e => [
          e.student.rt, e.student.nom,
          ...MOIS_SCOLAIRES.map(m => absencesParMois[m].get(e.student.id) ?? 0),
          e.etude, e.absence, e.justifiee, e.retards, e.etude ? e.taux.toFixed(2) : '',
        ]);
      download(`حصيلة-سنوية-${cls.nom}.csv`, toCSV([entete, ...lignes]), 'text/csv');
    };

    corps.append(
      h('div.card', {},
        h('div.card-head', {},
          h('h2', {}, `الحصيلة السنوية — ${cls.nom}`),
          h('span.spacer'),
          h('div.actions', {},
            h('button.btn', { onclick: exportAnnuel }, '⬇ CSV سنوي'),
            h('button.btn', {
              onclick: () => imprimerPlusieursMois({
                settings: app.settings, cls, cal: app.calendar, moisListe: MOIS_SCOLAIRES, students, regs }),
            }, '🖨 طباعة كل الأشهر'),
            h('button.btn.btn-gold', {
              onclick: async () => {
                toast('جارٍ إنشاء ملف PDF للسنة كاملة…');
                try {
                  await telechargerPdfMois({ settings: app.settings, cls, cal: app.calendar,
                    mois: MOIS_SCOLAIRES, students, regs });
                } catch (e) { console.error(e); toast('تعذر إنشاء PDF: ' + e.message, 'err'); }
              },
            }, '⬇ PDF السنة'))),
        tuiles),
      h('div.card', {}, h('div.card-head', {}, h('h2', {}, 'تطور نسبة المواظبة')), graphique(st.parMois)),
      h('div.card', {},
        h('div.card-head', {}, h('h2', {}, 'التلاميذ حسب المواظبة'),
          h('span.spacer'), h('span.muted.small', {}, 'مرتبة تصاعديا — الأكثر غيابا في الأعلى')),
        tableau));
  };

  wrap.append(h('div.card', {}, h('div.row', {}, classSelect(() => dessine()))), corps);
  await dessine();
  return wrap;
}
