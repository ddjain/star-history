import { PER_PAGE } from '../config.js';

export async function fetchPage(apiBase, page, { onRateLimit, token } = {}) {
  const url = `${apiBase}?per_page=${PER_PAGE}&page=${page}`;
  const headers = { Accept: 'application/vnd.github.v3.star+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });

  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');
  if (res.status === 403 || res.status === 429 || (remaining !== null && parseInt(remaining, 10) === 0)) {
    const resetTimestamp = reset ? parseInt(reset, 10) : null;
    if (onRateLimit) onRateLimit(resetTimestamp);
    throw new Error('Rate limit exceeded');
  }
  if (res.status === 401) throw new Error('Invalid or expired token');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAllStargazers(apiBase, { onProgress, onRateLimit, token } = {}) {
  const all = [];
  let page = 1;

  while (true) {
    if (onProgress) onProgress(page);
    const data = await fetchPage(apiBase, page, { onRateLimit, token });
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    page++;
  }

  return all;
}
