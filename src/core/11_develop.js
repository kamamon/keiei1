/* =========================================================
   育成：成長・衰え・キャンプ・故障・やる気・調子
   ========================================================= */
const PHYS = { pow: 1, spd: 1, arm: 1, vel: 1, sta: 1 };
const BAT_GRP = { con: 'bat', pow: 'bat', eye: 'bat', fld: 'fld', arm: 'fld', spd: 'fld' };

/* チームごとの成長係数（毎週計算） */
function growCtx(tid) {
  const t = curTurn();
  const user = isUser(tid);
  const T = G.teams[tid];
  const ctx = { team: tid, user, mult: 1, camp: null };
  // 時期: 2月=キャンプ、11〜1月=自主トレ（控えめ）
  let season = 1;
  if (t >= 4 && t <= 7) season = 2.0;
  else if (t >= 40 || t <= 3) season = 0.5;
  else if (t >= 36) season = 0.7;
  ctx.season = season;
  if (user) {
    const mg = uStaff('mgr'); const hd = uStaff('head');
    ctx.mult = (0.9 + (mg ? mg.dev : 40) / 100 * 0.2) * (1 + (hd ? hd.abil - 50 : -10) * 0.001);
    ctx.mult *= 0.9 + 0.1 * clamp(G.budget.dev / 30000, 0, 2.5);
    ctx.mult *= TRAIN_INT[G.user.train].grow;
    if (G.user.policy === 'dev') ctx.mult *= 1.10;
    ctx.mult *= 1 + facMult('team', 'gym') * 0.04 + facMult('team', 'analytics') * 0.02;
    ctx.cBat = 0.75 + coach('bat') / 100 * 0.5; ctx.cPit = 0.75 + coach('pit') / 100 * 0.5; ctx.cFld = 0.75 + coach('fld') / 100 * 0.5;
    ctx.cFarm = 0.75 + coach('farm') / 100 * 0.5; ctx.cIk = 0.75 + coach('ikusei') / 100 * 0.5;
    ctx.fIndoor = 1 + facMult('team', 'indoor') * 0.04; ctx.fPen = 1 + facMult('team', 'bullpen') * 0.05;
    ctx.fFarm = 1 + facMult('team', 'farm') * 0.05; ctx.fDorm = 1 + facMult('team', 'dorm') * 0.05;
    if (t >= 4 && t <= 7 && G.camp) {
      const site = CAMP_SITES[G.camp.site], th = CAMP_THEMES[G.camp.theme], it = CAMP_INT[G.camp.int];
      ctx.camp = { site, th, it, guest: G.camp.guest };
      ctx.mult *= site.grow * it.grow * (G.camp.guest ? 1.06 : 1);
    }
    if ((t === 41 || t === 42) && G.fallCamp && G.fallCamp.on) ctx.fall = G.fallCamp.theme;
  } else {
    const m = T.mgr; const lv = T.facLv || 2;
    ctx.mult = (0.9 + m.dev / 100 * 0.2) * (0.92 + lv * 0.04);
    ctx.cBat = ctx.cPit = ctx.cFld = ctx.cFarm = ctx.cIk = 0.9 + lv * 0.04;
    ctx.fIndoor = ctx.fPen = ctx.fFarm = ctx.fDorm = 1 + lv * 0.02;
    if (t >= 4 && t <= 7) ctx.mult *= 1.06;
    if (t === 41 || t === 42) ctx.fall = 'balance';
  }
  ctx.mult *= G.growAdj || 1;
  return ctx;
}
function growPlayer(p, ctx) {
  const g = GT[p.gt]; const age = p.age;
  const ageMul = age <= g.g ? (age <= 20 ? 1.1 : 1.0) : age <= g.p ? 0.35 : 0;
  const keys = isP(p) ? PIT_KEYS : BAT_KEYS;
  const per = PERS[p.per].grow || 1;
  const morF = 0.8 + p.mor / 100 * 0.4;
  let playF = 1;
  if (ctx.team != null) {
    if (p.lv === 1) playF = isP(p) ? (p.wkG >= 1 ? 1.1 : 0.9) : (p.wkG >= 4 ? 1.15 : p.wkG <= 1 ? 0.85 : 1);
    else if (p.lv === 3) playF = 0.92;
  }
  const season = ctx.season || 1;
  const base = 0.15 * (ctx.mult || 1) * per * morF * playF * season * (p.injW > 0 ? 0.3 : 1) * (p.gen ? 1.15 : 1) * (p.prac ? 0.94 : 1);
  const lvF = ctx.team == null ? 1 : p.lv === 1 ? 1 : p.lv === 2 ? (ctx.cFarm || 1) * (ctx.fFarm || 1) : (ctx.cIk || 1) * (ctx.fFarm || 1);
  const dorm = age <= 23 ? (ctx.fDorm || 1) : 1;
  let gain = 0;
  for (const k of keys) {
    const cur = p.a[k], cap = p.cap[k];
    if (ageMul > 0 && cur < cap) {
      const room = (cap - cur) / (k === 'vel' ? 4 : 15);
      let inc = base * ageMul * Math.pow(clamp(room, 0, 1), 0.8) * rf(0.4, 1.6) * lvF * dorm;
      if (p.lv === 1) inc *= isP(p) ? (ctx.cPit || 1) * (ctx.fPen || 1) : (BAT_GRP[k] === 'bat' ? (ctx.cBat || 1) * (ctx.fIndoor || 1) : (ctx.cFld || 1));
      else if (isP(p)) inc *= ctx.fPen ? 1 + (ctx.fPen - 1) * 0.5 : 1;
      if (p.focus) inc *= p.focus === k ? 1.6 : 0.85;
      if (ctx.camp) {
        const th = ctx.camp.th;
        if (th.keys) inc *= th.keys.includes(k) ? 1.5 : 0.85;
        if (th.youth) inc *= age <= 24 ? 1.4 : 0.85;
      }
      if (ctx.fall && age <= 25) inc *= ctx.fall === 'balance' ? 1.5 : (CAMP_THEMES[ctx.fall].keys && CAMP_THEMES[ctx.fall].keys.includes(k) ? 2.0 : 1.3);
      if (k === 'vel') inc *= 0.25;
      p.a[k] = Math.min(cap, cur + inc);
      gain += k === 'vel' ? inc * 2.5 : inc;
    }
    if (age > g.p) {
      const yrs = age - g.p;
      let dec = (PHYS[k] ? 0.035 : 0.02) * Math.pow(yrs, 0.8) * rf(0.5, 1.5) * (ctx.season === 2 ? 0.5 : 1);
      if (k === 'vel') dec *= 0.35;
      p.a[k] = Math.max(k === 'vel' ? 118 : 5, p.a[k] - dec);
      gain -= k === 'vel' ? dec * 2.5 : dec;
    }
  }
  p.grow = (p.grow || 0) + gain;
}
const GRADE_ORDER = 'GFEDCBAS';
function weeklyDevelopment() {
  for (const T of G.teams) {
    const ctx = growCtx(T.id);
    for (const p of roster(T.id)) {
      growPlayer(p, ctx);
      if (p.age <= 27 && chance(p.gen ? 0.0015 : 0.0005) && potv(p) - ovr(p) >= 8) breakout(p);
      if (p.adapt && curTurn() >= SEASON_START) p.adapt = p.adapt > 0 ? Math.max(0, p.adapt - 0.05) : Math.min(0, p.adapt + 0.18);
    }
  }
  weeklyPractice();
  gradeUpNotes();
}
/* 自球団の選手の総合評価が上の段階（C以上）に上がったら知らせる */
function gradeUpNotes() {
  let n = 0;
  for (const p of roster(G.user.tid)) {
    const g = grade(ovr(p));
    if (p.og && GRADE_ORDER.indexOf(g) > GRADE_ORDER.indexOf(p.og) && GRADE_ORDER.indexOf(g) >= 4 && n < 3) { n++; notify('dev', `${p.name}の総合力が${p.og}から${g}に上がりました（${ovr(p)}）`, { pid: p.id, go: 'training' }); }
    p.og = g;
  }
}
function breakout(p) {
  const keys = shuffle((isP(p) ? PIT_KEYS : BAT_KEYS).slice()).slice(0, 3);
  for (const k of keys) { const inc = k === 'vel' ? rf(1.5, 3.5) : rf(3, 6); p.cap[k] = Math.min(k === 'vel' ? 166 : 99, p.cap[k] + inc * 0.35); p.a[k] = Math.min(p.cap[k], p.a[k] + inc); }
  p.mor = clamp(p.mor + 10, 0, 100);
  if (isUser(p.team)) addNews('dev', `${p.name}が覚醒！ ${keys.map(k => ATTR_JP[k]).join('・')}が大きく伸びました`, { important: true, tid: p.team, note: 'hi', pid: p.id });
}

/* ---------- 調子とやる気 ---------- */
function weeklyMorale(weekRes) {
  const t = curTurn(); const season = t >= SEASON_START && t <= MAKEUP_TURN;
  for (const T of G.teams) {
    const mg = teamMgr(T.id);
    const R = T.rec; const wp = (R.w + R.l) >= 8 ? pctOf(R) : 0.5;
    const hasLeader = rosterLv(T.id, 1).some(p => p.per === 'leader' && ovr(p) >= 60);
    const moodB = clamp(sum(rosterLv(T.id, 1), p => skFx(p).mood) * 1.5, -4, 4);
    const dorm = isUser(T.id) ? G.tfac.dorm.lv : (T.facLv || 2) * 0.6;
    for (const p of roster(T.id)) {
      let tg = 55 + (wp - 0.5) * (p.per === 'passion' ? 60 : 40) + ((mg.lead || 50) - 50) * 0.15 + (hasLeader ? 4 : 0) + moodB;
      if (season) {
        if (p.lv === 1 && p.wkG >= 3) tg += 8;
        else if (p.lv !== 1 && p.age >= 28 && ovr(p) >= 60) tg -= 10;
      }
      if (p.age <= 23) tg += dorm;
      if (p.ren && p.ren.st === 'hold') tg -= 10;
      if (p.postY === G.year && p.postRef) tg -= 20;
      const sp = p.per === 'mypace' ? 0.07 : p.per === 'shy' ? 0.25 : 0.14;
      p.mor = clamp(p.mor + (tg - p.mor) * sp + rn(0, 1.5), 5, 100);
      // 調子
      const vol = (p.per === 'genius' ? 0.18 : p.per === 'shy' ? 0.42 : 0.3) * (skFx(p).swing ? 1.6 : 1);
      if (chance(vol)) p.form = clamp(p.form + (chance(0.5 + (p.mor - 50) / 200) ? 1 : -1), -2, 2);
      else if (p.form !== 0 && chance(0.25)) p.form += p.form > 0 ? -1 : 1;
      // 疲労（野手）
      if (!isP(p)) p.fat = Math.max(0, p.fat - 8 - (p.lv !== 1 ? 20 : 0));
    }
  }
}
function batterFatigue(res) {
  for (const id of res.bp) { const p = P_(id); if (p) p.fat = Math.min(100, p.fat + (p.pos === 'C' ? 4 : 2.2)); }
}

/* ---------- 故障 ---------- */
function injMult(p) {
  let m = (0.4 + p.inj / 80) * (1 + (p.fat || 0) / 150);
  if (p.team >= 0 && isUser(p.team)) {
    m *= 1 - facMult('team', 'medical') * 0.05 - facMult('team', 'gym') * 0.03 - facMult('stad', 'turf') * 0.03;
    m *= 1 - (coach('cond') - 50) * 0.004;
    m *= TRAIN_INT[G.user.train].inj;
    if (G.camp && G.camp.theme === 'stamina' && G.camp.done) m *= 0.85;
    const t = curTurn(); if (t >= 4 && t <= 7 && G.camp) m *= CAMP_SITES[G.camp.site].inj * CAMP_INT[G.camp.int].inj;
  } else if (p.team >= 0) m *= 1.05 - (G.teams[p.team].facLv || 2) * 0.03;
  return clamp(m, 0.15, 3);
}
function injure(p, mult) {
  const pool = INJURIES.filter(x => !(x.pit && !isP(p)) && !(x.bat && isP(p)));
  const inj = wpick(pool, x => x.p * (x.w[1] >= 12 ? mult : 1));
  const w = ri(inj.w[0], inj.w[1]);
  p.injW = w; p.injN = inj.n; p.form = Math.min(p.form, 0);
  if (inj.perm) { if (isP(p)) { p.a.vel = Math.max(120, p.a.vel - rf(1, 3)); p.cap.vel = Math.max(p.a.vel, p.cap.vel - 2); } else p.a.spd -= 3; }
  if (p.team >= 0) {
    if (isUser(p.team) && p.lv === 1) addNews('injury', `${p.name}が${inj.n}で離脱（全治${w}週間）`, { important: w >= 4, tid: p.team, note: w >= 4 ? 'hi' : true, pid: p.id });
    if (p.lv === 1) { if (isUser(p.team) && !G.user.autoSwap) { /* ユーザーに任せる */ } else swapInjured(p.team); }
    touch();
  }
}
function gameInjuries(res) {
  for (const id of res.bp) { const p = P_(id); if (p && p.injW === 0 && chance(0.0016 * injMult(p))) injure(p, injMult(p)); }
  for (const x of res.pp) { const p = P_(x.id); if (p && p.injW === 0 && chance((x.sp ? 0.006 : 0.0025) * injMult(p) * (x.pc > 115 ? 1.5 : 1))) injure(p, injMult(p)); }
  batterFatigue(res);
}
function weeklyInjuries() {
  const t = curTurn(); const camp = t >= 4 && t <= 7;
  for (const T of G.teams) for (const p of roster(T.id)) {
    if (p.injW > 0) {
      let rec = 1;
      if (isUser(T.id)) rec += facMult('team', 'medical') * 0.08 + G.town.stat.heal + (coach('cond') - 50) * 0.004;
      else rec += (T.facLv || 2) * 0.05;
      p.injW = Math.max(0, p.injW - rec);
      if (p.injW < 0.5) { const nm = p.injN; p.injW = 0; p.injN = ''; if (isUser(T.id) && p.lv === 1) touch(); if (isUser(T.id)) { p.recovered = G.year * 100 + t; if (p.lv !== 3 || ovr(p) >= 50) notify('injury', `${p.name}が${nm ? nm + 'から' : '故障から'}復帰しました${p.lv === 1 ? '' : '（いまは2軍）'}`, { pid: p.id, go: 'roster' }); } }
    } else if (chance((camp ? 0.004 : 0.0018) * injMult(p))) injure(p, injMult(p));
  }
}

/* ---------- キャンプ（2月）・秋季キャンプ・ウィンターリーグ ---------- */
function defaultCampSite() { return LG.mlb ? 'arizona' : 'miyazaki'; }
function startCamp() {
  if (!G.camp) G.camp = { site: defaultCampSite(), theme: 'balance', int: 'normal', guest: false };
  if (!CAMP_SITES[G.camp.site]) G.camp.site = defaultCampSite();
  const site = CAMP_SITES[G.camp.site];
  book('exp', 'camp', site.cost + (G.camp.guest ? 2000 : 0));
  uT().pop = clamp(uT().pop + site.pop, 0, 99);
  if (site.frn) for (const p of roster(G.user.tid)) if ((p.frn || (LG.mlb && p.nat && p.nat !== 'US')) && p.adapt < 0) p.adapt = Math.min(0, p.adapt + 2);
  G.camp.started = true;
  addNews('camp', `春季キャンプ開始（${site.n}・${CAMP_THEMES[G.camp.theme].n}・${CAMP_INT[G.camp.int].n}）`, { tid: G.user.tid });
}
function endCamp() {
  if (!G.camp) return;
  G.camp.done = true;
  const top = roster(G.user.tid).filter(p => p.grow > 0).sort((a, b) => b.grow - a.grow).slice(0, 3);
  addNews('camp', `春季キャンプ打ち上げ。${top.map(p => p.name).join('、')}らが成長をアピール`, { tid: G.user.tid, note: true });
}
function winterLeague() {
  const W = G.winter || []; if (!W.length) return;
  for (const id of W) {
    const p = P_(id); if (!p || p.team !== G.user.tid) continue;
    const keys = shuffle((isP(p) ? PIT_KEYS : BAT_KEYS).slice()).slice(0, 3);
    for (const k of keys) { const inc = (k === 'vel' ? 0.8 : 2.5) * rf(0.6, 1.4); p.a[k] = Math.min(p.cap[k], p.a[k] + inc); }
    if (chance(0.12)) breakout(p);
  }
  addNews('dev', `ウィンターリーグに派遣した${W.length}人が実戦経験を積んで帰国`, { tid: G.user.tid, note: true, go: 'training' });
  G.winter = [];
}
function newYearAging() {
  for (const id in G.players) { const p = G.players[id]; p.age++; p.grow = 0; }
  for (const m of G.mlbAway || []) { m.p.age++; m.p.grow = 0; }
}

/* リーグ全体の水準を保つ（能力インフレ・デフレの自動補正） */
function leagueLevel() { let s = 0, n = 0; for (const T of G.teams) for (const p of rosterLv(T.id, 1)) { s += ovr(p); n++; } return n ? s / n : 62.5; }
function adjustGrowth() {
  const lv = leagueLevel();
  G.growAdj = clamp((G.growAdj || 1) * (1 - (lv - 66) * 0.04), 0.85, 1.15);
  G.lvHist = G.lvHist || []; G.lvHist.push({ y: G.year, lv: r1(lv), adj: r1(G.growAdj * 100) / 100 });
}
