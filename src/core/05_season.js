/* =========================================================
   シーズン：日程・試合消化・順位・プレーオフ・成績・表彰
   公式戦は3月第4週〜9月第3週（24週・143試合）、9月第4週は予備日
   ========================================================= */
const SEASON_START = 11, SEASON_END = 34, MAKEUP_TURN = 35;
const DOW = ['火', '水', '木', '金', '土', '日'];

function genSchedule() {
  const L = [[], []]; for (const t of G.teams) L[t.league].push(t.id);
  const circle = ids => { const arr = ids.slice(); const rounds = []; for (let r = 0; r < 5; r++) { const pairs = []; for (let i = 0; i < 3; i++) pairs.push([arr[i], arr[5 - i]]); rounds.push(pairs); arr.splice(1, 0, arr.pop()); } return rounds; };
  const R = [circle(shuffle(L[0].slice())), circle(shuffle(L[1].slice()))];
  const lens = [3, 3, 3, 2, 3, 3, 3, 2, 3];
  const hostX = [true, false, true, true, false, false, true, true, false];
  const extraOf = (lg, a, b) => {
    let i = L[lg].indexOf(a), j = L[lg].indexOf(b);
    const lo = Math.min(i, j), hi = Math.max(i, j); const d = hi - lo;
    const toLo = d === 1 || d === 2 || (d === 3 && lo < 3);
    return L[lg][toLo ? lo : hi];
  };
  const intra = [];
  for (let k = 0; k < 9; k++) for (let r = 0; r < 5; r++) {
    for (let g = 0; g < lens[k]; g++) {
      const day = [];
      for (let lg = 0; lg < 2; lg++) for (const [x, y] of R[lg][r]) {
        const ex = extraOf(lg, x, y); const o = ex === x ? y : x;
        const home = hostX[k] ? ex : o;
        day.push({ h: home, a: home === x ? y : x });
      }
      intra.push(day);
    }
  }
  const inter = [];
  for (let k = 0; k < 6; k++) for (let g = 0; g < 3; g++) {
    const day = [];
    for (let i = 0; i < 6; i++) { const a = L[0][i], b = L[1][(i + k) % 6]; const home = ((k + G.year) % 2 === 0) ? a : b; day.push({ h: home, a: home === a ? b : a }); }
    inter.push(day);
  }
  const days = intra.slice(0, 48).concat(inter, intra.slice(48));
  G.sched = { days: days.map(d => d.map(g => ({ h: g.h, a: g.a, done: false }))), makeup: [], mkDays: [] };
  G.day = 0;
}
function dayTurn(d) { return SEASON_START + Math.floor(d / 6); }
function dayLabel(d) { const t = dayTurn(d); const m = Math.floor(t / 4) + 1, w = t % 4 + 1; return m + '月第' + w + '週(' + DOW[d % 6] + ')'; }
function userSchedule() {
  const uid = G.user.tid; const out = [];
  G.sched.days.forEach((day, d) => { for (const g of day) if (g.h === uid || g.a === uid) out.push({ d, g }); });
  (G.sched.mkDays || []).forEach((day, i) => { for (const g of day) if (g.h === uid || g.a === uid) out.push({ d: 'mk' + i, g, mk: true }); });
  return out;
}

function blankRec() { return { w: 0, l: 0, d: 0, rs: 0, ra: 0, hw: 0, hl: 0, strk: 0, l10: [], vs: {}, il: [0, 0, 0] }; }
function pctOf(R) { const d = R.w + R.l; return d ? R.w / d : 0; }
function gamesPlayed(tid) { const r = G.teams[tid].rec; return r.w + r.l + r.d; }
function standings(lg) {
  const ts = G.teams.filter(t => t.league === lg).sort((a, b) => pctOf(b.rec) - pctOf(a.rec) || b.rec.w - a.rec.w || (b.rec.rs - b.rec.ra) - (a.rec.rs - a.rec.ra));
  const top = ts[0].rec;
  return ts.map((t, i) => ({ t, rank: i + 1, gb: ((top.w - t.rec.w) + (t.rec.l - top.l)) / 2 }));
}
function teamRank(tid) { const t = G.teams[tid]; return standings(t.league).find(x => x.t.id === tid).rank; }
function gamesBehind(tid) { const t = G.teams[tid]; return standings(t.league).find(x => x.t.id === tid).gb; }
function applyRecord(hid, aid, res) {
  const H = G.teams[hid].rec, A = G.teams[aid].rec;
  H.rs += res.hs; H.ra += res.as; A.rs += res.as; A.ra += res.hs;
  const inter = G.teams[hid].league !== G.teams[aid].league;
  const upd = (R, oid, r) => {
    if (r === 1) { R.w++; R.strk = R.strk > 0 ? R.strk + 1 : 1; } else if (r === 0) { R.l++; R.strk = R.strk < 0 ? R.strk - 1 : -1; } else R.d++;
    R.l10.push(r); if (R.l10.length > 10) R.l10.shift();
    const v = R.vs[oid] || (R.vs[oid] = [0, 0, 0]); v[r === 1 ? 0 : r === 0 ? 1 : 2]++;
    if (inter) R.il[r === 1 ? 0 : r === 0 ? 1 : 2]++;
  };
  if (res.tie) { upd(H, aid, 2); upd(A, hid, 2); }
  else if (res.hs > res.as) { upd(H, aid, 1); upd(A, hid, 0); H.hw++; }
  else { upd(H, aid, 0); upd(A, hid, 1); H.hl++; }
}

function rainProb(m) { return ({ 3: 0.03, 4: 0.04, 5: 0.04, 6: 0.09, 7: 0.05, 8: 0.05, 9: 0.05 })[m] || 0.03; }

function playSeasonGame(g, dayIdx, isMakeup) {
  const uid = G.user.tid;
  const userGame = g.h === uid || g.a === uid;
  if (!isMakeup && !stadOf(g.h).dome && chance(rainProb(G.month))) {
    g.rain = true; g.done = true; G.sched.makeup.push({ h: g.h, a: g.a });
    if (userGame) addNews('game', `${tName(g.a)}戦は雨天中止。予備日に振り替えます`, { tid: uid });
    if (g.h === uid) G.fin.rainouts = (G.fin.rainouts || 0) + 1;
    return;
  }
  const res = playGame(g.h, g.a, { rec: true, dayNo: G.dayNo, box: userGame, log: userGame });
  g.done = true; g.hs = res.hs; g.as = res.as; g.id = G.gid++;
  if (g.a === uid) G.fin.awayWeek = (G.fin.awayWeek || 0) + 1;
  applyRecord(g.h, g.a, res);
  g.att = homeGameEconomy(g.h, g.a, typeof dayIdx === 'number' ? dayIdx : 4, false);
  gameInjuries(res);
  if (userGame) { storeBox(g.id, res, g, dayIdx); userGameNews(res, g); }
  milestoneCheck(res);
  featCheck(res, g);
}
function playDay(dayGames, dayIdx, isMakeup) {
  G.dayNo++;
  touch();
  for (const g of dayGames) if (!g.done) playSeasonGame(g, dayIdx, isMakeup);
}
function playWeekGames(turn) {
  const w = turn - SEASON_START;
  for (let i = 0; i < 6; i++) {
    const d = w * 6 + i;
    if (d >= G.sched.days.length) break;
    playDay(G.sched.days[d], d, false);
    G.day = d + 1;
  }
}
function scheduleMakeups() {
  const pend = G.sched.makeup.slice(); G.sched.makeup = [];
  const days = [];
  while (pend.length) {
    const busy = new Set(); const day = [];
    for (let i = 0; i < pend.length; i++) { const g = pend[i]; if (busy.has(g.h) || busy.has(g.a)) continue; busy.add(g.h); busy.add(g.a); day.push({ h: g.h, a: g.a, done: false, mk: true }); pend.splice(i, 1); i--; }
    days.push(day);
  }
  G.sched.mkDays = days;
}
function playMakeups() {
  scheduleMakeups();
  G.sched.mkDays.forEach((day, i) => playDay(day, 2 + (i % 4), true));
}

/* ---------- ボックススコアの保存（ユーザー試合のみ・最近40試合） ---------- */
function storeBox(id, res, g, dayIdx, post) {
  G.boxes[id] = { id, h: g.h, a: g.a, hs: res.hs, as: res.as, line: res.line, box: res.box, log: res.log, W: res.W, L: res.L, SV: res.SV,
    hits: res.hits, errs: res.errs, date: nowStr(), day: typeof dayIdx === 'number' ? DOW[dayIdx % 6] : '', post: !!post, att: g.att || 0 };
  G.boxOrder.push(id);
  while (G.boxOrder.length > 40) { const old = G.boxOrder.shift(); delete G.boxes[old]; }
}

/* ---------- プレーオフ ---------- */
function mkSeries(kind, lg, hi, lo) {
  const cfg = { cs1: { need: 2, max: 3, adv: 0 }, cs2: { need: 4, max: 6, adv: 1 }, gs: { need: 4, max: 8, adv: 0 } }[kind];
  return { kind, lg, hi, lo, w: [cfg.adv, 0], d: 0, need: cfg.need, max: cfg.max, games: [], winner: null };
}
function startPost() {
  const st = [standings(0), standings(1)];
  G.post = { stage: 'cs1', series: [], lgChamp: [st[0][0].t.id, st[1][0].t.id], champ: null, mvp: null };
  for (let lg = 0; lg < 2; lg++) G.post.series.push(mkSeries('cs1', lg, st[lg][1].t.id, st[lg][2].t.id));
}
function playSeries(kind) {
  for (const s of G.post.series.filter(x => x.kind === kind && x.winner == null)) {
    let guard = 0;
    while (s.winner == null && guard++ < 12) {
      const gi = s.games.length;
      let h = s.hi, a = s.lo;
      if (kind === 'gs') { const homeHi = [0, 1, 5, 6, 7].includes(gi); h = homeHi ? s.hi : s.lo; a = homeHi ? s.lo : s.hi; }
      G.dayNo++; touch();
      const res = playGame(h, a, { rec: false, post: true, dayNo: G.dayNo, box: true, log: true });
      const gid = G.gid++;
      const gm = { h, a, hs: res.hs, as: res.as, id: gid, tie: res.tie };
      gm.att = homeGameEconomy(h, a, 4, kind);
      s.games.push(gm);
      if (isUser(h) || isUser(a)) storeBox(gid, res, gm, 4, true);
      gameInjuries(res);
      if (!res.tie) { const wt = res.hs > res.as ? h : a; s.w[wt === s.hi ? 0 : 1]++; } else s.d++;
      s.res = s.res || []; s.res.push(res);
      if (s.w[0] >= s.need) s.winner = s.hi; else if (s.w[1] >= s.need) s.winner = s.lo;
      else if (s.games.length >= s.max) s.winner = kind === 'gs' ? (s.w[0] >= s.w[1] ? s.hi : s.lo) : s.hi;
      else if (kind === 'gs' && s.games.length >= 7 && s.d === 0) s.winner = s.w[0] > s.w[1] ? s.hi : s.lo;
    }
    s.mvp = seriesMvp(s);
    delete s.res;
    const k = { cs1: 'プレーオフ1st', cs2: 'プレーオフ最終', gs: 'グランドシリーズ' }[kind];
    const wl = s.winner === s.hi ? s.w[0] + '勝' + s.w[1] + '敗' : s.w[1] + '勝' + s.w[0] + '敗';
    addNews('post', `${k}：${tName(s.winner)}が${wl}${s.d ? s.d + '分' : ''}で勝ち抜け`, { important: isUser(s.hi) || isUser(s.lo), tid: s.winner });
  }
}
function seriesMvp(s) {
  const sc = {};
  for (const res of (s.res || [])) {
    if (!res.box) continue;
    res.box.forEach((bx, i) => {
      const tid = i === 0 ? res.a : res.h; if (tid !== s.winner) return;
      for (const b of bx.bat) sc[b.id] = (sc[b.id] || 0) + b.h * 1 + b.hr * 2.5 + b.rbi * 1.2 + b.bb * 0.3 + b.r * 0.5;
      for (const p of bx.pit) sc[p.id] = (sc[p.id] || 0) + p.outs * 0.35 - p.er * 1.5 + p.so * 0.2 + (p.dec === '勝' ? 2 : 0) + (p.dec === 'S' ? 1.5 : 0);
    });
  }
  let best = null, bv = -1e9; for (const k in sc) if (sc[k] > bv) { bv = sc[k]; best = +k; }
  return best;
}
function advancePost(turn) {
  if (turn === 36) {
    playSeries('cs1');
    const st = [standings(0), standings(1)];
    for (let lg = 0; lg < 2; lg++) { const s1 = G.post.series.find(x => x.kind === 'cs1' && x.lg === lg); G.post.series.push(mkSeries('cs2', lg, st[lg][0].t.id, s1.winner)); }
    G.post.stage = 'cs2';
  } else if (turn === 37) {
    playSeries('cs2');
    const w = [0, 1].map(lg => G.post.series.find(x => x.kind === 'cs2' && x.lg === lg).winner);
    const hostLg = G.year % 2;
    G.post.series.push(mkSeries('gs', -1, w[hostLg], w[1 - hostLg]));
    G.post.stage = 'gs';
  } else if (turn === 38) {
    playSeries('gs');
    const s = G.post.series.find(x => x.kind === 'gs');
    G.post.champ = s.winner; G.post.mvp = s.mvp; G.post.stage = 'done';
    const champ = G.teams[s.winner];
    champ.titles = champ.titles || { lg: 0, gs: 0 }; champ.titles.gs++;
    champ.pop = clamp(champ.pop + 2, 0, 99); champ.popBonus = (champ.popBonus || 0) + 6;
    addNews('post', `${tName(s.winner)}が日本一！ シリーズMVPは${s.mvp != null && P_(s.mvp) ? P_(s.mvp).name : '―'}`, { important: true, tid: s.winner });
    if (isUser(s.winner)) { book('rev', 'prize', 20000); G.flags.gsWin = (G.flags.gsWin || 0) + 1; G.flags.goodsWeeks = 6; G.flags.goodsBoost = 0.5; }
    else if (isUser(s.hi) || isUser(s.lo)) book('rev', 'prize', 8000);
  }
}

/* ---------- 成績計算 ---------- */
function bAvg(s) { return s.ab ? s.h / s.ab : 0; }
function bObp(s) { const d = s.ab + s.bb + s.hbp + s.sf; return d ? (s.h + s.bb + s.hbp) / d : 0; }
function bSlg(s) { return s.ab ? (s.h + s.d + 2 * s.t + 3 * s.hr) / s.ab : 0; }
function bOps(s) { return bObp(s) + bSlg(s); }
function pEra(s) { return s.outs ? s.er * 27 / s.outs : (s.er ? 99.99 : 0); }
function pWhip(s) { return s.outs ? (s.h + s.bb) * 3 / s.outs : 0; }
function pK9(s) { return s.outs ? s.so * 27 / s.outs : 0; }
function woNum(s) { const s1 = s.h - s.d - s.t - s.hr; return .69 * s.bb + .72 * s.hbp + .89 * s1 + 1.27 * s.d + 1.62 * s.t + 2.10 * s.hr; }
function woDen(s) { return s.ab + s.bb + s.sf + s.hbp; }
function leagueBase() {
  if (G._lbStamp === G.dayNo && G._lb) return G._lb;
  let num = 0, den = 0, r = 0, outs = 0, er = 0;
  for (const t of G.teams) for (const p of roster(t.id)) {
    if (isP(p)) { r += p.st.r; outs += p.st.outs; er += p.st.er; } else { num += woNum(p.st); den += woDen(p.st); }
  }
  G._lb = { woba: den > 2000 ? num / den : 0.315, ra9: outs > 3000 ? r * 27 / outs : 3.8, era: outs > 3000 ? er * 27 / outs : 3.5 };
  G._lbStamp = G.dayNo;
  return G._lb;
}
function batWAR(p, s, lb) {
  s = s || p.st; lb = lb || leagueBase();
  if (!s.pa) return 0;
  const den = woDen(s); const woba = den ? woNum(s) / den : 0;
  const wraa = (woba - lb.woba) / 1.2 * s.pa;
  const pos = mainPos(p);
  const posAdj = { C: 12, SS: 7, '2B': 3, '3B': 2, CF: 2.5, LF: -7, RF: -7, '1B': -12, DH: -17 }[pos] || 0;
  const gf = s.g / 143;
  const def = (defVal(p) - 60) * 0.12 * gf - s.e * 0.3;
  const br = s.sb * 0.2 - s.cs * 0.4;
  const repl = 20 * s.pa / 600;
  return (wraa + posAdj * gf + def + br + repl) / 10;
}
function pitWAR(p, s, lb) {
  s = s || p.st; lb = lb || leagueBase();
  if (!s.outs) return 0;
  const ip = s.outs / 3; const ra9 = s.r * 27 / s.outs; const sp = s.gs >= s.g * 0.5;
  const repl = lb.ra9 + (sp ? 1.1 : 0.7);
  let w = (repl - ra9) * ip / 9 / 10;
  if (!sp) w += s.sv * 0.02 + s.hld * 0.012;
  return w;
}
function war(p, s, lb) { return isP(p) ? pitWAR(p, s, lb) : batWAR(p, s, lb); }

function qualified(p, kind) {
  if (p.team < 0) return false;
  const g = Math.max(1, gamesPlayed(p.team));
  return kind === 'bat' ? p.st.pa >= g * 3.1 : p.st.outs >= g * 3;
}
const STAT_DEFS = {
  avg: { n: '打率', bat: true, q: true, f: s => bAvg(s), fmt: fmtAvg },
  hr: { n: '本塁打', bat: true, f: s => s.hr },
  rbi: { n: '打点', bat: true, f: s => s.rbi },
  h: { n: '安打', bat: true, f: s => s.h },
  sb: { n: '盗塁', bat: true, f: s => s.sb },
  obp: { n: '出塁率', bat: true, q: true, f: s => bObp(s), fmt: fmtAvg },
  ops: { n: 'OPS', bat: true, q: true, f: s => bOps(s), fmt: v => v.toFixed(3) },
  era: { n: '防御率', bat: false, q: true, f: s => pEra(s), fmt: fmtEra, asc: true },
  w: { n: '勝利', bat: false, f: s => s.w },
  so: { n: '奪三振', bat: false, f: s => s.so },
  sv: { n: 'セーブ', bat: false, f: s => s.sv },
  hp: { n: 'ホールドP', bat: false, f: s => s.hld + (s.gs < s.g * 0.5 ? s.w : 0) },
  whip: { n: 'WHIP', bat: false, q: true, f: s => pWhip(s), fmt: v => v.toFixed(2), asc: true }
};
function leaders(lg, key, n) {
  const d = STAT_DEFS[key];
  const ps = [];
  for (const t of G.teams) { if (lg >= 0 && t.league !== lg) continue; for (const p of roster(t.id)) { if (isP(p) !== !d.bat) continue; if (d.q && !qualified(p, d.bat ? 'bat' : 'pit')) continue; const v = d.f(p.st); if (!d.q && v <= 0) continue; ps.push({ p, v }); } }
  ps.sort((a, b) => d.asc ? a.v - b.v : b.v - a.v);
  return ps.slice(0, n || 10);
}

/* ---------- タイトル（シーズン終了時）と表彰（11月） ---------- */
function decideTitles() {
  const out = [];
  for (let lg = 0; lg < 2; lg++) {
    const T = {};
    for (const [k, nm] of [['avg', '首位打者'], ['hr', '本塁打王'], ['rbi', '打点王'], ['sb', '盗塁王'], ['h', '最多安打'], ['obp', '最高出塁率'], ['era', '最優秀防御率'], ['w', '最多勝'], ['so', '最多奪三振'], ['sv', '最多セーブ'], ['hp', '最優秀中継ぎ']]) {
      const l = leaders(lg, k, 3);
      if (!l.length) continue;
      const top = l.filter(x => x.v === l[0].v);
      T[k] = { n: nm, ids: top.map(x => x.p.id), v: l[0].v };
      for (const x of top) { x.p.awards = x.p.awards || []; x.p.awards.push({ y: G.year, n: nm }); x.p.pop = clamp(x.p.pop + 4, 0, 100); }
    }
    out.push(T);
  }
  G.seasonTitles = out;
  const ut = G.user.tid; const ul = G.teams[ut].league;
  for (const k in out[ul]) { const t = out[ul][k]; for (const id of t.ids) { const p = P_(id); if (p && p.team === ut) addNews('award', `${p.name}が${t.n}を獲得`, { important: true, tid: ut }); } }
}
function decideAwards() {
  const lb = leagueBase();
  const res = [];
  for (let lg = 0; lg < 2; lg++) {
    const all = []; for (const t of G.teams) if (t.league === lg) for (const p of roster(t.id)) all.push(p);
    const st = standings(lg);
    const rankOf = tid => st.find(x => x.t.id === tid).rank;
    const score = p => war(p, null, lb) * (1 + (rankOf(p.team) === 1 ? 0.25 : rankOf(p.team) <= 3 ? 0.08 : 0));
    const mvp = maxBy(all.filter(p => (isP(p) ? p.st.outs > 300 : p.st.pa > 300)), score);
    const rookies = all.filter(p => p.join >= G.year - 4 && (isP(p) ? (p.car.outs < 90) : (p.car.ab < 60)) && (isP(p) ? p.st.outs > 120 : p.st.pa > 200));
    const roy = maxBy(rookies, p => war(p, null, lb));
    const b9 = {};
    const bats = all.filter(p => !isP(p) && p.st.pa >= 300);
    for (const pos of ['C', '1B', '2B', '3B', 'SS', 'DH']) { const c = bats.filter(p => mainPos(p) === pos); const b = maxBy(c, p => war(p, null, lb)); if (b) b9[pos] = b.id; }
    const ofs = bats.filter(p => ['LF', 'CF', 'RF'].includes(mainPos(p))).sort((a, b) => war(b, null, lb) - war(a, null, lb)).slice(0, 3);
    b9.OF = ofs.map(p => p.id);
    const sps = all.filter(p => isP(p) && p.st.outs >= 300);
    const bp = maxBy(sps, p => war(p, null, lb)); if (bp) b9.P = bp.id;
    const gg = {};
    for (const pos of ['C', '1B', '2B', '3B', 'SS']) { const c = bats.filter(p => mainPos(p) === pos && p.st.g >= 90); const b = maxBy(c, p => defVal(p) - p.st.e * 0.8); if (b) gg[pos] = b.id; }
    gg.OF = bats.filter(p => ['LF', 'CF', 'RF'].includes(mainPos(p)) && p.st.g >= 90).sort((a, b) => (defVal(b) - b.st.e * 0.8) - (defVal(a) - a.st.e * 0.8)).slice(0, 3).map(p => p.id);
    const ace = maxBy(all.filter(p => isP(p) && p.st.gs >= 18), p => war(p, null, lb) + p.st.w * 0.1);
    res.push({ mvp: mvp ? mvp.id : null, roy: roy ? roy.id : null, b9, gg, ace: ace ? ace.id : null });
    const give = (id, n, pop) => { const p = P_(id); if (!p) return; p.awards = p.awards || []; p.awards.push({ y: G.year, n }); p.pop = clamp(p.pop + pop, 0, 100); };
    if (mvp) give(mvp.id, 'MVP', 10);
    if (roy) give(roy.id, '新人王', 8);
    if (ace) give(ace.id, 'ゴールデンアーム賞', 5);
    for (const k in b9) [].concat(b9[k]).forEach(id => give(id, 'ベストナイン', 3));
    for (const k in gg) [].concat(gg[k]).forEach(id => give(id, 'ゴールデングラブ賞', 2));
  }
  G.awards = res;
  const ut = G.user.tid; const ul = G.teams[ut].league; const A = res[ul];
  const mine = id => { const p = P_(id); return p && p.team === ut ? p : null; };
  if (mine(A.mvp)) addNews('award', `${mine(A.mvp).name}がリーグMVPに輝きました`, { important: true, tid: ut });
  if (mine(A.roy)) addNews('award', `${mine(A.roy).name}が新人王を受賞`, { important: true, tid: ut });
  if (mine(A.ace)) addNews('award', `${mine(A.ace).name}がゴールデンアーム賞を受賞`, { important: true, tid: ut });
  const aw = [['MVP', mine(A.mvp)], ['新人王', mine(A.roy)], ['ゴールデンアーム賞', mine(A.ace)]].filter(x => x[1]);
  if (aw.length) G.celeQ.push({ art: 'post', head: '年間表彰', kicker: `${G.year}年 表彰式`, title: aw.length === 1 ? `${aw[0][1].name}が${aw[0][0]}に` : aw.map(x => x[0]).join('・') + 'を受賞', sub: aw.map(x => `${x[0]} ${x[1].name}`).join('　'), body: '表彰式の壇上で、受賞した選手がファンへの感謝を語りました。', pid: aw[0][1].id });
  const b9n = [].concat(...Object.values(A.b9)).map(mine).filter(Boolean);
  if (b9n.length) addNews('award', `ベストナインに${b9n.map(p => p.name).join('、')}が選出`, { tid: ut });
  return res;
}
function archiveSeason() {
  const lb = leagueBase();
  const st = [standings(0), standings(1)];
  const rec = {
    y: G.year,
    st: st.map(s => s.map(x => ({ tid: x.t.id, w: x.t.rec.w, l: x.t.rec.l, d: x.t.rec.d }))),
    champ: G.post ? G.post.champ : null, lgChamp: G.post ? G.post.lgChamp : null, mvpGS: G.post ? G.post.mvp : null,
    awards: G.awards ? JSON.parse(JSON.stringify(G.awards)) : null, titles: G.seasonTitles || null,
    names: {}
  };
  const ids = new Set();
  if (rec.awards) rec.awards.forEach(a => { [a.mvp, a.roy, a.ace].forEach(x => x != null && ids.add(x)); for (const k in a.b9) [].concat(a.b9[k]).forEach(x => ids.add(x)); for (const k in a.gg) [].concat(a.gg[k]).forEach(x => ids.add(x)); });
  if (rec.titles) rec.titles.forEach(T => { for (const k in T) T[k].ids.forEach(x => ids.add(x)); });
  if (rec.mvpGS != null) ids.add(rec.mvpGS);
  ids.forEach(id => { const p = P_(id); if (p) rec.names[id] = { n: p.name, t: p.team }; });
  G.hist.seasons.push(rec);
  for (const t of G.teams) {
    for (const p of roster(t.id)) {
      const s = p.st;
      const played = isP(p) ? s.g > 0 : s.pa > 0;
      if (played) p.hist.push({ y: G.year, t: p.sTeam != null && p.sTeam >= 0 ? p.sTeam : t.id, s: JSON.parse(JSON.stringify(s)), war: r1(war(p, s, lb)), sal: p.sal, lv: p.lv });
      if (p.hist.length > 25) p.hist.shift();
      for (const k in s) if (typeof s[k] === 'number') p.car[k] = (p.car[k] || 0) + s[k];
      p.st = isP(p) ? blankPit() : blankBat();
    }
  }
}

/* ---------- 交流戦・オールスター・月間MVP ---------- */
function interleagueTitle() {
  const best = G.teams.slice().sort((a, b) => { const pa = a.rec.il[0] / Math.max(1, a.rec.il[0] + a.rec.il[1]), pb = b.rec.il[0] / Math.max(1, b.rec.il[0] + b.rec.il[1]); return pb - pa || b.rec.il[0] - a.rec.il[0]; })[0];
  addNews('league', `交流戦は${tName(best.id)}が${best.rec.il[0]}勝${best.rec.il[1]}敗で優勝`, { important: isUser(best.id), tid: best.id });
  best.popBonus = (best.popBonus || 0) + 1.5;
  if (isUser(best.id)) book('rev', 'prize', 5000);
  G.ilChamp = G.ilChamp || []; G.ilChamp.push({ y: G.year, tid: best.id });
}
function allStar() {
  const lb = leagueBase(); const sel = [[], []];
  for (let lg = 0; lg < 2; lg++) {
    const all = []; for (const T of G.teams) if (T.league === lg) for (const p of rosterLv(T.id, 1)) all.push(p);
    const vote = p => p.pop * 1.2 + war(p, null, lb) * 12 + (isUser(p.team) ? 4 : 0);
    const used = new Set();
    const take = (f, n) => { const c = all.filter(p => !used.has(p.id) && f(p)).sort((a, b) => vote(b) - vote(a)).slice(0, n); c.forEach(p => { used.add(p.id); sel[lg].push(p.id); }); };
    for (const pos of ['C', '1B', '2B', '3B', 'SS']) take(p => !isP(p) && p.pos === pos, 2);
    take(p => !isP(p) && p.pos === 'OF', 5); take(p => !isP(p), 2);
    take(p => isP(p) && p.st.gs >= p.st.g * 0.5, 6); take(p => isP(p) && p.st.gs < p.st.g * 0.5, 5);
  }
  const ut = G.user.tid; const mine = sel.flat().map(P_).filter(p => p && p.team === ut);
  for (const id of sel.flat()) { const p = P_(id); if (p) { p.pop = clamp(p.pop + 2, 0, 100); p.awards = p.awards || []; p.awards.push({ y: G.year, n: 'オールスター出場' }); } }
  const a = ri(1, 9), b = ri(1, 9); const win = a === b ? -1 : a > b ? 0 : 1;
  const mvpPool = sel[win < 0 ? 0 : win].map(P_).filter(p => p && !isP(p));
  const mvp = mvpPool.length ? pick(mvpPool) : null;
  addNews('league', `オールスター戦 ${LEAGUES[0]} ${a} - ${b} ${LEAGUES[1]}${mvp ? '。MVPは' + tShort(mvp.team) + 'の' + mvp.name : ''}`, { important: mvp && mvp.team === ut });
  if (mine.length) { book('rev', 'prize', mine.length * 300); uT().pop = clamp(uT().pop + mine.length * 0.2, 0, 99); addNews('league', `オールスターに${mine.map(p => p.name).join('、')}の${mine.length}人が選ばれました`, { important: true, tid: ut }); }
  if (mvp) { mvp.pop = clamp(mvp.pop + 5, 0, 100); if (mvp.team === ut) book('rev', 'prize', 300); }
  G.allStar = { y: G.year, sel, mvp: mvp ? mvp.id : null, score: [a, b] };
}
function monthlyMvp() {
  const ut = G.user.tid; const snap = G.mSnap || {};
  const lines = [];
  for (let lg = 0; lg < 2; lg++) {
    let bb = null, bv = -1e9, pb = null, pv = -1e9;
    for (const T of G.teams) {
      if (T.league !== lg) continue;
      for (const p of roster(T.id)) {
        const s0 = snap[p.id] || {}; const s = p.st;
        if (isP(p)) { const outs = s.outs - (s0.outs || 0), er = s.er - (s0.er || 0), w = s.w - (s0.w || 0), sv = s.sv - (s0.sv || 0), so = s.so - (s0.so || 0); if (outs < 30) continue; const v = outs / 3 * 0.12 - er * 0.9 + w * 1.2 + sv * 0.8 + so * 0.05; if (v > pv) { pv = v; pb = p; } }
        else { const pa = s.pa - (s0.pa || 0); if (pa < 60) continue; const h = s.h - (s0.h || 0), hr = s.hr - (s0.hr || 0), rbi = s.rbi - (s0.rbi || 0), bb2 = s.bb - (s0.bb || 0), sb = s.sb - (s0.sb || 0); const v = h * 1 + hr * 2.2 + rbi * 0.8 + bb2 * 0.4 + sb * 0.4 - pa * 0.22; if (v > bv) { bv = v; bb = p; } }
      }
    }
    for (const p of [bb, pb]) if (p) { p.pop = clamp(p.pop + 2, 0, 100); p.awards = p.awards || []; p.awards.push({ y: G.year, n: G.month + '月の月間MVP' }); if (p.team === ut) lines.push(p.name); }
    addNews('award', `${G.month}月の月間MVP（${LEAGUES[lg]}）：打者 ${bb ? tShort(bb.team) + 'の' + bb.name : '―'}、投手 ${pb ? tShort(pb.team) + 'の' + pb.name : '―'}`, {});
  }
  if (lines.length) addNews('award', `${lines.join('と')}が${G.month}月の月間MVPに選ばれました`, { important: true, tid: ut });
  monthSnap();
}
function monthSnap() { const m = {}; for (const T of G.teams) for (const p of roster(T.id)) { const s = p.st; m[p.id] = isP(p) ? { outs: s.outs, er: s.er, w: s.w, sv: s.sv, so: s.so } : { pa: s.pa, h: s.h, hr: s.hr, rbi: s.rbi, bb: s.bb, sb: s.sb }; } G.mSnap = m; }
