/** التلاميذ — liste des élèves d'une classe, saisie manuelle, import CSV / collage Excel. */
import { h, toast, confirmBox, clear, download, modal } from '../../utils/dom.js';
import * as repo from '../../db/repo.js';
import { app } from '../app.js';
import { classSelect, emptyState } from '../components/pickers.js';
import { parseDelimited, toCSV } from '../../utils/csv.js';

const RE_MASSAR = /^[A-Za-z]{1,2}\d{6,12}$/;

/** Extrait { nom, codeMassar } d'une ligne quelconque (CSV, TSV, texte brut). */
function ligneVersEleve(cols) {
  const cells = cols.filter(c => c !== '');
  if (!cells.length) return null;
  let codeMassar = '';
  const restes = [];
  for (const c of cells) {
    if (!codeMassar && RE_MASSAR.test(c)) { codeMassar = c.toUpperCase(); continue; }
    if (/^\d{1,3}$/.test(c)) continue;                 // numéro d'ordre
    restes.push(c);
  }
  const nom = restes.sort((a, b) => b.length - a.length)[0] || '';
  return nom ? { nom: nom.replace(/\s+/g, ' ').trim(), codeMassar } : null;
}

function estEntete(cols) {
  const t = cols.join(' ');
  return /الاسم|النسب|nom|رقم|ر\.?ت|massar|مسار/i.test(t) && !/\d{6}/.test(t);
}

export function parseListeEleves(texte) {
  const rows = parseDelimited(texte);
  if (rows.length && estEntete(rows[0])) rows.shift();
  return rows.map(ligneVersEleve).filter(Boolean);
}

async function dialogueImport(classId) {
  const zone = h('textarea', {
    placeholder: 'الصق هنا لائحة التلاميذ (سطر لكل تلميذ)، أو انسخ الأعمدة مباشرة من Excel.\nمثال:\n1;R130012345;أمزيل فاطمة الزهراء\n2;R130012346;بوعزة يوسف',
    style: { minHeight: '160px', fontFamily: 'monospace' },
  });
  const fichier = h('input', {
    type: 'file', accept: '.csv,.txt,.tsv,text/csv',
    onchange: async e => {
      const f = e.target.files[0];
      if (f) { zone.value = await f.text(); apercu(); }
    },
  });
  const info = h('p.small.muted', {}, 'لم يتم تحليل أي سطر بعد.');
  const apercu = () => {
    const list = parseListeEleves(zone.value);
    info.textContent = list.length
      ? `${list.length} تلميذ(ة) — أول اسم: «${list[0].nom}»، آخر اسم: «${list[list.length - 1].nom}»`
      : 'لم يتم التعرف على أي اسم.';
  };
  zone.addEventListener('input', apercu);

  const ok = await modal({
    title: 'استيراد لائحة التلاميذ',
    okText: 'استيراد',
    body: h('div', {},
      h('div.field', {}, h('label', {}, 'ملف CSV'), fichier),
      h('div.field', {}, h('label', {}, 'أو لصق مباشر'), zone),
      info),
  });
  if (!ok) return 0;
  const list = parseListeEleves(zone.value);
  if (!list.length) { toast('لا توجد أسماء صالحة', 'err'); return 0; }
  await repo.addStudents(classId, list);
  return list.length;
}

export async function renderStudents() {
  if (!app.classes.length) {
    return emptyState('🏫', 'لا يوجد قسم', 'أنشئ قسما أولا من تبويب «الأقسام».',
      h('a.btn.btn-primary', { href: '#/classes' }, 'إنشاء قسم'));
  }

  const wrap = h('div');
  const corps = h('div');
  const dessine = async () => {
    clear(corps);
    const students = await repo.listStudents(app.classId);

    const ligneAjout = (() => {
      const nom = h('input', { placeholder: 'الاسم والنسب' });
      const massar = h('input', { placeholder: 'رمز مسار (اختياري)' });
      const ajouter = async () => {
        if (!nom.value.trim()) return toast('أدخل الاسم', 'err');
        await repo.saveStudent({ classId: app.classId, nom: nom.value.trim(), codeMassar: massar.value.trim() });
        nom.value = massar.value = ''; nom.focus();
        toast('تمت الإضافة ✓');
        dessine();
      };
      nom.addEventListener('keydown', e => { if (e.key === 'Enter') ajouter(); });
      massar.addEventListener('keydown', e => { if (e.key === 'Enter') ajouter(); });
      return h('div.row', {},
        h('div.field', { style: { flex: '2 1 260px' } }, h('label', {}, 'إضافة تلميذ(ة)'), nom),
        h('div.field', { style: { flex: '1 1 160px' } }, h('label', {}, 'رمز مسار'), massar),
        h('button.btn.btn-primary', { onclick: ajouter }, '+ إضافة'));
    })();

    const table = students.length ? h('div.table-wrap', {}, h('table.data', {},
      h('thead', {}, h('tr', {},
        h('th', { style: { width: '48px' } }, 'ر.ت'),
        h('th', {}, 'الاسم والنسب'),
        h('th', { style: { width: '130px' } }, 'رمز مسار'),
        h('th', { style: { width: '120px' } }, 'تاريخ التسجيل'),
        h('th', { style: { width: '120px' } }, 'تاريخ المغادرة'),
        h('th', { style: { width: '120px' } }, ''))),
      h('tbody', {}, students.map(st => h('tr', {},
        h('td', {}, String(st.rt)),
        h('td', {}, h('input', {
          value: st.nom, style: { border: 'none', background: 'transparent' },
          onchange: async e => { await repo.saveStudent({ ...st, nom: e.target.value.trim() }); toast('تم التحديث ✓'); },
        })),
        h('td', {}, h('input', {
          value: st.codeMassar || '', style: { border: 'none', background: 'transparent' },
          onchange: async e => { await repo.saveStudent({ ...st, codeMassar: e.target.value.trim() }); },
        })),
        h('td', {}, h('input', {
          type: 'date', value: st.dateInscription || '', style: { border: 'none', background: 'transparent' },
          title: 'إن سُجّل التلميذ خلال السنة، لا تُحتسب أنصاف الأيام السابقة',
          onchange: async e => { await repo.saveStudent({ ...st, dateInscription: e.target.value || null }); },
        })),
        h('td', {}, h('input', {
          type: 'date', value: st.dateRadiation || '', style: { border: 'none', background: 'transparent' },
          title: 'تاريخ المغادرة/الشطب',
          onchange: async e => { await repo.saveStudent({ ...st, dateRadiation: e.target.value || null }); },
        })),
        h('td', {}, h('button.btn.btn-sm.btn-danger', {
          onclick: async () => {
            const ok = await confirmBox('حذف التلميذ', `حذف «${st.nom}» وجميع معطيات حضوره؟`);
            if (!ok) return;
            await repo.deleteStudent(st);
            toast('تم الحذف');
            dessine();
          },
        }, 'حذف'))))))
    ) : h('div.empty', {}, h('div.big', {}, '👥'), h('p.muted', {}, 'لا يوجد تلميذ في هذا القسم.'));

    corps.append(
      h('div.card', {},
        h('div.card-head', {},
          h('h2', {}, `التلاميذ — ${app.classes.find(c => c.id === app.classId)?.nom || ''}`),
          h('span.spacer'),
          h('button.btn', { onclick: async () => { const n = await dialogueImport(app.classId); if (n) { toast(`تم استيراد ${n} تلميذ(ة) ✓`); dessine(); } } }, '⬆ استيراد'),
          ' ',
          h('button.btn', {
            onclick: () => {
              const rows = [['ر.ت', 'الاسم والنسب', 'رمز مسار'], ...students.map(s => [s.rt, s.nom, s.codeMassar || ''])];
              download(`تلاميذ-${app.classes.find(c => c.id === app.classId)?.nom || 'قسم'}.csv`, toCSV(rows), 'text/csv');
            },
          }, '⬇ تصدير CSV'),
          ' ',
          h('button.btn', {
            onclick: async () => {
              const tries = [...students].sort((a, b) => a.nom.localeCompare(b.nom, 'ar'));
              await repo.renumber(tries);
              toast('تم الترتيب الأبجدي وإعادة الترقيم ✓');
              dessine();
            },
          }, '⇅ ترتيب أبجدي'),
        ),
        ligneAjout,
        table));
  };

  wrap.append(h('div.card', {}, h('div.row', {}, classSelect(() => dessine()))), corps);
  await dessine();
  return wrap;
}
