export function getRepoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('repo') || '';
}

export function setRepoInUrl(repo) {
  const url = new URL(window.location.href);
  if (repo) url.searchParams.set('repo', repo);
  else url.searchParams.delete('repo');
  window.history.replaceState({}, '', url.toString());
}

export function parseRepoInput(value) {
  const raw = (value || '').trim();
  const parts = raw.split('/').map(s => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return parts[0] + '/' + parts[1];
}
