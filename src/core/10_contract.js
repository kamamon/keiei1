/* =========================================================
   契約更改・自由契約・FA・トレード・外国人・トライアウト・ポスティング・引退
   p.ren = { st:'pending'|'signed'|'hold', dem, off, sal, yrs, tries }
   新しい年俸と年数は年末（12月第4週）に反映
   ========================================================= */
function salByWar(w) { w = Math.max(0, w); return 800 + w * 5500 + Math.max(0, w - 3) * 3500; }
function seasonPlayed(p) { return isP(p) ? p.st.outs >= 90 : p.st.pa >= 100; }
function marketPayFactor(tid) { const T = G.teams[tid]; return T ? 0.88 + T.market * 0.05 : 1; }
function evalTarget(p) {
  const o = ovr(p);
  let t = seasonPlayed(p) ? salByWar(war(p)) * 0.55 + valueSalary(o) * 0.45 : valueSalary(o) * 0.6;
  t *= marketPayFactor(p.team);
  t *= clamp(0.5 + p.svc * 0.15, 0.5, 1);
  if (p.frn) t *= 1.2;
  if (p.age >= 35) t *= 0.85;
  return t;
}
function minSal(p) { return p.lv === 3 ? MIN_SAL_IK : MIN_SAL; }
function reductionLimit(p) { return p.sal * (p.sal >= 10000 ? 0.6 : 0.75); }
function calcDemand(p) {
  const prev = Math.max(p.sal, minSal(p)); const t = evalTarget(p);
  let d = prev + (t - prev) * (t >= prev ? 0.7 : 0.45);
  d = clamp(d, prev * (prev >= 10000 ? 0.6 : 0.75), prev * 2.5 + 1000);
  d *= PERS[p.per].demand || 1;
  if (p.mor < 35) d *= 1.05;
  return roundSal(Math.max(d, minSal(p)));
}
function teamOffer(p) {
  const prev = Math.max(p.sal, minSal(p)); const t = evalTarget(p);
  let o = prev + (t - prev) * (t >= prev ? 0.5 : 0.7);
  o = clamp(o, prev * (prev >= 10000 ? 0.6 : 0.75), prev * 2.4 + 800);
  return roundSal(Math.max(o, minSal(p)));
}
function maxYears(p) { return (p.age >= 26 || p.svc >= 5) && p.lv !== 3 ? 5 : 1; }
function demandFor(p, yrs) { const d = p.ren.dem; if (yrs <= 1) return d; return roundSal(d * (p.age >= 31 ? (1 - 0.03 * (yrs - 1)) : (1 + 0.02 * (yrs - 1)))); }
function teamPayroll(tid, next) { return sum(roster(tid), p => next && p.ren && p.ren.st === 'signed' ? p.ren.sal : p.sal); }

function openRenewals() {
  for (const p of roster(G.user.tid)) {
    if (p.yrs <= 1 && !(p.ren && p.ren.st === 'signed')) p.ren = { st: 'pending', dem: calcDemand(p), off: teamOffer(p), yrs: 1, tries: 0 };
  }
}
function renewalList() { return roster(G.user.tid).filter(p => p.ren && p.ren.st !== 'signed' && !p.ren.rookie); }
function startExtension(p) {
  if (p.ren && p.ren.st === 'signed') return;
  p.ren = { st: 'pending', dem: roundSal(calcDemand(p) * (faEligibleSoon(p) ? 1.12 : 1.04)), off: teamOffer(p), yrs: Math.min(3, maxYears(p)), tries: 0, ext: true };
}
function faEligibleSoon(p) { const need = p.faUsed ? p.faUsed + 4 : 8; return !p.frn && p.svc + 1 >= need; }
function negotiate(p, offer, yrs) {
  const R = p.ren; if (!R || R.st === 'signed') return { res: 'none' };
  yrs = clamp(yrs || 1, 1, maxYears(p));
  const need = demandFor(p, yrs);
  const ratio = offer / need;
  let pAcc;
  if (ratio >= 1) pAcc = 1;
  else { const th = p.per === 'money' ? 0.9 : p.per === 'loyal' ? 0.8 : 0.85; pAcc = Math.pow(clamp((ratio - th) / (1 - th), 0, 1), 1.5); }
  if (offer < reductionLimit(p) && ratio < 1) pAcc *= 0.3;
  R.tries++; R.lastOff = offer;
  if (rnd() < pAcc) {
    R.st = 'signed'; R.sal = roundSal(offer); R.yrs = yrs;
    p.mor = clamp(p.mor + (ratio >= 1.05 ? 6 : ratio >= 1 ? 3 : -2), 0, 100);
    addNews('contract', `${p.name}が${fmtSal(R.sal)}${yrs > 1 ? '（' + yrs + '年契約）' : ''}で契約${R.ext ? '延長' : '更改'}`, { tid: G.user.tid });
    return { res: 'signed' };
  }
  p.mor = clamp(p.mor - 4, 0, 100);
  if (R.tries >= 3) { R.st = 'hold'; R.dem = roundSal(R.dem * 1.03); return { res: 'hold', need }; }
  return { res: 'refused', need };
}
function applyContractsYearEnd() {
  for (const T of G.teams) for (const p of roster(T.id)) {
    const R = p.ren;
    if (R && R.st === 'signed') { p.sal = R.sal; p.yrs = R.yrs; }
    else if (p.yrs <= 1) {
      if (R && isUser(T.id)) {
        const s = roundSal(((R.lastOff || R.off) + R.dem) / 2);
        p.sal = s; p.yrs = 1; p.mor = clamp(p.mor - 8, 0, 100);
        addNews('contract', `${p.name}は年俸調停の結果${fmtSal(s)}で決着`, { tid: T.id });
      } else { p.sal = calcDemand(p); p.yrs = 1; }
    } else p.yrs--;
    p.ren = null;
  }
}
function aiRenewals(tid) {
  const T = G.teams[tid];
  for (const p of roster(tid)) {
    if (p.yrs > 1 || (p.ren && p.ren.st === 'signed')) continue;
    const yrs = (p.age < 31 && ovr(p) >= 70 && chance(0.35)) ? ri(2, 4) : 1;
    p.ren = { st: 'signed', sal: roundSal(calcDemand(p) * rf(0.95, 1.02)), yrs };
  }
  // 予算オーバーなら割高なベテランを放出
  let over = teamPayroll(tid, true) - T.payBudget;
  if (over > 0) {
    const c = roster(tid).filter(p => p.ren && p.ren.st === 'signed' && !p.ren.faNew && p.ren.sal >= 5000 && p.yrs <= 1).sort((a, b) => pVal(a, tid) / a.ren.sal - pVal(b, tid) / b.ren.sal);
    for (const p of c.slice(0, 3)) { if (over <= 0) break; over -= p.ren.sal; releasePlayer(p, true); addNews('contract', `${tShort(tid)}が${p.name}を自由契約に`, {}); }
  }
}

/* ---------- 自由契約（戦力外） ---------- */
function releaseCost(p) {
  if (!isUser(p.team)) return 0;
  const t = curTurn(); const left = Math.max(0, 47 - t) / 48;
  const future = p.ren && p.ren.st === 'signed' && !p.ren.rookie ? p.ren.sal * p.ren.yrs : Math.max(0, p.yrs - 1) * p.sal;
  return Math.round(p.sal * left + future);
}
function releasePlayer(p, quiet) {
  const tid = p.team;
  if (isUser(tid)) { const c = releaseCost(p); if (c > 0) book('exp', 'payroll', c); }
  removeFromTeam(p);
  p.fa = { kind: 'free', from: tid, ask: roundSal(Math.max(MIN_SAL, marketSalary(p) * 0.6)), y: G.year };
  p.ren = null; p.yrs = 0; p.lv = 2; p.sal = 0;
  if (!G.fapool.includes(p.id)) G.fapool.push(p.id);
  if (!quiet && isUser(tid)) addNews('contract', `${p.name}に戦力外を通告しました`, { tid });
  touch();
}
function signFree(id) {
  const p = P_(id); const ut = G.user.tid;
  if (!p || p.team !== -1) return { ok: false, why: '契約できません' };
  if (shihai(ut).length >= LIM.shihai) return { ok: false, why: '支配下登録が70人に達しています' };
  if (curTurn() > 27 && curTurn() < 36) return { ok: false, why: '7月末以降は新たに支配下登録できません' };
  G.fapool = G.fapool.filter(x => x !== id);
  const ask = p.fa ? p.fa.ask : MIN_SAL;
  addToTeam(p, ut, 2);
  if (curTurn() >= 40) { p.sal = 0; p.ren = { st: 'signed', sal: ask, yrs: 1 }; } else { p.sal = ask; p.yrs = 1; }
  p.fa = null; p.mor = 70;
  addNews('contract', `${p.name}と年俸${fmtSal(ask)}で契約しました`, { tid: ut });
  touch();
  return { ok: true };
}
function promoteIkusei(p) {
  if (p.lv !== 3) return { ok: false };
  if (shihai(p.team).length >= LIM.shihai) return { ok: false, why: '支配下登録が70人に達しています' };
  if (curTurn() > 27 && curTurn() < 40) return { ok: false, why: '支配下登録は7月末までです' };
  p.lv = 2; p.ikusei = false; p.num = -1; assignNumber(p, p.team);
  if (p.sal < MIN_SAL) p.sal = MIN_SAL;
  if (p.ren && p.ren.sal < MIN_SAL) p.ren.sal = MIN_SAL;
  p.mor = clamp(p.mor + 15, 0, 100);
  if (isUser(p.team)) addNews('contract', `育成の${p.name}を支配下登録しました（背番号${p.num}）`, { tid: p.team, important: true });
  return { ok: true };
}

/* ---------- FA ---------- */
function faEligible(p) { const need = p.faUsed ? p.faUsed + 4 : 8; return !p.frn && p.svc >= need && p.yrs <= 1 && !(p.ren && p.ren.st === 'signed') && p.lv !== 3; }
function faRank(p) { const ss = shihai(p.team).filter(x => !x.frn).sort((a, b) => b.sal - a.sal); const i = ss.indexOf(p); return i < 3 ? 'A' : i < 10 ? 'B' : 'C'; }
function declareFA() {
  G.faMarket = []; G.compPending = G.compPending || [];
  for (const T of G.teams) for (const p of shihai(T.id)) {
    if (!faEligible(p)) continue;
    const o = ovr(p);
    if (p.svc >= 9 && p.age <= 33 && ((p.per === 'mlb' && o >= 72) || o >= 82) && chance(p.per === 'mlb' ? 0.6 : 0.2)) { leaveToMLB(p, '海外FA権を行使', 0); continue; }
    let pd = 0.07 + (o - 60) * 0.008;
    if (p.per === 'money') pd += 0.2; if (p.per === 'loyal') pd -= 0.1; if (p.mor < 40) pd += 0.15; if (p.age >= 34) pd -= 0.08; if (p.lv === 2 && o >= 60) pd += 0.1;
    if (teamRank(T.id) >= 5) pd += 0.05;
    if (!chance(clamp(pd, 0.01, 0.7))) continue;
    const rank = faRank(p);
    const ask = roundSal(Math.max(p.sal * 1.05, calcDemand(p) * 1.1));
    const askYrs = p.age <= 29 ? ri(3, 5) : p.age <= 32 ? ri(2, 4) : ri(1, 2);
    G.faMarket.push({ id: p.id, from: T.id, rank, ask, askYrs, offers: {}, done: false, prevSal: p.sal });
    p.fa = { kind: 'fa', from: T.id };
    removeFromTeam(p);
    addNews('fa', `${tShort(T.id)}の${p.name}（${POS_JP[p.pos]}・${p.age}歳）がFA権を行使（${rank}ランク）`, { important: isUser(T.id) || o >= 70, tid: T.id });
  }
}
function faNeed(T, p) {
  const tid = T.id; const o = ovr(p);
  if (isP(p)) {
    const ro = getRoles(tid); const rot = ro.rot.map(P_).filter(Boolean).map(spOvr).sort((a, b) => a - b);
    const weakest = rot.length >= 5 ? rot[0] : 40;
    return (p.pt === 'SP' ? spOvr(p) : rpOvr(p)) - weakest > 3 ? 0.35 : 0;
  }
  const lu = getLineup(tid); const same = lu.filter(x => fitPos(p, x.pos) >= 0.9);
  const weakest = same.length ? Math.min(...same.map(x => ovr(x.p))) : 40;
  return o - weakest > 3 ? 0.35 : 0;
}
function pendingFASpend(tid) { return sum(G.faMarket.filter(f => !f.done && f.offers[tid]), f => f.offers[tid].sal); }
function aiFABids() {
  for (const f of G.faMarket.filter(x => !x.done)) {
    const p = P_(f.id); if (!p) continue;
    for (const T of G.teams) {
      if (isUser(T.id) || f.offers[T.id]) continue;
      const room = T.payBudget - teamPayroll(T.id, true) - pendingFASpend(T.id);
      if (room < f.ask * 0.8) continue;
      const o = ovr(p);
      const base = (o - 62) / 20 + faNeed(T, p) + (f.from === T.id ? 0.35 : 0) + (T.market - 3) * 0.08 - (p.age >= 33 ? 0.2 : 0);
      if (!chance(clamp(base, 0, 0.85))) continue;
      f.offers[T.id] = { sal: roundSal(f.ask * rf(0.92, 1.12) * (1 + (T.market - 3) * 0.03)), yrs: clamp(f.askYrs + ri(-1, 1), 1, 5) };
    }
  }
}
function faUtility(p, f, o) {
  const T = G.teams[o.tid];
  const money = o.sal * Math.pow(o.yrs, 0.6);
  const strength = (teamPower(o.tid).total - 55) / 12;
  const pop = (T.pop - 50) / 50;
  const town = isUser(o.tid) ? G.town.stat.vib / 120 : (T.market - 3) * 0.08;
  const home = T.region === p.home ? 0.08 : 0;
  const former = o.tid === f.from ? (p.per === 'loyal' ? 0.25 : 0.06) : 0;
  const mw = p.per === 'money' ? 1.25 : 1;
  return Math.pow(money, mw) * (1 + 0.18 * strength + 0.10 * pop + 0.06 * town + home + former + (p.per === 'star' ? 0.08 * pop : 0));
}
function faDecide(final) {
  for (const f of G.faMarket.filter(x => !x.done)) {
    const p = P_(f.id); if (!p) { f.done = true; continue; }
    const offers = Object.entries(f.offers).map(([tid, o]) => ({ tid: +tid, sal: o.sal, yrs: o.yrs }));
    if (!offers.length) { if (final) faNoOffer(f, p); continue; }
    if (!final && (offers.length < 2 || chance(0.5))) continue;
    const best = maxBy(offers, o => faUtility(p, f, o));
    if (best.sal < f.ask * 0.85 && !final) continue;
    faSign(f, p, best);
  }
}
function faSign(f, p, o) {
  f.done = true; f.to = o.tid;
  addToTeam(p, o.tid, 2);
  p.ren = { st: 'signed', sal: o.sal, yrs: o.yrs, faNew: true }; p.fa = null;
  if (o.tid !== f.from) {
    p.faUsed = p.svc; p.mor = 70;
    addNews('fa', `${p.name}が${tName(o.tid)}へFA移籍（${o.yrs}年・年${fmtSal(o.sal)}）`, { important: isUser(o.tid) || isUser(f.from), tid: o.tid });
    faCompensation(f, o.tid);
  } else {
    addNews('fa', `${p.name}が${tName(o.tid)}に宣言残留（${o.yrs}年・年${fmtSal(o.sal)}）`, { important: isUser(o.tid), tid: o.tid });
  }
}
function faNoOffer(f, p) {
  f.done = true;
  if (p.age >= 35 && chance(0.6)) { retirePlayer(p); return; }
  f.to = f.from;
  addToTeam(p, f.from, 2);
  p.ren = { st: 'signed', sal: roundSal(Math.max(MIN_SAL, Math.min(f.ask * 0.8, f.prevSal))), yrs: 1 }; p.fa = null; p.mor = clamp(p.mor - 10, 0, 100);
  addNews('fa', `${p.name}は獲得球団が現れず${tName(f.from)}に残留`, { tid: f.from });
}
function unprotected(tid) {
  const ps = shihai(tid).filter(p => !p.frn && !(p.join > G.year) && !(p.ren && p.ren.faNew));
  const prot = new Set(sortBy(ps, p => pVal(p, tid), true).slice(0, 28).map(p => p.id));
  return ps.filter(p => !prot.has(p.id));
}
function payComp(fromTid, toTid, money) {
  if (isUser(fromTid)) book('exp', 'transfer', money);
  if (isUser(toTid)) book('rev', 'transfer', money);
}
function moveComp(p, toTid) {
  const from = p.team;
  addToTeam(p, toTid, 2);
  addNews('fa', `人的補償で${p.name}が${tName(from)}から${tName(toTid)}へ移籍`, { important: isUser(from) || isUser(toTid), tid: toTid });
}
function faCompensation(f, toTid) {
  if (f.rank === 'C') return;
  const fromT = f.from;
  if (isUser(fromT)) { G.compPending.push({ fa: f.id, to: toTid, rank: f.rank, prev: f.prevSal }); return; }
  const best = maxBy(unprotected(toTid), x => pVal(x, fromT));
  if (best && pVal(best, fromT) > 180) { payComp(toTid, fromT, f.prevSal * (f.rank === 'A' ? 0.5 : 0.4)); moveComp(best, fromT); }
  else payComp(toTid, fromT, f.prevSal * (f.rank === 'A' ? 0.8 : 0.6));
}
function resolveComp(i, pid) {
  const c = G.compPending[i]; if (!c) return;
  if (pid != null) { const p = P_(pid); payComp(c.to, G.user.tid, c.prev * (c.rank === 'A' ? 0.5 : 0.4)); if (p) moveComp(p, G.user.tid); }
  else { payComp(c.to, G.user.tid, c.prev * (c.rank === 'A' ? 0.8 : 0.6)); addNews('fa', `${P_(c.fa) ? P_(c.fa).name : 'FA選手'}の補償として金銭${fmtOku(c.prev * (c.rank === 'A' ? 0.8 : 0.6))}を受け取りました`, { tid: G.user.tid }); }
  G.compPending.splice(i, 1);
}
function userFAOffer(id, sal, yrs) {
  const f = G.faMarket.find(x => x.id === id && !x.done); if (!f) return false;
  f.offers[G.user.tid] = { sal: roundSal(sal), yrs: clamp(yrs, 1, 5) };
  return true;
}

/* ---------- トレード ---------- */
function tradeOpen() { const t = curTurn(); return t <= 27 || t >= 40; }
function evalTrade(tid, give, get, cash) {
  const ut = G.user.tid;
  if (!tradeOpen()) return { ok: false, why: 'トレード期間外です（7月末で締切、11月に再開）' };
  if (!give.length && !get.length) return { ok: false, why: '選手を選んでください' };
  const vin = sum(give, p => pVal(p, tid)), vout = sum(get, p => pVal(p, tid));
  const maxOut = get.length ? Math.max(...get.map(p => pVal(p, tid))) : 0;
  const maxIn = give.length ? Math.max(...give.map(p => pVal(p, tid))) : 0;
  let score = vin + cash / 10000 * 30 - vout * 1.08 - 5;
  if (maxOut > 0 && maxIn < maxOut * 0.6) score -= (maxOut * 0.6 - maxIn) * 1.5;
  const after = shihai(tid).length + give.filter(p => p.lv !== 3).length - get.filter(p => p.lv !== 3).length;
  if (after > LIM.shihai) return { ok: false, why: `${tName(tid)}の支配下枠が足りません` };
  const ua = shihai(ut).length - give.filter(p => p.lv !== 3).length + get.filter(p => p.lv !== 3).length;
  if (ua > LIM.shihai) return { ok: false, why: 'あなたの支配下枠（70人）を超えます' };
  if (cash > 0 && G.fin.cash < cash) return { ok: false, why: '資金が足りません' };
  const cLeft = shihai(tid).filter(p => p.pos === 'C' && !get.includes(p)).length + give.filter(p => p.pos === 'C').length;
  if (cLeft < 3) return { ok: false, why: '捕手が足りなくなるため断られました', score };
  const ok = score >= 0;
  return { ok, score, why: ok ? '' : (score > -60 ? 'あと少し上積みがあれば応じてもらえそうです' : '釣り合わないと断られました') };
}
function doTrade(tid, give, get, cash) {
  const ut = G.user.tid;
  for (const p of give) { const lv = p.lv === 3 ? 3 : 2; addToTeam(p, tid, lv); p.mor = clamp(p.mor - 5, 0, 100); }
  for (const p of get) { const lv = p.lv === 3 ? 3 : 2; addToTeam(p, ut, lv); p.mor = clamp(p.mor + 3, 0, 100); }
  if (cash > 0) book('exp', 'transfer', cash); else if (cash < 0) book('rev', 'transfer', -cash);
  const s = `${tName(tid)}とトレード成立：${give.map(p => p.name).join('・') || '金銭'} ⇄ ${get.map(p => p.name).join('・') || '金銭'}`;
  addNews('trade', s, { important: true, tid: ut });
  G.trades.unshift({ y: G.year, m: G.month, tid, give: give.map(p => p.name), get: get.map(p => p.name), cash });
  touch();
}

/* ---------- 外国人選手 ---------- */
const FRN_FROM = ['米メジャー', '米3A', '米3A', '米2A', 'ドミニカ', 'ベネズエラ', 'キューバ', 'メキシコ', '韓国', '台湾', '豪州'];
function genForeign(n) {
  for (let i = 0; i < n; i++) {
    const pos = chance(0.5) ? 'P' : wpick(['1B', '3B', 'OF', '2B', 'SS', 'C'], x => ({ '1B': 30, '3B': 15, OF: 40, '2B': 6, SS: 5, C: 4 })[x]);
    const cur = clamp(rn(64, 8), 48, 86); const age = ri(25, 33);
    const p = makePlayer({ pos, pt: pos === 'P' ? (chance(0.5) ? 'SP' : 'RP') : '', age, cur, pot: cur + rf(0, 4), frn: true, from: '外国', gt: 1 });
    p.team = -3;
    p.pr = { sc: 0, noise: { ovr: rn(0, 1) }, cat: '外国', school: pick(FRN_FROM), hype: 0 };
    p.adaptT = clamp(Math.round(rn(-1.5, 4)), -10, 4);
    p.fa = { kind: 'frn', ask: roundSal(clamp(valueSalary(cur) * rf(1.0, 1.5), 3000, 40000)), fee: roundSal(valueSalary(cur) * rf(0, 0.3)), yrs: chance(0.3) ? 2 : 1 };
    G.foreign.push(p);
  }
}
function shownFrnOvr(p) { const s = 2 + 10 * (1 - p.pr.sc / 100) * (1 - G.tfac.analytics.lv * 0.06); return clamp(Math.round(ovr(p) + p.pr.noise.ovr * s), 1, 99); }
function adaptLabel(p) { if (!p.pr || p.pr.sc < 60) return '不明'; return p.adaptT <= -5 ? '不安' : p.adaptT <= 0 ? '普通' : '良好'; }
function frnWindow() { const t = curTurn(); return t <= 27 || t >= 40; }
function signForeign(id, tid) {
  tid = tid === undefined ? G.user.tid : tid;
  const p = G.foreign.find(x => x.id === id); if (!p) return { ok: false, why: '見つかりません' };
  if (!frnWindow()) return { ok: false, why: '外国人選手の獲得は7月末までです（11月に再開）' };
  if (isUser(tid) && G.fin.cash < p.fa.fee) return { ok: false, why: '移籍金を払う資金が足りません' };
  if (shihai(tid).length >= LIM.shihai) return { ok: false, why: '支配下登録が70人に達しています' };
  if (isUser(tid)) book('exp', 'transfer', p.fa.fee);
  G.foreign = G.foreign.filter(x => x !== p);
  G.players[p.id] = p; p.team = -1;
  addToTeam(p, tid, 2);
  const off = curTurn() >= 40;
  if (off) { p.sal = 0; p.ren = { st: 'signed', sal: p.fa.ask, yrs: p.fa.yrs }; p.join = G.year + 1; } else { p.sal = p.fa.ask; p.yrs = p.fa.yrs; p.join = G.year; }
  p.adapt = p.adaptT; p.prFrom = p.pr.school; delete p.pr; p.fa = null; p.mor = 65;
  if (isUser(tid)) addNews('contract', `新外国人${p.name}（${POS_JP[p.pos]}・${p.prFrom}）と年俸${fmtSal(p.sal || p.ren.sal)}で契約`, { important: true, tid });
  touch();
  return { ok: true };
}

/* ---------- ポスティング・海外移籍 ---------- */
function postingFee(p) { return roundSal(clamp(valueSalary(ovr(p)) * 4 * rf(0.8, 1.2), 20000, 300000)); }
function leaveToMLB(p, how, fee) {
  const from = p.team;
  if (fee && isUser(from)) book('rev', 'transfer', fee);
  G.mlb.push({ name: p.name, from, y: G.year, how, ovr: ovr(p) });
  addNews('fa', `${tShort(from)}の${p.name}が${how}でメジャーへ${fee ? '（譲渡金' + fmtOku(fee) + '）' : ''}`, { important: isUser(from) || ovr(p) >= 78, tid: from });
  removeFromTeam(p);
  delete G.players[p.id];
}
function postingRequests() {
  for (const T of G.teams) for (const p of shihai(T.id)) {
    if (p.per !== 'mlb' || ovr(p) < 72 || p.age > 31 || p.svc < 4 || p.svc >= 9 || p.postY === G.year) continue;
    if (!chance(0.5)) continue;
    p.postY = G.year;
    if (isUser(T.id)) queueEvent('posting', { pid: p.id, fee: postingFee(p) });
    else if (chance(0.35)) leaveToMLB(p, 'ポスティング', 0);
  }
}

/* ---------- 引退 ---------- */
function retireChance(p) {
  const o = ovr(p), a = p.age;
  if (a >= 42) return 0.95;
  let c = 0;
  if (a >= 38) c = 0.35 + (a - 38) * 0.15; else if (a >= 35) c = 0.12 + (a - 35) * 0.08; else if (a >= 32) c = 0.03;
  if (o >= 72) c *= 0.4; else if (o < 45) c = c * 2 + (a >= 30 ? 0.15 : 0);
  if (p.lv === 3 && a >= 25) c += 0.25;
  if (p.team < 0 && a >= 30) c += 0.3;
  return clamp(c, 0, 0.95);
}
function careerOf(p) {
  const c = {}; const s = p.st;
  for (const k in p.car) if (typeof p.car[k] === 'number') c[k] = p.car[k] + (s[k] || 0);
  return c;
}
function careerWar(p) { return r1(sum(p.hist, h => h.war || 0) + war(p) + (p.preWar || 0)); }
function isLegend(p, c) { return careerWar(p) >= 18 || (isP(p) ? (c.w >= 100 || c.sv >= 150 || c.hld >= 200) : (c.h >= 1200 || c.hr >= 200)); }
function retirePlayer(p) {
  const from = p.team;
  const c = careerOf(p); const legend = isLegend(p, c);
  if (legend) G.legends.push({ name: p.name, pos: p.pos, team: from >= 0 ? from : p.orig, orig: p.orig, y: G.year, yrs: p.hist.length + 1, c, war: careerWar(p), awards: (p.awards || []).length });
  if (p.pop >= 45 || legend) {
    const role = isP(p) ? 'pit' : pick(['bat', 'fld', 'bat', 'head']);
    G.retiredCoaches.push({ role: legend && chance(0.4) ? 'mgr' : role, name: p.name, q: clamp(Math.round(48 + (legend ? 12 : 0) + rn(0, 8)), 35, 88), age: p.age + 1, pid: p.id });
  }
  if (isUser(from)) addNews('retire', `${p.name}（${p.age}歳）が現役引退を表明${legend ? '。球団の歴史に名を刻んだ名選手です' : ''}`, { important: legend || p.pop >= 50, tid: from });
  else if (legend) addNews('retire', `${tShort(from >= 0 ? from : p.orig)}の名選手${p.name}が引退`, {});
  if (from >= 0) removeFromTeam(p);
  G.fapool = G.fapool.filter(x => x !== p.id);
  delete G.players[p.id];
}
function processRetirements() {
  const all = [];
  for (const T of G.teams) all.push(...roster(T.id));
  for (const id of G.fapool) { const p = P_(id); if (p) all.push(p); }
  for (const p of all) if (chance(retireChance(p))) retirePlayer(p);
}
