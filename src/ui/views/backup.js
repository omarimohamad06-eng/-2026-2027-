/** النسخ الاحتياطي — sauvegarde et restauration des données. */
import { h, toast, download, confirmBox } from '../../utils/dom.js';
import { exportBackup, importBackup } from '../../db/backup.js';
import * as repo from '../../db/repo.js';
import { app, refresh } from '../app.js';
import { renderCurrent } from '../router.js';
import * as idb from '../../db/idb.js';
import { t } from '../../i18n/index.js';

export async function renderBackup() {
  const compte = {
    classes: app.classes.length,
    eleves: (await Promise.all(app.classes.map(c => repo.listStudents(c.id)))).reduce((s, l) => s + l.length, 0),
    registres: (await idb.getAll('registers')).length,
  };

  const fichier = h('input', { type: 'file', accept: '.json,application/json' });
  const mode = h('select', {}, [
    h('option', { value: 'replace' }, t('استبدال كل المعطيات الحالية')),
    h('option', { value: 'merge' }, t('دمج مع المعطيات الحالية')),
  ]);

  const restaurer = async () => {
    const f = fichier.files[0];
    if (!f) return toast('اختر ملف نسخة احتياطية', 'err');
    if (!await confirmBox(t('استعادة نسخة احتياطية'),
      mode.value === 'replace'
        ? t('سيتم حذف كل المعطيات الحالية واستبدالها بمحتوى الملف. لا يمكن التراجع.')
        : t('سيتم دمج محتوى الملف مع معطياتك الحالية (يفوز محتوى الملف عند التعارض).'),
      t('استعادة'))) return;
    try {
      const payload = JSON.parse(await f.text());
      const n = await importBackup(payload, mode.value);
      await repo.init();
      await refresh();
      toast(t('تمت استعادة {n} سجل ✓', { n }));
      renderCurrent();
    } catch (e) {
      console.error(e);
      toast('فشل الاستيراد: ' + e.message, 'err');
    }
  };

  return h('div', {},
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, t('النسخ الاحتياطي'))),
      h('div.grid.grid-3', {},
        h('div.stat', {}, h('div.v', {}, String(compte.classes)), h('div.l', {}, t('أقسام'))),
        h('div.stat', {}, h('div.v', {}, String(compte.eleves)), h('div.l', {}, t('تلاميذ'))),
        h('div.stat', {}, h('div.v', {}, String(compte.registres)), h('div.l', {}, t('سجلات شهرية')))),
      h('p.muted.small', { style: { marginTop: '.8rem' } },
        t('كل المعطيات محفوظة محليا في هذا المتصفح فقط (IndexedDB). '),
        t('أنشئ نسخة احتياطية بانتظام واحتفظ بها خارج الحاسوب (مفتاح USB، بريد إلكتروني، سحابة).')),
      h('button.btn.btn-primary', {
        onclick: async () => {
          const payload = await exportBackup();
          const nom = `${t('نسخة-احتياطية')}-${app.settings.anneeScolaire.replace('/', '-')}-${new Date().toISOString().slice(0, 10)}.json`;
          download(nom, JSON.stringify(payload, null, 1), 'application/json');
          toast('تم إنشاء النسخة الاحتياطية ✓');
        },
      }, t('⬇ تصدير نسخة احتياطية (JSON)'))),

    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, t('استعادة نسخة'))),
      h('div.field', {}, h('label', {}, t('ملف النسخة الاحتياطية')), fichier),
      h('div.field', {}, h('label', {}, t('طريقة الاستعادة')), mode),
      h('button.btn.btn-primary', { onclick: restaurer }, t('⬆ استعادة'))),

    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, t('منطقة الخطر'))),
      h('p.muted.small', {}, t('حذف نهائي لكل الأقسام والتلاميذ والسجلات من هذا المتصفح.')),
      h('button.btn.btn-danger', {
        onclick: async () => {
          if (!await confirmBox(t('حذف كل المعطيات'),
            t('سيتم محو كل شيء نهائيا. تأكد من إنشاء نسخة احتياطية أولا.'), t('حذف كل شيء'))) return;
          for (const s of idb.STORES) await idb.clear(s);
          await repo.init();
          await refresh();
          toast('تم محو كل المعطيات');
          renderCurrent();
        },
      }, t('🗑 حذف كل المعطيات'))));
}
