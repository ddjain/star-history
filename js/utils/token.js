const STORAGE_KEY = 'stargrap_github_token';
let sessionToken = null;

export function getToken() {
  if (sessionToken != null && sessionToken !== '') return sessionToken;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || null;
  } catch (_) {
    return null;
  }
}

export function setToken(value, saveToStorage) {
  const v = value == null ? '' : String(value).trim();
  sessionToken = v || null;
  if (saveToStorage && v) {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch (_) {}
  } else if (saveToStorage && !v) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }
}

export function clearToken() {
  sessionToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}
