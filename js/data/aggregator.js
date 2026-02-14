export function aggregate(stargazers) {
  const day = new Map();
  const month = new Map();
  const year = new Map();

  for (const item of stargazers) {
    const date = new Date(item.starred_at);
    const dayKey = date.toISOString().slice(0, 10);
    const monthKey = dayKey.slice(0, 7);
    const yearKey = dayKey.slice(0, 4);
    const user = { login: item.user?.login || 'unknown', avatar_url: item.user?.avatar_url || '' };

    for (const [map, key] of [
      [day, dayKey],
      [month, monthKey],
      [year, yearKey]
    ]) {
      if (!map.has(key)) map.set(key, { count: 0, users: [] });
      const entry = map.get(key);
      entry.count += 1;
      entry.users.push(user);
    }
  }

  for (const map of [day, month, year]) {
    const keys = Array.from(map.keys()).sort();
    const sorted = new Map();
    keys.forEach(k => sorted.set(k, map.get(k)));
    map.clear();
    sorted.forEach((v, k) => map.set(k, v));
  }

  return { day, month, year };
}

export function getChartData(aggregated, granularity, dateRange = {}) {
  const map = aggregated[granularity];
  let labels = Array.from(map.keys());
  const { from, to } = dateRange;

  if (from != null || to != null) {
    const fromKey = from == null ? null : (granularity === 'year' ? from.slice(0, 4) : granularity === 'month' ? from.slice(0, 7) : from);
    const toKey = to == null ? null : (granularity === 'year' ? to.slice(0, 4) : granularity === 'month' ? to.slice(0, 7) : to);
    labels = labels.filter((key) => {
      if (fromKey != null && key < fromKey) return false;
      if (toKey != null && key > toKey) return false;
      return true;
    });
  }

  const counts = labels.map(k => map.get(k).count);
  const userData = labels.map(k => map.get(k));
  return { labels, counts, userData };
}
