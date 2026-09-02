/** États d'une cellule jour/élève et règles de comptage en أنصاف الأيام. */

export const STATES = {
  ''  : { code:'',   label:'حاضر',            court:'',  couleur:'#ffffff', poids:0, justifie:false },
  p   : { code:'p',  label:'حاضر (مؤكد)',     court:'✓', couleur:'#e7f4ec', poids:0, justifie:false },
  a   : { code:'a',  label:'غائب (يوم كامل)', court:'غ', couleur:'#fbe3e1', poids:'full', justifie:false },
  am  : { code:'am', label:'غائب صباحا',      court:'ص', couleur:'#fbe3e1', poids:'half', justifie:false },
  pm  : { code:'pm', label:'غائب مساء',       court:'م', couleur:'#fbe3e1', poids:'half', justifie:false },
  aj  : { code:'aj', label:'غياب مبرر',       court:'ب', couleur:'#fbf0d5', poids:'full', justifie:true  },
  r   : { code:'r',  label:'تأخر',            court:'ت', couleur:'#f6edcf', poids:0, justifie:false },
};

/** Ordre de défilement au clic sur une cellule. */
export const CYCLE = ['', 'a', 'am', 'pm', 'aj', 'r'];

export const nextState = code => CYCLE[(CYCLE.indexOf(code || '') + 1) % CYCLE.length];

/**
 * Anssaf ayam d'absence portés par un état, selon la capacité du jour
 * (2 pour un jour plein, 1 pour un samedi/demi-journée).
 */
export function poidsAbsence(code, capacite) {
  const st = STATES[code || ''];
  if (!st || !st.poids || capacite <= 0) return 0;
  return st.poids === 'full' ? capacite : Math.min(1, capacite);
}

export const estAbsence = code => !!STATES[code || '']?.poids;
export const estJustifie = code => !!STATES[code || '']?.justifie;

/** Clé du registre mensuel : une ligne par (classe, mois). */
export const registerId = (classId, mois) => `${classId}__${mois}`;

export const emptyRegister = (classId, mois) => ({
  id: registerId(classId, mois), classId, mois, cells: {}, notes: {}, updatedAt: null,
});
