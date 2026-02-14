const CACHE_PREFIX = 'stargazers:';

/** Cache considered stale after this many ms (default 24h). */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function isCacheStale(cached) {
  if (!cached || !cached.fetchedAt) return true;
  const age = Date.now() - new Date(cached.fetchedAt).getTime();
  return age > CACHE_TTL_MS;
}

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

/** Trim one stargazer to minimal fields for storage and memory. */
function trimStargazer(item) {
  return {
    starred_at: item.starred_at,
    user: {
      login: item.user?.login ?? 'unknown',
      avatar_url: item.user?.avatar_url ?? ''
    }
  };
}

/** Trim a full API response array to minimal fields (in-memory and before cache). */
export function trimStargazersList(data) {
  return Array.isArray(data) ? data.map(trimStargazer) : data;
}

export function setCachedStargazers(repo, data) {
  try {
    const trimmed = trimStargazersList(data);
    const value = JSON.stringify({
      fetchedAt: new Date().toISOString(),
      data: trimmed
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
