/** النسخ الاحتياطي — sauvegarde et restauration des données. */
import { h, toast, download, confirmBox } from '../../utils/dom.js';
import { exportBackup, importBackup } from '../../db/backup.js';
import * as repo from '../../db/repo.js';
import { app, refresh } from '../app.js';
import { renderCurrent } from '../router.js';
import * as idb from '../../db/idb.js';

export async function renderBackup() {
  const compte = {
    classes: app.classes.length,
    eleves: (await Promise.all(app.classes.map(c => repo.listStudents(c.id)))).reduce((s, l) => s + l.length, 0),
    registres: (await idb.getAll('registers')).length,
  };

  const fichier = h('input', { type: 'file', accept: '.json,application/json' });
  const mode = h('select', {}, [
    h('option', { value: 'replace' }, 'استبدال كل المعطيات الحالية'),
    h('option', { value: 'merge' }, 'دمج مع المعطيات الحالية'),
  ]);

  const restaurer = async () => {
    const f = fichier.files[0];
    if (!f) return toast('اختر ملف نسخة احتياطية', 'err');
    if (!await confirmBox('استعادة نسخة احتياطية',
      mode.value === 'replace'
        ? 'سيتم حذف كل المعطيات الحالية واستبدالها بمحتوى الملف. لا يمكن التراجع.'
        : 'سيتم دمج محتوى الملف مع معطياتك الحالية (يفوز محتوى الملف عند التعارض).',
      'استعادة')) return;
    try {
      const payload = JSON.parse(await f.text());
      const n = await importBackup(payload, mode.value);
      await repo.init();
      await refresh();
      toast(`تمت استعادة ${n} سجل ✓`);
      renderCurrent();
    } catch (e) {
      console.error(e);
      toast('فشل الاستيراد: ' + e.message, 'err');
    }
  };

  return h('div', {},
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'النسخ الاحتياطي')),
      h('div.grid.grid-3', {},
        h('div.stat', {}, h('div.v', {}, String(compte.classes)), h('div.l', {}, 'أقسام')),
        h('div.stat', {}, h('div.v', {}, String(compte.eleves)), h('div.l', {}, 'تلاميذ')),
        h('div.stat', {}, h('div.v', {}, String(compte.registres)), h('div.l', {}, 'سجلات شهرية'))),
      h('p.muted.small', { style: { marginTop: '.8rem' } },
        'كل المعطيات محفوظة محليا في هذا المتصفح فقط (IndexedDB). ',
        'أنشئ نسخة احتياطية بانتظام واحتفظ بها خارج الحاسوب (مفتاح USB، بريد إلكتروني، سحابة).'),
      h('button.btn.btn-primary', {
        onclick: async () => {
          const payload = await exportBackup();
          const nom = `نسخة-احتياطية-${app.settings.anneeScolaire.replace('/', '-')}-${new Date().toISOString().slice(0, 10)}.json`;
          download(nom, JSON.stringify(payload, null, 1), 'application/json');
          toast('تم إنشاء النسخة الاحتياطية ✓');
        },
      }, '⬇ تصدير نسخة احتياطية (JSON)')),

    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'استعادة نسخة')),
      h('div.field', {}, h('label', {}, 'ملف النسخة الاحتياطية'), fichier),
      h('div.field', {}, h('label', {}, 'طريقة الاستعادة'), mode),
      h('button.btn.btn-primary', { onclick: restaurer }, '⬆ استعادة')),

    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'منطقة الخطر')),
      h('p.muted.small', {}, 'حذف نهائي لكل الأقسام والتلاميذ والسجلات من هذا المتصفح.'),
      h('button.btn.btn-danger', {
        onclick: async () => {
          if (!await confirmBox('حذف كل المعطيات',
            'سيتم محو كل شيء نهائيا. تأكد من إنشاء نسخة احتياطية أولا.', 'حذف كل شيء')) return;
          for (const s of idb.STORES) await idb.clear(s);
          await repo.init();
          await refresh();
          toast('تم محو كل المعطيات');
          renderCurrent();
        },
      }, '🗑 حذف كل المعطيات')));
}
