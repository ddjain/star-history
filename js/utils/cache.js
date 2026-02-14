const CACHE_PREFIX = 'stargazers:';

export function getCachedStargazers(repo) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + repo);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    return { fetchedAt: parsed.fetchedAt || '', data: parsed.data };
  } catch {
    return null;
  }
}

export function setCachedStargazers(repo, data) {
  try {
    const value = JSON.stringify({
      fetchedAt: new Date().toISOString(),
      data
    });
    localStorage.setItem(CACHE_PREFIX + repo, value);
  } catch (_) {
    // quota or other
  }
}

export function clearCachedStargazers(repo) {
  try {
    localStorage.removeItem(CACHE_PREFIX + repo);
  } catch (_) {}
}
