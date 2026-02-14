import { getStargazersUrl } from './config.js';
import { fetchAllStargazers } from './api/github.js';
import { aggregate, getChartData } from './data/aggregator.js';
import { getRepoFromUrl, setRepoInUrl, parseRepoInput } from './utils/url.js';
import { getCachedStargazers, setCachedStargazers, clearCachedStargazers, isCacheStale, trimStargazersList } from './utils/cache.js';
import { getRecentRepos, addRecentRepo, clearRecentRepos } from './utils/recentRepos.js';
import { getToken, setToken, clearToken } from './utils/token.js';
import { getChartTheme } from './utils/theme.js';
import * as rateLimit from './components/rateLimit.js';
import * as tooltip from './components/tooltip.js';
import * as sidebar from './components/sidebar.js';
import { createChart } from './components/chart.js';

let apiBase = '';
let allStargazers = [];
let aggregated = { day: new Map(), month: new Map(), year: new Map() };
let chartInstance = null;
let currentRepo = '';
let currentChartType = 'line';
let loadAbortController = null;

const loadingEl = document.getElementById('loading');
const loadingTextEl = document.getElementById('loadingText');
const chartEl = document.getElementById('chart');
const viewButtons = document.querySelectorAll('.view-segmented button');
const rateLimitEl = document.getElementById('rateLimit');
const tooltipEl = document.getElementById('tooltip');
const repoInput = document.getElementById('repoInput');
const loadBtn = document.getElementById('loadBtn');
const loadedRepoEl = document.getElementById('loadedRepo');
const sidebarEl = document.getElementById('sidebar');
const sidebarTitleEl = document.getElementById('sidebarTitle');
const sidebarListEl = document.getElementById('sidebarList');
const sidebarCloseBtn = document.getElementById('sidebarClose');
const cacheMessageEl = document.getElementById('cacheMessage');
const cacheMessageTextEl = document.getElementById('cacheMessageText');
const cacheRefreshBtn = document.getElementById('cacheRefreshBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const chartSkeletonEl = document.getElementById('chartSkeleton');
const themeToggleEl = document.getElementById('themeToggle');
const chartTypeButtons = document.querySelectorAll('.chart-type-segmented button');
const resetZoomBtn = document.getElementById('resetZoomBtn');
const rateLimitTokenInput = document.getElementById('rateLimitToken');
const saveTokenSessionBtn = document.getElementById('saveTokenSessionBtn');
const saveTokenStorageBtn = document.getElementById('saveTokenStorageBtn');
const clearTokenBtn = document.getElementById('clearTokenBtn');
const rateLimitRetryBtn = document.getElementById('rateLimitRetryBtn');
const tokenSavedFeedback = document.getElementById('tokenSavedFeedback');
const apiCallCountEl = document.getElementById('apiCallCount');
const repoSuggestionsEl = document.getElementById('repoSuggestions');
const useCacheOnlyCheckbox = document.getElementById('useCacheOnly');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const clearRecentReposBtn = document.getElementById('clearRecentReposBtn');
const exampleReposEl = document.getElementById('exampleRepos');

const RATE_LIMIT_STORAGE_KEY = 'stargrap_rate_limit_info';

let chartScriptsLoaded = null;
function loadChartScripts() {
  if (typeof window.Chart !== 'undefined') return Promise.resolve();
  if (chartScriptsLoaded) return chartScriptsLoaded;
  const urls = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1'
  ];
  chartScriptsLoaded = urls.reduce((p, url) => p.then(() => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load chart script: ' + url));
    document.head.appendChild(s);
  })), Promise.resolve());
  return chartScriptsLoaded;
}

function refreshRepoSuggestions() {
  if (!repoSuggestionsEl) return;
  repoSuggestionsEl.innerHTML = '';
  getRecentRepos().forEach((repo) => {
    const opt = document.createElement('option');
    opt.value = repo;
    repoSuggestionsEl.appendChild(opt);
  });
}

function getStoredRateLimitInfo() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.used === 'number' && typeof data.limit === 'number') return data;
    return null;
  } catch (_) {
    return null;
  }
}

function setStoredRateLimitInfo(used, limit) {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify({
      used,
      limit,
      recordedAt: new Date().toISOString()
    }));
  } catch (_) {}
}

function updateApiCallCountDisplay(used, limit, recordedAt) {
  if (!apiCallCountEl) return;
  if (used != null && limit != null) {
    const timeStr = recordedAt ? new Date(recordedAt).toLocaleString() : '';
    apiCallCountEl.textContent = timeStr
      ? `API calls: ${used} / ${limit}. Last recorded at ${timeStr}.`
      : `API calls: ${used} / ${limit}`;
  } else {
    const stored = getStoredRateLimitInfo();
    if (stored) {
      const timeStr = stored.recordedAt ? new Date(stored.recordedAt).toLocaleString() : '';
      apiCallCountEl.textContent = timeStr
        ? `API calls: ${stored.used} / ${stored.limit}. Last recorded at ${timeStr}.`
        : `API calls: ${stored.used} / ${stored.limit}`;
    } else {
      apiCallCountEl.textContent = 'API calls: — / —';
    }
  }
}

function getChartType() {
  const active = document.querySelector('.chart-type-segmented button.active');
  return (active && active.getAttribute('data-chart-type')) || 'line';
}

function getGranularity() {
  const active = document.querySelector('.view-segmented button.active');
  return (active && active.getAttribute('data-view')) || 'day';
}

function setControlsDisabled(disabled) {
  loadBtn.disabled = disabled;
  repoInput.disabled = disabled;
  viewButtons.forEach((btn) => { btn.disabled = disabled; });
  chartTypeButtons.forEach((btn) => { btn.disabled = disabled; });
}

function showLoadingState(showSkeleton) {
  loadingEl.style.display = 'flex';
  const spinner = loadingEl.querySelector('.spinner');
  if (spinner) spinner.style.display = '';
  if (showSkeleton) chartSkeletonEl.style.display = 'block';
  chartEl.style.display = 'none';
}

function hideLoadingState() {
  loadingEl.style.display = 'none';
  chartSkeletonEl.style.display = 'none';
}

async function renderChart() {
  await loadChartScripts();
  const granularity = getGranularity();
  const chartData = getChartData(aggregated, granularity, {});
  const theme = getChartTheme();
  const chartType = getChartType();

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (resetZoomBtn) resetZoomBtn.style.display = 'none';

  chartEl.style.display = 'block';
  chartEl.setAttribute('aria-label', currentRepo
    ? `Stargazer history for ${currentRepo}. Number of stars over time. Select a point or bar to see who starred.`
    : 'Stargazer history chart showing number of stars over time. Select a point or bar to see who starred.');
  loadingEl.style.display = 'none';

  if (chartData.labels.length === 0) {
    loadingEl.style.display = 'flex';
    loadingEl.querySelector('.spinner').style.display = 'none';
    loadingTextEl.textContent = 'No data.';
    chartEl.style.display = 'none';
    return;
  }
  loadingEl.querySelector('.spinner').style.display = '';

  chartInstance = createChart(chartEl, chartData, granularity, {
    onClick(dataIndex) {
      if (!chartInstance || !chartInstance.userDataByIndex) return;
      const userData = chartInstance.userDataByIndex[dataIndex];
      if (!userData) return;
      const label = chartInstance.data.labels[dataIndex];
      sidebar.open(sidebarEl, sidebarTitleEl, sidebarListEl, {
        label,
        granularity: getGranularity(),
        count: userData.count,
        users: userData.users || []
      });
    },
    onTooltip(context) {
      tooltip.show(tooltipEl, context);
    }
  }, theme, chartType, resetZoomBtn);
}

async function loadRepo(skipCache = false) {
  const repo = parseRepoInput(repoInput.value);
  if (!repo) {
    loadedRepoEl.style.display = 'none';
    cacheMessageEl.style.display = 'none';
    rateLimit.hide(rateLimitEl);
    if (exampleReposEl) exampleReposEl.style.display = 'block';
    if (!chartInstance) loadingTextEl.textContent = 'Enter owner/repo (e.g. krkn-chaos/krkn) and click Load.';
    return;
  }

  apiBase = getStargazersUrl(repo);
  currentRepo = repo;
  setRepoInUrl(repo);
  loadedRepoEl.textContent = 'Stargazers for ' + repo;
  loadedRepoEl.style.display = 'block';
  cacheMessageEl.style.display = 'none';
  rateLimit.hide(rateLimitEl);
  sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);

  const cached = !skipCache && getCachedStargazers(repo);
  if (useCacheOnlyCheckbox && useCacheOnlyCheckbox.checked && (!cached || cached.data.length === 0)) {
    cacheMessageTextEl.textContent = 'Not in cache. Uncheck to fetch from GitHub.';
    if (cacheRefreshBtn) cacheRefreshBtn.style.display = 'none';
    cacheMessageEl.style.display = 'flex';
    loadingTextEl.textContent = 'Not in cache. Uncheck "Use cache only" to fetch from GitHub.';
    if (exampleReposEl) exampleReposEl.style.display = 'block';
    return;
  }
  if (cached && cached.data.length > 0) {
    allStargazers = cached.data;
    aggregated = aggregate(allStargazers);
    await renderChart();
    if (exampleReposEl) exampleReposEl.style.display = 'none';
    const dateStr = cached.fetchedAt ? new Date(cached.fetchedAt).toLocaleString() : 'unknown';
    const stale = isCacheStale(cached);
    cacheMessageTextEl.textContent = `Using cache from ${dateStr}.${stale ? ' (may be outdated)' : ''}`;
    if (cacheRefreshBtn) cacheRefreshBtn.style.display = stale ? 'inline-block' : 'none';
    cacheMessageEl.style.display = 'flex';
    addRecentRepo(repo);
    refreshRepoSuggestions();
    return;
  }

  if (loadAbortController) loadAbortController.abort();
  loadAbortController = new AbortController();

  setControlsDisabled(true);
  showLoadingState(true);
  loadingTextEl.textContent = 'Fetching page 1...';

  try {
    allStargazers = await fetchAllStargazers(apiBase, {
      onProgress(page) {
        loadingTextEl.textContent = `Fetching page ${page}...`;
      },
      onRateLimit(reset) {
        rateLimit.show(rateLimitEl, reset);
      },
      onRateLimitInfo(used, limit) {
        setStoredRateLimitInfo(used, limit);
        updateApiCallCountDisplay(used, limit, new Date().toISOString());
      },
      token: getToken(),
      signal: loadAbortController.signal
    });

    hideLoadingState();
    setControlsDisabled(false);

    if (allStargazers.length === 0 && !rateLimitEl.classList.contains('visible')) {
      loadingTextEl.textContent = 'No stargazers found.';
      return;
    }
    if (rateLimitEl.classList.contains('visible')) {
      return;
    }

    allStargazers = trimStargazersList(allStargazers);
    setCachedStargazers(repo, allStargazers);
    aggregated = aggregate(allStargazers);
    await renderChart();
    if (exampleReposEl) exampleReposEl.style.display = 'none';
    const dateStr = new Date().toLocaleString();
    cacheMessageTextEl.textContent = `Using cache from ${dateStr}.`;
    if (cacheRefreshBtn) cacheRefreshBtn.style.display = 'none';
    cacheMessageEl.style.display = 'flex';
    addRecentRepo(repo);
    refreshRepoSuggestions();
  } catch (err) {
    hideLoadingState();
    setControlsDisabled(false);
    if (err.name === 'AbortError') return;
    loadingTextEl.textContent = err.message || 'Failed to load data.';
    if (exampleReposEl) exampleReposEl.style.display = 'block';
    if (tokenSavedFeedback) {
      tokenSavedFeedback.textContent = '';
      tokenSavedFeedback.style.display = 'none';
    }
    if (!rateLimitEl.classList.contains('visible')) {
      rateLimitEl.classList.add('visible');
      const isInvalidToken = err.message === 'Invalid or expired token';
      const displayMessage = isInvalidToken
        ? 'Your GitHub token is invalid or expired. Check or create a token at GitHub → Settings → Developer settings → Personal access tokens. Clear the token below and try without a token, or enter a valid token and save.'
        : (err.message || 'An error occurred.');
      const msgEl = rateLimitEl.querySelector('.rate-limit-message');
      if (msgEl) msgEl.textContent = displayMessage;
      else rateLimitEl.textContent = displayMessage;
    }
  }
}

loadBtn.addEventListener('click', () => loadRepo());
repoInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') loadRepo();
});
if (cacheRefreshBtn) {
  cacheRefreshBtn.addEventListener('click', function() {
    loadRepo(true);
  });
}
clearCacheBtn.addEventListener('click', function() {
  if (currentRepo) {
    clearCachedStargazers(currentRepo);
    repoInput.value = currentRepo;
    loadRepo(true);
  }
});

if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', function() {
    try {
      navigator.clipboard.writeText(window.location.href);
      copyLinkBtn.textContent = 'Copied!';
      setTimeout(function() { copyLinkBtn.textContent = 'Copy link'; }, 2000);
    } catch (_) {}
  });
}
if (clearRecentReposBtn) {
  clearRecentReposBtn.addEventListener('click', function() {
    clearRecentRepos();
    refreshRepoSuggestions();
  });
}
document.querySelectorAll('.example-repo-chip').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const repo = btn.getAttribute('data-repo');
    if (repo && repoInput) {
      repoInput.value = repo;
      loadRepo();
    }
  });
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && sidebarEl && !sidebarEl.classList.contains('empty')) {
    sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);
  }
});

function handleSaveToken(saveToStorage) {
  if (!rateLimitTokenInput || !tokenSavedFeedback) return;
  const value = rateLimitTokenInput.value.trim();
  setToken(value, saveToStorage);
  if (value) {
    tokenSavedFeedback.textContent = saveToStorage ? 'Token saved to this device.' : 'Token saved for this session only.';
    tokenSavedFeedback.style.display = 'block';
    rateLimitTokenInput.value = '';
  } else {
    tokenSavedFeedback.textContent = '';
    tokenSavedFeedback.style.display = 'none';
  }
}

if (saveTokenSessionBtn) saveTokenSessionBtn.addEventListener('click', () => handleSaveToken(false));
if (saveTokenStorageBtn) saveTokenStorageBtn.addEventListener('click', () => handleSaveToken(true));

if (clearTokenBtn && rateLimitTokenInput && tokenSavedFeedback) {
  if (rateLimitRetryBtn) {
    rateLimitRetryBtn.addEventListener('click', function() {
      loadRepo();
    });
  }
  clearTokenBtn.addEventListener('click', function() {
    clearToken();
    rateLimitTokenInput.value = '';
    if (tokenSavedFeedback) {
      tokenSavedFeedback.textContent = '';
      tokenSavedFeedback.style.display = 'none';
    }
  });
}

viewButtons.forEach((btn) => {
  btn.addEventListener('click', async function() {
    viewButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);
    await renderChart();
  });
});

chartTypeButtons.forEach((btn) => {
  btn.addEventListener('click', async function() {
    chartTypeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentChartType = btn.getAttribute('data-chart-type');
    sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);
    await renderChart();
  });
});

if (resetZoomBtn) {
  resetZoomBtn.addEventListener('click', function() {
    if (chartInstance && typeof chartInstance.resetZoom === 'function') {
      chartInstance.resetZoom();
      resetZoomBtn.style.display = 'none';
    }
  });
}

function applyTheme(theme) {
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  themeToggleEl.textContent = theme === 'dark' ? 'Light' : 'Dark';
  themeToggleEl.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  try { localStorage.setItem('theme', theme); } catch (_) {}
}

themeToggleEl.addEventListener('click', function() {
  const current = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  if (chartInstance) {
    const theme = getChartTheme();
    const granularity = getGranularity();
    const chartData = getChartData(aggregated, granularity, {});
    chartInstance.destroy();
    chartInstance = createChart(chartEl, chartData, granularity, {
      onClick(dataIndex) {
        if (!chartInstance || !chartInstance.userDataByIndex) return;
        const userData = chartInstance.userDataByIndex[dataIndex];
        if (!userData) return;
        const label = chartInstance.data.labels[dataIndex];
        sidebar.open(sidebarEl, sidebarTitleEl, sidebarListEl, {
          label,
          granularity: getGranularity(),
          count: userData.count,
          users: userData.users || []
        });
      },
      onTooltip(context) { tooltip.show(tooltipEl, context); }
    }, getChartTheme(), getChartType(), resetZoomBtn);
  }
});

sidebarCloseBtn.addEventListener('click', function() {
  sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);
});

document.addEventListener('click', function(e) {
  if (sidebarEl.classList.contains('empty')) return;
  if (e.target.id === 'sidebarBackdrop' || e.target.classList.contains('sidebar-backdrop')) {
    sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);
    return;
  }
  if (!sidebarEl.contains(e.target) && !chartEl.contains(e.target)) {
    sidebar.close(sidebarEl, sidebarTitleEl, sidebarListEl);
  }
});

chartEl.addEventListener('mouseleave', function() {
  tooltip.hide(tooltipEl);
});

(function init() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  updateApiCallCountDisplay();
  refreshRepoSuggestions();
  if (exampleReposEl) exampleReposEl.style.display = 'block';

  const urlRepo = getRepoFromUrl();
  if (urlRepo) {
    repoInput.value = urlRepo;
    loadRepo();
  }
})();
