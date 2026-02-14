import { escapeHtml } from '../utils/html.js';

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
  const listHtml = users.map(u =>
    `<li><img src="${u.avatar_url || ''}" alt="" onerror="this.style.display='none'"><span>${escapeHtml(u.login)}</span></li>`
  ).join('');
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
