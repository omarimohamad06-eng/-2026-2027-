/** الرزنامة — édition du calendrier scolaire (vacances, fêtes, examens). */
import { h, toast, confirmBox, clear, uid } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app, refresh } from '../app.js';
import { renderCurrent } from '../router.js';
import { DAY_NAME } from '../../core/schoolCalendar.js';
import { t } from '../../i18n/index.js';

/** Les libellés sont traduits au rendu, pas au chargement du module. */
const TYPES = {
  vacances: 'عطلة مدرسية',
  ferie:    'عيد / يوم وطني',
  examen:   'امتحان',
  autre:    'أخرى',
};

export async function renderCalendar() {
  const cal = structuredClone(app.calendar);

  const sauver = async (message = t('تم الحفظ ✓')) => {
    await repo.saveCalendar(cal);
    await refresh();
    toast(message);
  };

  const nonConfirmees = cal.periodes.filter(p => !p.confirme).length;

  const bandeau = nonConfirmees ? h('div.hint', {},
    h('b', {}, t('⚠ تنبيه: ')),
    t('{n} فترة مُدرجة كتقدير في انتظار المذكرة الوزارية الرسمية للموسم {annee} ',
      { n: nonConfirmees, annee: cal.anneeScolaire }),
    t('(عطل الفترات البينية والأعياد الدينية المرتبطة بالرؤية الهلالية). '),
    t('صحّحها هنا بمجرد صدور التواريخ الرسمية، وستُحدَّث كل نسب المواظبة تلقائيا.')) : null;

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
        }), t(nom)))),
    h('p.small.muted', {}, aide));

  const general = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, `${t('الرزنامة الدراسية')} ${cal.anneeScolaire}`),
      h('span.spacer'),
      h('button.btn.btn-danger.btn-sm', {
        onclick: async () => {
          if (!await confirmBox(t('استعادة الرزنامة الأصلية'),
            t('سيتم استبدال جميع تعديلاتك بالرزنامة المُحمّلة مسبقا. هل تريد المتابعة؟'), t('استعادة'))) return;
          await repo.resetCalendar();
          await refresh();
          toast('تمت استعادة الرزنامة الأصلية');
          renderCurrent();
        },
      }, t('↺ استعادة الأصل'))),
    h('div.grid.grid-2', {},
      champDate('debutAnnee', t('بداية الدراسة')),
      champDate('finAnnee', t('نهاية الدراسة'))),
    cases('joursWeekend', t('أيام العطلة الأسبوعية'), t('الأيام المحددة لا تُحتسب ضمن أنصاف أيام الدراسة.')),
    cases('joursDemiJournee', t('أيام بنصف يوم واحد'), t('يوم دراسي بحصة صباحية فقط (نصف واحد بدل نصفين) — السبت عادة.')));

  /* ---------- liste des périodes ---------- */
  const listeZone = h('div');

  const dessineListe = () => {
    clear(listeZone);
    const tri = [...cal.periodes].sort((a, b) => a.du.localeCompare(b.du));
    listeZone.append(h('div.table-wrap', {}, h('table.data', {},
      h('thead', {}, h('tr', {},
        h('th', {}, t('التسمية')),
        h('th', { style: { width: '140px' } }, t('النوع')),
        h('th', { style: { width: '140px' } }, t('من')),
        h('th', { style: { width: '140px' } }, t('إلى')),
        h('th', { style: { width: '90px' } }, t('مؤكدة')),
        h('th', { style: { width: '70px' } }, ''))),
      h('tbody', {}, tri.map(p => h('tr', {},
        h('td', {}, h('input', {
          value: p.libelle, style: { border: 'none', background: 'transparent' },
          onchange: e => { p.libelle = e.target.value; sauver(); },
        })),
        h('td', {}, h('select', {
          onchange: e => { p.type = e.target.value; sauver(); },
        }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: p.type === k }, t(v))))),
        h('td', {}, h('input', { type: 'date', value: p.du, onchange: e => { p.du = e.target.value; sauver(); } })),
        h('td', {}, h('input', { type: 'date', value: p.au || p.du, onchange: e => { p.au = e.target.value; sauver(); } })),
        h('td', { style: { textAlign: 'center' } }, h('input', {
          type: 'checkbox', style: { width: 'auto' }, checked: !!p.confirme,
          title: t('حدّد الخانة بعد التأكد من التاريخ الرسمي'),
          onchange: e => { p.confirme = e.target.checked; sauver(t('تم تأكيد التاريخ ✓')); },
        })),
        h('td', {}, h('button.btn.btn-sm.btn-danger', {
          onclick: async () => {
            if (!await confirmBox(t('حذف الفترة'), t('حذف «{nom}»؟', { nom: p.libelle }))) return;
            cal.periodes = cal.periodes.filter(x => x.id !== p.id);
            await sauver(t('تم الحذف'));
            dessineListe();
          },
        }, '✕'))))))));
  };
  dessineListe();

  /* ---------- ajout ---------- */
  const nouveau = { id: '', type: 'vacances', libelle: '', du: cal.debutAnnee, au: cal.debutAnnee, confirme: true };
  const ajout = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, t('إضافة فترة'))),
    h('div.grid.grid-2', {},
      h('div.field', {}, h('label', {}, t('التسمية')),
        h('input', { placeholder: t('مثال: عطلة الفترة البينية'), oninput: e => nouveau.libelle = e.target.value })),
      h('div.field', {}, h('label', {}, t('النوع')),
        h('select', { onchange: e => nouveau.type = e.target.value },
          Object.entries(TYPES).map(([k, v]) => h('option', { value: k }, t(v))))),
      h('div.field', {}, h('label', {}, t('من')),
        h('input', { type: 'date', value: nouveau.du, oninput: e => nouveau.du = e.target.value })),
      h('div.field', {}, h('label', {}, t('إلى')),
        h('input', { type: 'date', value: nouveau.au, oninput: e => nouveau.au = e.target.value })),
    ),
    h('button.btn.btn-primary', {
      onclick: async () => {
        if (!nouveau.libelle.trim()) return toast('أدخل تسمية الفترة', 'err');
        if (nouveau.au < nouveau.du) return toast('تاريخ النهاية قبل تاريخ البداية', 'err');
        cal.periodes.push({ ...nouveau, id: uid('p') });
        await sauver(t('تمت الإضافة ✓'));
        dessineListe();
      },
    }, t('+ إضافة')));

  return h('div', {}, bandeau, general,
    h('div.card', {}, h('div.card-head', {}, h('h2', {}, t('العطل والأعياد والامتحانات'))), listeZone),
    ajout);
}
