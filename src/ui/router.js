/** Routage par hash + barre de navigation. */
import { qs, clear, h } from '../utils/dom.js';
import { t } from '../i18n/index.js';

const routes = new Map();
let current = null;

export function route(path, label, render) { routes.set(path, { label, render }); }

export function navigate(path) {
  if (location.hash.slice(1) === path) renderCurrent();
  else location.hash = path;
}

export function renderNav() {
  const nav = clear(qs('#nav'));
  const active = location.hash.slice(1) || '/register';
  for (const [path, def] of routes) {
    if (!def.label) continue;
    nav.append(h('a', { href: '#' + path, class: path === active ? 'active' : '' }, t(def.label)));
  }
}

export async function renderCurrent() {
  const path = location.hash.slice(1) || '/register';
  const def = routes.get(path) || routes.get('/register');
  current = path;
  renderNav();
  const view = clear(qs('#view'));
  window.scrollTo(0, 0);
  try {
    const node = await def.render();
    if (node) view.append(node);
  } catch (err) {
    console.error(err);
    view.append(h('div.card', {}, h('h2', {}, t('خطأ')), h('p.muted', {}, String(err.message || err))));
  }
}

export function startRouter() {
  addEventListener('hashchange', renderCurrent);
  renderCurrent();
}

export const currentPath = () => current;
