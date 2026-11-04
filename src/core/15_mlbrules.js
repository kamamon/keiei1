/* =========================================================
   メジャー版の決まりごと
   日程（162試合）・地区順位・ポストシーズン（12球団）・年俸（調停とFA）・ぜいたく税・
   ドラフトの指名順と契約金・海外選手・選手の生成
   ========================================================= */

/* ---------- 日程：3連戦×54カード＝162試合 ----------
   リーグ内総当たり2周（15カード×2）＋地区内総当たり3周（5カード×3）＋インターリーグ9カード。
   奇数で余った球団どうしはインターリーグのカードを組む。どのカードも30球団が一斉に戦う */
function rrOdd(ids) {
  const arr = ids.concat([-1]); const n = arr.length; const out = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = []; let bye = null;
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a < 0) bye = b; else if (b < 0) bye = a; else pairs.push([a, b]); }
    out.push({ pairs, bye });
    arr.splice(1, 0, arr.pop());
  }
  return out;
}
function genScheduleMLB() {
  const lgIds = lg => G.teams.filter(t => t.league === lg).map(t => t.id);
  const divIds = (lg, d) => G.teams.filter(t => t.league === lg && t.div === d).map(t => t.id);
  const rounds = [];
  for (let c = 0; c < 2; c++) {
    const R = [rrOdd(shuffle(lgIds(0))), rrOdd(shuffle(lgIds(1)))];
    for (let r = 0; r < R[0].length; r++) rounds.push(R[0][r].pairs.concat(R[1][r].pairs, [[R[0][r].bye, R[1][r].bye]]));
  }
  for (let c = 0; c < 3; c++) {
    const D = [0, 1].map(lg => [0, 1, 2].map(d => rrOdd(shuffle(divIds(lg, d)))));
    for (let r = 0; r < 5; r++) {
      const pairs = [];
      for (let lg = 0; lg < 2; lg++) for (let d = 0; d < 3; d++) pairs.push(...D[lg][d][r].pairs);
      for (let d = 0; d < 3; d++) pairs.push([D[0][d][r].bye, D[1][(d + r + c) % 3][r].bye]);
      rounds.push(pairs);
    }
  }
  const L0 = shuffle(lgIds(0)), L1 = shuffle(lgIds(1));
  const shifts = shuffle(Array.from({ length: 15 }, (_, i) => i)).slice(0, 9);
  for (const k of shifts) rounds.push(L0.map((a, i) => [a, L1[(i + k) % 15]]));
  shuffle(rounds);
  // 同じ相手とのカードが続かないように並べ替える
  const key = p => Math.min(p[0], p[1]) * 100 + Math.max(p[0], p[1]);
  for (let it = 0; it < 200; it++) {
    let bad = -1;
    for (let i = 1; i < rounds.length && bad < 0; i++) { const s = new Set(rounds[i - 1].map(key)); if (rounds[i].some(p => s.has(key(p)))) bad = i; }
    if (bad < 0) break;
    const j = ri(0, rounds.length - 1); const t = rounds[bad]; rounds[bad] = rounds[j]; rounds[j] = t;
  }
  // ホームとビジター：同じ相手とは交互、初対戦はホームの少ない側
  const home = {}; for (const T of G.teams) home[T.id] = 0;
  const last = {};
  const series = [];
  for (const rd of rounds) {
    const row = [];
    for (const [a, b] of rd) {
      const k = key([a, b]);
      let h;
      if (last[k] != null) h = last[k] === a ? b : a;
      else h = home[a] < home[b] ? a : home[b] < home[a] ? b : (chance(0.5) ? a : b);
      last[k] = h; home[h]++;
      row.push({ h, a: h === a ? b : a });
    }
    series.push(row);
  }
  for (let it = 0; it < 6; it++) {
    for (const row of series) for (const s of row) {
      if (home[s.h] > 27 && home[s.a] < 27) { home[s.h]--; home[s.a]++; const t = s.h; s.h = s.a; s.a = t; }
    }
  }
  // 162日＋休み6日（オールスター休みを含む）＝24週
  const OFF = new Set([24, 59, 105, 106, 107, 139]);
  const days = []; let si = 0, gi = 0;
  for (let d = 0; d < 24 * 7; d++) {
    if (OFF.has(d) || si >= series.length) { days.push([]); continue; }
    days.push(series[si].map(s => ({ h: s.h, a: s.a, done: false })));
    gi++; if (gi >= 3) { gi = 0; si++; }
  }
  G.sched = { days, makeup: [], mkDays: [] };
  G.day = 0;
}

/* ---------- 地区の順位とポストシーズン進出 ---------- */
function recCmp(a, b) { return pctOf(b.rec) - pctOf(a.rec) || b.rec.w - a.rec.w || (b.rec.rs - b.rec.ra) - (a.rec.rs - a.rec.ra) || a.id - b.id; }
function grpStandings(g) {
  const ts = G.teams.filter(t => grpOf(t) === g).sort(recCmp);
  const top = ts[0].rec;
  return ts.map((t, i) => ({ t, rank: i + 1, gb: ((top.w - t.rec.w) + (t.rec.l - top.l)) / 2 }));
}
/* リーグの6シード：地区1位3球団（勝率順）＋ワイルドカード3球団 */
function mlbSeeds(lg) {
  const divW = [0, 1, 2].map(d => grpStandings(lg * 3 + d)[0].t).sort(recCmp);
  const rest = G.teams.filter(t => t.league === lg && !divW.includes(t)).sort(recCmp);
  return divW.concat(rest.slice(0, 3)).map(t => t.id);
}
/* ワイルドカード争い（地区1位以外の勝率順。3位とのゲーム差つき） */
function wildCard(lg) {
  const divW = new Set([0, 1, 2].map(d => grpStandings(lg * 3 + d)[0].t.id));
  const rest = G.teams.filter(t => t.league === lg && !divW.has(t.id)).sort(recCmp);
  const third = rest[2] ? rest[2].rec : rest[0].rec;
  return rest.map((t, i) => ({ t, rank: i + 1, gb: ((third.w - t.rec.w) + (t.rec.l - third.l)) / 2 }));
}
function inPostField(tid) {
  if (G.post && G.post.field) return G.post.field.includes(tid);
  const T = G.teams[tid]; return mlbSeeds(T.league).includes(tid);
}
const SERIES_CFG = {
  cs1: { need: 2, max: 3, adv: 0, n: 'プレーオフ1st' }, cs2: { need: 4, max: 6, adv: 1, n: 'プレーオフ最終' }, gs: { need: 4, max: 8, adv: 0, n: 'グランドシリーズ' },
  wc: { need: 2, max: 3, adv: 0, n: 'ワイルドカードシリーズ', home: [1, 1, 1] }, ds: { need: 3, max: 5, adv: 0, n: '地区シリーズ', home: [1, 1, 0, 0, 1] },
  lcs: { need: 4, max: 7, adv: 0, n: 'リーグ優勝決定シリーズ', home: [1, 1, 0, 0, 0, 1, 1] }, ws: { need: 4, max: 7, adv: 0, n: 'ワールドシリーズ', home: [1, 1, 0, 0, 0, 1, 1] }
};
function startPostMLB() {
  const seeds = [mlbSeeds(0), mlbSeeds(1)];
  const divChamp = [];
  for (let g = 0; g < 6; g++) divChamp.push(grpStandings(g)[0].t.id);
  G.post = { stage: 'wc', series: [], lgChamp: [], divChamp, seeds, field: seeds[0].concat(seeds[1]), champ: null, mvp: null };
  for (let lg = 0; lg < 2; lg++) { const s = seeds[lg]; G.post.series.push(mkSeries('wc', lg, s[2], s[5]), mkSeries('wc', lg, s[3], s[4])); }
}
function seedOf(lg, tid) { return G.post.seeds[lg].indexOf(tid); }
function advancePostMLB(turn) {
  const P = G.post; const fin = (k, lg) => P.series.filter(x => x.kind === k && x.lg === lg);
  if (turn === 36) {
    playSeries('wc');
    for (let lg = 0; lg < 2; lg++) {
      const s = P.seeds[lg]; const w36 = fin('wc', lg).find(x => x.hi === s[2]).winner, w45 = fin('wc', lg).find(x => x.hi === s[3]).winner;
      P.series.push(mkSeries('ds', lg, s[0], w45), mkSeries('ds', lg, s[1], w36));
    }
    P.stage = 'ds';
  } else if (turn === 37) {
    playSeries('ds');
    for (let lg = 0; lg < 2; lg++) {
      const w = fin('ds', lg).map(x => x.winner).sort((a, b) => seedOf(lg, a) - seedOf(lg, b));
      P.series.push(mkSeries('lcs', lg, w[0], w[1]));
    }
    P.stage = 'lcs';
  } else if (turn === 38) {
    playSeries('lcs');
    P.lgChamp = [0, 1].map(lg => fin('lcs', lg)[0].winner);
    for (const tid of P.lgChamp) {
      const T = G.teams[tid]; T.titles.lg = (T.titles.lg || 0) + 1; T.pop = clamp(T.pop + 1.5, 0, 99); T.popBonus = (T.popBonus || 0) + 4;
      if (isUser(tid)) { book('rev', 'prize', 10000); addNews('post', `${tName(tid)}が${LEAGUES[T.league]}優勝！ ワールドシリーズへ進みます`, { important: true, tid, note: 'hi' }); }
    }
    const [a, b] = P.lgChamp; const hi = recCmp(G.teams[a], G.teams[b]) <= 0 ? a : b;
    P.series.push(mkSeries('ws', -1, hi, hi === a ? b : a));
    P.stage = 'ws';
  } else if (turn === 39) {
    playSeries('ws');
    const s = P.series.find(x => x.kind === 'ws');
    P.champ = s.winner; P.mvp = s.mvp; P.stage = 'done';
    const champ = G.teams[s.winner];
    champ.titles.gs = (champ.titles.gs || 0) + 1;
    champ.pop = clamp(champ.pop + 2, 0, 99); champ.popBonus = (champ.popBonus || 0) + 6;
    addNews('post', `${tName(s.winner)}がワールドシリーズを制覇！ シリーズMVPは${s.mvp != null && P_(s.mvp) ? P_(s.mvp).name : '―'}`, { important: true, tid: s.winner });
    if (isUser(s.winner)) { book('rev', 'prize', 20000); G.flags.gsWin = (G.flags.gsWin || 0) + 1; G.flags.goodsWeeks = 6; G.flags.goodsBoost = 0.5; }
    else if (isUser(s.hi) || isUser(s.lo)) book('rev', 'prize', 8000);
  }
}
/* そのチームのポストシーズンの結果（'ws'優勝・'pen'リーグ優勝・'lcs'・'ds'・'wc'・null） */
function postResult(tid) {
  const P = G.post; if (!P || !P.field || !P.field.includes(tid)) return null;
  if (P.champ === tid) return 'champ';
  if (P.lgChamp.includes(tid)) return 'pen';
  for (const k of ['lcs', 'ds', 'wc']) if (P.series.some(s => s.kind === k && (s.hi === tid || s.lo === tid))) return k;
  return 'wc';
}

/* ---------- 年俸：サービスタイム（メジャー在籍年数）で決まる ----------
   0〜2年：最低年俸に近い額で球団が更新／3〜5年：年俸調停／6年以上：FA */
function valueSalaryMLB(o) { const usd = 0.78 + 52 / (1 + Math.exp(-(o - 79) / 6.5)); return usd * 1e6 / 300; }
function svcClass(p) { if (p.lv === 3) return 'minor'; if (p.intlFA) return 'fa'; return p.svc >= 6 ? 'fa' : p.svc >= (LG.arbYears || 3) ? 'arb' : 'pre'; }
const SVC_LABEL = { minor: 'マイナー契約', pre: '調停権なし', arb: '年俸調停', fa: 'FA権' };
function ageFactorMLB(age) { return age <= 31 ? 1 : age === 32 ? 0.95 : age === 33 ? 0.88 : age === 34 ? 0.8 : 0.7; }
function preArbSal(p) { return roundSal(MIN_SAL * (1 + 0.05 * Math.min(p.svc, 3)) + Math.max(0, ovr(p) - 68) * 60); }
function salByWarMLB(w) { return MIN_SAL + Math.max(0, w) * 26700 + Math.max(0, w - 4) * 8000; }
/* 調停の相場（成績と能力から） */
function arbFair(p) {
  const o = ovr(p); const base = seasonPlayed(p) ? salByWarMLB(war(p)) * 0.55 + valueSalaryMLB(o) * 0.45 : valueSalaryMLB(o) * 0.8;
  const k = [0.30, 0.45, 0.62][clamp(p.svc - 3, 0, 2)];
  return Math.max(base * k, p.sal * 0.95, MIN_SAL * 1.15);
}
function marketSalaryMLB(p) {
  if (p.lv === 3) return MIN_SAL_IK;
  const c = svcClass(p);
  if (c === 'pre') return preArbSal(p);
  if (c === 'arb') return roundSal(Math.max(MIN_SAL * 1.15, valueSalaryMLB(ovr(p)) * [0.30, 0.45, 0.62][clamp(p.svc - 3, 0, 2)]));
  let s = valueSalaryMLB(ovr(p)) * ageFactorMLB(p.age);
  if (p.team >= 0 && G.teams[p.team]) s *= 0.92 + G.teams[p.team].market * 0.03;
  return roundSal(Math.max(MIN_SAL, s));
}
/* FAで求める年数 */
function faAskYears(p) {
  const o = ovr(p), a = p.age;
  if (a >= 35) return 1;
  if (a >= 33) return ri(1, 2);
  if (a >= 31) return ri(2, 4);
  if (a >= 28) return o >= 78 ? ri(5, 7) : ri(3, 5);
  return o >= 80 ? ri(7, 10) : o >= 70 ? ri(5, 7) : ri(2, 4);
}

/* ---------- ぜいたく税 ---------- */
function luxTaxCalc(pay, yrsOver) {
  const L = LG.lux; if (!L || pay <= L.th) return 0;
  const over = pay - L.th;
  let t = over * L.rates[Math.min(yrsOver, L.rates.length - 1)];
  for (const [th, r] of L.sur) if (over > th) t += (over - th) * r;
  return Math.round(t);
}
function luxTaxYearEnd() {
  if (!LG.mlb) return;
  const hits = [];
  for (const T of G.teams) {
    const pay = teamPayroll(T.id);
    const tax = luxTaxCalc(pay, T.luxY || 0);
    if (tax > 0) {
      T.luxY = (T.luxY || 0) + 1; hits.push(T.id);
      if (isUser(T.id)) { book('exp', 'lux', tax); notify('biz', `年俸総額${fmtOku(pay)}がぜいたく税の基準額（${fmtOku(LG.lux.th)}）を超えたため、ぜいたく税${fmtOku(tax)}を支払いました（${T.luxY}年連続）`, { go: 'finance', note: 'hi' }); }
    } else T.luxY = 0;
  }
  if (hits.length) addNews('league', `今季のぜいたく税の対象：${hits.map(tShort).join('、')}`, {});
}

/* ---------- ドラフト：前年の成績の逆順。プレーオフに出なかった球団で上位6つを抽選 ---------- */
const LOTTERY_ODDS = [16.5, 16.5, 16.5, 13.25, 10, 7.5, 5.5, 3.9, 2.7, 1.8, 1.4, 1.1, 0.9, 0.7, 0.5, 0.4, 0.2, 0.1];
function mlbDraftOrder(byPower) {
  let teams;
  if (byPower) teams = G.teams.slice().sort((a, b) => teamPower(a.id).total - teamPower(b.id).total || a.id - b.id);
  else teams = G.teams.slice().sort((a, b) => recCmp(b, a));
  const field = byPower ? [] : ((G.post && G.post.field) || []);
  const non = teams.filter(t => !field.includes(t.id)); const po = teams.filter(t => field.includes(t.id));
  const rk = { wc: 0, ds: 1, lcs: 2, pen: 3, champ: 4 };
  if (!byPower) po.sort((a, b) => (rk[postResult(a.id)] || 0) - (rk[postResult(b.id)] || 0) || recCmp(b, a));
  const pool = non.map((t, i) => ({ t, w: LOTTERY_ODDS[Math.min(i, LOTTERY_ODDS.length - 1)] }));
  const top = [];
  for (let k = 0; k < 6 && pool.length; k++) { const x = wpick(pool, y => y.w); top.push(x.t); pool.splice(pool.indexOf(x), 1); }
  const order = top.concat(pool.map(x => x.t), po).map(t => t.id);
  return { y: G.year + (byPower ? 0 : 1), order, lot: top.map(t => t.id) };
}
/* 指名順位ごとの契約金の目安（ドル→内部の単位） */
function mlbSlot(n) {
  const usd = n <= 30 ? 2.6e6 + 7.9e6 * Math.exp(-(n - 1) / 7) : Math.max(1.6e5, 1.9e6 * Math.exp(-(n - 31) / 55));
  return usd / 300;
}

/* ---------- 選手の生成 ---------- */
function natPick() { return wpick(['US', 'LAT', 'JP', 'KR', 'TW'], x => ({ US: 70, LAT: 26, JP: 2.5, KR: 1, TW: 0.5 })[x]); }
function nameFor(nat) { return nat === 'JP' ? genJpReal() : nat === 'KR' || nat === 'TW' ? genAsName(nat) : genUsName(nat); }
function setNat(p, nat) { NAMESET.delete(p.name); p.nat = nat; p.name = nameFor(nat); if (nat === 'LAT') p.home = 5; }
function genRosterMLB(T) {
  const shift = T.shift * 0.5 + rf(-1.5, 1.5);
  const add = (pos, pt, o) => {
    const age = o.age || sampleAge(); const gt = wpick([0, 1, 2], x => [25, 50, 25][x]);
    const P = clamp(rn(o.mu || 58 + shift, o.sd || 10), 30, 93);
    const cur = clamp(curFromPeak(P, age, gt), 18, 92);
    const pot = age < GT[gt].g ? P : cur;
    const p = makePlayer({ pos, pt, age, cur, pot, gt, from: pick(['高校', '大学', '大学', '短大', '海外']) });
    setNat(p, natPick());
    p.svc = o.lv === 3 ? 0 : clamp(Math.round((age - 22 - ri(0, 2)) * (cur >= 55 ? 1 : 0.5)), 0, 18);
    p.pop = clamp(Math.round((ovr(p) - 50) * 1.6 + p.svc * 1.5 + rn(0, 8)), 0, 95);
    p.join = G.year - Math.max(0, Math.min(p.svc + ri(0, 3), age - 18));
    G.players[p.id] = p;
    addToTeam(p, T.id, o.lv || 2);
    p.orig = chance(0.55) ? T.id : ri(0, G.teams.length - 1);
    p.sal = marketSalaryMLB(p);
    p.yrs = 1;
    if (svcClass(p) === 'fa' && ovr(p) >= 64) p.yrs = ri(1, p.age <= 30 ? 6 : 3);
    else if (svcClass(p) === 'arb' && ovr(p) >= 74 && chance(0.4)) p.yrs = ri(2, 5);
    synthCareer(p);
    markPastMilestones(p);
    return p;
  };
  for (let i = 0; i < 9; i++) add('P', 'SP', {});
  for (let i = 0; i < 12; i++) add('P', 'RP', {});
  const bp = { C: 3, '1B': 2, '2B': 2, '3B': 2, SS: 3, OF: 7 };
  for (const pos in bp) for (let i = 0; i < bp[pos]; i++) add(pos, '', {});
  for (let i = 0; i < 24; i++) {
    const p = add(i < 10 ? 'P' : pick(['C', '2B', 'SS', 'OF', '3B', '1B', 'OF']), i < 4 ? 'SP' : 'RP', { age: ri(18, 24), mu: 50, sd: 9, lv: 3 });
    p.svc = 0; p.sal = MIN_SAL_IK; p.yrs = ri(1, 5); p.pop = ri(0, 10);
  }
}
/* 海外のプロ選手（日本・韓国・台湾・キューバなど）。日本と韓国はポスティングで移籍金がかかる */
const INTL_LG = { 日本: '日本（プロ野球）', 韓国: '韓国（プロ野球）', 台湾: '台湾（プロ野球）', キューバ: 'キューバ', ドミニカ共和国: 'ドミニカ共和国', ベネズエラ: 'ベネズエラ', メキシコ: 'メキシコ', オーストラリア: 'オーストラリア' };
function genForeignMLB(n) {
  for (let i = 0; i < n; i++) {
    const from = pick(FRN_FROM);
    const nat = from === '日本' ? 'JP' : from === '韓国' ? 'KR' : from === '台湾' ? 'TW' : from === 'オーストラリア' ? 'US' : 'LAT';
    const mu = { JP: 66, KR: 61, TW: 57, US: 56, LAT: 60 }[nat];
    const cur = clamp(rn(mu, 7), 46, 88);
    const age = nat === 'LAT' && from === 'キューバ' ? ri(20, 29) : ri(23, 32);
    const pos = chance(0.5) ? 'P' : wpick(['1B', '3B', 'OF', '2B', 'SS', 'C'], x => ({ '1B': 15, '3B': 15, OF: 35, '2B': 13, SS: 14, C: 8 })[x]);
    const p = makePlayer({ pos, pt: pos === 'P' ? (chance(0.55) ? 'SP' : 'RP') : '', age, cur, pot: cur + rf(0, age <= 25 ? 8 : 3), from: '海外', gt: 1 });
    setNat(p, nat);
    p.team = -3;
    const yrs = cur >= 72 && age <= 29 ? ri(4, 7) : cur >= 64 ? ri(2, 4) : ri(1, 2);
    const ask = roundSal(Math.max(MIN_SAL, valueSalaryMLB(cur) * rf(0.85, 1.15) * (age <= 27 ? 1.1 : 1)));
    const posted = (nat === 'JP' || nat === 'KR') && age <= 30;
    p.pr = { sc: 0, noise: { ovr: rn(0, 1) }, cat: '海外', school: INTL_LG[from] || from, hype: clamp(Math.round((cur - 55) * 3), 0, 100) };
    p.adaptT = clamp(Math.round(rn(-1, 3.5)), -10, 4);
    p.fa = { kind: 'frn', ask, fee: posted ? roundSal(ask * yrs * (nat === 'JP' ? 0.18 : 0.12)) : 0, yrs, posted };
    G.foreign.push(p);
    if (posted && cur >= 74 && G.teams.length) addNews('fa', `${INTL_LG[from]}の${p.name}（${POS_JP[p.pos]}・${age}歳）がポスティングでメジャー移籍をめざします`, { important: cur >= 78, note: false });
  }
}
function genSchoolMLB(cat, home) {
  const pl = pick(PLACES[home]);
  if (home === 5) return cat === '高校' ? pl + pick(['アカデミー', '高', '野球学校']) : pl + pick(['大', '工科大']);
  if (cat === '高校') return pl + pick(['高', 'セントラル高', 'ノース高', 'サウス高', 'カトリック高', 'イースト高', 'ウエスト高', 'アカデミー', 'クリスチャン高']);
  if (cat === '大学') return pl + pick(['大', '州立大', '工科大', 'クリスチャン大', 'バプテスト大', 'パシフィック大', 'テック大', 'カレッジ']);
  return pl + pick(['短大', 'コミュニティカレッジ']);
}
function tvAnnualMLB(T) { return 160000 + T.market * 80000 + T.pop * 700; }
function otherCostMLB(T) { return 60000 + T.market * 25000; }
function aiPayBudgetMLB(T) { return Math.round((140000 + T.market * 100000 + T.pop * 1500) * (0.9 + (T.lastPct || 0.5) * 0.2)); }
/* 自球団の40人枠が足りず試合を組めないときの応急処置（マイナーから登録、足りなければ自由契約の選手と最低年俸で契約） */
function userFill40() {
  const ut = G.user.tid; let n = shihai(ut).length; if (n >= 28) return;
  const added = [];
  const c = rosterLv(ut, 3).filter(p => p.injW === 0).sort((a, b) => ovr(b) - ovr(a));
  for (const p of c) { if (n >= 28) break; if (promoteIkusei(p).ok) { n++; added.push(p.name); } }
  const f = G.fapool.map(P_).filter(p => p && p.team < 0).sort((a, b) => ovr(b) - ovr(a));
  for (const p of f) { if (n >= 28) break; G.fapool = G.fapool.filter(x => x !== p.id); addToTeam(p, ut, 2); p.sal = MIN_SAL; p.yrs = 1; p.fa = null; n++; added.push(p.name); }
  if (added.length) notify('contract', `40人枠の選手が足りず試合を組めないため、${added.length}人を登録しました（${added.slice(0, 5).join('、')}${added.length > 5 ? 'ほか' : ''}）。補強を考えましょう`, { go: 'roster', note: 'hi' });
}

/* ---------- 契約更改・延長・FA（メジャー版） ---------- */
/* 1年あたりの妥当な額 */
function mlbTarget(p) {
  const c = svcClass(p);
  if (c === 'minor') return MIN_SAL_IK;
  if (c === 'pre') return preArbSal(p);
  if (c === 'arb') return arbFair(p);
  const o = ovr(p); const base = seasonPlayed(p) ? salByWarMLB(war(p)) * 0.5 + valueSalaryMLB(o) * 0.5 : valueSalaryMLB(o);
  return base * ageFactorMLB(p.age) * (p.team >= 0 && G.teams[p.team] ? 0.92 + G.teams[p.team].market * 0.03 : 1);
}
function calcDemandMLB(p) {
  const c = svcClass(p); const t = mlbTarget(p);
  let d = c === 'pre' || c === 'minor' ? t : t * 1.08 * (PERS[p.per].demand || 1);
  if (p.titleRew === G.year) d *= 1.05;
  if (p.mor < 35) d *= 1.05;
  return roundSal(Math.max(d, minSal(p)));
}
function teamOfferMLB(p) { const c = svcClass(p); const t = mlbTarget(p); return roundSal(Math.max(c === 'arb' ? t * 0.92 : t * 0.95, minSal(p))); }
/* 複数年の要求（1年あたり）。保有できる年（調停まで）をこえる年はFAの相場で考える */
function demandForMLB(p, yrs, d) {
  const c = svcClass(p);
  if (c === 'fa') return d * (p.age >= 31 ? (1 - 0.03 * (yrs - 1)) : (1 + 0.01 * (yrs - 1)));
  const ctrl = clamp(LG.faYears - p.svc, 0, yrs); const faY = yrs - ctrl;
  const ctrlAvg = d * (1 + 0.28 * Math.max(0, ctrl - 1) / 2);
  const faV = valueSalaryMLB(Math.max(ovr(p), Math.round((ovr(p) + potv(p)) / 2))) * ageFactorMLB(p.age + ctrl) * 0.9;
  return Math.max(d, (ctrl * ctrlAvg + faY * faV) / yrs);
}
function aiRenewalsMLB(tid) {
  const T = G.teams[tid];
  for (const p of roster(tid)) {
    if (p.yrs > 1 || (p.ren && p.ren.st === 'signed')) continue;
    const c = svcClass(p);
    if (c === 'minor') { p.ren = { st: 'signed', sal: MIN_SAL_IK, yrs: 1 }; continue; }
    if (c === 'pre') {
      if (ovr(p) >= 72 && p.age <= 27 && chance(0.12)) { const yrs = ri(5, 8); p.ren = { st: 'signed', sal: roundSal(demandForMLB(p, yrs, mlbTarget(p))), yrs }; }
      else p.ren = { st: 'signed', sal: preArbSal(p), yrs: 1 };
      continue;
    }
    const fair = arbFair(p);
    if (c === 'arb' && ovr(p) >= 72 && p.age <= 29 && chance(0.2)) { const yrs = ri(3, 6); p.ren = { st: 'signed', sal: roundSal(demandForMLB(p, yrs, fair)), yrs }; }
    else p.ren = { st: 'signed', sal: roundSal(fair * rf(0.97, 1.03)), yrs: 1 };
  }
  // 予算オーバーなら、調停を迎える割高な選手と契約しない（ノンテンダー）
  let over = teamPayroll(tid, true) - T.payBudget;
  if (over > 0) {
    const c = roster(tid).filter(p => p.ren && p.ren.st === 'signed' && !p.ren.faNew && p.yrs <= 1 && svcClass(p) === 'arb').sort((a, b) => pVal(a, tid) / a.ren.sal - pVal(b, tid) / b.ren.sal);
    for (const p of c.slice(0, 4)) { if (over <= 0) break; over -= p.ren.sal; releasePlayer(p, true); if (ovr(p) >= 62) addNews('contract', `${tShort(tid)}が${p.name}と契約しないと発表（ノンテンダー）`, {}); }
  }
}
/* シーズン後：保有6年を過ぎて契約が切れる選手は、みなFAになる（AI球団は一部を先に引き留める） */
function declareFAMLB() {
  G.faMarket = []; G.compPending = [];
  for (const T of G.teams) for (const p of shihai(T.id)) {
    if (!faEligible(p)) continue;
    const o = ovr(p);
    if (!isUser(T.id) && o >= 64 && p.age <= 33) {
      const want = valueSalaryMLB(o) * ageFactorMLB(p.age);
      const room = T.payBudget - teamPayroll(T.id, true);
      if (room > want * 0.6 && chance(0.25 + (p.per === 'loyal' ? 0.2 : 0) - (p.per === 'money' ? 0.1 : 0))) {
        const yrs = faAskYears(p); p.ren = { st: 'signed', sal: roundSal(want * rf(0.95, 1.08)), yrs }; p.intlFA = false;
        if (o >= 76) addNews('fa', `${tShort(T.id)}がFA目前の${p.name}と${yrs}年総額${fmtOku(p.ren.sal * yrs)}で再契約`, {});
        continue;
      }
    }
    const ask = roundSal(Math.max(MIN_SAL, valueSalaryMLB(o) * ageFactorMLB(p.age) * (PERS[p.per].demand || 1) * rf(0.95, 1.1)));
    G.faMarket.push({ id: p.id, from: T.id, rank: '', ask, askYrs: faAskYears(p), offers: {}, done: false, prevSal: p.sal });
    p.fa = { kind: 'fa', from: T.id };
    removeFromTeam(p); p.intlFA = false;
    if (o >= 74 || isUser(T.id)) addNews('fa', `${tShort(T.id)}の${p.name}（${POS_JP[p.pos]}・${p.age}歳）がFAに`, { important: isUser(T.id) || o >= 78, tid: T.id, note: isUser(T.id) ? (o >= 66 ? 'hi' : true) : false, pid: p.id });
  }
}
/* AI球団：40人枠が空いていれば、マイナーの有望株を登録する */
function aiFill40(tid) {
  let n = shihai(tid).length; if (n >= 38) return;
  const c = rosterLv(tid, 3).filter(p => ovr(p) >= 44 || potv(p) >= 62).sort((a, b) => pVal(b, tid) - pVal(a, tid));
  for (const p of c) { if (n >= 38) break; if (promoteIkusei(p).ok) n++; }
}

/* ---------- シーズンの終わり（メジャー版） ---------- */
function seasonEndMLB() {
  for (const T of G.teams) T.lastPct = pctOf(T.rec);
  for (let g = 0; g < 6; g++) grpStandings(g).forEach(x => {
    x.t.lastRank = x.rank;
    if (x.rank === 1) { x.t.titles.div = (x.t.titles.div || 0) + 1; x.t.pop = clamp(x.t.pop + 1.5, 0, 99); x.t.popBonus = (x.t.popBonus || 0) + 4; }
    if (x.rank === 5) x.t.popBonus = (x.t.popBonus || 0) - 2;
  });
  for (const id in G.players) { const p = G.players[id]; p.sTeam = p.team; if ((p.w1 || 0) >= 12) p.svc++; p.w1 = 0; }
  decideTitles();
  seasonRecordsEnd();
  titleCelebrate();
  startPostMLB();
  for (const tid of G.post.field) { const T = G.teams[tid]; T.popBonus = (T.popBonus || 0) + 1.5; }
  const ut = G.user.tid; const U = uT();
  if (G.post.divChamp.includes(ut)) addNews('post', `${tName(ut)}が${grpName(grpOf(U))}で優勝！ ポストシーズンへ進みます`, { important: true, tid: ut });
  else if (G.post.field.includes(ut)) addNews('post', `${tName(ut)}がワイルドカードでポストシーズン進出！`, { important: true, tid: ut });
  else addNews('league', `レギュラーシーズンが終了。${tName(ut)}は${grpName(grpOf(U))}${U.lastRank}位でした`, { important: true, tid: ut });
}
/* 12月：来年のドラフトの指名順（抽選） */
function mlbLottery() {
  G.draftOrder = mlbDraftOrder(false);
  const ut = G.user.tid; const lot = G.draftOrder.lot; const my = G.draftOrder.order.indexOf(ut) + 1;
  addNews('draft', `ドラフト抽選会：来年の1位指名権は${tName(lot[0])}に。${tShort(ut)}は${my}番目の指名です`, { important: true, tid: ut, note: my <= 6 ? 'hi' : true, go: 'draft' });
}

/* AI球団のFAへの提示（メジャー版）：必要な位置と予算に合う選手を数人に絞って声をかける */
function aiFABidsMLB() {
  const open = G.faMarket.filter(x => !x.done && P_(x.id));
  for (const T of shuffle(G.teams.filter(t => !isUser(t.id)))) {
    const tid = T.id;
    const mine = open.filter(f => f.offers[tid]);
    let room = T.payBudget - teamPayroll(tid, true) - sum(mine, f => f.offers[tid].sal) * 0.5;
    let slots = 2 + Math.ceil(T.market / 2) - mine.length;
    if (slots <= 0 || room <= 0) continue;
    const cand = open.filter(f => !f.offers[tid]).map(f => {
      const p = P_(f.id); const o = ovr(p); const need = faNeed(T, p);
      return { f, p, o, need, v: (o - 60) / 10 + need * 3 + (f.from === tid ? 1 : 0) + rn(0, 0.8) - (p.age >= 33 ? 0.6 : 0) };
    }).filter(x => x.o >= 58 && x.f.ask <= room * (x.o >= 72 ? 1.3 : 1)).sort((a, b) => b.v - a.v);
    for (const x of cand) {
      if (slots <= 0 || room <= 0) break;
      if (!chance(clamp((x.o - 60) / 18 + x.need + (T.market - 3) * 0.06 + (x.f.from === tid ? 0.2 : 0), 0.05, 0.85))) continue;
      const sal = roundSal(x.f.ask * rf(0.92, 1.1) * (1 + (T.market - 3) * 0.03));
      x.f.offers[tid] = { sal, yrs: clamp(x.f.askYrs + ri(-1, 1), 1, LG.maxYrs) };
      room -= sal * 0.5; slots--;
    }
  }
}
