/**
 * Calendrier scolaire marocain 2026-2027 — données de référence PRÉCHARGÉES ET MODIFIABLES.
 *
 * confirme:true  → date fixe officielle (fêtes nationales).
 * confirme:false → estimation : vacances inter-semestres (en attente de la note ministérielle)
 *                  et fêtes religieuses (dépendantes de l'observation lunaire).
 * L'écran « الرزنامة » permet de corriger, ajouter ou supprimer chaque période.
 */
export const CALENDAR_2026_2027 = {
  id: 'cal_2026_2027',
  anneeScolaire: '2026/2027',
  debutAnnee: '2026-09-07',
  finAnnee: '2027-06-30',
  joursWeekend: [0],          // 0 = dimanche
  joursDemiJournee: [6],      // samedi = 1 seul نصف يوم
  periodes: [
    { id:'p01', type:'vacances', libelle:'عطلة الفترة البينية الأولى',
      du:'2026-10-18', au:'2026-10-25', confirme:false },
    { id:'p02', type:'ferie', libelle:'ذكرى المسيرة الخضراء',
      du:'2026-11-06', au:'2026-11-06', confirme:true },
    { id:'p03', type:'ferie', libelle:'عيد الاستقلال',
      du:'2026-11-18', au:'2026-11-18', confirme:true },
    { id:'p04', type:'vacances', libelle:'عطلة الفترة البينية الثانية (نهاية السنة الميلادية)',
      du:'2026-12-20', au:'2027-01-03', confirme:false },
    { id:'p05', type:'ferie', libelle:'فاتح السنة الميلادية',
      du:'2027-01-01', au:'2027-01-01', confirme:true },
    { id:'p06', type:'ferie', libelle:'ذكرى تقديم وثيقة الاستقلال',
      du:'2027-01-11', au:'2027-01-11', confirme:true },
    { id:'p07', type:'ferie', libelle:'عطلة رأس السنة الأمازيغية',
      du:'2027-01-14', au:'2027-01-14', confirme:true },
    { id:'p08', type:'vacances', libelle:'عطلة منتصف السنة الدراسية',
      du:'2027-01-31', au:'2027-02-07', confirme:false },
    { id:'p09', type:'ferie', libelle:'عيد الفطر',
      du:'2027-03-09', au:'2027-03-11', confirme:false },
    { id:'p10', type:'vacances', libelle:'عطلة الفترة البينية الثالثة',
      du:'2027-03-21', au:'2027-03-28', confirme:false },
    { id:'p11', type:'ferie', libelle:'عيد الشغل',
      du:'2027-05-01', au:'2027-05-01', confirme:true },
    { id:'p12', type:'vacances', libelle:'عطلة الفترة البينية الرابعة',
      du:'2027-05-09', au:'2027-05-16', confirme:false },
    { id:'p13', type:'ferie', libelle:'عيد الأضحى',
      du:'2027-05-17', au:'2027-05-19', confirme:false },
    { id:'p14', type:'ferie', libelle:'فاتح محرم',
      du:'2027-06-06', au:'2027-06-06', confirme:false },
    { id:'p15', type:'examen', libelle:'الامتحان الموحد الجهوي',
      du:'2027-06-07', au:'2027-06-09', confirme:false },
    { id:'p16', type:'examen', libelle:'الامتحان الوطني الموحد',
      du:'2027-06-21', au:'2027-06-23', confirme:false },
  ],
};

/** Mois du registre, de septembre à juin. */
export const MOIS_SCOLAIRES = [
  '2026-09','2026-10','2026-11','2026-12',
  '2027-01','2027-02','2027-03','2027-04','2027-05','2027-06',
];

export const NOMS_MOIS = {
  '01':'يناير','02':'فبراير','03':'مارس','04':'أبريل','05':'ماي','06':'يونيو',
  '07':'يوليوز','08':'غشت','09':'شتنبر','10':'أكتوبر','11':'نونبر','12':'دجنبر',
};
