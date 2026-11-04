/* =========================================================
   記録・偉業・タイトル争い・引退試合・永久欠番・野球殿堂
   G.recs    = { lg: {k: rec}, tm: {tid: {k: rec}}, car: {k: rec}, feats: [] }
               rec = { v, name, tid, y, pid, seed, prev }（seed＝ゲーム開始前からの歴代記録）
   G.hof     = { members: [plaque], ballot: [cand], last: { y, res } }
   G.retNums = { tid: [{ num, name, pid, y, pos, seed }] }
   G.celeQ   = 画面で演出を出す順番待ち [{ art, kicker, title, sub, body, pid }]
   ========================================================= */
const REC_DEFS = {
  hr: { n: 'シーズン本塁打', u: '本', bat: 1, f: s => s.hr, near: 3 },
  h: { n: 'シーズン安打', u: '安打', bat: 1, f: s => s.h, near: 8 },
  rbi: { n: 'シーズン打点', u: '打点', bat: 1, f: s => s.rbi, near: 5 },
  sb: { n: 'シーズン盗塁', u: '盗塁', bat: 1, f: s => s.sb, near: 4 },
  avg: { n: 'シーズン打率', bat: 1, rate: 1, f: s => bAvg(s), fmt: fmtAvg },
  hstr: { n: '連続試合安打', u: '試合', bat: 1, streak: 1, near: 3 },
  w: { n: 'シーズン勝利', u: '勝', bat: 0, f: s => s.w, near: 2 },
  so: { n: 'シーズン奪三振', u: '奪三振', bat: 0, f: s => s.so, near: 10 },
  sv: { n: 'シーズンセーブ', u: 'セーブ', bat: 0, f: s => s.sv, near: 3 },
  hld: { n: 'シーズンホールド', u: 'ホールド', bat: 0, f: s => s.hld, near: 3 },
  era: { n: 'シーズン防御率', bat: 0, rate: 1, asc: 1, f: s => pEra(s), fmt: fmtEra }
};
const CAR_DEFS = {
  hr: { n: '通算本塁打', u: '本', bat: 1 }, h: { n: '通算安打', u: '安打', bat: 1 }, rbi: { n: '通算打点', u: '打点', bat: 1 }, sb: { n: '通算盗塁', u: '盗塁', bat: 1 },
  w: { n: '通算勝利', u: '勝', bat: 0 }, so: { n: '通算奪三振', u: '奪三振', bat: 0 }, sv: { n: '通算セーブ', u: 'セーブ', bat: 0 }, hld: { n: '通算ホールド', u: 'ホールド', bat: 0 }
};
const REC_SEED_LG = { hr: 55, h: 214, rbi: 161, sb: 106, avg: 0.389, hstr: 33, w: 26, so: 350, sv: 54, hld: 53, era: 1.12 };
const REC_SEED_CAR = { hr: 644, h: 3021, rbi: 2170, sb: 1065, w: 350, so: 4490, sv: 407, hld: 440 };
const REC_SEED_TM = { hr: [36, 50], h: [176, 205], rbi: [108, 142], sb: [42, 78], avg: [0.334, 0.372], hstr: [20, 30], w: [17, 24], so: [215, 300], sv: [34, 47], hld: [32, 46], era: [1.45, 2.15] };
const FEATS = {
  perfect: { n: '完全試合', big: true }, nono: { n: 'ノーヒットノーラン', big: true }, nono2: { n: '継投ノーヒットノーラン' },
  cycle: { n: 'サイクルヒット', big: true }, hr3: { n: '1試合3本塁打' }, h5: { n: '1試合5安打' }, k15: { n: '1試合15奪三振' }, sayogs: { n: 'サヨナラ満塁本塁打' }
};
const RET_POOL = [1, 3, 8, 10, 11, 14, 16, 18, 19, 21, 23, 27, 34, 41, 44, 51, 55];
const TITLE_NAMES = ['首位打者', '本塁打王', '打点王', '盗塁王', '最多安打', '最高出塁率', '最優秀防御率', '最多勝', '最多奪三振', '最多セーブ', '最優秀中継ぎ'];

function recFmt(k, v, car) { const d = car ? CAR_DEFS[k] : REC_DEFS[k]; if (!d) return String(v); return d.fmt ? d.fmt(v) : comma(v) + (d.u || ''); }
function histYears(a, b) { const y = G.year; return ri(Math.min(a, b), Math.max(a, b)); }

/* ---------- ゲーム開始時の歴史（歴代記録・殿堂・永久欠番） ---------- */
function seedHistory(keepNumbers) {
  const y = G.year;
  G.recs = { lg: {}, tm: {}, car: {}, feats: [] };
  const nt = G.teams.length - 1;
  for (const k in REC_SEED_LG) G.recs.lg[k] = { v: REC_SEED_LG[k], name: genJpName(), tid: ri(0, nt), y: histYears(y - (LG.mlb ? 110 : 75), y - 8), seed: true };
  for (const k in REC_SEED_CAR) G.recs.car[k] = { v: REC_SEED_CAR[k], name: genJpName(), tid: ri(0, nt), y: histYears(y - (LG.mlb ? 90 : 60), y - 10), seed: true };
  for (const T of G.teams) {
    const r = {};
    for (const k in REC_SEED_TM) { const [a, b] = REC_SEED_TM[k]; r[k] = { v: REC_DEFS[k].rate ? Math.round(rf(a, b) * 1000) / 1000 : ri(a, b), name: genJpName(), tid: T.id, y: histYears(y - 70, y - 3), seed: true }; }
    G.recs.tm[T.id] = r;
  }
  G.hof = { members: seedHof(), ballot: [], last: null };
  G.retNums = {};
  for (const T of G.teams) {
    const used = keepNumbers ? new Set(roster(T.id).map(p => p.num)) : new Set();
    const n = wpick([0, 1, 2, 3], x => [20, 40, 28, 12][x]); const list = [];
    for (const num of shuffle(RET_POOL.slice())) { if (list.length >= n) break; if (used.has(num)) continue; list.push({ num, name: genJpName(), pos: pick(['P', 'P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF']), y: histYears(y - 60, y - 5), seed: true }); }
    G.retNums[T.id] = list.sort((a, b) => a.num - b.num);
  }
}
function seedHof() {
  const out = []; const y = G.year;
  const n = LG.mlb ? ri(30, 38) : ri(14, 18);
  for (let i = 0; i < n; i++) {
    const kind = wpick(['bat', 'sp', 'rp'], k => ({ bat: 55, sp: 35, rp: 10 })[k]);
    const end = histYears(y - 60, y - 6), yrs = ri(15, 22);
    let line, pos;
    if (kind === 'bat') { const h = LG.mlb ? ri(2300, 3600) : ri(1850, 2950), hr = LG.mlb ? ri(180, 690) : ri(140, 560); line = `通算${comma(h)}安打 ${hr}本塁打 打率${fmtAvg(rf(0.278, 0.322))}`; pos = pick(['C', '1B', '2B', '3B', 'SS', 'OF', 'OF']); }
    else if (kind === 'sp') { line = `通算${LG.mlb ? ri(210, 360) : ri(180, 330)}勝 防御率${rf(2.1, 3.1).toFixed(2)} ${comma(ri(1900, 3600))}奪三振`; pos = 'P'; }
    else { line = `通算${LG.mlb ? ri(300, 600) : ri(230, 400)}セーブ 防御率${rf(1.9, 2.8).toFixed(2)}`; pos = 'P'; }
    out.push({ key: 'seed' + i, name: genJpName(), pos, team: ri(0, G.teams.length - 1), from: end - yrs + 1, to: end, y: Math.min(y - 1, end + ri(5, 12)), pct: r1(rf(76, 97)), line, seed: true });
  }
  return out.sort((a, b) => a.y - b.y);
}
/* ---------- 永久欠番 ---------- */
function retiredNums(tid) { return (G.retNums && G.retNums[tid]) || []; }
function isRetiredNum(tid, num) { return retiredNums(tid).some(r => r.num === num); }
function retireNumber(tid, info, quiet) {
  if (info.num == null || info.num < 0 || isRetiredNum(tid, info.num)) return false;
  G.retNums[tid] = retiredNums(tid).concat([{ num: info.num, name: info.name, pid: info.pid, pos: info.pos, y: G.year }]).sort((a, b) => a.num - b.num);
  const L = G.legends.find(x => (info.pid != null && x.pid === info.pid)); if (L) L.retNum = true;
  const cur = roster(tid).find(p => p.num === info.num);
  if (cur) { cur.num = -1; assignNumber(cur, tid); if (isUser(tid)) notify('contract', `${cur.name}の背番号は${numStr(cur)}に変わりました（${info.num}が永久欠番になったため）`, { pid: cur.id, go: 'roster' }); }
  if (isUser(tid)) {
    const T = uT(); T.pop = clamp(T.pop + (quiet ? 1 : 2), 0, 99); T.fans += 2;
    addNews('record', `背番号${info.num}を${info.name}の永久欠番に`, { important: true, tid, note: 'hi', go: 'records', tab: 'retnum' });
    G.celeQ.push({ art: 'retnum', kicker: `背番号${info.num}`, title: `${info.name}の背番号が永久欠番に`, sub: '球団の歴史に刻まれ、もう誰も背負うことはありません', body: 'セレモニーではファンの大きな拍手が送られました。人気とファンが増えています。' });
  } else addNews('record', `${tShort(tid)}が${info.name}の背番号${info.num}を永久欠番に`, { tid });
  return true;
}
/* 自球団の名選手のうち、まだ永久欠番にしていない人（球団史から指定できる） */
function retNumCands(tid) {
  return G.legends.filter(L => L.team === tid && L.num != null && L.num >= 0 && L.num < 100 && !L.retNum && !isRetiredNum(tid, L.num));
}

/* ---------- 記録の確認 ---------- */
function recOf(scope, k, tid) { return scope === 'tm' ? (G.recs.tm[tid] || {})[k] : G.recs[scope][k]; }
function setRecOf(scope, k, tid, r) { if (scope === 'tm') { G.recs.tm[tid] = G.recs.tm[tid] || {}; G.recs.tm[tid][k] = r; } else G.recs[scope][k] = r; }
function better(k, v, r, car) { if (!r) return true; const asc = !car && REC_DEFS[k].asc; return asc ? v < r.v : v > r.v; }
/* 記録を塗り替えたら新しい記録を返す（同じ選手が更新し続けているときは静かに数字だけ直す） */
function tryRecord(p, scope, k, v) {
  const tid = p.team; const r = recOf(scope, k, tid); const car = scope === 'car';
  if (!better(k, v, r, car)) return null;
  const mine = r && r.pid === p.id && (car || r.y === G.year);
  const nr = { v, name: p.name, tid, y: G.year, pid: p.id, prev: mine ? r.prev : r ? { v: r.v, name: r.name, y: r.y, tid: r.tid } : null };
  setRecOf(scope, k, tid, nr);
  return mine ? null : nr;
}
function goodsBuzz(w, b) { G.flags.goodsWeeks = Math.max(G.flags.goodsWeeks || 0, w); G.flags.goodsBoost = Math.max(G.flags.goodsBoost || 0, b); }
function crowdBuzz(w, b) { G.flags.buzzW = Math.max(G.flags.buzzW || 0, w); G.flags.buzz = Math.max(G.flags.buzz || 0, b); }
function recNews(p, scope, k, nr) {
  const car = scope === 'car'; const d = car ? CAR_DEFS[k] : REC_DEFS[k];
  const old = nr.prev; const user = isUser(p.team);
  const where = scope === 'tm' ? `${tShort(p.team)}の球団記録` : car ? '歴代最多' : 'リーグ記録';
  const t = `${tShort(p.team)}の${p.name}が${d.n}の${where}を更新（${recFmt(k, nr.v, car)}${old ? `。これまでは${old.name}の${recFmt(k, old.v, car)}・${old.y}年` : ''}）`;
  if (scope === 'tm') { if (user) notify('record', t, { pid: p.id, go: 'records', tab: 'recs' }); return; }
  addNews('record', t, { important: true, tid: p.team, note: user ? 'hi' : false, pid: p.id, go: 'records', tab: 'recs' });
  p.pop = clamp(p.pop + 6, 0, 100);
  if (!user) return;
  const T = uT(); T.pop = clamp(T.pop + 2, 0, 99); T.fans += 2;
  crowdBuzz(3, 0.08); goodsBuzz(3, 0.3);
  G.celeQ.push({ art: 'feat', kicker: scope === 'car' ? '歴代最多' : 'リーグ新記録', title: `${p.name}、${d.n}の新記録`, sub: `${recFmt(k, nr.v, car)}${old ? `（これまで ${recFmt(k, old.v, car)}・${old.name}）` : ''}`, body: '球場は総立ちの拍手。記録の瞬間を見ようと、しばらく観客とグッズの売上が増えます。', pid: p.id });
  queueEvent('recCele', { pid: p.id, name: p.name, label: d.n + 'の新記録' });
}
/* 毎週：記録の更新とカウントダウン（シーズン中） */
function recordsWeekly() {
  const t = curTurn(); if (t < SEASON_START || t > MAKEUP_TURN || !G.recs) return;
  for (const T of G.teams) for (const p of roster(T.id)) {
    const P = isP(p); const user = isUser(T.id);
    for (const k in REC_DEFS) {
      const d = REC_DEFS[k]; if (d.rate || (!!d.bat) === P) continue;
      const v = d.streak ? (p.hstr || 0) : d.f(p.st); if (!v) continue;
      const lg = tryRecord(p, 'lg', k, v);
      const tm = tryRecord(p, 'tm', k, v);
      if (lg) recNews(p, 'lg', k, lg); else if (tm) recNews(p, 'tm', k, tm);
      if (user && d.near) recCountdown(p, k, v);
    }
    if (user) msCountdown(p);
    if (user || ovr(p) >= 70) {
      const c = careerOf(p);
      for (const k in CAR_DEFS) { const d = CAR_DEFS[k]; if ((!!d.bat) === P || !c[k]) continue; const r = tryRecord(p, 'car', k, c[k]); if (r) recNews(p, 'car', k, r); }
    }
    if (user && !P) streakNotes(p);
  }
}
function recCountdown(p, k, v) {
  const d = REC_DEFS[k];
  for (const scope of ['lg', 'tm']) {
    const r = recOf(scope, k, p.team); if (!r || r.pid === p.id) continue;
    const need = r.v - v + 1; if (need <= 0 || need > d.near) continue;
    p.cd = p.cd || {}; const key = scope + k + G.year; if (p.cd[key]) continue;
    p.cd[key] = 1;
    notify('record', `${p.name}、${d.n}の${scope === 'lg' ? 'リーグ記録' : '球団記録'}（${recFmt(k, r.v)}）まであと${need}${d.u}。新記録の瞬間を見ようと注目が集まっています`, { pid: p.id, note: scope === 'lg' ? 'hi' : true, go: 'records', tab: 'recs' });
    if (scope === 'lg') crowdBuzz(2, 0.06);
    break;
  }
}
function streakNotes(p) {
  const s = p.hstr || 0; const steps = [15, 20, 25, 30];
  const hit = steps.filter(x => s >= x).pop();
  if (hit && (p.hsN || 0) < hit) { p.hsN = hit; notify('record', `${p.name}が${s}試合連続安打。リーグ記録は${recFmt('hstr', G.recs.lg.hstr.v)}`, { pid: p.id, note: hit >= 25 ? 'hi' : true, go: 'records', tab: 'recs' }); if (hit >= 25) crowdBuzz(1, 0.05); }
  if (!s) p.hsN = 0;
}
/* シーズン終了：打率・防御率など率の記録を確定し、連続記録などを片づける */
function seasonRecordsEnd() {
  if (!G.recs) return;
  for (const T of G.teams) for (const p of roster(T.id)) {
    for (const k of ['avg', 'era']) {
      const d = REC_DEFS[k]; if ((!!d.bat) === isP(p) || !qualified(p, d.bat ? 'bat' : 'pit')) continue;
      const v = Math.round(d.f(p.st) * 1000) / 1000;
      const lg = tryRecord(p, 'lg', k, v); const tm = tryRecord(p, 'tm', k, v);
      if (lg) recNews(p, 'lg', k, lg); else if (tm) recNews(p, 'tm', k, tm);
    }
    p.hstr = 0; p.hsN = 0; p.cd = null;
  }
}

/* ---------- 1試合の偉業 ---------- */
function featCheck(res, g) {
  if (!res.feats || !res.feats.length || !G.recs) return;
  for (const f of res.feats) {
    const p = P_(f.pid); if (!p) continue;
    const F = FEATS[f.k]; const opp = f.tid === g.h ? g.a : g.h;
    G.recs.feats.unshift({ y: G.year, m: G.month, w: G.week, k: f.k, pid: p.id, name: p.name, tid: f.tid, opp, v: f.v || 0 });
    if (G.recs.feats.length > 200) G.recs.feats.length = 200;
    p.feats = (p.feats || []).concat([{ y: G.year, k: f.k }]);
    const user = isUser(f.tid);
    const t = `${tShort(f.tid)}の${p.name}が${tShort(opp)}戦で${F.n}を達成${f.k === 'k15' ? `（${f.v}奪三振）` : ''}`;
    // メジャー版は30球団あるので、ほかの球団の小さな偉業はニュースにしない（偉業の記録には残る）
    if (user || F.big || !LG.mlb) addNews('record', t, { important: F.big || user, tid: f.tid, note: user ? (F.big ? 'hi' : true) : false, pid: p.id, go: 'records', tab: 'feats' });
    p.pop = clamp(p.pop + (F.big ? 6 : 2), 0, 100);
    if (!user) continue;
    uT().pop = clamp(uT().pop + (F.big ? 1.5 : 0.5), 0, 99);
    if (F.big) {
      goodsBuzz(3, 0.3);
      G.celeQ.push({ art: 'feat', kicker: `${tShort(opp)}戦`, title: `${p.name}、${F.n}`, sub: f.k === 'cycle' ? '単打・二塁打・三塁打・本塁打をすべて記録' : f.k === 'perfect' ? '27人の打者を1人も塁に出さず' : 'ひとりで9回を投げ、1本の安打も許さず', body: '翌日のスポーツ紙は一面で大きく報じています。記念グッズの注文が入り始めました。', pid: p.id });
      queueEvent('featCele', { pid: p.id, name: p.name, label: F.n });
    }
  }
}

/* ---------- タイトル争い（9月） ---------- */
const RACE_KEYS = [['avg', '首位打者', .006], ['hr', '本塁打王', 2], ['rbi', '打点王', 5], ['sb', '盗塁王', 3], ['era', '最優秀防御率', .25], ['w', '最多勝', 1], ['so', '最多奪三振', 8], ['sv', '最多セーブ', 2]];
function titleRaceNotes() {
  const ut = G.user.tid; const lg = uT().league; const lines = [];
  for (const [k, n, m] of RACE_KEYS) {
    const l = leaders(lg, k, 3); if (l.length < 2) continue;
    const d = STAT_DEFS[k]; const f = v => d.fmt ? d.fmt(v) : v;
    const i = l.findIndex(x => x.p.team === ut); if (i < 0 || i > 1) continue;
    const gap = Math.abs(l[0].v - l[1].v);
    if (i === 0 && gap <= m) lines.push(`${n}：${l[0].p.name}が${f(l[0].v)}でトップ（2位の${tShort(l[1].p.team)}・${l[1].p.name}と${d.fmt ? f(gap) : gap}差）`);
    else if (i === 1 && gap <= m) lines.push(`${n}：${l[1].p.name}が${f(l[1].v)}で2位（トップの${tShort(l[0].p.team)}・${l[0].p.name}と${d.fmt ? f(gap) : gap}差）`);
  }
  if (lines.length) notify('award', 'タイトル争いが大詰めです。' + lines.join('　'), { go: 'stats' });
}
/* 最終週：首位打者・最優秀防御率がかかる選手を休ませるか */
function titleSitCheck() {
  const ut = G.user.tid; const lg = uT().league;
  for (const [k, m] of [['avg', .006], ['era', .25]]) {
    const l = leaders(lg, k, 2); if (l.length < 2) continue;
    const top = l[0]; if (top.p.team !== ut || Math.abs(top.v - l[1].v) > m) continue;
    queueEvent('titleSit', { pid: top.p.id, k, name: top.p.name, v: top.v, v2: l[1].v, rival: l[1].p.name });
  }
}
function benched(p) { return p.sit === G.year && curTurn() <= MAKEUP_TURN; }
/* タイトルの表彰（シーズン終了時） */
function titleCelebrate() {
  const ut = G.user.tid; const T = G.seasonTitles; if (!T) return;
  const mine = [];
  for (const k in T[uT().league]) { const t = T[uT().league][k]; for (const id of t.ids) { const p = P_(id); if (p && p.team === ut) mine.push({ p, n: t.n }); } }
  if (!mine.length) return;
  const names = mine.map(x => `${x.n} ${x.p.name}`);
  G.celeQ.push({ art: 'post', kicker: `${G.year}年 タイトル`, title: mine.length === 1 ? `${mine[0].p.name}が${mine[0].n}` : `${mine.length}つのタイトルを獲得`, sub: names.join('　'), body: '表彰式では満員のスタンドから祝福の声。タイトルホルダーは来季のチームの顔です。' });
  queueEvent('titleCele', { pids: mine.map(x => x.p.id), text: names.join('、') });
}

/* ---------- 引退表明と引退試合 ---------- */
function isLegendNow(p) { return isLegend(p, careerOf(p)); }
function retireAnnounce() {
  for (const T of G.teams) for (const p of roster(T.id)) {
    if (p.age < 33 || p.retAnn) continue;
    const lgd = isLegendNow(p);
    if (!(lgd || p.pop >= 40 || p.svc >= 12)) continue;
    if (!chance(retireChance(p) * 0.85)) continue;
    p.retAnn = G.year;
    if (isUser(T.id)) {
      notify('retire', `${p.name}（${p.age}歳）が今季限りでの現役引退を表明しました`, { pid: p.id, note: 'hi', go: 'roster' });
      queueEvent('farewell', { pid: p.id, name: p.name, legend: lgd });
    } else if (lgd || p.pop >= 55) addNews('retire', `${tShort(T.id)}の${p.name}が今季限りでの引退を表明`, { tid: T.id });
  }
}
/* 最終週：引退試合（ホームの観客が増え、本人はスタメンで出場） */
function farewellWeek() {
  const list = roster(G.user.tid).filter(p => p.farewell === G.year && p.injW === 0);
  if (!list.length) return;
  crowdBuzz(1, 0.15);
  for (const p of list) if (p.lv !== 1 && p.lv !== 3) { const f1 = rosterLv(G.user.tid, 1); if (f1.length >= LIM.first) { const out = minBy(f1.filter(x => isP(x) === isP(p) && x.farewell !== G.year), ovr); if (out) out.lv = 2; } p.lv = 1; }
  touch();
}
function farewellDone() {
  for (const p of roster(G.user.tid).filter(x => x.farewell === G.year)) {
    p.farewell = -G.year;
    uT().pop = clamp(uT().pop + 2, 0, 99); uT().fans += 1.5; goodsBuzz(2, 0.25);
    notify('retire', `${p.name}の引退試合。${isP(p) ? '最後のマウンド' : '最後の打席'}に満員のスタンドから大きな拍手が送られました`, { pid: p.id, note: 'hi', go: 'roster' });
    G.celeQ.push({ art: 'season', kicker: '引退試合', title: `ありがとう、${p.name}`, sub: `${p.age}歳・プロ${Math.max(1, G.year - (p.join || G.year) + 1)}年`, body: 'チームメイトの胴上げで、長い現役生活に別れを告げました。', pid: p.id });
  }
}

/* ---------- 野球殿堂（毎年1月に記者投票） ---------- */
function legendKey(L) { return L.pid != null ? 'p' + L.pid : L.name + '_' + L.y; }
function hofScore(L) {
  const c = L.c || {};
  if (LG.mlb) return (L.war || 0) * 1.4 + (c.h >= 3000 ? 24 : c.h >= 2500 ? 9 : 0) + (c.hr >= 500 ? 24 : c.hr >= 400 ? 10 : c.hr >= 300 ? 3 : 0) + (c.w >= 300 ? 26 : c.w >= 250 ? 12 : c.w >= 200 ? 5 : 0) +
    (c.sv >= 400 ? 18 : c.sv >= 300 ? 7 : 0) + (c.so >= 3000 ? 10 : 0) + (L.awards || 0) * 1.3 + (L.titles || 0) * 2 + (L.feats || 0) * 2;
  return (L.war || 0) * 1.6 + (c.h >= 2000 ? 18 : c.h >= 1500 ? 6 : 0) + (c.hr >= 500 ? 22 : c.hr >= 400 ? 14 : c.hr >= 300 ? 6 : 0) + (c.w >= 200 ? 22 : c.w >= 150 ? 8 : 0) +
    (c.sv >= 250 ? 16 : c.sv >= 150 ? 5 : 0) + (L.awards || 0) * 1.5 + (L.titles || 0) * 2 + (L.feats || 0) * 2;
}
function hofVote() {
  if (!G.hof) return;
  const H = G.hof; const y = G.year;
  for (const L of G.legends) {
    const key = legendKey(L);
    if (L.y > y - (LG.hofWait || 3) || L.hofOut || H.members.some(m => m.key === key) || H.ballot.some(b => b.key === key)) continue;
    H.ballot.push({ key, L, yrs: 0, pct: 0 });
  }
  const res = [];
  for (const b of H.ballot.slice()) {
    b.yrs++;
    b.pct = r1(clamp((hofScore(b.L) - 30) * 1.3 + (b.yrs - 1) * 2.5 + rn(0, 3), 0, 99.5));
    if (b.pct >= 75) { H.ballot = H.ballot.filter(x => x !== b); hofInduct(b); res.push(b); }
    else if (b.yrs >= (LG.hofYears || 15) || b.pct < 5) { H.ballot = H.ballot.filter(x => x !== b); b.L.hofOut = true; }
  }
  H.last = { y, res: res.map(b => ({ name: b.L.name, pct: b.pct })), top: H.ballot.slice().sort((a, b) => b.pct - a.pct).slice(0, 5).map(b => ({ name: b.L.name, pct: b.pct })) };
  if (!res.length) { if (H.ballot.length) addNews('record', `野球殿堂の投票結果：今年の殿堂入りはなし（最多は${H.last.top[0].name}の${H.last.top[0].pct}%）`, {}); return; }
}
function hofInduct(b) {
  const L = b.L; const c = L.c || {};
  const line = L.pos === 'P' ? `通算${c.w || 0}勝${c.l || 0}敗${c.sv ? ' ' + c.sv + 'セーブ' : ''} 防御率${fmtEra(pEra(c))}` : `通算${comma(c.h || 0)}安打 ${c.hr || 0}本塁打 打率${fmtAvg(bAvg(c))}`;
  const m = { key: b.key, name: L.name, pos: L.pos, team: L.team, orig: L.orig, from: L.y - (L.yrs || 1) + 1, to: L.y, y: G.year, pct: b.pct, line, war: L.war, titles: L.titles || 0, awards: L.awards || 0, num: L.num, first: b.yrs === 1 };
  G.hof.members.push(m);
  L.hof = G.year;
  const ut = G.user.tid; const mine = L.team === ut || L.orig === ut;
  addNews('record', `${L.name}（元${tShort(L.team)}）が野球殿堂入り（得票率${b.pct}%${b.yrs === 1 ? '・資格1年目' : ''}）`, { important: true, tid: mine ? ut : L.team, note: mine ? 'hi' : false, go: 'records', tab: 'hof' });
  if (mine) {
    uT().pop = clamp(uT().pop + 1, 0, 99);
    G.celeQ.push({ art: 'hof', kicker: `${G.year}年 野球殿堂`, title: `${L.name}が殿堂入り`, sub: `得票率${b.pct}%　${line}`, body: `球団の歴史に名を刻んだ選手が、球界の殿堂に迎えられました。${retNumCands(ut).some(x => legendKey(x) === b.key) ? '背番号を永久欠番にすることもできます（球団史・記録）。' : ''}` });
  }
}
