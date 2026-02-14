export function getChartTheme() {
  const root = document.documentElement;
  const get = (name) => getComputedStyle(root).getPropertyValue(name).trim() || undefined;
  return {
    line: get('--chart-line') || '#0071e3',
    fill: get('--chart-fill') || 'rgba(0, 113, 227, 0.1)',
    axis: get('--chart-axis') || '#6e6e73',
    grid: get('--chart-grid') || 'rgba(0, 0, 0, 0.06)'
  };
}
