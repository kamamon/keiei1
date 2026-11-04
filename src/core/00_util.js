'use strict';
/* =========================================================
   球団社長 — 基本ユーティリティ
   金額はすべて「万円」単位の数値で扱う
   ========================================================= */
let G = null;               // ゲーム状態（セーブ対象）
let RNG = 20271;            // 乱数の内部状態（セーブ対象）
let LG = { mode: 'npb', mlb: false };  // いまのリーグの決まりごと（01_league.js の setLeague で切り替える）
/* メジャー版では、内部の金額（万円の単位）を 1単位＝300ドルとしてドルで表示する */
const USD_RATE = 0.03;      // 1単位 → 万ドル
function usdMan(units) { return units * USD_RATE; }
function unitsFromUsdMan(man) { return man / USD_RATE; }

function setSeed(s) { RNG = (s >>> 0) || 1; }
function rnd() {
  RNG = (RNG + 0x6D2B79F5) | 0;
  let t = RNG;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function rf(a, b) { return a + rnd() * (b - a); }
function rn(mu, sd) {
  let u = 0; while (u === 0) u = rnd();
  const v = rnd();
  return (mu || 0) + (sd === undefined ? 1 : sd) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function chance(p) { return rnd() < p; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function wpick(items, w) {
  let tot = 0; const ws = items.map(it => { const x = Math.max(0, w(it)); tot += x; return x; });
  if (tot <= 0) return items[Math.floor(rnd() * items.length)];
  let r = rnd() * tot;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function sum(a, f) { let s = 0; for (const x of a) s += f ? f(x) : x; return s; }
function avg(a, f) { return a.length ? sum(a, f) / a.length : 0; }
function maxBy(a, f) { let best = null, bv = -Infinity; for (const x of a) { const v = f(x); if (v > bv) { bv = v; best = x; } } return best; }
function minBy(a, f) { return maxBy(a, x => -f(x)); }
function sortBy(a, f, desc) { return a.slice().sort((x, y) => desc ? f(y) - f(x) : f(x) - f(y)); }
function r1(v) { return Math.round(v * 10) / 10; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hash2(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function trimNum(s) { if (s.indexOf('.') < 0) return s; s = s.replace(/0+$/, ''); if (s.endsWith('.')) s = s.slice(0, -1); return s; }
function comma(n) { return Math.round(n).toLocaleString('ja-JP'); }

/* 年俸表記: 1億3500万円（メジャー版は 1250万ドル） */
function fmtSal(man) {
  if (LG.mlb) return fmtSalUsd(man);
  man = Math.round(man);
  const neg = man < 0; const v = Math.abs(man);
  const oku = Math.floor(v / 10000), rest = v % 10000;
  const s = oku > 0 ? oku + '億' + (rest ? rest + '万' : '') : rest + '万';
  return (neg ? '−' : '') + s + '円';
}
function fmtSalUsd(units) {
  const neg = units < 0; let v = Math.abs(usdMan(units));
  let s;
  if (v >= 10000) { v = Math.round(v / 10) * 10; const oku = Math.floor(v / 10000), rest = Math.round(v % 10000); s = oku + '億' + (rest ? rest + '万' : ''); }
  else if (v >= 100) s = String(Math.round(v)) + '万';
  else s = trimNum(v.toFixed(1)) + '万';
  return (neg ? '−' : '') + s + 'ドル';
}
/* 財務表記: 32.4億円 / 4,500万円（メジャー版は 4.5億ドル / 1,200万ドル） */
function fmtOku(man, d) {
  if (LG.mlb) {
    const neg = man < 0; const v = Math.abs(usdMan(man)); let s;
    if (v >= 10000) { const dig = d !== undefined ? d : (v >= 1000000 ? 0 : (v >= 100000 ? 1 : 2)); s = trimNum((v / 10000).toFixed(dig)) + '億'; }
    else s = (v >= 100 ? comma(v) : trimNum(v.toFixed(1))) + '万';
    return (neg ? '−' : '') + s + 'ドル';
  }
  man = Math.round(man);
  const neg = man < 0; const v = Math.abs(man);
  let s;
  if (v >= 10000) {
    const dig = d !== undefined ? d : (v >= 1000000 ? 0 : (v >= 100000 ? 1 : 2));
    s = trimNum((v / 10000).toFixed(dig)) + '億';
  } else s = comma(v) + '万';
  return (neg ? '−' : '') + s + '円';
}
function fmtSigned(man) { return (man > 0 ? '+' : '') + fmtOku(man); }
function fmtPct(v, d) { return (v * 100).toFixed(d === undefined ? 1 : d) + '%'; }
function fmtAvg(v) { if (!isFinite(v)) return '-'; const s = v.toFixed(3); return s.startsWith('0') ? s.slice(1) : s; }
function fmtEra(v) { return isFinite(v) ? v.toFixed(2) : '-'; }
function fmtIP(outs) { const f = Math.floor(outs / 3), r = outs % 3; return r ? f + ' ' + r + '/3' : String(f); }
function fmtPeople(n) { return n >= 10000 ? trimNum((n / 10000).toFixed(1)) + '万人' : comma(n) + '人'; }
/* チケット・会費など「円」で持っている値段（メジャー版はドルで見せる） */
function priceShow(yen) { return LG.mlb ? Math.round(yen * USD_RATE) : Math.round(yen); }
function priceFrom(v) { return LG.mlb ? +v / USD_RATE : +v; }
function fmtPrice(yen) { return LG.mlb ? comma(yen * USD_RATE) + 'ドル' : comma(yen) + '円'; }
/* 入力欄の金額（万円／メジャー版は万ドル） */
function moneyShow(units) { return LG.mlb ? Math.round(usdMan(units) * 10) / 10 : Math.round(units); }
function moneyFrom(v) { return LG.mlb ? unitsFromUsdMan(+v) : +v; }
function moneyUnit() { return LG.mlb ? '万ドル' : '万円'; }
/* グラフ用の大きな金額（億円／メジャー版は億ドル） */
function bigMoney(units) { return LG.mlb ? usdMan(units) / 10000 : units / 10000; }
function bigUnit() { return LG.mlb ? '億ドル' : '億円'; }

const GRADES = [[90, 'S'], [80, 'A'], [70, 'B'], [60, 'C'], [50, 'D'], [40, 'E'], [20, 'F'], [0, 'G']];
function grade(v) { for (const [t, g] of GRADES) if (v >= t) return g; return 'G'; }

/* 暦: 1年=12か月×4週=48ターン */
function turnOf(m, w) { return (m - 1) * 4 + (w - 1); }
function curTurn() { return turnOf(G.month, G.week); }
function dateStr(y, m, w) { return y + '年' + m + '月 第' + w + '週'; }
function nowStr() { return dateStr(G.year, G.month, G.week); }
