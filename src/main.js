/** Point d'entrée : initialisation de la base, routage, service worker. */
import * as repo from './db/repo.js';
import { refresh, app } from './ui/app.js';
import { route, startRouter } from './ui/router.js';
import { qs, toast } from './utils/dom.js';

import { renderRegister }  from './ui/views/register.js';
import { renderStudents }  from './ui/views/students.js';
import { renderClasses }   from './ui/views/classes.js';
import { renderDashboard } from './ui/views/dashboard.js';
import { renderCalendar }  from './ui/views/calendar.js';
import { renderSetup }     from './ui/views/setup.js';
import { renderBackup }    from './ui/views/backup.js';

route('/register',  'سجل الشهر',       renderRegister);
route('/students',  'التلاميذ',        renderStudents);
route('/classes',   'الأقسام',         renderClasses);
route('/dashboard', 'الإحصائيات',      renderDashboard);
route('/calendar',  'الرزنامة',        renderCalendar);
route('/setup',     'الإعداد',         renderSetup);
route('/backup',    'النسخ الاحتياطي', renderBackup);

async function demarrer() {
  try {
    await repo.init();
    await refresh();
  } catch (e) {
    console.error(e);
    qs('#view').innerHTML =
      '<div class="card"><h2>تعذر فتح قاعدة البيانات</h2>' +
      '<p class="muted">قد يكون التصفح في وضع خاص أو أن التخزين المحلي معطّل في هذا المتصفح.</p></div>';
    return;
  }

  qs('#brand-sub').textContent = `${app.settings.etablissement} · ${app.settings.anneeScolaire}`;
  document.title = `سجل الحضور والغياب ${app.settings.anneeScolaire}`;
  startRouter();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  addEventListener('online',  () => toast('تم استرجاع الاتصال'));
}

demarrer();
