/** المزامنة — synchronisation cloud (Firebase) : configuration, compte, état. */
import { h, toast, clear, confirmBox, modal } from '../../utils/dom.js';
import { t } from '../../i18n/index.js';
import { refresh } from '../app.js';
import { renderCurrent } from '../router.js';
import * as sync from '../../sync/index.js';

const LIEN_CONSOLE = 'https://console.firebase.google.com/';

/** Messages d'erreur techniques traduits en langage clair. */
const EXPLICATION = {
  CONFIG_VIDE: 'الصق إعدادات Firebase أولا',
  CONFIG_ILLISIBLE: 'تعذرت قراءة الإعدادات: تأكد من نسخ الكتلة كاملة',
  CONFIG_INCOMPLETE: 'الإعدادات ناقصة',
  CONFIG_ABSENTE: 'لم يتم إعداد Firebase بعد',
  CHARGEMENT_SDK: 'تعذر تحميل Firebase: تحقق من الاتصال بالإنترنت',
  EMAIL_INVALIDE: 'البريد الإلكتروني غير صالح',
  COMPTE_INTROUVABLE: 'لا يوجد حساب بهذا البريد',
  MOT_DE_PASSE_INCORRECT: 'كلمة المرور غير صحيحة',
  EMAIL_DEJA_UTILISE: 'هذا البريد مستعمل من قبل: اختر «الاتصال» بدل «إنشاء حساب»',
  MOT_DE_PASSE_FAIBLE: 'كلمة المرور قصيرة جدا (6 أحرف على الأقل)',
  RESEAU: 'تعذر الاتصال بالخادم',
  PERMISSION_REFUSEE: 'الخادم رفض العملية: تحقق من قواعد الأمان في Firestore',
  HORS_LIGNE: 'لا يوجد اتصال بالإنترنت',
  NON_CONNECTE: 'لست متصلا بالحساب',
};

const expliquer = code => t(EXPLICATION[code] || 'حدث خطأ غير متوقع') + (EXPLICATION[code] ? '' : ` (${code})`);

const dateLisible = iso => {
  if (!iso) return t('لم تتم أي مزامنة بعد');
  const d = new Date(iso);
  return d.toLocaleString(document.documentElement.lang === 'fr' ? 'fr-FR' : 'ar-MA');
};

export async function renderSync() {
  const etat = await sync.etat();
  const wrap = h('div');

  /* ---------- 1. Explication et mise en garde ---------- */
  const presentation = h('div.card', {},
    h('div.card-head', {}, h('h2', {}, t('المزامنة بين الأجهزة'))),
    h('p.muted.small', {},
      t('المزامنة اختيارية. بدونها يشتغل التطبيق كما هو، والمعطيات محفوظة في هذا المتصفح فقط. ')),
    h('p.muted.small', {},
      t('عند تفعيلها، تبقى قاعدة البيانات المحلية هي المرجع، ويُستعمل Firebase كنسخة مطابقة تتيح فتح نفس السجل على حاسوب آخر أو على لوحة.')),
    h('div.hint', {},
      h('b', {}, t('⚠ تنبيه: ')),
      t('حساب واحد = جهاز واحد مسجَّل. عند الاتصال من جهاز جديد يجب تحرير الجهاز السابق أو الاستيلاء على مكانه.')));

  /* ---------- 2. Configuration Firebase ---------- */
  const zoneConfig = h('div');
  const dessinerConfig = () => {
    clear(zoneConfig);
    const config = sync.configFirebase();

    if (config && !etat.connecte) {
      zoneConfig.append(h('div.card', {},
        h('div.card-head', {}, h('h2', {}, t('مشروع Firebase')), h('span.spacer'),
          h('span.badge.ok', {}, config.projectId)),
        h('p.muted.small', {}, t('يمكنك تغيير المشروع إن لزم الأمر.')),
        h('button.btn.btn-danger.btn-sm', {
          onclick: async () => {
            if (!await confirmBox(t('حذف إعدادات Firebase'),
              t('سيتم نسيان إعدادات المشروع على هذا الجهاز. المعطيات المحلية لا تُمسّ.'), t('حذف'))) return;
            sync.enregistrerConfig(null);
            renderCurrent();
          },
        }, t('تغيير المشروع'))));
      return;
    }
    if (config) return;

    const zone = h('textarea', {
      placeholder: '{\n  apiKey: "…",\n  authDomain: "…firebaseapp.com",\n  projectId: "…",\n  appId: "…"\n}',
      style: { minHeight: '150px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' },
    });

    zoneConfig.append(h('div.card', {},
      h('div.card-head', {}, h('h2', {}, t('الخطوة 1 — إعداد مشروع Firebase'))),
      h('ol.small', { style: { paddingInlineStart: '1.2rem', lineHeight: '1.9' } },
        h('li', {}, t('أنشئ مشروعا مجانيا في '),
          h('a', { href: LIEN_CONSOLE, target: '_blank', rel: 'noopener' }, 'console.firebase.google.com')),
        h('li', {}, t('في Authentication، فعّل طريقة «Email/Password».')),
        h('li', {}, t('في Firestore Database، أنشئ قاعدة بيانات ثم الصق قواعد الأمان الموجودة في ملف firestore.rules.')),
        h('li', {}, t('في Project settings ← Your apps، أضف تطبيق ويب وانسخ كتلة firebaseConfig.')),
        h('li', {}, t('الصقها أسفله.'))),
      h('div.field', {}, h('label', {}, t('إعدادات المشروع (firebaseConfig)')), zone),
      h('button.btn.btn-primary', {
        onclick: () => {
          try {
            const config = sync.analyserConfig(zone.value);
            sync.enregistrerConfig(config);
            toast(t('تم حفظ إعدادات Firebase ✓'));
            renderCurrent();
          } catch (e) {
            toast(expliquer(e.message) + (e.manquants ? ' : ' + e.manquants.join(', ') : ''), 'err');
          }
        },
      }, t('حفظ الإعدادات'))));
  };
  dessinerConfig();

  /* ---------- 3. Compte ---------- */
  const zoneCompte = h('div');
  const dessinerCompte = async () => {
    clear(zoneCompte);
    const e = await sync.etat();
    if (!e.configuree) return;

    if (!e.connecte) {
      const email = h('input', { type: 'email', autocomplete: 'username',
        value: e.email || '', style: { direction: 'ltr', textAlign: 'left' } });
      const mdp = h('input', { type: 'password', autocomplete: 'current-password',
        style: { direction: 'ltr', textAlign: 'left' } });

      const tenter = async (mode, reprendreAppareil = false) => {
        if (!email.value.trim() || !mdp.value) return toast(t('أدخل البريد وكلمة المرور'), 'err');
        try {
          const stats = await sync.connecter({
            email: email.value.trim(), motDePasse: mdp.value, mode, reprendreAppareil });
          await refresh();
          toast(t('تم الاتصال ✓ ({r} واردة، {e} صادرة)', { r: stats?.recus ?? 0, e: stats?.envoyes ?? 0 }));
          await sync.demarrerAuto();
          renderCurrent();
        } catch (err) {
          const code = sync.messageErreur(err);
          if (code === 'APPAREIL_DEJA_ENREGISTRE') {
            const autre = err.appareil?.label || t('جهاز آخر');
            const ok = await modal({
              title: t('الحساب مسجَّل على جهاز آخر'),
              body: t('هذا الحساب مرتبط حاليا بـ «{appareil}». هل تريد نقل التسجيل إلى هذا الجهاز؟ سيفقد الجهاز الآخر حق المزامنة.',
                { appareil: autre }),
              okText: t('نقل إلى هذا الجهاز'),
              danger: true,
            });
            if (ok) await tenter(mode, true);
            return;
          }
          toast(expliquer(code), 'err');
        }
      };

      zoneCompte.append(h('div.card', {},
        h('div.card-head', {}, h('h2', {}, t('الخطوة 2 — الحساب'))),
        h('div.grid.grid-2', {},
          h('div.field', {}, h('label', {}, t('البريد الإلكتروني')), email),
          h('div.field', {}, h('label', {}, t('كلمة المرور')), mdp)),
        h('div.row', {},
          h('button.btn.btn-primary', { onclick: () => tenter('connexion') }, t('اتصال')),
          h('button.btn', { onclick: () => tenter('creation') }, t('إنشاء حساب جديد'))),
        h('p.muted.small', { style: { marginTop: '.6rem' } },
          t('استعمل بريدك المهني. كلمة المرور من 6 أحرف على الأقل.'))));
      return;
    }

    /* --- connecté --- */
    const ligne = (libelle, valeur) => h('div.field', {},
      h('label', {}, libelle), h('div.small', {}, valeur));

    zoneCompte.append(h('div.card', {},
      h('div.card-head', {}, h('h2', {}, t('المزامنة مفعّلة')),
        h('span.spacer'),
        h('span.badge.ok', {}, e.enCours ? t('جارية…') : t('متصل'))),
      h('div.grid.grid-2', {},
        ligne(t('الحساب'), e.email),
        ligne(t('الجهاز المسجَّل'), e.deviceLabel || e.deviceId),
        ligne(t('آخر مزامنة'), dateLisible(e.derniereSync)),
        ligne(t('الحالة'), e.derniereErreur ? expliquer(e.derniereErreur) : t('كل شيء متزامن'))),
      h('div.field', {},
        h('label', { style: { display: 'flex', gap: '.4rem', alignItems: 'center' } },
          h('input', {
            type: 'checkbox', style: { width: 'auto' }, checked: e.auto !== false,
            onchange: async ev => { await sync.reglerAuto(ev.target.checked); toast(t('تم الحفظ ✓')); },
          }),
          t('مزامنة تلقائية (كل 10 دقائق وبعد كل تعديل)'))),
      h('div.row', {},
        h('button.btn.btn-primary', {
          onclick: async ev => {
            ev.target.disabled = true;
            try {
              const s = await sync.synchroniserMaintenant();
              toast(t('تمت المزامنة ✓ ({r} واردة، {e} صادرة)', { r: s?.recus ?? 0, e: s?.envoyes ?? 0 }));
            } catch (err) { toast(expliquer(sync.messageErreur(err)), 'err'); }
            finally { ev.target.disabled = false; await dessinerCompte(); }
          },
        }, t('⟳ مزامنة الآن')),
        h('button.btn', {
          onclick: async () => {
            if (!await confirmBox(t('قطع الاتصال'),
              t('ستبقى كل المعطيات على هذا الجهاز. يمكنك إعادة الاتصال لاحقا.'), t('قطع الاتصال'))) return;
            await sync.deconnecter();
            toast(t('تم قطع الاتصال'));
            renderCurrent();
          },
        }, t('قطع الاتصال')),
        h('button.btn.btn-danger', {
          onclick: async () => {
            if (!await confirmBox(t('تحرير الجهاز'),
              t('سيتحرر مكان الجهاز حتى تتمكن من الاتصال من جهاز آخر. المعطيات لا تُمسّ.'), t('تحرير'))) return;
            await sync.deconnecter({ libererAppareil: true });
            toast(t('تم تحرير الجهاز'));
            renderCurrent();
          },
        }, t('تحرير الجهاز'))),
    ));
  };
  await dessinerCompte();

  wrap.append(presentation, zoneConfig, zoneCompte);
  return wrap;
}
