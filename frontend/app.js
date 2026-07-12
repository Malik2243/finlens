/* =========================================================
   FinLens – app.js
   Fetches all data from the FastAPI backend and renders the
   dashboard. Configure API_BASE to point at your backend.
   ========================================================= */

// ── Configuration ──────────────────────────────────────────────────────────
// In production this should be your Render backend URL.
// For local dev: http://localhost:8000
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : window.__API_URL__ || 'https://finlens-api.onrender.com'; // replaced at deploy time

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = {
  inr:  (v) => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
  pct:  (v) => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%',
  num:  (v) => v == null ? '—' : Number(v).toLocaleString('en-IN'),
  dec:  (v, d=2) => v == null ? '—' : Number(v).toFixed(d),
};

function el(id) { return document.getElementById(id); }

function show(...ids) { ids.forEach(id => { const e = el(id); if (e) e.style.display = ''; }); }
function hide(...ids) { ids.forEach(id => { const e = el(id); if (e) e.style.display = 'none'; }); }

async function apiFetch(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── Tab switching ───────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.id === 'tab-' + name);
    b.setAttribute('aria-selected', b.id === 'tab-' + name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + name);
  });
}
window.switchTab = switchTab; // expose for onclick attributes

// ── Render Summary Cards ────────────────────────────────────────────────────
function renderSummary(s) {
  el('val-total').textContent = s.total_skus;
  el('sub-total').textContent = `${s.scraped_skus} with live competitor data`;

  el('val-declining').textContent = s.declining_skus;

  el('val-above').textContent = s.above_market_skus;

  el('val-risk').textContent = fmt.inr(s.total_profit_swing);

  el('data-as-of').innerHTML = `<span class="dot pulse"></span> Data as of ${s.data_as_of}`;
  el('footer-date').textContent = s.data_as_of;
}

// ── Render Join Section ─────────────────────────────────────────────────────
function renderJoin(summary, priceDelta, marginTrend) {
  const joinSkus = summary.join_skus;
  const chips = el('join-chips');
  chips.innerHTML = '';

  if (joinSkus.length === 0) {
    chips.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">No SKUs currently meet both criteria.</p>';
    return;
  }

  // Build lookup maps
  const priceMap = Object.fromEntries(priceDelta.map(r => [r.sku, r]));
  const marginMap = Object.fromEntries(marginTrend.map(r => [r.sku, r]));

  joinSkus.forEach(sku => {
    const pd = priceMap[sku];
    const mt = marginMap[sku];
    const chip = document.createElement('div');
    chip.className = 'join-chip';
    chip.innerHTML = `
      ${sku}
      <span>${pd ? pd.name : ''}</span>
      <span style="margin-left:12px;color:#f87171;">
        Δ ${pd && pd.delta_pct != null ? '+' + pd.delta_pct.toFixed(1) + '% vs market' : ''}
      </span>
      <span style="margin-left:8px;color:#fbbf24;">
        slope ${mt ? mt.slope + ' pt/mo' : ''}
      </span>
    `;
    chips.appendChild(chip);
  });
}

// ── Render Price Delta Table ────────────────────────────────────────────────
function renderPriceDelta(rows, joinSkus) {
  const tbody = el('tbody-price');
  tbody.innerHTML = '';
  const joinSet = new Set(joinSkus);

  el('meta-price').textContent =
    `${rows.length} SKUs tracked · ${rows.filter(r=>!r.stale).length} with scraped competitor price · grey rows = no competitor data (STALE, not zero delta)`;

  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (joinSet.has(row.sku)) tr.classList.add('join-row');
    if (row.stale) tr.classList.add('stale-row');

    const deltaClass = row.delta_pct == null ? '' : row.delta_pct > 0 ? 'delta-up' : row.delta_pct < 0 ? 'delta-down' : 'delta-zero';
    const deltaText  = row.stale ? '—' : fmt.pct(row.delta_pct);

    const flagBadge = row.stale
      ? `<span class="badge badge-stale">STALE</span>`
      : row.above_10pct
        ? `<span class="badge badge-yes">⚠ &gt;10% above</span>`
        : `<span class="badge badge-no">OK</span>`;

    const sourceCell = row.source_url
      ? `<a href="${row.source_url}" target="_blank" rel="noopener" class="source-link">
           ${row.competitor} <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 8.5 L8.5 1.5M4 1.5h4.5v4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
         </a>`
      : `<span style="color:var(--text-muted)">No data</span>`;

    tr.innerHTML = `
      <td>${row.sku}</td>
      <td>${row.name}</td>
      <td>${row.category}</td>
      <td class="price-cell">${fmt.inr(row.our_price)}</td>
      <td class="price-cell">${row.stale ? '<span style="color:var(--text-muted)">—</span>' : fmt.inr(row.comp_price)}</td>
      <td class="${deltaClass}">${deltaText}</td>
      <td>${flagBadge}</td>
      <td>${sourceCell}</td>
      <td style="color:var(--text-muted);font-size:0.72rem;font-family:var(--font-mono)">${row.scraped_at ? row.scraped_at.replace(' UTC','') : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Render Margin Trend Table ───────────────────────────────────────────────
function renderMarginTrend(rows, joinSkus) {
  const tbody = el('tbody-margin');
  tbody.innerHTML = '';
  const joinSet = new Set(joinSkus);

  el('meta-margin').textContent =
    `Linear regression slope of gross margin % over Apr/May/Jun 2026 (x=1,2,3). DECLINING = slope < −1 pt/mo AND monotonically decreasing.`;

  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (joinSet.has(row.sku)) tr.classList.add('join-row');

    const slopeClass = row.slope < -1 ? 'delta-up' : row.slope > 0 ? 'delta-down' : 'delta-zero';
    const slopeText  = row.slope != null ? (row.slope >= 0 ? '+' : '') + row.slope.toFixed(3) : '—';

    const flagBadge = row.declining
      ? `<span class="badge badge-declining">📉 DECLINING</span>`
      : `<span class="badge badge-stable">Stable</span>`;

    tr.innerHTML = `
      <td>${row.sku}</td>
      <td class="price-cell">${row.apr_pct != null ? row.apr_pct.toFixed(2) + '%' : '—'}</td>
      <td class="price-cell">${row.may_pct != null ? row.may_pct.toFixed(2) + '%' : '—'}</td>
      <td class="price-cell">${row.jun_pct != null ? row.jun_pct.toFixed(2) + '%' : '—'}</td>
      <td class="${slopeClass}" style="font-family:var(--font-mono)">${slopeText}</td>
      <td style="color:var(--text-secondary)">${row.monotonic}</td>
      <td>${flagBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Render Revenue at Risk Table ────────────────────────────────────────────
function renderRevenueAtRisk(rows, priceDelta) {
  const tbody = el('tbody-risk');
  tbody.innerHTML = '';

  el('meta-risk').textContent =
    `Only the ${rows.length} SKUs that are both margin-declining AND priced >10% above market. Volumes held constant at June 2026 actuals.`;

  const priceMap = Object.fromEntries(priceDelta.map(r => [r.sku, r]));

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.classList.add('join-row');

    const swingClass = row.profit_swing < 0 ? 'swing-neg' : 'swing-pos';
    const swingText  = row.profit_swing != null
      ? (row.profit_swing < 0 ? '−' : '+') + '₹' + Math.abs(row.profit_swing).toLocaleString('en-IN', {maximumFractionDigits:0})
      : '—';

    tr.innerHTML = `
      <td>${row.sku}</td>
      <td class="price-cell">${fmt.num(row.june_units)}</td>
      <td class="price-cell">${fmt.inr(row.june_revenue)}</td>
      <td class="price-cell">${row.june_margin_pct != null ? row.june_margin_pct.toFixed(2) + '%' : '—'}</td>
      <td class="price-cell">${fmt.inr(row.current_gp)}</td>
      <td class="price-cell">${fmt.inr(row.comp_price)}</td>
      <td class="price-cell">${fmt.inr(row.new_revenue)}</td>
      <td class="price-cell">${fmt.inr(row.new_gp)}</td>
      <td class="price-cell">${row.new_margin_pct != null ? row.new_margin_pct.toFixed(2) + '%' : '—'}</td>
      <td class="${swingClass}">${swingText}</td>
    `;
    tbody.appendChild(tr);
  });

  el('risk-note').textContent =
    'Profit Swing = New GP − Current GP. Negative = margin lost if price is cut to match competitor. ' +
    'Presented as evidence only — no pricing recommendation is made or implied.';
}

// ── Render Assumptions ──────────────────────────────────────────────────────
function renderAssumptions(notes) {
  const ul = el('assumptions-list');
  ul.innerHTML = '';
  notes.forEach((note, i) => {
    const li = document.createElement('li');
    // Bold any leading number like "1. "
    li.innerHTML = note.replace(/^(\d+\.)/, '<strong>$1</strong>');
    ul.appendChild(li);
  });
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
async function init() {
  try {
    // Fetch all endpoints in parallel
    const [summary, priceDelta, marginTrend, revenueAtRisk, assumptions] = await Promise.all([
      apiFetch('/api/summary'),
      apiFetch('/api/price-delta'),
      apiFetch('/api/margin-trend'),
      apiFetch('/api/revenue-at-risk'),
      apiFetch('/api/assumptions'),
    ]);

    hide('loading-overlay', 'error-banner');
    show('cards-section', 'join-section', 'tabs-section');

    renderSummary(summary);
    renderJoin(summary, priceDelta, marginTrend);
    renderPriceDelta(priceDelta, summary.join_skus);
    renderMarginTrend(marginTrend, summary.join_skus);
    renderRevenueAtRisk(revenueAtRisk, priceDelta);
    renderAssumptions(assumptions.notes);

  } catch (err) {
    hide('loading-overlay');
    show('error-banner');
    el('error-banner').innerHTML =
      `⚠️ Could not reach the backend (<code>${API_BASE}</code>). Is the API running? — ${err.message}`;
    console.error('FinLens API error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
