import { escapeHtml } from '../utils/html.js';

/** Max users to render in sidebar; rest are summarized to avoid DOM bloat. */
export const MAX_RENDERED_USERS = 100;

export function sidebarHeading(label, granularity, count) {
  if (granularity === 'day') return `Stargazers on ${label} (${count} users)`;
  if (granularity === 'month') return `Stargazers in ${label} (${count} users)`;
  return `Stargazers in ${label} (${count} users)`;
}

export function open(sidebarEl, titleEl, listEl, { label, granularity, count, users }) {
  titleEl.textContent = sidebarHeading(label, granularity, count);
  const list = users || [];
  const toRender = list.slice(0, MAX_RENDERED_USERS);
  const more = list.length - MAX_RENDERED_USERS;
  let html = toRender.map(u =>
    `<li><img src="${u.avatar_url || ''}" alt="" width="24" height="24" onerror="this.style.display='none'"><span>${escapeHtml(u.login)}</span></li>`
  ).join('');
  if (more > 0) html += `<li class="sidebar-more">… and ${more} more</li>`;
  listEl.innerHTML = html;
  sidebarEl.classList.remove('empty');
}

export function close(sidebarEl, titleEl, listEl) {
  sidebarEl.classList.add('empty');
  titleEl.textContent = '';
  listEl.innerHTML = '';
}
