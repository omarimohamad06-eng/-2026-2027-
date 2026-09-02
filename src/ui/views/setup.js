/** إعداد المؤسسة — configuration de l'établissement. */
import { h, toast } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app, refresh } from '../app.js';
import { t, LANGUES, getLangue } from '../../i18n/index.js';

export async function renderSetup() {
  const s = { ...app.settings };
  const champ = (key, label, type = 'text', extra = {}) => h('div.field', {},
    h('label', { for: 'f_' + key }, label),
    h('input', { id: 'f_' + key, type, value: s[key] ?? '', ...extra,
      oninput: e => { s[key] = type === 'number' ? Number(e.target.value) : e.target.value; } }));

  const form = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, t('إعداد المؤسسة والأستاذ'))),
    h('p.muted.small', {}, t('تُستعمل هذه المعطيات في ترويسة الطباعة وملفات PDF.')),
    h('div.grid.grid-2', {},
      champ('academie', t('الأكاديمية الجهوية')),
      champ('direction', t('المديرية الإقليمية')),
      champ('etablissement', t('المؤسسة')),
      champ('enseignant', t('الأستاذ(ة) — بالعربية')),
      champ('enseignantFr', t('الأستاذ(ة) — بالفرنسية (تذييل PDF)')),
      champ('anneeScolaire', t('السنة الدراسية')),
    ),
    h('h3', { style: { marginTop: '1rem' } }, t('عتبات الإنذار')),
    h('div.grid.grid-2', {},
      champ('seuilAlerteAbsence', t('عدد أنصاف أيام الغياب الشهري المُنذِر'), 'number', { min: 1, max: 60 }),
      champ('seuilTauxFaible', t('نسبة المواظبة الدنيا (%)'), 'number', { min: 50, max: 100 }),
    ),
    h('h3', { style: { marginTop: '1rem' } }, t('لغة الواجهة')),
    h('div.field', {},
      h('select', {
        onchange: e => dispatchEvent(new CustomEvent('langue-changee', { detail: e.target.value })),
      }, Object.entries(LANGUES).map(([code, nom]) =>
        h('option', { value: code, selected: code === getLangue() }, nom)))),
    h('div.row', { style: { marginTop: '.8rem' } },
      h('button.btn.btn-primary', {
        onclick: async () => { await repo.saveSettings(s); await refresh(); toast('تم حفظ الإعدادات ✓'); },
      }, t('حفظ'))),
  );

  return h('div', {}, form);
}
