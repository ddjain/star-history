import { PER_PAGE } from '../config.js';

export async function fetchPage(apiBase, page, { onRateLimit, onRateLimitInfo, token, signal } = {}) {
  const url = `${apiBase}?per_page=${PER_PAGE}&page=${page}`;
  const headers = { Accept: 'application/vnd.github.v3.star+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, signal });

  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');
  if (res.status === 403 || res.status === 429 || (remaining !== null && parseInt(remaining, 10) === 0)) {
    const resetTimestamp = reset ? parseInt(reset, 10) : null;
    if (onRateLimit) onRateLimit(resetTimestamp);
    throw new Error('Rate limit exceeded');
  }
  if (res.status === 401) throw new Error('Invalid or expired token');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const used = parseInt(res.headers.get('X-RateLimit-Used'), 10);
  const limit = parseInt(res.headers.get('X-RateLimit-Limit'), 10);
  if (!isNaN(used) && !isNaN(limit) && onRateLimitInfo) onRateLimitInfo(used, limit);

  return res.json();
}

export async function fetchAllStargazers(apiBase, { onProgress, onRateLimit, onRateLimitInfo, token, signal } = {}) {
  const all = [];
  let page = 1;

  while (true) {
    if (onProgress) onProgress(page);
    const data = await fetchPage(apiBase, page, { onRateLimit, onRateLimitInfo, token, signal });
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    page++;
  }

  return all;
}
