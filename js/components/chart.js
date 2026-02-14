export function createChart(canvas, { labels, counts, userData }, granularity, callbacks = {}, theme = {}, chartType = 'line', resetZoomBtnEl = null) {
  const { onClick, onTooltip } = callbacks;
  const lineColor = theme.line || '#0071e3';
  const fillColor = theme.fill || 'rgba(0, 113, 227, 0.1)';
  const axisColor = theme.axis || '#6e6e73';
  const gridColor = theme.grid || 'rgba(0, 0, 0, 0.06)';

  const isBar = chartType === 'bar';
  const isArea = chartType === 'area';
  const type = isBar ? 'bar' : 'line';
  const areaFill = isArea ? fillColor.replace(/[\d.]+\)$/, '0.25)') : fillColor;
  const barColor = fillColor.replace(/[\d.]+\)$/, '0.7)');
  const dataset = isBar
    ? { label: 'Stars', data: counts, backgroundColor: barColor, borderRadius: 4 }
    : {
        label: 'Stars',
        data: counts,
        borderColor: lineColor,
        backgroundColor: isArea ? areaFill : fillColor,
        fill: true,
        tension: 0.2
      };

  const chart = new window.Chart(canvas.getContext('2d'), {
    type,
    data: {
      labels,
      datasets: [dataset]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { intersect: false, mode: 'index' },
      onClick: function(_ev, elements) {
        if (elements.length > 0 && onClick) onClick(elements[0].index);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: function(context) {
            if (onTooltip) onTooltip(context);
          }
        },
        zoom: {
          zoom: {
            drag: { enabled: true },
            mode: 'x',
            onZoomComplete: function() {
              if (resetZoomBtnEl) resetZoomBtnEl.style.display = 'block';
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Time', color: axisColor },
          ticks: (function() {
            const opts = { maxRotation: 45, color: axisColor };
            if (granularity === 'day') {
              opts.maxTicksLimit = 12;
              opts.autoSkip = true;
              opts.autoSkipPadding = 8;
            }
            return opts;
          })(),
          grid: { color: gridColor }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Number of stars', color: axisColor },
          ticks: { color: axisColor },
          grid: { color: gridColor }
        }
      }
    }
  });

  chart.userDataByIndex = userData;
  return chart;
}
