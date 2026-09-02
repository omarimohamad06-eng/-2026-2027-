/**
 * Bascule arabe / français de l'interface.
 *
 * La clé de traduction est la chaîne arabe elle-même : une chaîne sans
 * traduction retombe naturellement sur l'arabe, jamais sur un code technique.
 * Le registre imprimé et les PDF restent en arabe : ce sont des documents
 * officiels dont la mise en forme ne dépend pas de la langue de l'interface.
 */

import { NOMS_MOIS } from '../data/calendar-2026-2027.js';

export const LANGUES = { ar: 'العربية', fr: 'Français' };

let langue = 'ar';

export const getLangue = () => langue;

export function setLangue(l) {
  langue = l === 'fr' ? 'fr' : 'ar';
  const de = document.documentElement;
  de.lang = langue;
  de.dir = langue === 'fr' ? 'ltr' : 'rtl';
  return langue;
}

/** t('الأقسام') · t('{n} قسم', { n: 3 }) */
export function t(ar, vars) {
  let s = langue === 'fr' ? (FR[ar] ?? ar) : ar;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
  return s;
}

/** Noms de mois pour l'interface (les exports restent en arabe). */
export const MOIS_FR = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril', '05': 'Mai', '06': 'Juin',
  '07': 'Juillet', '08': 'Août', '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre',
};

/** Libellé de mois pour l'interface ; les exports gardent `moisLabel` (arabe). */
export function moisLabelUI(mois) {
  const [annee, m] = mois.split('-');
  return `${langue === 'fr' ? MOIS_FR[m] : NOMS_MOIS[m]} ${annee}`;
}

const FR = {
  /* --- Navigation et cadre --- */
  'سجل الشهر': 'Registre du mois',
  'التلاميذ': 'Élèves',
  'الأقسام': 'Classes',
  'الإحصائيات': 'Statistiques',
  'الرزنامة': 'Calendrier',
  'الإعداد': 'Paramètres',
  'النسخ الاحتياطي': 'Sauvegarde',
  'سجل الحضور والغياب': 'Registre de présence et d’absence',
  'خطأ': 'Erreur',

  /* --- Boutons et actions génériques --- */
  'حفظ': 'Enregistrer',
  'حذف': 'Supprimer',
  'تعديل': 'Modifier',
  'تأكيد': 'Confirmer',
  'إلغاء': 'Annuler',
  'استعادة': 'Restaurer',
  'استيراد': 'Importer',
  'من': 'Du',
  'إلى': 'Au',
  '— اختر —': '— Choisir —',

  /* --- Paramètres --- */
  'إعداد المؤسسة والأستاذ': 'Établissement et enseignant',
  'تُستعمل هذه المعطيات في ترويسة الطباعة وملفات PDF.':
    'Ces informations figurent dans l’en-tête des impressions et des PDF.',
  'الأكاديمية الجهوية': 'Académie régionale',
  'المديرية الإقليمية': 'Direction provinciale',
  'المؤسسة': 'Établissement',
  'الأستاذ(ة) — بالعربية': 'Enseignant(e) — en arabe',
  'الأستاذ(ة) — بالفرنسية (تذييل PDF)': 'Enseignant(e) — en français (pied de page PDF)',
  'السنة الدراسية': 'Année scolaire',
  'عتبات الإنذار': 'Seuils d’alerte',
  'عدد أنصاف أيام الغياب الشهري المُنذِر': 'Demi-journées d’absence mensuelles déclenchant une alerte',
  'نسبة المواظبة الدنيا (%)': 'Taux de fréquentation minimal (%)',
  'لغة الواجهة': 'Langue de l’interface',
  'تم حفظ الإعدادات ✓': 'Paramètres enregistrés ✓',

  /* --- Classes --- */
  'إضافة قسم جديد': 'Ajouter une classe',
  'تعديل القسم': 'Modifier la classe',
  'حفظ القسم': 'Enregistrer la classe',
  'حذف القسم': 'Supprimer la classe',
  'المستوى': 'Niveau',
  'اسم القسم': 'Nom de la classe',
  'الفوج': 'Groupe',
  'المادة': 'Matière',
  'الترتيب': 'Ordre',
  'أيام الحصص': 'Jours de cours',
  'القسم': 'Classe',
  '{n} قسم': '{n} classe(s)',
  'لا يوجد أي قسم بعد. أضف قسمك الأول أسفله.':
    'Aucune classe pour l’instant. Ajoutez la première ci-dessous.',
  'أدخل اسم القسم': 'Saisissez le nom de la classe',
  'تم حفظ القسم ✓': 'Classe enregistrée ✓',
  'تم حذف القسم': 'Classe supprimée',
  'سيتم حذف «{nom}» مع جميع تلاميذه وسجلاته الشهرية. لا يمكن التراجع.':
    '« {nom} » sera supprimée avec tous ses élèves et ses registres mensuels. Action irréversible.',
  'لا يوجد قسم': 'Aucune classe',
  'أنشئ قسما أولا من تبويب «الأقسام».': 'Créez d’abord une classe dans l’onglet « Classes ».',
  'إنشاء قسم': 'Créer une classe',

  /* --- Élèves --- */
  'إضافة تلميذ(ة)': 'Ajouter un(e) élève',
  'الاسم والنسب': 'Nom et prénom',
  'رمز مسار': 'Code Massar',
  'رمز مسار (اختياري)': 'Code Massar (facultatif)',
  'تاريخ التسجيل': 'Date d’inscription',
  'تاريخ المغادرة': 'Date de départ',
  'تاريخ المغادرة/الشطب': 'Date de départ ou de radiation',
  'إن سُجّل التلميذ خلال السنة، لا تُحتسب أنصاف الأيام السابقة':
    'Si l’élève est inscrit en cours d’année, les demi-journées antérieures ne sont pas comptées',
  '+ إضافة': '+ Ajouter',
  'أدخل الاسم': 'Saisissez le nom',
  'تمت الإضافة ✓': 'Élève ajouté(e) ✓',
  'تم التحديث ✓': 'Mise à jour effectuée ✓',
  'تم الحذف': 'Supprimé',
  'حذف التلميذ': 'Supprimer l’élève',
  'حذف «{nom}» وجميع معطيات حضوره؟': 'Supprimer « {nom} » et toutes ses données de présence ?',
  'لا يوجد تلميذ في هذا القسم.': 'Aucun élève dans cette classe.',
  'لا يوجد تلاميذ': 'Aucun élève',
  'لا يوجد تلاميذ في هذا القسم.': 'Aucun élève dans cette classe.',
  'أضف تلاميذ هذا القسم لتظهر شبكة الحضور.':
    'Ajoutez les élèves de cette classe pour afficher la grille de présence.',
  'إضافة التلاميذ': 'Ajouter les élèves',
  '⇅ ترتيب أبجدي': '⇅ Tri alphabétique',
  'تم الترتيب الأبجدي وإعادة الترقيم ✓': 'Liste triée et renumérotée ✓',
  '⬆ استيراد': '⬆ Importer',
  '⬇ تصدير CSV': '⬇ Exporter CSV',
  'استيراد لائحة التلاميذ': 'Importer la liste des élèves',
  'ملف CSV': 'Fichier CSV',
  'أو لصق مباشر': 'Ou collage direct',
  'لم يتم تحليل أي سطر بعد.': 'Aucune ligne analysée pour l’instant.',
  'لم يتم التعرف على أي اسم.': 'Aucun nom reconnu.',
  'لا توجد أسماء صالحة': 'Aucun nom valide',
  '{n} تلميذ(ة) — أول اسم: «{a}»، آخر اسم: «{b}»':
    '{n} élève(s) — premier : « {a} », dernier : « {b} »',
  'تم استيراد {n} تلميذ(ة) ✓': '{n} élève(s) importé(s) ✓',
  'الصق هنا لائحة التلاميذ (سطر لكل تلميذ)، أو انسخ الأعمدة مباشرة من Excel.':
    'Collez ici la liste des élèves (une ligne par élève), ou copiez les colonnes depuis Excel.',

  /* --- Registre mensuel --- */
  'الشهر': 'Mois',
  'ر.ت': 'N°',
  'ملاحظات': 'Observations',
  'أنصاف أيام الدراسة': 'Demi-journées d’étude',
  'أنصاف أيام الغياب': 'Demi-journées d’absence',
  'أنصاف أيام الحضور': 'Demi-journées de présence',
  'النسبة %': 'Taux %',
  'نسبة المواظبة الشهرية بـ %': 'Taux de fréquentation mensuel en %',
  'أداة التعليم:': 'Outil de saisie :',
  'نقرة = تطبيق الأداة · نقرة ثانية = مسح · الأسهم للتنقل · مفاتيح 1‑5':
    'Clic = appliquer · second clic = effacer · flèches pour se déplacer · touches 1 à 5',
  'مسح': 'Effacer',
  'حاضر': 'Présent',
  'حاضر (مؤكد)': 'Présent (confirmé)',
  'غائب (يوم كامل)': 'Absent (journée)',
  'غائب صباحا': 'Absent le matin',
  'غائب مساء': 'Absent l’après-midi',
  'غياب مبرر': 'Absence justifiée',
  'تأخر': 'Retard',
  '{j} يوم دراسي · {e} تلميذ(ة)': '{j} jour(s) de cours · {e} élève(s)',
  'الخانات الرمادية = عطلة أو نهاية أسبوع (غير قابلة للتعليم) · الخانات المخططة = خارج فترة تسجيل التلميذ · الخانة الفارغة = حاضر.':
    'Cases grises = vacances ou week-end (non modifiables) · cases hachurées = hors période d’inscription de l’élève · case vide = présent.',
  'تم الحفظ تلقائيا ✓': 'Enregistré automatiquement ✓',
  'مرحبا بك': 'Bienvenue',
  'أنشئ قسمك الأول ثم أضف التلاميذ لبدء تعبئة السجل.':
    'Créez votre première classe puis ajoutez les élèves pour commencer à remplir le registre.',
  'يوم دراسي': 'Jour de cours',
  'نصف يوم': 'Demi-journée',
  'يوم غير دراسي': 'Jour non travaillé',
  'عطلة نهاية الأسبوع': 'Week-end',
  'خارج السنة الدراسية': 'Hors année scolaire',

  /* --- Exports --- */
  '🖨 طباعة': '🖨 Imprimer',
  '⬇ PDF': '⬇ PDF',
  '⬇ CSV': '⬇ CSV',
  '⬇ CSV سنوي': '⬇ CSV annuel',
  '🖨 طباعة كل الأشهر': '🖨 Imprimer tous les mois',
  '⬇ PDF السنة': '⬇ PDF de l’année',
  'جارٍ إنشاء ملف PDF…': 'Génération du PDF en cours…',
  'جارٍ إنشاء ملف PDF للسنة كاملة…': 'Génération du PDF de l’année en cours…',
  'تعذر إنشاء PDF: ': 'Échec de la génération du PDF : ',

  /* --- Statistiques --- */
  'الحصيلة السنوية': 'Bilan annuel',
  'نسبة المواظبة السنوية': 'Taux de fréquentation annuel',
  'تلاميذ دون {n}%': 'Élèves sous {n} %',
  'تطور نسبة المواظبة': 'Évolution du taux de fréquentation',
  'التلاميذ حسب المواظبة': 'Élèves par taux de fréquentation',
  'مرتبة تصاعديا — الأكثر غيابا في الأعلى': 'Ordre croissant — les plus absents en tête',
  'الدراسة': 'Étude',
  'الغياب': 'Absences',
  'منه مبرر': 'Dont justifiées',
  'التأخرات': 'Retards',
  'المواظبة': 'Fréquentation',
  'لا توجد معطيات': 'Aucune donnée',
  'أنشئ قسما وأضف تلاميذ لعرض الإحصائيات.':
    'Créez une classe et ajoutez des élèves pour afficher les statistiques.',
  'مجموع أنصاف أيام الدراسة': 'Total des demi-journées d’étude',
  'مجموع الغياب': 'Total des absences',
  'نسبة المواظبة %': 'Taux de fréquentation %',

  /* --- Calendrier --- */
  'الرزنامة الدراسية': 'Calendrier scolaire',
  'بداية الدراسة': 'Début des cours',
  'نهاية الدراسة': 'Fin des cours',
  'أيام العطلة الأسبوعية': 'Jours de week-end',
  'الأيام المحددة لا تُحتسب ضمن أنصاف أيام الدراسة.':
    'Les jours cochés ne comptent pas dans les demi-journées d’étude.',
  'أيام بنصف يوم واحد': 'Jours à une seule demi-journée',
  'يوم دراسي بحصة صباحية فقط (نصف واحد بدل نصفين) — السبت عادة.':
    'Jour de cours le matin seulement (1 demi-journée au lieu de 2) — le samedi en général.',
  'العطل والأعياد والامتحانات': 'Vacances, fêtes et examens',
  'إضافة فترة': 'Ajouter une période',
  'التسمية': 'Intitulé',
  'النوع': 'Type',
  'مؤكدة': 'Confirmée',
  'عطلة مدرسية': 'Vacances scolaires',
  'عيد / يوم وطني': 'Fête ou jour national',
  'امتحان': 'Examen',
  'أخرى': 'Autre',
  'حدّد الخانة بعد التأكد من التاريخ الرسمي': 'Cochez après vérification de la date officielle',
  'مثال: عطلة الفترة البينية': 'Exemple : vacances inter-semestre',
  'أدخل تسمية الفترة': 'Saisissez l’intitulé de la période',
  'تاريخ النهاية قبل تاريخ البداية': 'La date de fin précède la date de début',
  'حذف الفترة': 'Supprimer la période',
  'حذف «{nom}»؟': 'Supprimer « {nom} » ?',
  'تم تأكيد التاريخ ✓': 'Date confirmée ✓',
  '↺ استعادة الأصل': '↺ Rétablir l’original',
  'استعادة الرزنامة الأصلية': 'Rétablir le calendrier d’origine',
  'سيتم استبدال جميع تعديلاتك بالرزنامة المُحمّلة مسبقا. هل تريد المتابعة؟':
    'Toutes vos modifications seront remplacées par le calendrier préchargé. Continuer ?',
  'تمت استعادة الرزنامة الأصلية': 'Calendrier d’origine rétabli',
  '⚠ تنبيه: ': '⚠ Attention : ',
  '{n} فترة مُدرجة كتقدير في انتظار المذكرة الوزارية الرسمية للموسم {annee} ':
    '{n} période(s) saisies à titre d’estimation, dans l’attente de la note ministérielle officielle {annee} ',
  '(عطل الفترات البينية والأعياد الدينية المرتبطة بالرؤية الهلالية). ':
    '(vacances inter-semestres et fêtes religieuses liées à l’observation lunaire). ',
  'صحّحها هنا بمجرد صدور التواريخ الرسمية، وستُحدَّث كل نسب المواظبة تلقائيا.':
    'Corrigez-les ici dès la publication des dates officielles : tous les taux se recalculent automatiquement.',

  /* --- Sauvegarde --- */
  'أقسام': 'Classes',
  'تلاميذ': 'Élèves',
  'سجلات شهرية': 'Registres mensuels',
  'كل المعطيات محفوظة محليا في هذا المتصفح فقط (IndexedDB). ':
    'Toutes les données sont stockées localement dans ce navigateur (IndexedDB). ',
  'أنشئ نسخة احتياطية بانتظام واحتفظ بها خارج الحاسوب (مفتاح USB، بريد إلكتروني، سحابة).':
    'Créez régulièrement une sauvegarde et conservez-la hors de l’ordinateur (clé USB, e-mail, cloud).',
  '⬇ تصدير نسخة احتياطية (JSON)': '⬇ Exporter une sauvegarde (JSON)',
  'تم إنشاء النسخة الاحتياطية ✓': 'Sauvegarde créée ✓',
  'استعادة نسخة': 'Restaurer une sauvegarde',
  'ملف النسخة الاحتياطية': 'Fichier de sauvegarde',
  'طريقة الاستعادة': 'Mode de restauration',
  'استبدال كل المعطيات الحالية': 'Remplacer toutes les données actuelles',
  'دمج مع المعطيات الحالية': 'Fusionner avec les données actuelles',
  '⬆ استعادة': '⬆ Restaurer',
  'اختر ملف نسخة احتياطية': 'Choisissez un fichier de sauvegarde',
  'استعادة نسخة احتياطية': 'Restaurer une sauvegarde',
  'سيتم حذف كل المعطيات الحالية واستبدالها بمحتوى الملف. لا يمكن التراجع.':
    'Toutes les données actuelles seront supprimées et remplacées par le contenu du fichier. Action irréversible.',
  'سيتم دمج محتوى الملف مع معطياتك الحالية (يفوز محتوى الملف عند التعارض).':
    'Le contenu du fichier sera fusionné avec vos données actuelles (le fichier l’emporte en cas de conflit).',
  'تمت استعادة {n} سجل ✓': '{n} enregistrement(s) restauré(s) ✓',
  'فشل الاستيراد: ': 'Échec de l’import : ',
  'منطقة الخطر': 'Zone sensible',
  'حذف نهائي لكل الأقسام والتلاميذ والسجلات من هذا المتصفح.':
    'Suppression définitive de toutes les classes, élèves et registres de ce navigateur.',
  '🗑 حذف كل المعطيات': '🗑 Supprimer toutes les données',
  'حذف كل المعطيات': 'Supprimer toutes les données',
  'سيتم محو كل شيء نهائيا. تأكد من إنشاء نسخة احتياطية أولا.':
    'Tout sera effacé définitivement. Assurez-vous d’avoir créé une sauvegarde.',
  'حذف كل شيء': 'Tout supprimer',
  'تم محو كل المعطيات': 'Toutes les données ont été effacées',

  /* --- Noms de fichiers exportés --- */
  'فوج 1': 'Groupe 1',
  'سجل': 'registre',
  'حصيلة-سنوية': 'bilan-annuel',
  'نسخة-احتياطية': 'sauvegarde',

  /* --- Divers --- */
  'تم الحفظ ✓': 'Enregistré ✓',
  'تم استرجاع الاتصال': 'Connexion rétablie',
  'تعذر فتح قاعدة البيانات': 'Impossible d’ouvrir la base de données',
  'قد يكون التصفح في وضع خاص أو أن التخزين المحلي معطّل في هذا المتصفح.':
    'La navigation privée est peut-être active, ou le stockage local est désactivé dans ce navigateur.',

  /* --- Jours de la semaine (interface uniquement) --- */
  'الأحد': 'Dimanche', 'الاثنين': 'Lundi', 'الثلاثاء': 'Mardi', 'الأربعاء': 'Mercredi',
  'الخميس': 'Jeudi', 'الجمعة': 'Vendredi', 'السبت': 'Samedi',
};
