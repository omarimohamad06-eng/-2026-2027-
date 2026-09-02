/** Niveaux du lycée qualifiant proposés à la création d'une classe. */
export const LEVELS = [
  { code: 'TCS',       ar: 'الجذع المشترك العلمي' },
  { code: 'TCL',       ar: 'الجذع المشترك الأدبي' },
  { code: '1BAC SE',   ar: 'الأولى باكالوريا علوم تجريبية' },
  { code: '1BAC LSH',  ar: 'الأولى باكالوريا آداب وعلوم إنسانية' },
  { code: '2BAC PC',   ar: 'الثانية باكالوريا علوم فيزيائية' },
  { code: '2BAC SVT',  ar: 'الثانية باكالوريا علوم الحياة والأرض' },
];

export const levelLabel = code => (LEVELS.find(l => l.code === code)?.ar) || code;
