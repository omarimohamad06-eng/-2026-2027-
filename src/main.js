/** Point d'entrée : initialisation de la base, routage, service worker. */
import * as repo from './db/repo.js';
import { refresh, app } from './ui/app.js';
import { route, startRouter, renderCurrent } from './ui/router.js';
import { qs, toast, h } from './utils/dom.js';
import { t, LANGUES, getLangue, setLangue } from './i18n/index.js';

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

/** Met à jour les éléments hors routeur (titre, sous-titre) après un changement de langue. */
function appliquerLangue() {
  qs('#brand-title').textContent = t('سجل الحضور والغياب');
  qs('#brand-sub').textContent = `${app.settings.etablissement} · ${app.settings.anneeScolaire}`;
  document.title = `${t('سجل الحضور والغياب')} ${app.settings.anneeScolaire}`;
}

/**
 * Changement de langue : un seul chemin, partagé par le bouton de la barre
 * supérieure et le sélecteur de l'écran « Paramètres ».
 */
async function changerLangue(suivante) {
  setLangue(suivante);
  await repo.saveSettings({ ...app.settings, langue: suivante });
  await refresh();
  majBoutonLangue();
  appliquerLangue();
  renderCurrent();
}

function majBoutonLangue() {
  const btn = qs('#lang-btn');
  btn.textContent = getLangue() === 'ar' ? 'FR' : 'ع';
  btn.title = LANGUES[getLangue() === 'ar' ? 'fr' : 'ar'];
}

function installerBoutonLangue() {
  majBoutonLangue();
  qs('#lang-btn').addEventListener('click', () => changerLangue(getLangue() === 'ar' ? 'fr' : 'ar'));
  addEventListener('langue-changee', e => { if (e.detail !== getLangue()) changerLangue(e.detail); });
}

async function demarrer() {
  try {
    await repo.init();
    await refresh();
  } catch (e) {
    console.error(e);
    qs('#view').replaceChildren(h('div.card', {},
      h('h2', {}, t('تعذر فتح قاعدة البيانات')),
      h('p.muted', {}, t('قد يكون التصفح في وضع خاص أو أن التخزين المحلي معطّل في هذا المتصفح.'))));
    return;
  }

  setLangue(app.settings.langue || 'ar');
  appliquerLangue();
  installerBoutonLangue();
  startRouter();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  addEventListener('online',  () => toast(t('تم استرجاع الاتصال')));
}

demarrer();
