/** Petits utilitaires DOM — remplacent une librairie de rendu. */

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** h('div.card', {onclick}, ...enfants) */
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = String(tag).split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className += (node.className ? ' ' : '') + v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

let toastTimer;
export function toast(message, kind = 'ok') {
  const t = qs('#toast');
  t.textContent = message;
  t.className = 'toast' + (kind === 'err' ? ' err' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/** Modale générique. body = Node | string. Résout true/false. */
export function modal({ title, body, okText = 'تأكيد', cancelText = 'إلغاء', danger = false }) {
  return new Promise(resolve => {
    const box = qs('#modal');
    qs('#modal-title').textContent = title || '';
    const b = clear(qs('#modal-body'));
    b.append(body instanceof Node ? body : document.createTextNode(body || ''));
    const ok = qs('#modal-ok'), cancel = qs('#modal-cancel');
    ok.textContent = okText;
    ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    cancel.textContent = cancelText;
    cancel.hidden = cancelText === null;
    const done = value => {
      box.hidden = true;
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onOk = () => done(true), onCancel = () => done(false);
    const onKey = e => { if (e.key === 'Escape') done(false); };
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    box.hidden = false;
    ok.focus();
  });
}

export const confirmBox = (title, text, okText = 'حذف') =>
  modal({ title, body: text, okText, danger: true });

/** Téléchargement d'un fichier généré côté client. */
export function download(filename, data, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const uid = (prefix = 'id') =>
  prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const escapeHtml = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
