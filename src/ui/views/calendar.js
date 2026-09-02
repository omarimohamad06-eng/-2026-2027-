/** الرزنامة — édition du calendrier scolaire (vacances, fêtes, examens). */
import { h, toast, confirmBox, clear, uid } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app, refresh } from '../app.js';
import { renderCurrent } from '../router.js';
import { DAY_NAME } from '../../core/schoolCalendar.js';

const TYPES = {
  vacances: 'عطلة مدرسية',
  ferie:    'عيد / يوم وطني',
  examen:   'امتحان',
  autre:    'أخرى',
};

export async function renderCalendar() {
  const cal = structuredClone(app.calendar);

  const sauver = async (message = 'تم الحفظ ✓') => {
    await repo.saveCalendar(cal);
    await refresh();
    toast(message);
  };

  const nonConfirmees = cal.periodes.filter(p => !p.confirme).length;

  const bandeau = nonConfirmees ? h('div.hint', {},
    h('b', {}, '⚠ تنبيه: '),
    `${nonConfirmees} فترة مُدرجة كتقدير في انتظار المذكرة الوزارية الرسمية للموسم ${cal.anneeScolaire} `,
    '(عطل الفترات البينية والأعياد الدينية المرتبطة بالرؤية الهلالية). ',
    'صحّحها هنا بمجرد صدور التواريخ الرسمية، وستُحدَّث كل نسب المواظبة تلقائيا.') : null;

  /* ---------- paramètres généraux ---------- */
  const champDate = (key, label) => h('div.field', {},
    h('label', {}, label),
    h('input', { type: 'date', value: cal[key], onchange: e => { cal[key] = e.target.value; sauver(); } }));

  const cases = (key, label, aide) => h('div.field', {},
    h('label', {}, label),
    h('div.row', {}, DAY_NAME.map((nom, i) =>
      h('label', { style: { display: 'flex', gap: '.25rem', alignItems: 'center', fontWeight: '400' } },
        h('input', {
          type: 'checkbox', style: { width: 'auto' }, checked: (cal[key] || []).includes(i),
          onchange: e => {
            cal[key] = e.target.checked
              ? [...new Set([...(cal[key] || []), i])].sort()
              : (cal[key] || []).filter(x => x !== i);
            sauver();
          },
        }), nom))),
    h('p.small.muted', {}, aide));

  const general = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, `الرزنامة الدراسية ${cal.anneeScolaire}`),
      h('span.spacer'),
      h('button.btn.btn-danger.btn-sm', {
        onclick: async () => {
          if (!await confirmBox('استعادة الرزنامة الأصلية',
            'سيتم استبدال جميع تعديلاتك بالرزنامة المُحمّلة مسبقا. هل تريد المتابعة؟', 'استعادة')) return;
          await repo.resetCalendar();
          await refresh();
          toast('تمت استعادة الرزنامة الأصلية');
          renderCurrent();
        },
      }, '↺ استعادة الأصل')),
    h('div.grid.grid-2', {},
      champDate('debutAnnee', 'بداية الدراسة'),
      champDate('finAnnee', 'نهاية الدراسة')),
    cases('joursWeekend', 'أيام العطلة الأسبوعية', 'الأيام المحددة لا تُحتسب ضمن أنصاف أيام الدراسة.'),
    cases('joursDemiJournee', 'أيام بنصف يوم واحد', 'يوم دراسي بحصة صباحية فقط (نصف واحد بدل نصفين) — السبت عادة.'));

  /* ---------- liste des périodes ---------- */
  const listeZone = h('div');

  const dessineListe = () => {
    clear(listeZone);
    const tri = [...cal.periodes].sort((a, b) => a.du.localeCompare(b.du));
    listeZone.append(h('div.table-wrap', {}, h('table.data', {},
      h('thead', {}, h('tr', {},
        h('th', {}, 'التسمية'),
        h('th', { style: { width: '140px' } }, 'النوع'),
        h('th', { style: { width: '140px' } }, 'من'),
        h('th', { style: { width: '140px' } }, 'إلى'),
        h('th', { style: { width: '90px' } }, 'مؤكدة'),
        h('th', { style: { width: '70px' } }, ''))),
      h('tbody', {}, tri.map(p => h('tr', {},
        h('td', {}, h('input', {
          value: p.libelle, style: { border: 'none', background: 'transparent' },
          onchange: e => { p.libelle = e.target.value; sauver(); },
        })),
        h('td', {}, h('select', {
          onchange: e => { p.type = e.target.value; sauver(); },
        }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: p.type === k }, v)))),
        h('td', {}, h('input', { type: 'date', value: p.du, onchange: e => { p.du = e.target.value; sauver(); } })),
        h('td', {}, h('input', { type: 'date', value: p.au || p.du, onchange: e => { p.au = e.target.value; sauver(); } })),
        h('td', { style: { textAlign: 'center' } }, h('input', {
          type: 'checkbox', style: { width: 'auto' }, checked: !!p.confirme,
          title: 'حدّد الخانة بعد التأكد من التاريخ الرسمي',
          onchange: e => { p.confirme = e.target.checked; sauver('تم تأكيد التاريخ ✓'); },
        })),
        h('td', {}, h('button.btn.btn-sm.btn-danger', {
          onclick: async () => {
            if (!await confirmBox('حذف الفترة', `حذف «${p.libelle}»؟`)) return;
            cal.periodes = cal.periodes.filter(x => x.id !== p.id);
            await sauver('تم الحذف');
            dessineListe();
          },
        }, '✕'))))))));
  };
  dessineListe();

  /* ---------- ajout ---------- */
  const nouveau = { id: '', type: 'vacances', libelle: '', du: cal.debutAnnee, au: cal.debutAnnee, confirme: true };
  const ajout = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, 'إضافة فترة')),
    h('div.grid.grid-2', {},
      h('div.field', {}, h('label', {}, 'التسمية'),
        h('input', { placeholder: 'مثال: عطلة الفترة البينية', oninput: e => nouveau.libelle = e.target.value })),
      h('div.field', {}, h('label', {}, 'النوع'),
        h('select', { onchange: e => nouveau.type = e.target.value },
          Object.entries(TYPES).map(([k, v]) => h('option', { value: k }, v)))),
      h('div.field', {}, h('label', {}, 'من'),
        h('input', { type: 'date', value: nouveau.du, oninput: e => nouveau.du = e.target.value })),
      h('div.field', {}, h('label', {}, 'إلى'),
        h('input', { type: 'date', value: nouveau.au, oninput: e => nouveau.au = e.target.value })),
    ),
    h('button.btn.btn-primary', {
      onclick: async () => {
        if (!nouveau.libelle.trim()) return toast('أدخل تسمية الفترة', 'err');
        if (nouveau.au < nouveau.du) return toast('تاريخ النهاية قبل تاريخ البداية', 'err');
        cal.periodes.push({ ...nouveau, id: uid('p') });
        await sauver('تمت الإضافة ✓');
        dessineListe();
      },
    }, '+ إضافة'));

  return h('div', {}, bandeau, general,
    h('div.card', {}, h('div.card-head', {}, h('h2', {}, 'العطل والأعياد والامتحانات')), listeZone),
    ajout);
}
