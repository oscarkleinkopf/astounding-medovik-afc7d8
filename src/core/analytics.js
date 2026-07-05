/**
 * @module analytics
 * Advanced analytics visualizations using Canvas 2D API.
 * All charts are animated and support hover tooltips.
 * 
 * @description Provides treemap, timeline, and horizontal bar chart
 * visualizations for bookmark data, plus a computeInsights function
 * for deriving summary statistics.
 */

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Sets up a canvas for high-DPI rendering.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number }}
 */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Reset CSS dimensions to match layout
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  return { ctx, width, height, dpr };
}

/**
 * Clears the entire canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Extracts the domain from a URL string.
 * @param {string} url
 * @returns {string}
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Easing function (ease-out cubic).
 * @param {number} t  Progress 0..1
 * @returns {number}
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Treemap ────────────────────────────────────────────────────────

/**
 * Lays out rectangles using a simple slice-and-dice algorithm.
 * @param {Array<{ key: string, value: number }>} items  Sorted items
 * @param {{ x: number, y: number, w: number, h: number }} bounds
 * @returns {Array<{ key: string, value: number, x: number, y: number, w: number, h: number }>}
 */
function sliceAndDice(items, bounds) {
  if (items.length === 0) return [];

  const total = items.reduce((s, d) => s + d.value, 0);
  if (total === 0) return [];

  const rects = [];
  let { x, y, w, h } = bounds;
  const vertical = w >= h;

  for (const item of items) {
    const ratio = item.value / total;
    if (vertical) {
      const rw = w * ratio;
      rects.push({ key: item.key, value: item.value, x, y, w: rw, h });
      x += rw;
    } else {
      const rh = h * ratio;
      rects.push({ key: item.key, value: item.value, x, y, w, h: rh });
      y += rh;
    }
  }
  return rects;
}

/**
 * Renders an animated category treemap on a canvas.
 *
 * @param {HTMLCanvasElement} canvas  Target canvas element
 * @param {Object<string, Array>} data  Map of categoryName → bookmarks[]
 * @param {Object} options
 * @param {string[]} options.colors  Palette of hex colors
 * @param {(key: string) => string} options.getLabel  Produces a display label for a category key
 */
export function renderTreemap(canvas, data, options = {}) {
  const { colors = ['#667eea', '#764ba2', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#00f2fe', '#38f9d7'],
    getLabel = (k) => k } = options;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = 10;
  const bounds = { x: padding, y: padding, w: width - padding * 2, h: height - padding * 2 };

  // Prepare sorted data
  const entries = Object.entries(data)
    .map(([key, bookmarks]) => ({ key, value: Array.isArray(bookmarks) ? bookmarks.length : 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (entries.length === 0) {
    clearCanvas(ctx, width, height);
    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data to display', width / 2, height / 2);
    return;
  }

  const total = entries.reduce((s, d) => s + d.value, 0);
  const rects = sliceAndDice(entries, bounds);

  // ── Animation ──
  const duration = 600; // ms
  let startTime = null;
  let hoveredIndex = -1;

  function draw(progress) {
    clearCanvas(ctx, width, height);
    const t = easeOutCubic(Math.min(progress, 1));

    rects.forEach((r, i) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const sw = r.w * t;
      const sh = r.h * t;
      const sx = cx - sw / 2;
      const sy = cy - sh / 2;

      // Fill
      const isHovered = i === hoveredIndex;
      ctx.fillStyle = isHovered
        ? lightenColor(colors[i % colors.length], 25)
        : colors[i % colors.length];
      ctx.globalAlpha = isHovered ? 1 : 0.85;
      ctx.beginPath();
      roundRect(ctx, sx, sy, sw, sh, 6);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundRect(ctx, sx, sy, sw, sh, 6);
      ctx.stroke();

      // Label (only if rect is big enough)
      if (sw > 50 && sh > 30 && t > 0.5) {
        const label = getLabel(r.key);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(14, sw / 8)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const displayText = label.length > 18 ? label.slice(0, 16) + '…' : label;
        ctx.fillText(displayText, cx, cy - 7);

        ctx.font = `${Math.min(11, sw / 10)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(`${r.value}`, cx, cy + 9);
      }
    });
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = elapsed / duration;
    draw(progress);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);

  // ── Hover tooltip ──
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found = -1;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        found = i;
        break;
      }
    }

    if (found !== hoveredIndex) {
      hoveredIndex = found;
      draw(1);
    }

    if (found >= 0) {
      const r = rects[found];
      const pct = ((r.value / total) * 100).toFixed(1);
      canvas.title = `${getLabel(r.key)}: ${r.value} bookmarks (${pct}%)`;
      canvas.style.cursor = 'pointer';
    } else {
      canvas.title = '';
      canvas.style.cursor = 'default';
    }
  };

  canvas.onmouseleave = () => {
    hoveredIndex = -1;
    draw(1);
    canvas.title = '';
    canvas.style.cursor = 'default';
  };
}

// ─── Timeline ───────────────────────────────────────────────────────

/**
 * Renders an animated timeline bar chart of bookmarks grouped by month.
 *
 * @param {HTMLCanvasElement} canvas  Target canvas element
 * @param {Array<Object>} bookmarks  Array of bookmark objects with `addDate` (unix seconds)
 * @param {Object} options
 * @param {string} [options.barColor='#667eea']  Bar fill color
 * @param {string} [options.labelColor='rgba(240,240,245,0.6)']  Axis label color
 */
export function renderTimeline(canvas, bookmarks, options = {}) {
  const { barColor = '#667eea', labelColor = 'rgba(240,240,245,0.6)' } = options;
  const { ctx, width, height } = setupCanvas(canvas);

  // Filter bookmarks with valid addDate
  const valid = (bookmarks || []).filter(b => b && b.addDate && b.addDate > 0);

  if (valid.length === 0) {
    clearCanvas(ctx, width, height);
    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No timeline data available', width / 2, height / 2);
    return;
  }

  // Group by month/year
  /** @type {Map<string, number>} */
  const monthCounts = new Map();
  for (const b of valid) {
    const date = new Date(b.addDate * 1000);
    if (isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }

  // Sort chronologically
  const sortedKeys = [...monthCounts.keys()].sort();
  const counts = sortedKeys.map(k => monthCounts.get(k));
  const maxCount = Math.max(...counts, 1);

  // Layout
  const marginLeft = 50;
  const marginBottom = 50;
  const marginTop = 20;
  const marginRight = 20;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;
  const barW = Math.max(4, Math.min(30, (chartW / sortedKeys.length) - 2));
  const gap = (chartW - barW * sortedKeys.length) / (sortedKeys.length + 1);

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ── Build bar geometries ──
  const bars = sortedKeys.map((key, i) => {
    const count = counts[i];
    const barH = (count / maxCount) * chartH;
    const x = marginLeft + gap + i * (barW + gap);
    const y = marginTop + chartH - barH;
    const [yearStr, monthStr] = key.split('-');
    const label = `${MONTHS_SHORT[parseInt(monthStr, 10) - 1]} ${yearStr}`;
    return { x, y, w: barW, h: barH, count, label, key };
  });

  // ── Animation ──
  const duration = 700;
  let startTime = null;
  let hoveredIndex = -1;

  function draw(progress) {
    clearCanvas(ctx, width, height);
    const t = easeOutCubic(Math.min(progress, 1));

    // Y-axis
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const yy = marginTop + (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(marginLeft, yy);
      ctx.lineTo(width - marginRight, yy);
      ctx.stroke();

      const val = Math.round(maxCount * (1 - i / ySteps));
      ctx.fillStyle = labelColor;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), marginLeft - 8, yy);
    }

    // Bars
    bars.forEach((bar, i) => {
      const animH = bar.h * t;
      const animY = marginTop + chartH - animH;
      const isHovered = i === hoveredIndex;

      // Gradient fill
      const grad = ctx.createLinearGradient(bar.x, animY, bar.x, marginTop + chartH);
      grad.addColorStop(0, isHovered ? lightenColor(barColor, 30) : barColor);
      grad.addColorStop(1, isHovered ? lightenColor(barColor, 10) : adjustAlpha(barColor, 0.6));
      ctx.fillStyle = grad;

      ctx.beginPath();
      roundRect(ctx, bar.x, animY, bar.w, animH, Math.min(4, barW / 2));
      ctx.fill();
    });

    // X-axis labels (show subset if too many)
    const labelInterval = Math.max(1, Math.floor(bars.length / 12));
    ctx.fillStyle = labelColor;
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    bars.forEach((bar, i) => {
      if (i % labelInterval === 0 || i === bars.length - 1) {
        ctx.save();
        ctx.translate(bar.x + bar.w / 2, marginTop + chartH + 6);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(bar.label, 0, 0);
        ctx.restore();
      }
    });
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = (timestamp - startTime) / duration;
    draw(progress);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);

  // ── Hover tooltip ──
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found = -1;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const animY = marginTop + chartH - b.h;
      if (mx >= b.x && mx <= b.x + b.w && my >= animY && my <= marginTop + chartH) {
        found = i;
        break;
      }
    }

    if (found !== hoveredIndex) {
      hoveredIndex = found;
      draw(1);
    }

    if (found >= 0) {
      canvas.title = `${bars[found].label}: ${bars[found].count} bookmarks`;
      canvas.style.cursor = 'pointer';
    } else {
      canvas.title = '';
      canvas.style.cursor = 'default';
    }
  };

  canvas.onmouseleave = () => {
    hoveredIndex = -1;
    draw(1);
    canvas.title = '';
    canvas.style.cursor = 'default';
  };
}

// ─── Top Domains ────────────────────────────────────────────────────

/**
 * Renders an animated horizontal bar chart of the most popular domains.
 *
 * @param {HTMLCanvasElement} canvas  Target canvas element
 * @param {Array<Object>} bookmarks  Array of bookmark objects with `url`
 * @param {Object} options
 * @param {number} [options.limit=10]  Number of domains to show
 * @param {string[]} [options.colors]  Gradient color palette
 */
export function renderTopDomains(canvas, bookmarks, options = {}) {
  const {
    limit = 10,
    colors = ['#667eea', '#764ba2', '#4facfe', '#43e97b', '#fa709a',
      '#fee140', '#00f2fe', '#38f9d7', '#818cf8', '#f472b6']
  } = options;

  const { ctx, width, height } = setupCanvas(canvas);

  // Count domains
  const domainMap = new Map();
  for (const b of (bookmarks || [])) {
    if (!b || !b.url) continue;
    const domain = extractDomain(b.url);
    if (domain === 'unknown') continue;
    domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
  }

  // Top N
  const sorted = [...domainMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sorted.length === 0) {
    clearCanvas(ctx, width, height);
    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No domain data available', width / 2, height / 2);
    return;
  }

  const maxCount = sorted[0][1];

  // Layout
  const marginLeft = 130;
  const marginRight = 60;
  const marginTop = 15;
  const marginBottom = 15;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;
  const barH = Math.min(28, (chartH / sorted.length) - 6);
  const gap = (chartH - barH * sorted.length) / (sorted.length + 1);

  // Build bar geometries
  const bars = sorted.map(([domain, count], i) => {
    const barW = (count / maxCount) * chartW;
    const x = marginLeft;
    const y = marginTop + gap + i * (barH + gap);
    return { domain, count, x, y, w: barW, h: barH };
  });

  // ── Animation ──
  const duration = 650;
  let startTime = null;
  let hoveredIndex = -1;

  function draw(progress) {
    clearCanvas(ctx, width, height);
    const t = easeOutCubic(Math.min(progress, 1));

    bars.forEach((bar, i) => {
      const animW = bar.w * t;
      const isHovered = i === hoveredIndex;

      // Gradient bar
      const c1 = colors[i % colors.length];
      const c2 = colors[(i + 1) % colors.length];
      const grad = ctx.createLinearGradient(bar.x, bar.y, bar.x + animW, bar.y);
      grad.addColorStop(0, isHovered ? lightenColor(c1, 25) : c1);
      grad.addColorStop(1, isHovered ? lightenColor(c2, 25) : c2);
      ctx.fillStyle = grad;

      ctx.beginPath();
      roundRect(ctx, bar.x, bar.y, animW, bar.h, 4);
      ctx.fill();

      // Domain label (left)
      ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(240,240,245,0.8)';
      ctx.font = `${isHovered ? 'bold ' : ''}11px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const displayDomain = bar.domain.length > 18 ? bar.domain.slice(0, 16) + '…' : bar.domain;
      ctx.fillText(displayDomain, marginLeft - 8, bar.y + bar.h / 2);

      // Count label (right of bar)
      if (t > 0.3) {
        ctx.fillStyle = 'rgba(240,240,245,0.6)';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(bar.count), bar.x + animW + 8, bar.y + bar.h / 2);
      }
    });
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = (timestamp - startTime) / duration;
    draw(progress);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);

  // ── Hover tooltip ──
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found = -1;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        found = i;
        break;
      }
    }

    if (found !== hoveredIndex) {
      hoveredIndex = found;
      draw(1);
    }

    if (found >= 0) {
      canvas.title = `${bars[found].domain}: ${bars[found].count} bookmarks`;
      canvas.style.cursor = 'pointer';
    } else {
      canvas.title = '';
      canvas.style.cursor = 'default';
    }
  };

  canvas.onmouseleave = () => {
    hoveredIndex = -1;
    draw(1);
    canvas.title = '';
    canvas.style.cursor = 'default';
  };
}

// ─── Insights ───────────────────────────────────────────────────────

/**
 * Computes summary insights from bookmarks and organized data.
 *
 * @param {Array<Object>} bookmarks  All bookmarks
 * @param {Object<string, Array>} organizedData  Map of category → bookmarks[]
 * @returns {{
 *   totalBookmarks: number,
 *   totalCategories: number,
 *   oldestBookmark: Object|null,
 *   newestBookmark: Object|null,
 *   mostPopularDomain: string,
 *   avgPerCategory: number,
 *   topCategory: string,
 *   emptyCategories: number,
 *   duplicateEstimate: number
 * }}
 */
export function computeInsights(bookmarks, organizedData) {
  const all = bookmarks || [];
  const org = organizedData || {};
  const categoryKeys = Object.keys(org);

  // Total counts
  const totalBookmarks = all.length;
  const totalCategories = categoryKeys.length;

  // Oldest / newest by addDate
  let oldestBookmark = null;
  let newestBookmark = null;
  for (const b of all) {
    if (!b || !b.addDate || b.addDate <= 0) continue;
    if (!oldestBookmark || b.addDate < oldestBookmark.addDate) {
      oldestBookmark = b;
    }
    if (!newestBookmark || b.addDate > newestBookmark.addDate) {
      newestBookmark = b;
    }
  }

  // Most popular domain
  const domainCounts = new Map();
  for (const b of all) {
    if (!b || !b.url) continue;
    const domain = extractDomain(b.url);
    if (domain === 'unknown') continue;
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  }
  let mostPopularDomain = '';
  let maxDomainCount = 0;
  for (const [domain, count] of domainCounts) {
    if (count > maxDomainCount) {
      maxDomainCount = count;
      mostPopularDomain = domain;
    }
  }

  // Average per category
  const avgPerCategory = totalCategories > 0
    ? Math.round((totalBookmarks / totalCategories) * 10) / 10
    : 0;

  // Top category
  let topCategory = '';
  let topCategoryCount = 0;
  for (const [key, arr] of Object.entries(org)) {
    const len = Array.isArray(arr) ? arr.length : 0;
    if (len > topCategoryCount) {
      topCategoryCount = len;
      topCategory = key;
    }
  }

  // Empty categories
  const emptyCategories = categoryKeys.filter(k => {
    const arr = org[k];
    return !Array.isArray(arr) || arr.length === 0;
  }).length;

  // Duplicate estimate (by URL)
  const urlSet = new Set();
  let duplicateEstimate = 0;
  for (const b of all) {
    if (!b || !b.url) continue;
    if (urlSet.has(b.url)) {
      duplicateEstimate++;
    } else {
      urlSet.add(b.url);
    }
  }

  return {
    totalBookmarks,
    totalCategories,
    oldestBookmark,
    newestBookmark,
    mostPopularDomain,
    avgPerCategory,
    topCategory,
    emptyCategories,
    duplicateEstimate,
  };
}

// ─── Internal Utilities ─────────────────────────────────────────────

/**
 * Draws a rounded rectangle path (does NOT fill or stroke).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r  Corner radius
 */
function roundRect(ctx, x, y, w, h, r) {
  if (w < 0 || h < 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Lightens a hex color by a percentage.
 * @param {string} hex  Color like '#667eea'
 * @param {number} pct  Percentage 0-100
 * @returns {string}
 */
function lightenColor(hex, pct) {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, r + Math.round((255 - r) * (pct / 100)));
    g = Math.min(255, g + Math.round((255 - g) * (pct / 100)));
    b = Math.min(255, b + Math.round((255 - b) * (pct / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return hex;
  }
}

/**
 * Returns a color string with adjusted alpha (for non-hex usage in gradients).
 * @param {string} hex
 * @param {number} alpha  0..1
 * @returns {string}
 */
function adjustAlpha(hex, alpha) {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return hex;
  }
}
