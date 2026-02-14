export function show(el, resetTimestamp) {
  const resetDate = resetTimestamp ? new Date(resetTimestamp * 1000).toLocaleString() : 'soon';
  const msgEl = el.querySelector('.rate-limit-message');
  if (msgEl) {
    msgEl.textContent = `GitHub's rate limit was reached. You can try again after ${resetDate}, or add a Personal Access Token below for 5,000 requests/hour.`;
  }
  el.classList.add('visible');
}

export function hide(el) {
  el.classList.remove('visible');
}
