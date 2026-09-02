/** الأقسام — création et gestion des classes. */
import { h, toast, confirmBox, clear } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { refresh, app, setClass } from '../app.js';
import { renderCurrent } from '../router.js';
import { LEVELS } from '../../data/levels.js';
import { DAY_NAME } from '../../core/schoolCalendar.js';
import { t } from '../../i18n/index.js';

function formClasse(cls, onDone) {
  const c = { joursSeance: [1, 2, 3, 4, 5, 6], ...cls };
  const nomInput = h('input', { value: c.nom || '', oninput: e => c.nom = e.target.value });

  const niveauSel = h('select', {
    onchange: e => {
      c.niveau = e.target.value;
      const lvl = LEVELS.find(l => l.code === c.niveau);
      if (lvl && !c.nom) { c.nom = lvl.ar; nomInput.value = lvl.ar; }
    },
  }, [h('option', { value: '' }, t('— اختر —')),
      ...LEVELS.map(l => h('option', { value: l.code, selected: l.code === c.niveau }, `${l.code} — ${l.ar}`))]);

  const jours = h('div.row', {}, DAY_NAME.map((nom, i) =>
    h('label', { style: { display: 'flex', gap: '.25rem', alignItems: 'center', fontWeight: '400' } },
      h('input', {
        type: 'checkbox', style: { width: 'auto' }, checked: c.joursSeance.includes(i),
        onchange: e => {
          c.joursSeance = e.target.checked
            ? [...new Set([...c.joursSeance, i])].sort()
            : c.joursSeance.filter(x => x !== i);
        },
      }), t(nom))));

  return h('div', {},
    h('div.grid.grid-2', {},
      h('div.field', {}, h('label', {}, t('المستوى')), niveauSel),
      h('div.field', {}, h('label', {}, t('اسم القسم')), nomInput),
      h('div.field', {}, h('label', {}, t('الفوج')),
        h('input', { value: c.fawj || '', placeholder: t('فوج 1'), oninput: e => c.fawj = e.target.value })),
      h('div.field', {}, h('label', {}, t('المادة')),
        h('input', { value: c.matiere || '', oninput: e => c.matiere = e.target.value })),
      h('div.field', {}, h('label', {}, t('الترتيب')),
        h('input', { type: 'number', min: 1, value: c.ordre ?? '', oninput: e => c.ordre = e.target.value })),
    ),
    h('div.field', {}, h('label', {}, t('أيام الحصص')), jours),
    h('div.row', {},
      h('button.btn.btn-primary', {
        onclick: async () => {
          if (!c.nom?.trim()) return toast('أدخل اسم القسم', 'err');
          const saved = await repo.saveClass(c);
          await refresh();
          if (!app.classId) setClass(saved.id);
          toast('تم حفظ القسم ✓');
          onDone?.();
        },
      }, t('حفظ القسم'))));
}

export async function renderClasses() {
  const wrap = h('div');

  const compteurs = {};
  for (const c of app.classes) compteurs[c.id] = (await repo.listStudents(c.id)).length;

  const liste = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, t('الأقسام')),
      h('span.spacer'),
      h('span.muted.small', {}, t('{n} قسم', { n: app.classes.length }))),
    app.classes.length
      ? h('div.table-wrap', {}, h('table.data', {},
          h('thead', {}, h('tr', {},
            h('th', {}, t('المستوى')), h('th', {}, t('القسم')), h('th', {}, t('الفوج')),
            h('th', {}, t('المادة')), h('th', {}, t('التلاميذ')), h('th', {}, ''))),
          h('tbody', {}, app.classes.map(c => h('tr', {},
            h('td', {}, c.niveau || '—'),
            h('td', {}, c.nom),
            h('td', {}, c.fawj || '—'),
            h('td', {}, c.matiere || '—'),
            h('td', {}, String(compteurs[c.id] || 0)),
            h('td', {},
              h('button.btn.btn-sm', {
                onclick: () => {
                  const box = clear(editZone);
                  box.append(h('div.card', {},
                    h('div.card-head', {}, h('h2', {}, t('تعديل القسم'))),
                    formClasse(c, () => renderCurrent())));
                  box.scrollIntoView({ behavior: 'smooth' });
                },
              }, t('تعديل')), ' ',
              h('button.btn.btn-sm.btn-danger', {
                onclick: async () => {
                  const ok = await confirmBox(t('حذف القسم'),
                    t('سيتم حذف «{nom}» مع جميع تلاميذه وسجلاته الشهرية. لا يمكن التراجع.', { nom: c.nom }));
                  if (!ok) return;
                  await repo.deleteClass(c.id);
                  await refresh();
                  toast('تم حذف القسم');
                  renderCurrent();
                },
              }, t('حذف')))))))
        )
      : h('div.empty', {}, h('div.big', {}, '🏫'), h('p.muted', {}, t('لا يوجد أي قسم بعد. أضف قسمك الأول أسفله.'))));

  const editZone = h('div');

  const ajout = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, t('إضافة قسم جديد'))),
    formClasse({}, () => renderCurrent()));

  wrap.append(liste, editZone, ajout);
  return wrap;
}
