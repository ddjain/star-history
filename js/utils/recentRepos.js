const STORAGE_KEY = 'stargrap_recent_repos';
const MAX_RECENT = 15;

export function getRecentRepos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX_RECENT).filter((r) => typeof r === 'string' && r.trim().length > 0);
  } catch (_) {
    return [];
  }
}

export function addRecentRepo(repo) {
  if (!repo || typeof repo !== 'string') return;
  const trimmed = repo.trim();
  if (!trimmed) return;
  const list = getRecentRepos();
  const without = list.filter((r) => r !== trimmed);
  const updated = [trimmed, ...without].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export function clearRecentRepos() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}
