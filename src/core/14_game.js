/* =========================================================
   ゲーム進行：新規作成・週の進行・年間行事・計画・セーブ
   ========================================================= */
const START_YEAR = 2027;
const AGE_W = [[18, 3], [19, 3], [20, 6], [21, 6], [22, 6], [23, 7], [24, 7], [25, 8], [26, 7], [27, 7], [28, 6], [29, 6], [30, 6], [31, 5], [32, 4], [33, 4], [34, 3], [35, 2], [36, 2], [37, 1], [38, 1]];
function sampleAge() { return wpick(AGE_W, x => x[1])[0]; }
function curFromPeak(P, age, gt) {
  const g = GT[gt];
  if (age < g.g) return P - (g.g - age) * rf(2.5, 4.2);
  if (age <= g.p) return P - rf(0, 2.5);
  return P - (age - g.p) * rf(1.5, 3);
}
function makeTeam(d, i) {
  return {
    id: i, city: d.city, nick: d.nick, kanji: d.kanji, color: d.color, color2: d.color2, league: d.league, div: d.div || 0, market: d.market, pop: d.pop + ri(-2, 2),
    fans: d.market * 55 + d.pop * 3.5, parent: d.parent, region: d.region, rec: blankRec(), roster: [], rotIdx: 0, facLv: d.fac,
    stad: { name: d.stadium, cap: d.cap, dome: d.dome, hrF: d.hrF }, mgr: aiManager(d.market), payBudget: 0, lastPct: 0.5, lastRank: null,
    titles: { lg: 0, gs: 0, div: 0 }, att: { g: 0, tot: 0 }, star: d.star, shift: d.shift, dPicks: 0, ikPicks: 0, luxY: 0
  };
}
function genRoster(T) {
  if (LG.mlb) return genRosterMLB(T);
  const shift = T.shift * 0.5 + rf(-1.5, 1.5);
  const add = (pos, pt, o) => {
    const age = o.age || sampleAge(); const gt = wpick([0, 1, 2], x => [25, 50, 25][x]);
    const P = clamp(rn(o.mu || 58 + shift, o.sd || 10), 30, 93);
    const cur = clamp(curFromPeak(P, age, gt), 18, 92);
    const pot = age < GT[gt].g ? P : cur;
    const p = makePlayer({ pos, pt, age, cur, pot, frn: o.frn, gt, from: o.frn ? '外国' : pick(['高校', '高校', '大学', '大学', '社会人', '独立']) });
    p.svc = o.frn ? ri(0, 4) : clamp(Math.round((age - 21 - ri(0, 2)) * (cur >= 55 ? 1 : 0.5)), 0, 18);
    if (p.svc >= 10 && chance(0.15)) p.faUsed = p.svc - ri(1, 3);
    p.pop = clamp(Math.round((ovr(p) - 50) * 1.6 + p.svc * 1.5 + rn(0, 8)), 0, 95);
    p.join = G.year - Math.max(0, Math.min(p.svc + ri(0, 2), age - 18));
    G.players[p.id] = p;
    addToTeam(p, T.id, o.lv || 2);
    p.orig = o.frn ? -1 : (chance(0.8) ? T.id : ri(0, 11));
    p.sal = marketSalary(p);
    p.yrs = (ovr(p) >= 72 && age >= 26 && age <= 33) ? ri(1, 4) : 1;
    if (o.frn) { p.sal = roundSal(p.sal * 1.2); p.prFrom = pick(FRN_FROM); }
    synthCareer(p);
    markPastMilestones(p);
    return p;
  };
  for (let i = 0; i < 14; i++) add('P', 'SP', {});
  for (let i = 0; i < 16; i++) add('P', 'RP', {});
  const bp = { C: 4, '1B': 3, '2B': 3, '3B': 3, SS: 4, OF: 13 };
  for (const pos in bp) for (let i = 0; i < bp[pos]; i++) add(pos, '', {});
  add('P', 'SP', { frn: true, age: ri(26, 33), mu: 66 + shift * 0.5, sd: 6 });
  add('P', 'RP', { frn: true, age: ri(26, 33), mu: 65 + shift * 0.5, sd: 6 });
  add(pick(['1B', 'OF', '3B']), '', { frn: true, age: ri(26, 33), mu: 67 + shift * 0.5, sd: 6 });
  add(pick(['1B', 'OF']), '', { frn: true, age: ri(26, 33), mu: 65 + shift * 0.5, sd: 6 });
  for (let i = 0; i < 8; i++) {
    const p = add(i < 4 ? 'P' : pick(['C', '2B', 'SS', 'OF', '3B']), i < 2 ? 'SP' : 'RP', { age: ri(18, 22), mu: 52, sd: 9, lv: 3 });
    p.svc = 0; p.sal = ri(24, 50) * 10; p.pop = ri(0, 10);
  }
}
function normalizeTeam(T, target) {
  const V = velOff();
  for (let it = 0; it < 3; it++) {
    autoRoster(T.id);
    const f1 = rosterLv(T.id, 1);
    const d = target - avg(f1, ovr);
    if (Math.abs(d) < 0.3) break;
    for (const p of roster(T.id)) {
      if (p.lv === 3) continue;
      for (const k in p.a) {
        if (k === 'vel') { p.a.vel = clamp(p.a.vel + d * 0.35, 120 + V, 164 + V); p.cap.vel = Math.max(p.a.vel, clamp(p.cap.vel + d * 0.35, 120 + V, 165 + V)); }
        else { p.a[k] = clamp(p.a[k] + d, 5, 99); p.cap[k] = Math.max(p.a[k], clamp(p.cap[k] + d, 5, 99)); }
      }
    }
  }
  for (const p of roster(T.id)) { p.sal = marketSalary(p); if (p.frn) p.sal = roundSal(p.sal * 1.2); if (p.lv === 3) p.sal = LG.mlb ? MIN_SAL_IK : ri(24, 50) * 10; p.pop = clamp(Math.round((ovr(p) - 50) * 1.6 + p.svc * 1.5 + rn(0, 8)), 0, 95); }
}
/* 開始時点の選手に、それまでの通算成績（概算）を持たせる */
function synthCareer(p) {
  const yrs = p.frn ? 0 : p.svc; if (!yrs) return;
  const c = p.car; const o = ovr(p); const f = clamp((o - 42) / 26, 0.15, 1.15) * (LG.games || 143) / 143;
  const kM = LGC.k / LGC_BASE.k, hrM = LGC.hr / LGC_BASE.hr, era0 = LGC.era0 || 3.7;   // リーグの得点環境に合わせる
  let w = 0;
  for (let y = 0; y < yrs; y++) {
    const ff = f * rf(0.6, 1.1) * (y < 2 ? 0.5 : 1);
    if (isP(p)) {
      const sp = p.pt === 'SP';
      const outs = Math.round((sp ? 420 : 160) * ff); const era = clamp(era0 - (o - 60) * 0.06 + rn(0, 0.5), 1.2, 7);
      const er = Math.round(era * outs / 27);
      c.g += sp ? Math.round(22 * ff) : Math.round(45 * ff); c.gs += sp ? Math.round(22 * ff) : 0; c.outs += outs; c.er += er; c.r += Math.round(er * 1.08);
      c.so += Math.round(outs / 3 * (0.75 + (velScore(p.a.vel) - 55) * 0.008) * kM); c.bb += Math.round(outs / 3 * 0.33); c.h += Math.round(outs / 3 * 0.9); c.hr += Math.round(outs / 3 * 0.08 * hrM);
      if (sp) { c.w += Math.round(9 * ff + (o - 60) * 0.12); c.l += Math.round(7 * ff); }
      else { c.w += Math.round(3 * ff); c.l += Math.round(3 * ff); c.hld += Math.round(14 * ff); if (rpOvr(p) >= 68) c.sv += Math.round(18 * ff); }
      w += (era0 + 1.0 - era) * outs / 27 / 10;
    } else {
      const pa = Math.round(500 * ff); const ab = Math.round(pa * 0.89);
      const av = clamp(0.245 + (p.a.con - 60) * 0.0018 + rn(0, 0.015), 0.18, 0.34);
      const hr = Math.round(pa * 0.021 * hrM * Math.exp(LGC.hrB * nz(p.a.pow)) * rf(0.7, 1.2));
      const h = Math.round(ab * av);
      c.g += Math.round(125 * ff); c.pa += pa; c.ab += ab; c.h += h; c.hr += hr; c.d += Math.round(h * 0.18); c.t += Math.round(h * 0.02);
      c.rbi += Math.round(hr * 3 + h * 0.25); c.r += Math.round(h * 0.42); c.bb += Math.round(pa * 0.08); c.so += Math.round(pa * 0.19 * kM); c.sb += Math.round(pa * 0.03 * Math.max(0, nz(p.a.spd) + 0.5));
      w += (o - 50) / 9 * ff;
    }
  }
  p.preWar = r1(Math.max(0, w));
}
function defaultBudget(T) {
  return { scout: 15000 + T.market * 2000, dev: 20000 + T.market * 3000, sales: 15000 + T.market * 2000, ads: 60000 + T.market * 10000, capex: 100000 + T.market * 20000 };
}

/* カスタムスタートの設定から難易度（★1〜5）を見積もる */
function customStars(c) {
  const sc = (c.market - 3) * 0.6 + CUSTOM_STR[c.str].off / 2.5 * 0.6 + (c.pop - 55) / 20 * 0.5 + (c.cash - 250000) / 250000 * 0.4 - CUSTOM_AI[c.ai].off / 2 * 0.4 + (c.owned ? 0.3 : 0) + (c.fac - 2) * 0.15;
  return clamp(Math.round(3 - sc), 1, 5);
}
function applyCustomDef(d, C) {
  const baseCap = d.cap, baseDome = d.dome;
  d.city = (C.city || d.city).slice(0, 8); d.nick = (C.nick || d.nick).slice(0, 12); d.kanji = (C.kanji || d.kanji).slice(0, 1);
  d.color = C.color || d.color; d.color2 = C.color2 || d.color2; d.parent = (C.parent || d.parent).slice(0, 20);
  d.stadium = (C.stadium || d.stadium).slice(0, 20); d.cap = clamp(+C.cap || d.cap, 10000, 60000); d.dome = !!C.dome;
  d.market = clamp(+C.market || d.market, 1, 5); d.pop = clamp(+C.pop || d.pop, 5, 95);
  d.cash = Math.max(0, +C.cash || 0); d.fac = clamp(+C.fac, 0, 5); d.owned = !!C.owned;
  d.rent = Math.round(d.rent * (d.cap / baseCap) * (d.dome ? 1.4 : 1) / (baseDome ? 1.4 : 1));
  if (d.dome && !baseDome) d.hrF = 1.04;
  d.shift = CUSTOM_STR[C.str].off / 0.4;
  d.region = C.region != null ? +C.region : d.region;
  d.star = customStars(C);
}
function newGame(o) {
  setSeed(o.seed || ((Date.now() ^ (Math.random() * 1e9)) >>> 0));
  setLeague(o.mode || 'npb');
  NAMESET = new Set();
  const C = o.custom || null;
  const y0 = C && C.year ? clamp(Math.round(+C.year), 1950, 2200) : START_YEAR;
  G = {
    v: 1, year: y0, startYear: y0, month: 1, week: 1, nid: 1, sid: 1, gid: 1, dayNo: 0, stamp: 0,
    teams: [], players: {}, staff: {}, staffPool: [], prospects: [], foreign: [], fapool: [], faMarket: [], compPending: [],
    news: [], pending: [], evCool: {}, boxes: {}, boxOrder: [], hist: { seasons: [], user: [] }, legends: [], retiredCoaches: [], mlb: [], trades: [],
    flags: {}, post: null, draft: null, sched: null, day: 0, weekly: null, gameOver: null, notes: [], noteSeq: 0, mlbTry: [], mlbAway: [], mode: LG.mode, velV: 1
  };
  const defs = TEAM_DEFS.map(d => Object.assign({}, d));
  if (C) applyCustomDef(defs[o.team], C);
  defs.forEach((d, i) => G.teams.push(makeTeam(d, i)));
  const T = G.teams[o.team];
  if (o.nick) T.nick = o.nick;
  G.user = {
    tid: T.id, name: o.name || '球団社長', policy: o.policy || 'balance', lineupMode: 'auto', manual: { lu: [], rot: [], su: [], cl: null },
    train: 'normal', autoSwap: true, autoRoster: false, showWeekly: true, theme: 'night', tutorial: true,
    ownerMode: C ? C.owner : 'normal', custom: !!C, noteStop: true, noteToast: true, osNote: false
  };
  G.celeQ = [];
  seedHistory(false);
  for (const t of G.teams) genRoster(t);
  const d = defs[T.id]; const fl = d.fac;
  const f = (lv) => ({ lv: Math.max(0, lv), cond: ri(72, 92) });
  G.stad = { name: d.stadium, cap: d.cap, dome: d.dome, hrF: d.hrF, owned: !!d.owned, rent: d.owned ? 0 : d.rent, age: C ? ri(5, 30) : ri(18, 40), honey: 1,
    fac: { seats: { lv: 0, cond: 100 }, vision: f(fl), food: f(fl), shop: f(fl), vip: f(fl - 1), amenity: f(fl), light: f(fl), turf: f(fl) } };
  G.tfac = { gym: f(fl), indoor: f(Math.max(1, fl - 1)), bullpen: f(fl), farm: f(fl), dorm: f(fl), medical: f(fl), analytics: f(fl - 1) };
  G.builds = []; G.project = null;
  initTown(T, C ? C.town : 'normal', C ? C.land : 'normal');
  G.fin = { cash: d.cash, y: { rev: {}, exp: {} }, m: { rev: 0, exp: 0 }, months: [], hist: [], loans: [], att: { g: 0, tot: 0, max: 0, sell: 0, list: [] }, lastRev: 400000 + d.market * 300000, lastAtt: 0, awayWeek: 0, capexY: 0 };
  const rm = tixRefMul(T);
  G.tix = refTix(T);
  G.ads = { lv: { tv: 0, web: 1, paper: 0, train: T.star <= 3 ? 1 : 0, local: 1, video: T.star <= 2 ? 1 : 0 }, paused: false };
  G.promo = { queue: [], log: [] };
  G.budget = defaultBudget(T);
  initUserStaff(T);
  G.fc = { members: 0, fee: { kids: 1500, reg: 4500, pre: 15000 }, ben: 3, camp: 0, joinY: 0, lastRet: 0.8 };
  G.fc.members = Math.round(fcTarget() * 0.92);
  book('rev', 'fanclub', G.fc.members * fcAvgFee() / 10000);
  G.sponsors = { cur: {}, offers: [], ng: {}, sol: {} };
  for (const slot of ['chest', 'sleeve', 'partner1', 'backnet', 'fence', 'score']) G.sponsors.cur[slot] = { co: pick(COMPANIES), annual: roundSal(sponsorValue(slot) * rf(0.85, 1.0)), yrs: ri(1, 3), since: G.year - ri(0, 4) };
  for (const [slot, n] of [['helmet', 2], ['partner2', 1], ['vision', 2], ['bench', 1]]) if (sponsorReq(slot).ok) G.sponsors.offers.push(...genSponsorOffers(slot, n));
  G.naming = { main: null, farm: null, offers: [], solicit: 0, solicitKind: 'main' };
  G.owner = { trust: 55, startPop: T.pop, review: null, msgs: [] };
  G.plan = { goals: [], start: G.year, end: G.year + 2, set: false };
  G.camp = null; G.fallCamp = { on: true, theme: 'balance' }; G.winter = [];
  for (const t of G.teams) {
    let target = 63 + t.shift * 0.4 + rf(-0.5, 0.5);
    if (C) target = t.id === T.id ? 63 + CUSTOM_STR[C.str].off + rf(-0.3, 0.3) : target + CUSTOM_AI[C.ai].off;
    normalizeTeam(t, target);
    t.payBudget = aiPayBudget(t); autoRoster(t.id);
    const pay = teamPayroll(t.id); const lim = t.payBudget * 0.76;
    const f = LG.mlb ? clamp(lim / pay, 0.7, 1.5) : clamp(lim / pay, 0.6, 2.2);
    const fl = LG.mlb ? MIN_SAL * 1.3 : 1500;
    for (const p of roster(t.id)) if (p.sal > fl && p.lv !== 3) p.sal = roundSal(Math.max(fl, p.sal * f));
  }
  // 能力をそろえたあとで特殊能力を決め直す（持ち味に合った能力がつくように）
  for (const t of G.teams) for (const p of roster(t.id)) genSkills(p, 0);
  genSchedule();
  genDraftClass();
  if (LG.mlb) G.draftOrder = mlbDraftOrder(true);
  genForeign(LG.mlb ? 18 : 14);
  computeSimCenter();
  touch();
  addNews('owner', `${G.user.name}が${tName(T.id)}の球団社長に就任。オーナーから「${ownerHope(T)}」と期待を託されました`, { important: true, tid: T.id, note: false });
  return G;
}
function ownerHope(T) {
  const st = T.star;
  if (LG.mlb) return st <= 1 ? 'ワールドシリーズを制覇して、王者の座を取り戻してほしい' : st <= 2 ? '毎年ポストシーズンを争えるチームと、健全な経営を両立してほしい' : st <= 3 ? '3年以内にポストシーズンの常連になってほしい' : '赤字を減らしながら、地元に愛されるチームを育ててほしい';
  if (st <= 1) return '常勝球団として日本一を取り戻してほしい';
  if (st <= 2) return '優勝争いのできるチームと健全な経営を両立してほしい';
  if (st <= 3) return '3年以内にAクラスの常連になってほしい';
  return '赤字を減らしながら、地域に愛される球団に育ててほしい';
}

/* ---------- 週の進行 ---------- */
function teamSnapshot() { const s = {}; for (const T of G.teams) s[T.id] = { w: T.rec.w, l: T.rec.l, d: T.rec.d }; return s; }
function phaseLabel(t) {
  t = t === undefined ? curTurn() : t;
  if (LG.mlb) {
    if (t <= 3) return 'オフシーズン';
    if (t <= 7) return 'スプリングトレーニング';
    if (t <= 10) return 'オープン戦';
    if (t === LG.draftT) return 'オールスター・ドラフト';
    if (t <= SEASON_END) return 'レギュラーシーズン';
    if (t === MAKEUP_TURN) return 'レギュラーシーズン 最終週';
    if (t === 36) return 'ワイルドカードシリーズ';
    if (t === 37) return '地区シリーズ';
    if (t === 38) return 'リーグ優勝決定シリーズ';
    if (t === 39) return 'ワールドシリーズ';
    if (t <= 43) return 'オフシーズン（FA）';
    return 'オフシーズン（契約・年俸調停）';
  }
  if (t <= 3) return 'オフシーズン（自主トレ）';
  if (t <= 7) return '春季キャンプ';
  if (t <= 10) return 'オープン戦';
  if (t <= SEASON_END) return 'ペナントレース';
  if (t === MAKEUP_TURN) return '公式戦 最終週';
  if (t === 36) return 'プレーオフ1st';
  if (t === 37) return 'プレーオフ最終';
  if (t === 38) return 'グランドシリーズ';
  if (t === 39) return 'ドラフト会議';
  if (t <= 43) return 'オフシーズン（FA・秋季キャンプ）';
  return 'オフシーズン（契約更改）';
}
function blockingTasks() {
  const t = curTurn(); const out = [];
  if (t === LG.draftT && G.draft && G.draft.stage !== 'done') out.push({ k: 'draft', t: LG.mlb ? 'ドラフトが終わっていません' : 'ドラフト会議が終わっていません' });
  if (G.gameOver) out.push({ k: 'over', t: 'ゲームは終了しています' });
  return out;
}
function autoResolveBlocking() {
  const t = curTurn();
  if (t === LG.draftT && G.draft && G.draft.stage !== 'done') autoUserDraft();
}
function playExhibitions() {
  const ut = G.user.tid; const res = [];
  for (let i = 0; i < 4; i++) {
    const opp = pick(G.teams.filter(t => t.id !== ut)).id;
    const home = i % 2 === 0;
    G.dayNo++; touch();
    const r = playGame(home ? ut : opp, home ? opp : ut, { rec: false, dayNo: G.dayNo });
    const my = home ? r.hs : r.as, op = home ? r.as : r.hs;
    res.push({ opp, my, op, home });
    if (home) { const att = Math.round(Math.min(capOf(ut), demandOf(ut, opp, 4) * 0.55)); book('rev', 'ticket', att * 1500 / 10000); book('exp', 'ops', 500 + att * 0.04); }
  }
  for (const T of G.teams) for (const p of roster(T.id)) if (p.rel) p.rel = null;
  return res;
}
function advanceWeek() {
  if (G.gameOver) return null;
  const t = curTurn();
  const snap = teamSnapshot();
  const finBefore = { rev: yearTotal('rev'), exp: yearTotal('exp'), cash: G.fin.cash };
  const report = { t, date: nowStr(), games: [], exh: null, news0: G.news.length, note0: G.noteSeq || 0 };
  const g0 = G.gid;
  if (t >= 8 && t <= 10) report.exh = playExhibitions();
  if (t >= SEASON_START && t <= SEASON_END) playWeekGames(t);
  if (t === 21) interleagueTitle();
  if (t === LG.asgT) allStar();
  if (G.week === 4 && t >= 15 && t <= 35) monthlyMvp();
  if (t === MAKEUP_TURN) { playMakeups(); seasonEnd(); }
  if (t >= 36 && t <= LG.postEnd) advancePost(t);
  if (t === LG.draftT) { if (!G.draft) startDraft(); if (G.draft.stage !== 'done') autoUserDraft(); else finishDraft(); }
  if (t === 42) faDecide(false);
  if (t === 43) faDecide(true);
  if (t === 45) aiForeignSignings();
  if (t === 46) aiTryouts();
  if (LG.mlb && (t === 2 || t === 9 || t === 20)) aiFreeAgentsMLB();
  // 共通の週次処理
  const weekRes = {}; for (const T of G.teams) { const s = snap[T.id]; const r = T.rec; weekRes[T.id] = { g: (r.w + r.l + r.d) - (s.w + s.l + s.d), w: r.w - s.w }; }
  weeklyDevelopment();
  weeklyInjuries();
  weeklyMorale(weekRes);
  weeklyFinance();
  weeklyFacilities();
  townWeekly();
  weeklyPopularity(weekRes);
  weeklyScouting();
  recordsWeekly();
  eventsWeekly();
  weeklyMLB();
  if (t >= SEASON_START && t <= MAKEUP_TURN) for (const T of G.teams) for (const p of rosterLv(T.id, 1)) p.w1 = (p.w1 || 0) + 1;
  for (const id in G.players) G.players[id].wkG = 0;
  aiWeekly();
  if (G.week === 4) monthClose();
  if (t === 47) yearEnd();
  // 日付を進める
  G.week++; if (G.week > 4) { G.week = 1; G.month++; if (G.month > 12) { G.month = 1; G.year++; } }
  phaseStart(curTurn());
  noteReminders(curTurn());
  // 週の報告
  const ut = G.user.tid;
  for (const id of G.boxOrder) { const b = G.boxes[id]; if (b && id >= g0) report.games.push(id); }
  const s = snap[ut]; const r = uT().rec;
  report.w = r.w - s.w; report.l = r.l - s.l; report.d = r.d - s.d;
  report.rev = yearTotal('rev') - finBefore.rev; report.exp = yearTotal('exp') - finBefore.exp;
  if (t === 47) { report.rev = null; report.exp = null; }
  report.cash = G.fin.cash - finBefore.cash;
  report.news = G.news.slice(0, G.news.length - report.news0).filter(n => (n.imp || n.tid === ut) && !n.nt).slice(0, 12);
  report.notes = notesSince(report.note0).map(n => n.id);
  if (G.celeQ && G.celeQ.length > 8) G.celeQ.splice(0, G.celeQ.length - 8);
  G.weekly = report;
  touch();
  return report;
}
function seasonEnd() {
  if (LG.mlb) return seasonEndMLB();
  for (const T of G.teams) { T.lastPct = pctOf(T.rec); }
  for (let lg = 0; lg < 2; lg++) standings(lg).forEach(x => { x.t.lastRank = x.rank; if (x.rank === 1) { x.t.titles.lg++; x.t.pop = clamp(x.t.pop + 2, 0, 99); x.t.popBonus = (x.t.popBonus || 0) + 6; } if (x.rank <= 3) x.t.popBonus = (x.t.popBonus || 0) + 1.5; if (x.rank === 6) x.t.popBonus = (x.t.popBonus || 0) - 2; });
  for (const id in G.players) { const p = G.players[id]; p.sTeam = p.team; if ((p.w1 || 0) >= 12) p.svc++; p.w1 = 0; }
  decideTitles();
  seasonRecordsEnd();
  titleCelebrate();
  const ut = G.user.tid; const rk = uT().lastRank;
  if (rk === 1) { addNews('post', `${tName(ut)}がリーグ優勝！`, { important: true, tid: ut }); book('rev', 'prize', 10000); }
  else addNews('league', `公式戦が終了。${tName(ut)}は${LEAGUES[uT().league]}${rk}位でした`, { important: true, tid: ut });
  startPost();
}
function phaseStart(t) {
  const ut = G.user.tid;
  if (t === 0) newYearStart();
  if (t === 4) {
    // 支配下70人・育成40人の上限を超えていたら整理
    for (const T of G.teams) {
      let sh = shihai(T.id);
      if (sh.length > LIM.shihai) { const cut = sortBy(sh, p => pVal(p, T.id)).slice(0, sh.length - LIM.shihai); for (const p of cut) releasePlayer(p, !isUser(T.id)); if (isUser(T.id)) addNews('contract', `支配下登録が上限を超えていたため、${cut.length}人と契約を解除しました`, { important: true, tid: ut }); }
      const ik = rosterLv(T.id, 3);
      if (ik.length > LIM.ikusei) for (const p of sortBy(ik, p => pVal(p, T.id)).slice(0, ik.length - LIM.ikusei)) releasePlayer(p, true);
      autoRoster(T.id);
    }
    startCamp();
  }
  if (t === 8) endCamp();
  if (t === SEASON_START) {
    for (const T of G.teams) { autoRoster(T.id); T.rotIdx = 0; }
    for (const id in G.players) { G.players[id].ls = -99; G.players[id].rel = null; }
    computeSimCenter();
    monthSnap();
    prunePool();
    addNews('league', `${G.year}年のペナントレースが開幕！`, { important: true });
  }
  if (t === 16 && !LG.mlb) genForeign(5);
  if (t === LG.draftT) startDraft();
  if (t === 20 || t === 22 || t === 29) phenomBuzz(t);
  if (t === 46 && LG.mlb) mlbLottery();
  if (t === 30 || t === 32 || t === 34) titleRaceNotes();
  if (t === 32) retireAnnounce();
  if (t === SEASON_END) { titleSitCheck(); farewellWeek(); }
  if (t === MAKEUP_TURN) farewellDone();
  if (t === 40) {
    processRetirements();
    aiReleases();
    const back = LG.mlb ? [] : mlbSeasonEnd();
    declareFA(back);
    postingRequests();
  }
  if (t === 41) { aiFABids(); if (G.fallCamp.on) { book('exp', 'camp', 4000); addNews('camp', '秋季キャンプで若手が鍛錬中', { tid: ut }); } }
  if (t === 42) aiFABids();
  if (t === 43) { decideAwards(); if (LG.mlb) aiFABids(); }
  if (t === 44) {
    for (const c of (G.compPending || []).splice(0)) { payComp(c.to, ut, c.prev * (c.rank === 'A' ? 0.8 : 0.6)); }
    openRenewals();
    for (const T of G.teams) if (!isUser(T.id)) aiRenewals(T.id);
    sponsorYearEnd();
    G.foreign = G.foreign.filter(p => chance(0.3));
    genForeign(LG.mlb ? 16 : 14);
    G.naming.offers.push(...(G.naming.main ? [] : genNamingOffers('main')));
    refreshStaffPool();
  }
}

/* ---------- 年度末（12月第4週） ---------- */
/* 営業収支：設備投資・土地取得・親会社の支援・税を除いた本業の収支 */
function opNet() { const F = G.fin; return yearTotal('rev') - (F.y.rev.subsidy || 0) - (yearTotal('exp') - (F.y.exp.capex || 0) - (F.y.exp.land || 0) - (F.y.exp.tax || 0)); }
function subsidyCap() { const T = uT(); return Math.round(allowedDeficit() + (20000 + T.market * 10000) * (0.3 + G.owner.trust / 100) * POLICIES[G.user.policy].budget); }
function yearEnd() {
  winterLeague();
  skillYearly();
  archiveSeason();
  luxTaxYearEnd();
  applyContractsYearEnd();
  // 収支の締め
  const F = G.fin; const T = uT();
  const rev0 = yearTotal('rev') - (F.y.rev.subsidy || 0);
  const net0 = opNet();
  const review = ownerReview(net0);
  if (net0 < 0) { const cover = Math.min(-net0, subsidyCap()); if (cover > 0) { book('rev', 'subsidy', cover); review.subsidy = cover; } }
  if (net0 > 0) { const tax = Math.round(net0 * 0.3); book('exp', 'tax', tax); review.tax = tax; }
  review.capex = (F.y.exp.capex || 0) + (F.y.exp.land || 0);
  for (const l of F.loans) { const pay = Math.min(l.pay, l.bal); l.bal -= pay; F.cash -= pay; }
  F.loans = F.loans.filter(l => l.bal > 1);
  F.hist.push({ y: G.year, rev: Math.round(yearTotal('rev')), exp: Math.round(yearTotal('exp')), net: Math.round(yearTotal('rev') - yearTotal('exp')), op: Math.round(net0), y_rev: F.y.rev, y_exp: F.y.exp,
    att: F.att.tot, attG: F.att.g, fc: Math.round(G.fc.members), pop: r1(T.pop), rank: T.lastRank, cash: Math.round(F.cash), pay: Math.round(teamPayroll(T.id)) });
  F.lastRev = rev0; F.lastAtt = F.att.tot;
  G.hist.user.push({ y: G.year, rank: T.lastRank, w: T.rec.w, l: T.rec.l, d: T.rec.d, lg: G.post && G.post.lgChamp.includes(T.id), champ: G.post && G.post.champ === T.id, po: LG.mlb ? postResult(T.id) : null, att: F.att.tot, net: Math.round(yearTotal('rev') - yearTotal('exp')), trust: G.owner.trust });
  G.owner.review = review;
  if (G.user.ownerMode !== 'none' && G.owner.trust <= (G.user.ownerMode === 'hard' ? 10 : 5)) {
    G.gameOver = { y: G.year, why: 'オーナーの信頼を失い、球団社長を解任されました' };
    addNews('owner', 'オーナー会議の結果、球団社長の解任が決まりました', { important: true, tid: T.id });
  }
  adjustGrowth();
  staffYearEnd();
  namingYearEnd();
  for (const T2 of G.teams) { if (!isUser(T2.id)) { T2.payBudget = aiPayBudget(T2); T2.facLv = clamp(T2.facLv + (chance(0.15) ? 1 : 0), 1, 5); } }
  newYear();
}
function expectedRank() { const st = uT().star; const pol = G.user.policy; let e = (LG.mlb ? [0, 1.5, 2, 3, 3.5, 4][st] : [0, 2, 3, 3.5, 4.5, 5][st]); if (pol === 'win') e -= 1; if (pol === 'dev') e += 0.5; return Math.round(clamp(e, 1, LG.mlb ? 5 : 6)); }
function expectedNet() { const st = uT().star; return (LG.mlb ? [0, 60000, 40000, 15000, 0, -20000] : [0, 200000, 100000, 30000, -60000, -90000])[st] * (G.user.policy === 'profit' ? 1.2 : 1) + (G.user.policy === 'profit' ? 30000 : 0); }
function allowedDeficit() { const st = uT().star; return Math.round([0, 0, 0, 30000, 60000, 90000][st] * POLICIES[G.user.policy].budget); }
function ownerReview(net) {
  const T = uT(); const F = G.fin; const pol = G.user.policy;
  const rank = T.lastRank; const champ = G.post && G.post.champ === T.id; const lgc = G.post && G.post.lgChamp.includes(T.id);
  let d = 0; const notes = [];
  if (champ) { d += 12; notes.push([LG.champ, 12]); }
  if (lgc) { d += 8; notes.push(['リーグ優勝', 8]); }
  if (LG.mlb && G.post && G.post.divChamp && G.post.divChamp.includes(T.id)) { d += 4; notes.push(['地区優勝', 4]); }
  else if (LG.mlb && G.post && G.post.field && G.post.field.includes(T.id)) { d += 3; notes.push(['ポストシーズン進出', 3]); }
  const exp = expectedRank();
  const rv = Math.round(clamp((exp - rank) * (pol === 'win' ? 2.5 : pol === 'dev' ? 1.2 : 2), -10, 8));
  if (!lgc || rv > 0) { d += rv; notes.push([rankStr(rank) + '（期待は' + exp + '位前後）', rv]); }
  const allow = allowedDeficit();
  const expNet = expectedNet();
  const fv = Math.round(clamp((net - expNet) / 100000 * 3, -10, 5)); d += fv; notes.push([net >= expNet ? (net >= 0 ? '黒字経営' : '赤字は許容範囲内') : (net >= 0 ? '黒字だが目標に届かず' : '想定以上の赤字'), fv]);
  const pv = Math.round(clamp((T.pop - G.owner.startPop) * 0.5, -6, 6)); if (pv) { d += pv; notes.push([pv > 0 ? '人気が上昇' : '人気が低下', pv]); }
  if (F.lastAtt) { const av = Math.round(clamp((F.att.tot / F.lastAtt - 1) * 25, -5, 5)); if (av) { d += av; notes.push([av > 0 ? '観客動員が増加' : '観客動員が減少', av]); } }
  const pl = planYearCheck(); if (pl.d) { d += pl.d; notes.push(...pl.notes); }
  if (G.fin.cash < 0) { const v = -Math.min(10, Math.round(-G.fin.cash / 100000 * 2) + 2); d += v; notes.push(['資金繰りの悪化', v]); }
  const over = (G.fin.capexY || 0) - G.budget.capex; if (over > 20000) { const v = -Math.min(5, Math.round(over / 50000) + 1); d += v; notes.push(['設備投資が予算超過', v]); }
  const om = CUSTOM_OWNER[G.user.ownerMode || 'normal'] || CUSTOM_OWNER.normal;
  if (om.k !== 1) { for (const n of notes) if (n[1] < 0) n[1] = Math.round(n[1] * om.k); d = sum(notes, n => n[1]); }
  G.owner.trust = clamp(60 + (G.owner.trust - 60) * 0.9 + d, 0, 100);
  G.owner.startPop = T.pop;
  return { y: G.year, d, notes, net, trust: G.owner.trust };
}
function newYear() {
  const ny = G.year + 1;
  for (const T of G.teams) { T.rec = blankRec(); T.att = { g: 0, tot: 0 }; T.rotIdx = 0; T.dPicks = 0; T.ikPicks = 0; }
  newYearAging();
  for (const id in G.players) { const p = G.players[id]; p.rel = null; p.ls = -99; p.fat = 0; p.ms = p.ms || null; if (p.adapt > 0) p.adapt = 0; }
  G.post = null; G.draft = null; G.awards = null; G.seasonTitles = null;
  G.faMarket = [];
  G.town.visitY = 0;
  G.fin.y = { rev: {}, exp: {} }; G.fin.att = { g: 0, tot: 0, max: 0, sell: 0, list: [] }; G.fin.capexY = 0; G.fin.projY = 0; G.fin.rainouts = 0;
  G.flags.foodBoost = 0;
  G.camp = null;
  if (G.stad.honey > 1) G.stad.honey = Math.max(1, G.stad.honey - 0.08);
  G.stad.age = (G.stad.age || 0) + 1;
  G.yearPending = ny;
}
/* advanceWeekで年が進んだ直後（1月第1週）に呼ばれる */
function newYearStart() {
  if (!G.yearPending) return;
  G.yearPending = 0;
  if (G.project && G.project.ready) openNewStadium();
  genSchedule();
  if (!LG.mlb || !G.prospects.length) genDraftClass();
  fcRenewal();
  hofVote();
  G.budget = Object.assign(defaultBudget(uT()), G.budget);
  if (G.plan.end < G.year) { G.plan = { goals: [], start: G.year, end: G.year + 2, set: false }; }
  addNews('owner', `${G.year}年が始まりました。予算と中期計画を確認しましょう`, { important: true, tid: G.user.tid });
}

/* ---------- 中期計画 ---------- */
const GOALS = {
  pennant: { n: 'リーグ優勝', d: '計画期間中に一度リーグ優勝する', r: 10, kind: 'once' },
  gs: { n: '日本一', d: '計画期間中に一度日本一になる', r: 14, kind: 'once' },
  aclass: { n: '毎年Aクラス', d: '計画期間中、毎年3位以内に入る', r: 8, kind: 'every' },
  att: { n: '観客動員', d: '年間観客動員の目標を達成する', r: 6, kind: 'once', tgt: () => Math.round(Math.max(G.fin.lastAtt || 0, capOf(G.user.tid) * 60) * 1.12 / 10000) * 10000, fmt: v => fmtPeople(v) },
  fc: { n: 'ファンクラブ会員', d: '会員数の目標を達成する', r: 6, kind: 'once', tgt: () => Math.round(G.fc.members * 1.35 / 1000) * 1000, fmt: v => fmtPeople(v) },
  profit: { n: '毎年黒字', d: '親会社の支援なしで毎年、営業黒字にする（設備投資は除く）', r: 8, kind: 'every' },
  pop: { n: '人気', d: '人気の目標を達成する', r: 6, kind: 'once', tgt: () => Math.min(95, Math.round(uT().pop + 8)), fmt: v => v },
  town: { n: '街の賑わい', d: '街の賑わいの目標を達成する', r: 6, kind: 'once', tgt: () => Math.round(G.town.stat.vib + 30), fmt: v => v },
  homegrown: { n: '生え抜きの主力', d: '生え抜き選手を規定打席・規定投球回に5人以上', r: 7, kind: 'once' },
  stadium: { n: '新球場の完成', d: '計画期間中に新球場を完成させる', r: 12, kind: 'once' }
};
function setPlan(keys) {
  G.plan.goals = keys.slice(0, 3).map(k => ({ k, tgt: GOALS[k].tgt ? GOALS[k].tgt() : null, st: 'open' }));
  G.plan.set = true;
  addNews('owner', `中期計画（${G.plan.start}〜${G.plan.end}年）を策定：${G.plan.goals.map(g => GOALS[g.k].n).join('、')}`, { tid: G.user.tid });
}
function goalProgress(g) {
  const T = uT();
  switch (g.k) {
    case 'pennant': return LG.mlb ? (G.post && G.post.lgChamp.includes(T.id) ? 1 : 0) : (T.lastRank === 1 && G.post ? 1 : 0);
    case 'gs': return G.post && G.post.champ === T.id ? 1 : 0;
    case 'aclass': return LG.mlb ? (inPostField(T.id) ? 1 : 0) : (teamRank(T.id) <= 3 ? 1 : 0);
    case 'att': return G.fin.att.tot / g.tgt;
    case 'fc': return G.fc.members / g.tgt;
    case 'profit': return opNet() >= 0 ? 1 : 0;
    case 'pop': return T.pop / g.tgt;
    case 'town': return G.town.stat.vib / g.tgt;
    case 'homegrown': return roster(T.id).filter(p => p.orig === T.id && (isP(p) ? qualified(p, 'pit') : qualified(p, 'bat'))).length / 5;
    case 'stadium': return G.flags.newStadium ? 1 : (G.project ? 1 - G.project.wk / G.project.tot : 0) * 0.99;
  }
  return 0;
}
function planYearCheck() {
  let d = 0; const notes = [];
  if (!G.plan.set) { d -= 2; notes.push(['中期計画が未策定', -2]); return { d, notes }; }
  const last = G.year >= G.plan.end;
  for (const g of G.plan.goals) {
    if (g.st !== 'open') continue;
    const def = GOALS[g.k]; const ok = goalProgress(g) >= 1;
    if (def.kind === 'every') { if (!ok) { g.st = 'fail'; d -= Math.round(def.r / 2); notes.push([def.n + '（未達）', -Math.round(def.r / 2)]); } else if (last) { g.st = 'done'; d += def.r; notes.push([def.n + '（達成）', def.r]); } }
    else if (ok) { g.st = 'done'; d += def.r; notes.push([def.n + '（達成）', def.r]); }
    else if (last) { g.st = 'fail'; d -= Math.round(def.r / 2); notes.push([def.n + '（未達）', -Math.round(def.r / 2)]); }
  }
  return { d, notes };
}

/* ---------- やること一覧（ホーム画面用） ---------- */
function userTasks() {
  const t = curTurn(); const ut = G.user.tid; const out = [];
  const add = (k, text, go, urgent) => out.push({ k, t: text, go, urgent: !!urgent });
  if (G.gameOver) add('over', G.gameOver.why, 'records', true);
  if (t <= 3 && !G.plan.set) add('plan', '中期計画（3か年の目標）を決めましょう', 'plan', true);
  if (t <= 3 && !G.camp) add('camp', LG.mlb ? '2月のスプリングトレーニングの場所と方針を決めましょう' : '2月の春季キャンプの場所と方針を決めましょう', 'camp', t === 3);
  if (t <= 2) add('budget', '今年の予算を確認しましょう', 'finance');
  const sh = shihai(ut).length;
  if (sh > LIM.shihai) add('limit', `支配下登録が${sh}人です。2月までに${LIM.shihai}人以内にしてください`, 'contracts', true);
  if (LG.mlb) { const mi = rosterLv(ut, 3).length; if (mi > LIM.ikusei) add('limit3', `マイナー契約の選手が${mi}人です。2月までに${LIM.ikusei}人以内にしてください`, 'contracts', t >= 0 && t <= 3); if (sh < 34 && t >= 44) add('few40', `40人枠が${sh}人です。マイナーの有望株を登録するか、補強しましょう`, 'contracts'); }
  const f1 = rosterLv(ut, 1);
  if (f1.length > LIM.first) add('first', `1軍登録が${f1.length}人です（上限${LIM.first}人）`, 'roster', true);
  if (!LG.mlb && firstFrnCount(ut) > LIM.frn1) add('frn', `1軍の外国人が${firstFrnCount(ut)}人です（上限4人）`, 'roster', true);
  const inj1 = f1.filter(p => p.injW > 0);
  if (inj1.length) add('inj', `1軍に故障者が${inj1.length}人います`, 'roster');
  if (f1.length < LIM.first - (LG.mlb ? 1 : 4) && t >= SEASON_START && t <= 38) add('few', `1軍登録が${f1.length}人と少なくなっています`, 'roster');
  if (G.pending.length) add('event', `判断が必要な出来事が${G.pending.length}件あります`, 'event', true);
  if (G.compPending && G.compPending.length) add('comp', 'FA移籍の補償（金銭か人的補償か）を選んでください', 'fa', true);
  if (t === LG.draftT && G.draft && G.draft.stage !== 'done') add('draft', LG.mlb ? 'ドラフトが開かれています' : 'ドラフト会議が開かれています', 'draft', true);
  if (LG.mlb ? (t >= 20 && t < LG.draftT) : (t >= 33 && t <= 38)) add('draftprep', LG.mlb ? '7月第3週はドラフト。指名候補を確認しましょう' : '10月第4週はドラフト会議。指名候補を確認しましょう', 'scout');
  if (t >= 40 && t <= 43 && G.faMarket.some(f => !f.done)) add('fa', `FA市場に${G.faMarket.filter(f => !f.done).length}人。獲得交渉ができます`, 'fa');
  if (t === 40) add('release', '戦力外通告の時期です。来季の構想から外れる選手を整理しましょう', 'contracts');
  if (t >= 44 && t <= 47) { const n = renewalList().length; if (n) add('renew', `契約更改が${n}人残っています（12月第4週で締切）`, 'contracts', t >= 46); }
  if (t >= 44 || t <= 1) if (G.foreign.length) add('frn2', LG.mlb ? '日本や韓国などの海外選手を獲得できます' : '外国人選手の補強を検討できます', 'foreign');
  if (G.sponsors.offers.length) { const rn = G.sponsors.offers.filter(o => o.renew).length; add('sponsor', `スポンサー・広告の提案が${G.sponsors.offers.length}件届いています${rn ? `（うち契約更新${rn}件）` : ''}。広告料は交渉できます`, 'sponsor'); }
  if (G.naming.offers.length) add('naming', `ネーミングライツの提案が${G.naming.offers.length}件届いています`, 'sponsor');
  if (G.fin.cash < 0) add('cash', '資金がマイナスです。融資や経費削減を検討してください', 'finance', true);
  if (G.owner.trust < 20) add('trust', 'オーナーの信頼が低下しています', 'plan', true);
  if (t >= 40 && G.user.lastSeenWinter !== G.year && t <= 46) add('winter', '若手をウィンターリーグへ派遣できます（12月）', 'training');
  if (!LG.mlb && (G.mlbTry || []).some(x => isUser(x.from))) add('mlb', 'メジャー球団と交渉中の選手がいます。結果はお知らせで届きます', 'fa');
  if (LG.mlb ? (t >= 14 && t < LG.draftT) : (t >= 28 && t <= 38)) { const ph = phenomOf(); if (ph) add('phenom', `「10年に一度の逸材」${ph.name}（${ph.pr.school}）がドラフト候補にいます`, 'scout'); }
  if (G.week <= 2) {
    const pm = G.month === 1 ? 12 : G.month - 1;
    const season = Object.entries(TOWN_EVENTS).filter(([k, d]) => d.months && d.months.includes(G.month) && !d.months.includes(pm) && eventCanHost(k).ok);
    if (season.length) { add('townev', `${season.map(([k, d]) => d.n).join('・')}を開ける時期です。街に人を呼びましょう`, 'town'); out[out.length - 1].tab = 'ev'; }
  }
  return out;
}

/* ---------- セーブ／ロード ---------- */
const SAVE_KEY = 'kyudan_shacho_v1_';
function serialize() {
  return JSON.stringify({ G, RNG }, (k, v) => {
    if (k && k[0] === '_') return undefined;
    if (typeof v === 'number' && !Number.isInteger(v)) return Math.round(v * 100) / 100;
    return v;
  });
}
function deserialize(str) {
  const o = JSON.parse(str);
  G = o.G; RNG = o.RNG >>> 0 || 1;
  setLeague(G.mode || 'npb');
  NAMESET = new Set();
  for (const id in G.players) NAMESET.add(G.players[id].name);
  for (const p of G.prospects) NAMESET.add(p.name);
  for (const p of G.foreign) NAMESET.add(p.name);
  for (const m of G.mlbAway || []) NAMESET.add(m.p.name);
  migrateSave();
  touch();
  return G;
}
/* 古いセーブを今の仕組みに合わせる */
function migrateSave() {
  setLeague(G.mode || 'npb'); G.mode = LG.mode;
  for (const T of G.teams) { T.titles = T.titles || { lg: 0, gs: 0 }; if (T.titles.div == null) T.titles.div = 0; if (T.div == null) T.div = 0; }
  G.notes = G.notes || []; G.noteSeq = G.noteSeq || 0; G.mlbTry = G.mlbTry || []; G.mlbAway = G.mlbAway || []; G.mlb = G.mlb || [];
  G.celeQ = G.celeQ || [];
  if (!G.recs) seedHistory(true);
  if (G.user) { if (G.user.noteStop == null) G.user.noteStop = true; if (G.user.noteToast == null) G.user.noteToast = true; if (G.user.osNote == null) G.user.osNote = false; }
  const all = Object.values(G.players).concat(G.prospects || [], G.foreign || [], G.mlbAway.map(m => m.p));
  // 球速の水準をリーグに合わせる前のセーブ（メジャー版は日本より速い）
  if (!G.velV) { const dv = LG.velAdd || 0; if (dv) for (const p of all) if (isP(p) && p.a && p.a.vel != null) { p.a.vel += dv; if (p.cap && p.cap.vel != null) p.cap.vel += dv; } G.velV = 1; }
  for (const p of all) {
    if (!p.sub || !p.sx) genSubs(p);
    if (!p.sk) genSkills(p, p.gen ? 1 : 0);
    if (p.prac === undefined) p.prac = null;
  }
  if (G.town) { computeTownStats(); if (G.town.stageMax == null) { G.town.stageMax = townStage().i; G.town.stageLog = []; } }
  const S = G.sponsors; if (!S) return;
  S.ng = S.ng || {}; S.sol = S.sol || {};
  S.offers = S.offers.filter(o => SPONSOR_SLOTS[o.slot]);
  for (const o of S.offers) dealEnsure('sp', o);
  for (const o of G.naming.offers) dealEnsure('nm', o);
}
function saveSlot(slot) {
  try { localStorage.setItem(SAVE_KEY + slot, serialize()); localStorage.setItem(SAVE_KEY + slot + '_meta', JSON.stringify({ t: Date.now(), team: tName(G.user.tid), date: nowStr(), name: G.user.name })); return true; }
  catch (e) { return false; }
}
function loadSlot(slot) {
  try { const s = localStorage.getItem(SAVE_KEY + slot); if (!s) return false; deserialize(s); return true; } catch (e) { return false; }
}
function slotMeta(slot) { try { const s = localStorage.getItem(SAVE_KEY + slot + '_meta'); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function deleteSlot(slot) { try { localStorage.removeItem(SAVE_KEY + slot); localStorage.removeItem(SAVE_KEY + slot + '_meta'); } catch (e) { } }
