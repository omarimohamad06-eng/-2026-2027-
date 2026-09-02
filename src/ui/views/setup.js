/** إعداد المؤسسة — configuration de l'établissement. */
import { h, toast } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app, refresh } from '../app.js';

export async function renderSetup() {
  const s = { ...app.settings };
  const champ = (key, label, type = 'text', extra = {}) => h('div.field', {},
    h('label', { for: 'f_' + key }, label),
    h('input', { id: 'f_' + key, type, value: s[key] ?? '', ...extra,
      oninput: e => { s[key] = type === 'number' ? Number(e.target.value) : e.target.value; } }));

  const form = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, 'إعداد المؤسسة والأستاذ')),
    h('p.muted.small', {}, 'تُستعمل هذه المعطيات في ترويسة الطباعة وملفات PDF.'),
    h('div.grid.grid-2', {},
      champ('academie', 'الأكاديمية الجهوية'),
      champ('direction', 'المديرية الإقليمية'),
      champ('etablissement', 'المؤسسة'),
      champ('enseignant', 'الأستاذ(ة) — بالعربية'),
      champ('enseignantFr', 'الأستاذ(ة) — بالفرنسية (تذييل PDF)'),
      champ('anneeScolaire', 'السنة الدراسية'),
    ),
    h('h3', { style: { marginTop: '1rem' } }, 'عتبات الإنذار'),
    h('div.grid.grid-2', {},
      champ('seuilAlerteAbsence', 'عدد أنصاف أيام الغياب الشهري المُنذِر', 'number', { min: 1, max: 60 }),
      champ('seuilTauxFaible', 'نسبة المواظبة الدنيا (%)', 'number', { min: 50, max: 100 }),
    ),
    h('div.row', { style: { marginTop: '.8rem' } },
      h('button.btn.btn-primary', {
        onclick: async () => { await repo.saveSettings(s); await refresh(); toast('تم حفظ الإعدادات ✓'); },
      }, 'حفظ')),
  );

  return h('div', {}, form);
}
