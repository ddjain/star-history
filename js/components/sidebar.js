import { escapeHtml } from '../utils/html.js';

export function sidebarHeading(label, granularity, count) {
  if (granularity === 'day') return `Stargazers on ${label} (${count} users)`;
  if (granularity === 'month') return `Stargazers in ${label} (${count} users)`;
  return `Stargazers in ${label} (${count} users)`;
}

export function open(sidebarEl, titleEl, listEl, { label, granularity, count, users }) {
  titleEl.textContent = sidebarHeading(label, granularity, count);
  listEl.innerHTML = (users || []).map(u =>
    `<li><img src="${u.avatar_url || ''}" alt="" onerror="this.style.display='none'"><span>${escapeHtml(u.login)}</span></li>`
  ).join('');
  sidebarEl.classList.remove('empty');
}

export function close(sidebarEl, titleEl, listEl) {
  sidebarEl.classList.add('empty');
  titleEl.textContent = '';
  listEl.innerHTML = '';
}
