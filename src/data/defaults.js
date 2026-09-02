/** Informations de l'établissement préremplies (modifiables dans l'écran « الإعداد »). */
export const DEFAULT_SETTINGS = {
  id: 1,
  academie: 'الأكاديمية الجهوية للتربية والتكوين لجهة درعة تافيلالت',
  direction: 'المديرية الإقليمية تنغير',
  etablissement: 'الثانوية التأهيلية تيلمي',
  enseignant: 'الأستاذ عمري محمد',
  enseignantFr: 'Pr. Omari Mohammed',
  anneeScolaire: '2026/2027',
  langue: 'ar',                    // 'ar' ou 'fr' — langue de l'interface
  seuilAlerteAbsence: 8,   // nombre d'anssaf ayam d'absence déclenchant une alerte (par mois)
  seuilTauxFaible: 90,     // taux de fréquentation (%) sous lequel l'élève est signalé
  updatedAt: null,
};
