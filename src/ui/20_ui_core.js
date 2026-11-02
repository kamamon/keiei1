/* =========================================================
   画面の土台：描画・イベント・モーダル・表・グラフ
   ========================================================= */
const UI = { screen: 'title', tab: {}, sort: {}, modal: null, mq: [], navOpen: false, busy: null, sel: {}, flip: false, lastDate: '',
  title: { step: 0, team: null, name: '', nick: '', policy: 'balance' }, f: {} };
const ACT = {};
const SCREENS = {};
const MODALS = {};

function $(s) { return document.querySelector(s); }
function contrastInk(hex) {
  const c = hex.replace('#', ''); const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255; return L > 0.6 ? '#141414' : '#ffffff';
}
function hexA(hex, a) { const c = hex.replace('#', ''); return `rgba(${parseInt(c.substr(0, 2), 16)},${parseInt(c.substr(2, 2), 16)},${parseInt(c.substr(4, 2), 16)},${a})`; }
function applyTheme() {
  let th = 'night';
  try { th = (G && G.user && G.user.theme) || localStorage.getItem('kyudan_theme') || 'night'; } catch (e) { }
  document.documentElement.dataset.theme = th === 'day' ? 'day' : 'night';
  const T = G && G.user ? uT() : null;
  const r = document.documentElement.style;
  if (T) { r.setProperty('--team', T.color); r.setProperty('--team2', T.color2); r.setProperty('--team-ink', contrastInk(T.color)); r.setProperty('--team-soft', hexA(T.color, 0.16)); }
}

/* ---------- 部品 ---------- */
function emblem(T, size) {
  size = size || 40; const ink = contrastInk(T.color);
  return `<svg class="emb" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="${T.color2}"/><circle cx="20" cy="20" r="15.5" fill="${T.color}"/>` +
    `<path d="M8 25 Q20 31 32 25" stroke="${hexA(ink === '#ffffff' ? '#ffffff' : '#000000', .35)}" stroke-width="1.2" fill="none"/>` +
    `<text x="20" y="21.5" text-anchor="middle" dominant-baseline="middle" font-family="Dela Gothic One, sans-serif" font-size="17" fill="${ink}">${esc(T.kanji)}</text></svg>`;
}
function gr(v) { if (v == null) return '<span class="gr Q">?</span>'; const g = grade(v); return `<span class="gr ${g}">${g}</span>`; }
function av(v, k) { if (v == null) return '<span class="av"><span class="gr Q">?</span><span class="n faint">–</span></span>'; if (k === 'vel') return `<span class="num">${Math.round(v)}</span>`; return `<span class="av">${gr(v)}<span class="n">${Math.round(v)}</span></span>`; }
function pLink(p) { if (!p) return '<span class="faint">（退団）</span>'; return `<a class="pl" data-a="player" data-id="${p.id}">${esc(p.name)}</a>`; }
function pLinkId(id) { return pLink(P_(id)); }
function tMark(tid, full) { const T = G.teams[tid]; if (!T) return '―'; return `<span class="nowrap"><span class="dot" style="background:${T.color};box-shadow:none"></span> ${esc(full ? tName(tid) : T.nick)}</span>`; }
function formTag(f) { const c = f === 2 ? 'f2' : f === 1 ? 'f1' : f === 0 ? 'f0' : f === -1 ? 'fm1' : 'fm2'; return `<span class="form ${c}" title="${formName(f)}">${formArrow(f)}</span>`; }
function morDot(m) { return `<span class="dot ${m >= 65 ? 'b' : m >= 40 ? 's' : 'o'}" title="やる気 ${Math.round(m)}"></span>`; }
function statusTag(p) {
  if (p.injW > 0) return `<span class="tag o">故障 ${Math.ceil(p.injW)}週</span>`;
  if (p.lv === 3) return '<span class="tag">育成</span>';
  return '';
}
function stars(n) { return '<span class="stars">' + '★'.repeat(n) + '<span class="faint">' + '★'.repeat(5 - n) + '</span></span>'; }
function bar(v, max, cls, mark) { const w = clamp(v / max * 100, 0, 100); return `<div class="bar ${cls || ''}"><i style="width:${w}%"></i>${mark != null ? `<b style="left:${clamp(mark / max * 100, 0, 100)}%"></b>` : ''}</div>`; }
function seg(name, opts, cur, attr) { return `<div class="seg">${opts.map(([v, l]) => `<button data-a="${name}" data-v="${v}" ${attr || ''} class="${String(v) === String(cur) ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
function tabs(key, list, cur) { return `<div class="tabs" role="tablist">${list.map(([v, l, cnt]) => `<button role="tab" data-a="tab" data-k="${key}" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}${cnt != null ? `<span class="cnt">${cnt}</span>` : ''}</button>`).join('')}</div>`; }
function getTab(key, def) { return UI.tab[key] || def; }
function panel(title, body, o) {
  o = o || {};
  return `<section class="panel ${o.cls || ''}">${title ? `<div class="panel-h"><h2>${title}</h2>${o.act ? `<div class="row">${o.act}</div>` : ''}</div>` : ''}<div class="panel-b ${o.flush ? 'flush' : ''}">${body}</div></section>`;
}
function tiles(list) { return `<div class="tiles">${list.map(t => `<div class="tile"><div class="k">${t[0]}</div><div class="v ${t[3] || ''}">${t[1]}</div>${t[2] ? `<div class="s">${t[2]}</div>` : ''}</div>`).join('')}</div>`; }
function opt(v, l, cur) { return `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`; }
function money(m) { return `<span class="num ${m < 0 ? 'neg' : ''}">${fmtOku(m)}</span>`; }
function signed(m) { return `<span class="num ${m < 0 ? 'neg' : m > 0 ? 'pos' : ''}">${fmtSigned(m)}</span>`; }

/* ---------- 並べ替えできる表 ---------- */
// cols: [{k, l, v:(row)=>sortValue, h:(row)=>html, num:bool, cls}]
function table(id, cols, rows, o) {
  o = o || {};
  const st = UI.sort[id] || o.sort || null;
  let rs = rows.slice();
  if (st) { const c = cols.find(c => c.k === st.k); if (c && c.v) rs.sort((a, b) => { const x = c.v(a), y = c.v(b); const r = (x > y ? 1 : x < y ? -1 : 0); return st.d ? -r : r; }); }
  if (o.limit) rs = rs.slice(0, o.limit);
  if (!rs.length) return `<div class="empty">${o.empty || '該当する項目はありません'}</div>`;
  const th = cols.map(c => `<th class="${c.num ? 'num' : ''} ${c.v ? 'sortable' : ''} ${st && st.k === c.k ? 'sorted' : ''}" ${c.v ? `data-a="sort" data-t="${id}" data-k="${c.k}"` : ''} ${c.title ? `title="${esc(c.title)}"` : ''}>${c.l}${st && st.k === c.k ? (st.d ? '↓' : '↑') : ''}</th>`).join('');
  const tr = rs.map(r => `<tr class="${o.rowCls ? o.rowCls(r) : ''}">${cols.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.h ? c.h(r) : esc(c.v ? c.v(r) : '')}</td>`).join('')}</tr>`).join('');
  return `<div class="tw" ${o.maxH ? `style="max-height:${o.maxH}px;overflow-y:auto"` : ''}><table class="t ${o.compact ? 'compact' : ''}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
ACT.sort = el => { const id = el.dataset.t, k = el.dataset.k; const cur = UI.sort[id]; UI.sort[id] = cur && cur.k === k ? { k, d: !cur.d } : { k, d: true }; render(); };
ACT.tab = el => { UI.tab[el.dataset.k] = el.dataset.v; render(); };

/* ---------- グラフ（SVG） ---------- */
function lineChart(series, labels, o) {
  o = o || {}; const W = o.w || 640, H = o.h || 200, pl = 52, pr = 10, pt = 10, pb = 24;
  const all = series.flatMap(s => s.v.filter(v => v != null));
  if (!all.length) return '<div class="empty">データがまだありません</div>';
  let mn = Math.min(0, ...all), mx = Math.max(...all); if (o.min != null) mn = o.min; if (mx === mn) mx = mn + 1;
  const n = labels.length; const x = i => pl + (n <= 1 ? 0 : i * (W - pl - pr) / (n - 1)); const y = v => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; const yy = y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="currentColor" stroke-opacity=".12"/><text x="${pl - 6}" y="${yy + 4}" text-anchor="end">${o.fmt ? o.fmt(v) : Math.round(v)}</text>`; }
  const step = Math.max(1, Math.ceil(n / 8));
  labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`; });
  for (const s of series) {
    const pts = s.v.map((v, i) => v == null ? null : `${x(i)},${y(v)}`).filter(Boolean).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round"/>`;
    s.v.forEach((v, i) => { if (v != null && n <= 30) g += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.c}"><title>${esc(labels[i])}：${o.fmt ? o.fmt(v) : v}</title></circle>`; });
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'グラフ')}" style="color:var(--ink2)">${g}</svg>` +
    (series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('')}</div>` : '');
}
function barChart(items, o) {
  o = o || {}; const W = o.w || 640, rowH = 22, H = items.length * rowH + 8, pl = o.pl || 110;
  const mx = Math.max(1, ...items.map(i => Math.abs(i.v)));
  let g = '';
  items.forEach((it, i) => {
    const yy = 4 + i * rowH; const w = Math.abs(it.v) / mx * (W - pl - 90);
    g += `<text x="${pl - 8}" y="${yy + 14}" text-anchor="end">${esc(it.l)}</text><rect x="${pl}" y="${yy + 3}" width="${Math.max(1, w)}" height="${rowH - 8}" rx="2" fill="${it.c || 'var(--lamp)'}"/><text x="${pl + w + 6}" y="${yy + 14}">${esc(it.s || '')}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'グラフ')}">${g}</svg>`;
}

/* ---------- 描画 ---------- */
const NAV = [
  { g: '', items: [['home', 'ホーム']] },
  { g: 'チーム', items: [['roster', '選手一覧'], ['lineup', 'オーダー・起用'], ['training', '育成・練習'], ['camp', 'キャンプ']] },
  { g: '試合', items: [['schedule', '日程・結果'], ['standings', '順位表'], ['stats', '成績・タイトル']] },
  { g: '編成', items: [['contracts', '契約・年俸'], ['fa', 'FA市場'], ['trade', 'トレード'], ['foreign', '外国人・トライアウト'], ['scout', 'スカウト'], ['draft', 'ドラフト会議']] },
  { g: '組織', items: [['staff', 'スタッフ']] },
  { g: '経営', items: [['finance', '財務・予算'], ['stadium', '球場・設備'], ['sponsor', 'スポンサー・命名権'], ['fans', 'ファン・広報'], ['town', '街づくり'], ['plan', '中長期計画']] },
  { g: '記録', items: [['records', '球団史・記録'], ['news', 'ニュース'], ['system', 'セーブ・設定']] }
];
function navBadge(k) {
  const t = curTurn();
  if (k === 'contracts' && t >= 44) { const n = renewalList().length; return n || 0; }
  if (k === 'draft' && t === 39 && G.draft && G.draft.stage !== 'done') return '!';
  if (k === 'fa' && ((G.compPending && G.compPending.length) || (t >= 41 && t <= 43 && G.faMarket.some(f => !f.done)))) return G.compPending.length ? '!' : G.faMarket.filter(f => !f.done).length;
  if (k === 'home' && G.pending.length) return G.pending.length;
  if (k === 'sponsor' && (G.sponsors.offers.length || G.naming.offers.length)) return G.sponsors.offers.length + G.naming.offers.length;
  return 0;
}
function renderNav() {
  return `<nav class="nav ${UI.navOpen ? 'open' : ''}" aria-label="メニュー">${NAV.map(g => (g.g ? `<div class="nav-g">${g.g}</div>` : '') + g.items.map(([k, l]) => { const b = navBadge(k); return `<a data-a="nav" data-v="${k}" class="${UI.screen === k ? 'on' : ''}" href="#${k}">${l}${b ? `<span class="badge">${b}</span>` : ''}</a>`; }).join('')).join('')}</nav>`;
}
function renderHeader() {
  const T = uT(); const R = T.rec; const t = curTurn();
  const inSeason = t >= SEASON_START && t <= 38;
  const rk = inSeason || t >= 35 ? teamRank(T.id) + '位' : (T.lastRank ? '昨季' + T.lastRank + '位' : '');
  const mini = `<div class="sb-mini">資金 <b>${fmtOku(G.fin.cash, 1).replace('円', '')}</b>　人気 <b>${Math.round(T.pop)}</b>　信頼 <b>${Math.round(G.owner.trust)}</b></div>`;
  const rec = inSeason ? `${R.w}勝${R.l}敗${R.d ? R.d + '分' : ''}` : '';
  const ds = [G.year, G.month, G.week];
  const flip = UI.lastDate && UI.lastDate !== ds.join('-');
  UI.lastDate = ds.join('-');
  const cash = G.fin.cash;
  return `<header class="sb">
    <button class="sb-menu" data-a="menu" aria-label="メニューを開く">☰</button>
    <div class="sb-team" data-a="nav" data-v="home">${emblem(T, 42)}<div><div class="sb-name">${esc(tName(T.id))}</div><div class="sb-sub">${LEAGUES[T.league]}　${rk} ${rec}</div></div></div>
    <div class="sb-date" aria-label="${nowStr()}"><span class="lit ${flip ? 'flip' : ''}">${G.year}</span><span class="sl">年</span><span class="lit ${flip ? 'flip' : ''}">${G.month}</span><span class="sl">月</span><span class="lit ${flip ? 'flip' : ''}">${G.week}</span><span class="sl">週</span><span class="sb-phase">${phaseLabel()}</span>${mini}</div>
    <div class="sb-read">
      <div class="rd"><span class="rk">資金</span><span class="rv ${cash < 0 ? 'neg' : ''}">${fmtOku(cash, cash >= 100000 ? 1 : 2).replace('円', '')}</span></div>
      <div class="rd"><span class="rk">人気</span><span class="rv">${Math.round(T.pop)}</span></div>
      <div class="rd"><span class="rk">オーナー信頼</span><span class="rv ${G.owner.trust < 25 ? 'neg' : ''}">${Math.round(G.owner.trust)}</span></div>
      <div class="rd"><span class="rk">観客平均</span><span class="rv">${G.fin.att.g ? comma(G.fin.att.tot / G.fin.att.g) : '―'}</span></div>
    </div>
    <div class="sb-go"><button class="go" data-a="next" ${UI.busy ? 'disabled' : ''}>次の週へ</button><button class="go2" data-a="nextMenu" aria-label="まとめて進める" ${UI.busy ? 'disabled' : ''}>▾</button></div>
  </header>`;
}
function renderScreen() { const f = SCREENS[UI.screen] || SCREENS.home; try { return f(); } catch (e) { console.error(e); return `<div class="panel"><div class="panel-b">画面の表示中にエラーが発生しました：${esc(e.message)}</div></div>`; } }
function render() {
  const app = document.getElementById('app');
  applyTheme();
  if (!G || UI.screen === 'title') { app.innerHTML = SCREENS.title(); renderModalRoot(); if (UI.resetScroll) { window.scrollTo(0, 0); UI.resetScroll = false; } return; }
  const y = window.scrollY;
  app.innerHTML = renderHeader() + `<div class="wrap">${renderNav()}${UI.navOpen ? '<div class="navback" data-a="menu"></div>' : ''}<main class="main" id="main">${renderScreen()}</main></div>`;
  renderModalRoot();
  if (!UI.resetScroll) window.scrollTo(0, y); else { window.scrollTo(0, 0); UI.resetScroll = false; }
}
function go(screen, tab) { UI.screen = screen; if (tab) UI.tab[screen] = tab; UI.navOpen = false; UI.resetScroll = true; closeAllModals(); render(); try { history.replaceState(null, '', '#' + screen); } catch (e) { } }
ACT.nav = el => go(el.dataset.v);
ACT.go = el => go(el.dataset.v, el.dataset.tab);
ACT.menu = () => { UI.navOpen = !UI.navOpen; render(); };

/* ---------- モーダル ---------- */
function openModal(k, args) { const m = { k, args: args || {} }; if (UI.modal) UI.mq.push(m); else UI.modal = m; renderModalRoot(); }
function closeModal() { UI.modal = UI.mq.shift() || null; renderModalRoot(); }
function closeAllModals() { UI.modal = null; UI.mq = []; }
function replaceModal(k, args) { UI.modal = { k, args: args || {} }; renderModalRoot(); }
function renderModalRoot() {
  let root = document.getElementById('modal-root');
  if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
  if (!UI.modal) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
  let m = null;
  while (UI.modal && !m) {
    const f = MODALS[UI.modal.k];
    try { m = f ? f(UI.modal.args) : null; } catch (e) { console.error(e); m = { title: 'エラー', body: esc(e.message) }; }
    if (!m) UI.modal = UI.mq.shift() || null;
  }
  if (!m) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
  root.innerHTML = `<div class="mback" data-a="mback"><div class="modal ${m.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(m.title)}"><div class="modal-h"><h3>${m.title}</h3><button class="x" data-a="closeModal" aria-label="閉じる">×</button></div><div class="modal-b">${m.body}</div>${m.foot ? `<div class="modal-f">${m.foot}</div>` : ''}</div></div>`;
  document.body.style.overflow = 'hidden';
}
ACT.closeModal = () => { closeModal(); render(); };
ACT.mback = (el, e) => { if (e.target === el) { closeModal(); render(); } };

/* ---------- トースト・進行中表示 ---------- */
function toast(msg, kind) {
  let root = document.getElementById('toasts');
  if (!root) { root = document.createElement('div'); root.id = 'toasts'; root.className = 'toasts'; root.setAttribute('role', 'status'); document.body.appendChild(root); }
  const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg;
  root.appendChild(el);
  while (root.children.length > 3) root.firstChild.remove();
  setTimeout(() => { el.remove(); }, 3400);
}
function busyShow(text) {
  let el = document.getElementById('busy');
  if (!el) { el = document.createElement('div'); el.id = 'busy'; el.className = 'busy'; document.body.appendChild(el); }
  el.innerHTML = `<div class="busy-box"><div class="small">進行中</div><div><span class="lit">${G.year}</span><span class="sl">年</span><span class="lit">${G.month}</span><span class="sl">月</span><span class="lit">${G.week}</span><span class="sl">週</span></div><div class="small">${esc(text || '')}</div><button class="btn sm" style="margin-top:10px;color:#fff;border-color:rgba(255,255,255,.4)" data-a="stopAhead">止める</button></div>`;
}
function busyHide() { const el = document.getElementById('busy'); if (el) el.remove(); }

/* ---------- イベント委譲 ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = ACT[el.dataset.a]; if (!fn) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
  try { fn(el, e); } catch (err) { console.error(err); toast('エラー：' + err.message, 'bad'); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-c]'); if (!el) return;
  const fn = ACT[el.dataset.c]; if (!fn) return;
  try { fn(el, e); } catch (err) { console.error(err); toast('エラー：' + err.message, 'bad'); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-i]'); if (!el) return;
  const fn = ACT[el.dataset.i]; if (fn) fn(el, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.modal) { closeModal(); render(); } });
