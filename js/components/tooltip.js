import { escapeHtml } from '../utils/html.js';
import { MAX_RENDERED_USERS } from './sidebar.js';

export function show(el, { chart, tooltip }) {
  if (!tooltip.opacity || tooltip.dataPoints.length === 0) {
    hide(el);
    return;
  }
  const dp = tooltip.dataPoints[0];
  const label = dp.label;
  const userData = chart.userDataByIndex[dp.dataIndex];
  const title = label;
  const count = userData.count;
  const users = userData.users || [];
  const toRender = users.slice(0, MAX_RENDERED_USERS);
  const more = users.length - MAX_RENDERED_USERS;
  let listHtml = toRender.map(u =>
    `<li><img src="${u.avatar_url || ''}" alt="" width="24" height="24" onerror="this.style.display='none'"><span>${escapeHtml(u.login)}</span></li>`
  ).join('');
  if (more > 0) listHtml += `<li class="tooltip-more">… and ${more} more</li>`;
  const hint = users.length > 5 ? '<div class="tooltip-hint">Scroll for more · click point to see full list in sidebar</div>' : '';
  el.innerHTML = `<div class="tooltip-title">${escapeHtml(title)}</div><div class="tooltip-count">Total stars: ${count}</div><ul class="tooltip-users">${listHtml}</ul>${hint}`;
  el.classList.add('visible');
  const rect = chart.canvas.getBoundingClientRect();
  el.style.left = (rect.left + tooltip.caretX) + 'px';
  el.style.top = (rect.top + tooltip.caretY - 10) + 'px';
}

export function hide(el) {
  el.classList.remove('visible');
}
