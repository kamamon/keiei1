/* =========================================================
   経営：観客動員・収入・支出・人気・ファンクラブ・広告・スポンサー
   ========================================================= */
function tName(tid) { const t = G.teams[tid]; return t ? t.city + t.nick : '―'; }
function tShort(tid) { const t = G.teams[tid]; return t ? t.nick : '―'; }
function stadOf(tid) { return isUser(tid) ? G.stad : G.teams[tid].stad; }
function capOf(tid) { const s = stadOf(tid); return isUser(tid) ? s.cap + s.fac.seats.lv * 2000 : s.cap; }

function book(kind, cat, man) {
  if (!man || !isFinite(man)) return;
  const F = G.fin;
  F.y[kind][cat] = (F.y[kind][cat] || 0) + man;
  F.m[kind] += man;
  F.cash += kind === 'rev' ? man : -man;
}
function yearTotal(kind) { return sum(Object.values(G.fin.y[kind])); }

/* ---------- 観客動員 ---------- */
function basePerf(T) {
  const R = T.rec; const n = R.w + R.l;
  const wp = n >= 8 ? pctOf(R) : (T.lastPct || 0.5);
  let perf = 0.88 + (wp - 0.5) * 1.2;
  if (G.month >= 6 && G.month <= 9) { const gb = gamesBehind(T.id); if (gb <= 0) perf += 0.08; else if (gb <= 5) perf += 0.04; else if (gb >= 15) perf -= 0.05; }
  if (R.strk >= 5) perf += 0.03;
  return clamp(perf, 0.65, 1.25);
}
function demandOf(hid, aid, dayIdx) {
  const T = G.teams[hid], O = G.teams[aid];
  let D = 6000 + T.market * 2600 + T.pop * 300;
  D *= basePerf(T);
  D *= [0.80, 0.80, 0.84, 1.0, 1.20, 1.14][dayIdx % 6];
  const st = stadOf(hid);
  let mf = ({ 3: 0.95, 4: 0.92, 5: 1.0, 6: 0.95, 7: 1.08, 8: 1.10, 9: 1.0, 10: 1.1 })[G.month] || 1;
  if (st.dome) mf = Math.max(mf, 1.0);
  if (curTurn() === 16) mf *= 1.12;
  D *= mf;
  D *= 0.90 + O.pop / 100 * 0.22;
  return D;
}
function stadSatisfaction() {
  const f = G.stad.fac;
  let s = 42 + f.vision.lv * 3 + f.amenity.lv * 3.5 + f.food.lv * 2 + f.light.lv * 2 + f.turf.lv * 0.6 + f.shop.lv * 1 + f.vip.lv * 0.8 + (G.stad.dome ? 4 : 0);
  const cond = avg(Object.values(f), x => x.cond) / 100;
  s *= 0.82 + cond * 0.18;
  s -= Math.min(12, (G.stad.age || 0) * 0.25);
  s += G.town.stat.sat || 0;
  s += G.flags.satBonus || 0;
  if (G.stad.honey > 1) s += 8;
  return clamp(s, 15, 100);
}
function tixRefMul(T) { return 0.8 + T.market * 0.06; }
function tierCaps(cap) {
  const pre = 0.04 + G.stad.fac.vip.lv * 0.02;
  return { out: cap * 0.30, inn: cap * (0.70 - pre), pre: cap * pre };
}
function userTicketSale(D, cap, priceMul) {
  const T = uT(); const caps = tierCaps(cap); const rm = tixRefMul(T);
  let att = 0, rev = 0; const by = {};
  for (const k of ['out', 'inn', 'pre']) {
    const d = TIX[k]; const share = caps[k] / cap; const price = G.tix[k] * (priceMul || 1);
    const ref = d.ref * rm * (k === 'pre' ? 1 + G.stad.fac.vip.lv * 0.05 : 1) * (priceMul || 1);
    const dem = D * share * Math.pow(ref / Math.max(300, price), d.el);
    const a = Math.min(caps[k], dem);
    by[k] = a; att += a; rev += a * price;
  }
  return { att, rev: rev / 10000, by };
}
function userAttMult() {
  const sat = stadSatisfaction();
  let m = 0.82 + sat / 100 * 0.36;
  const tw = G.town.stat;
  m *= clamp(1 + (tw.acc - 20) * 0.003 + tw.vib * 0.0012, 0.9, 1.4);
  m *= 1 + adEffect('att');
  m *= G.stad.honey || 1;
  m *= 1 + (G.flags.attBoost || 0);
  return m;
}
function pickPromo() {
  const P = G.promo; if (!P || !P.queue || !P.queue.length) return null;
  const k = P.queue[0];
  const d = PROMOS[k];
  if (d.months && !d.months.includes(G.month)) { P.queue.shift(); return pickPromo(); }
  P.queue.shift();
  return k;
}
/* 本拠地1試合ぶんの観客と収入。post=プレーオフ種別 */
function homeGameEconomy(hid, aid, dayIdx, post) {
  const T = G.teams[hid];
  const cap = capOf(hid);
  let D = demandOf(hid, aid, dayIdx);
  if (post) D *= post === 'gs' ? 1.8 : 1.5;
  if (!isUser(hid)) {
    D *= (0.94 + (T.facLv || 2) * 0.03) * rf(0.94, 1.06);
    const att = Math.round(Math.min(cap, D));
    T.att = T.att || { g: 0, tot: 0 }; if (!post) { T.att.g++; T.att.tot += att; }
    return att;
  }
  D *= userAttMult() * rf(0.94, 1.06);
  D += G.fc.members * 0.012;
  let promo = null;
  if (!post && dayIdx % 6 >= 3) promo = pickPromo();
  if (!promo && !post && G.promo.queue.length && dayIdx % 6 === 2 && chance(0.3)) promo = pickPromo();
  const pd = promo ? PROMOS[promo] : null;
  if (pd) D *= 1 + pd.att * (1 + G.stad.fac.light.lv * 0.08);
  const sale = userTicketSale(D, cap, post ? 1.3 : 1);
  const att = Math.round(sale.att);
  const f = G.stad.fac;
  const tw = G.town.stat;
  const share = G.stad.owned ? 1 : 0.5;
  const foodPc = (700 + f.food.lv * 200) * (1 + tw.food) * (pd && pd.food ? 1 + pd.food : 1) * (1 + (G.flags.foodBoost || 0));
  const goodsPc = (250 + f.shop.lv * 100) * (0.6 + T.pop / 100 * 0.8) * (1 + tw.goods + adEffect('goods')) * (pd && pd.goods ? 1 + pd.goods : 1) * (1 + (G.flags.goodsBoost || 0));
  book('rev', 'ticket', sale.rev);
  book('rev', 'food', att * foodPc * share / 10000);
  book('rev', 'goods', att * goodsPc / 10000);
  book('rev', 'town', G.town.stat.gameRev || 0);
  book('exp', 'ops', 800 + att * 0.07);
  if (pd) {
    book('exp', 'promo', pd.cost);
    if (pd.fans) T.fans += pd.fans;
    if (pd.pop) T.pop = clamp(T.pop + pd.pop, 0, 99);
    if (pd.attach) G.town.attach = clamp(G.town.attach + pd.attach, 0, 100);
    if (pd.sat) G.flags.satTmp = (G.flags.satTmp || 0) + pd.sat;
    G.promo.log.unshift({ date: nowStr(), k: promo, att });
    if (G.promo.log.length > 30) G.promo.log.pop();
  }
  const A = G.fin.att;
  if (!post) {
    A.g++; A.tot += att; A.max = Math.max(A.max, att); if (att >= cap * 0.995) A.sell++;
    A.list.push(att); if (A.list.length > 80) A.list.shift();
  } else { A.post = (A.post || 0) + att; }
  T.att = T.att || { g: 0, tot: 0 }; if (!post) { T.att.g++; T.att.tot += att; }
  return att;
}
function previewAttendance(prices) {
  const T = uT(); const save = G.tix; G.tix = prices || G.tix;
  let tot = 0, rev = 0; const n = 6;
  for (let d = 0; d < n; d++) {
    let D = demandOf(T.id, (T.id + 1 + d) % 12, d) * userAttMult() + G.fc.members * 0.012;
    const s = userTicketSale(D, capOf(T.id), 1); tot += s.att; rev += s.rev;
  }
  G.tix = save;
  return { att: tot / n, rev: rev / n, fill: tot / n / capOf(T.id) };
}

/* ---------- 広告 ---------- */
function adWeeklyCost() { let c = 0; for (const k in G.ads.lv) { const lv = G.ads.lv[k]; if (lv > 0) c += ADS[k].cost * lv; } return c * (G.ads.paused ? 0 : 1); }
function adEffect(key) {
  let e = 0; if (G.ads.paused) return 0;
  const pr = uStaff('pr'); const prm = 0.8 + (pr ? pr.abil : 40) / 100 * 0.4;
  for (const k in G.ads.lv) { const lv = G.ads.lv[k]; if (lv > 0 && ADS[k][key]) e += ADS[k][key] * Math.pow(lv, 0.75) * prm; }
  return e;
}
function tvAnnual(T) { return (T.market * 16000 + T.pop * 800); }

/* ---------- ファンクラブ ---------- */
function fcAvgFee() { let s = 0; for (const k in FC_TIERS) s += FC_TIERS[k].mix * G.fc.fee[k]; return s; }
function fcRefFee() { let s = 0; for (const k in FC_TIERS) s += FC_TIERS[k].mix * FC_TIERS[k].ref; return s; }
function fcTarget() {
  const T = uT();
  const fans = T.fans * 10000;
  const rate = 0.004 + 0.006 * (T.pop / 100);
  const feeF = Math.pow(fcRefFee() / Math.max(500, fcAvgFee()), 0.8);
  const benF = 0.8 + G.fc.ben * 0.1;
  const sales = 0.85 + clamp(G.budget.sales / 20000, 0, 3) * 0.08 + (uStaff('sales') ? uStaff('sales').abil : 40) / 100 * 0.1;
  const camp = G.fc.camp > 0 ? 1.15 : 1;
  return fans * rate * feeF * benF * sales * camp * (1 + adEffect('fc'));
}
function fcWeekly() {
  const t = curTurn(); const FC = G.fc;
  const target = fcTarget();
  const speed = t < 16 ? 0.06 : (t < 36 ? 0.03 : 0.012);
  let nw = (target - FC.members) * speed;
  if (nw > 0) { FC.members += nw; book('rev', 'fanclub', nw * fcAvgFee() / 10000); FC.joinY += nw; }
  else FC.members += nw * 0.3;
  book('exp', 'fc', FC.members * FC.ben * 800 / 48 / 10000);
  if (FC.camp > 0) { FC.camp--; book('exp', 'promo', 300); }
}
function fcRenewal() {
  const FC = G.fc; const sat = stadSatisfaction();
  const ret = clamp(0.62 + sat / 400 + FC.ben * 0.02 + (uT().lastPct - 0.5) * 0.4, 0.5, 0.92);
  FC.members *= ret;
  book('rev', 'fanclub', FC.members * fcAvgFee() / 10000);
  FC.lastRet = ret; FC.joinY = 0;
}

/* ---------- 人気・ファン人口（全球団・毎週） ---------- */
function popTarget(T) {
  const user = isUser(T.id);
  const R = T.rec; const n = R.w + R.l;
  const wp = n >= 10 ? pctOf(R) : (T.lastPct || 0.5);
  const stars = roster(T.id).filter(p => p.lv === 1).sort((a, b) => b.pop - a.pop).slice(0, 5);
  const mg = teamMgr(T.id);
  const parts = { base: 25 + T.market * 7, perf: (wp - 0.5) * 60, star: (avg(stars, p => p.pop) - 50) * 0.15, mgr: ((mg.fame || 40) - 50) * 0.06, bonus: T.popBonus || 0 };
  if (user) {
    parts.ads = adEffect('pop') * 25;
    parts.sat = (stadSatisfaction() - 60) * 0.15;
    parts.town = G.town.attach * 0.05 + BLD_EFFECT('popw') * 40;
    const pr = uStaff('pr'); parts.pr = pr ? (pr.abil - 50) * 0.04 : -1;
    if (G.user.policy === 'profit') parts.pol = -2;
  } else parts.fac = ((T.facLv || 2) - 2) * 1.5 + T.market * 1.2;
  let s = 0; for (const k in parts) s += parts[k];
  return { v: clamp(s, 5, 99), parts };
}
function weeklyPopularity(weekRes) {
  const season = curTurn() >= SEASON_START && curTurn() <= MAKEUP_TURN;
  for (const T of G.teams) {
    const user = isUser(T.id);
    let d = (popTarget(T).v - T.pop) * 0.015;
    const wr = weekRes[T.id];
    if (season && wr && wr.g) d += (wr.w / wr.g - 0.5) * 0.6;
    T.pop = clamp(T.pop + d, 5, 99);
    if (T.popBonus) T.popBonus *= 0.985;
    const tf = T.market * 55 + T.pop * 3.5 + (user ? G.town.stat.pop / 2000 + G.town.attach * 0.5 : T.market * 6);
    let fd = (tf - T.fans) * 0.01;
    if (user) fd += adEffect('fans') * (G.user.policy === 'local' ? 1.15 : 1);
    T.fans = Math.max(20, T.fans + fd);
  }
}

/* ---------- スポンサー ---------- */
function sponsorValue(slot) {
  const T = uT(); const s = SPONSOR_SLOTS[slot];
  const sales = 0.85 + clamp(G.budget.sales / 20000, 0, 3) * 0.06 + ((uStaff('sales') ? uStaff('sales').abil : 40) - 50) * 0.004;
  return s.base * (0.45 + T.pop / 100) * (0.6 + T.market * 0.12) * sales * (G.user.policy === 'profit' ? 1.05 : 1);
}
function genSponsorOffers(slot, n) {
  const offers = [];
  for (let i = 0; i < (n || 2); i++) {
    const yrs = ri(1, 3);
    const v = sponsorValue(slot) * rf(0.82, 1.15) * (1 + (yrs - 1) * 0.03);
    offers.push({ slot, co: pick(COMPANIES), annual: roundSal(v), yrs, exp: 8 });
  }
  return offers;
}
function sponsorWeekly() {
  const S = G.sponsors;
  for (const slot in SPONSOR_SLOTS) {
    if (!S.cur[slot] && !S.offers.some(o => o.slot === slot) && chance(0.08)) S.offers.push(...genSponsorOffers(slot, ri(1, 2)));
  }
  S.offers.forEach(o => o.exp--);
  S.offers = S.offers.filter(o => o.exp > 0);
  let tot = 0; for (const k in S.cur) if (S.cur[k]) tot += S.cur[k].annual;
  book('rev', 'sponsor', tot / 48);
}
function acceptSponsor(i) {
  const o = G.sponsors.offers[i]; if (!o) return;
  G.sponsors.cur[o.slot] = { co: o.co, annual: o.annual, yrs: o.yrs };
  G.sponsors.offers = G.sponsors.offers.filter(x => x.slot !== o.slot);
  addNews('biz', `${SPONSOR_SLOTS[o.slot].n}のスポンサーに${o.co}が決定（年${fmtOku(o.annual)}・${o.yrs}年）`, { tid: G.user.tid });
}
function sponsorYearEnd() {
  const S = G.sponsors;
  for (const k in S.cur) { const c = S.cur[k]; if (!c) continue; c.yrs--; if (c.yrs <= 0) { S.cur[k] = null; addNews('biz', `${SPONSOR_SLOTS[k].n}（${c.co}）の契約が満了しました`, { tid: G.user.tid }); } }
  for (const slot in SPONSOR_SLOTS) if (!S.cur[slot]) S.offers.push(...genSponsorOffers(slot, ri(2, 3)));
}

/* ---------- ネーミングライツ ---------- */
function namingValue(kind) {
  const T = uT();
  if (kind === 'farm') return (2500 + T.pop * 40 + G.tfac.farm.lv * 500);
  return (8000 + capOf(T.id) * 0.06 + T.pop * 120 + T.market * 3000) * (G.stad.dome ? 1.1 : 1);
}
function genNamingOffers(kind) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const co = pick(COMPANIES); const yrs = ri(3, 8);
    const v = namingValue(kind) * rf(0.8, 1.25) * (1 + (yrs - 3) * 0.02);
    const suf = kind === 'farm' ? pick(['ファーム', 'フィールド', 'ボールパーク']) : (G.stad.dome ? 'ドーム' : pick(['スタジアム', 'フィールド', 'ボールパーク']));
    const name = co.replace(/(銀行|証券|生命|保険|製薬|自動車|電機|住建|化粧品|航空|食品|酒造|電工|通信|不動産|飲料|物産|旅行|楽器|ガス|運輸|製菓|電子|工業|薬局|商事|住宅)$/, '') + suf + (kind === 'farm' ? '' : (chance(0.5) ? uT().city : ''));
    out.push({ kind, co, name, annual: roundSal(v), yrs, exp: 6 });
  }
  return out;
}
function acceptNaming(i) {
  const o = G.naming.offers[i]; if (!o) return;
  G.naming[o.kind] = { co: o.co, name: o.name, annual: o.annual, yrs: o.yrs };
  G.naming.offers = G.naming.offers.filter(x => x.kind !== o.kind);
  if (o.kind === 'main') { uT().pop = clamp(uT().pop - 1, 0, 99); addNews('biz', `本拠地の名称が「${o.name}」に決定（年${fmtOku(o.annual)}・${o.yrs}年）`, { important: true, tid: G.user.tid }); }
  else addNews('biz', `2軍球場の名称が「${o.name}」に決定（年${fmtOku(o.annual)}）`, { tid: G.user.tid });
}
function namingWeekly() {
  const N = G.naming; const share = G.stad.owned ? 1 : 0.5;
  if (N.main) book('rev', 'naming', N.main.annual * share / 48);
  if (N.farm) book('rev', 'naming', N.farm.annual / 48);
  N.offers.forEach(o => o.exp--); N.offers = N.offers.filter(o => o.exp > 0);
  if (N.solicit > 0) { N.solicit--; if (N.solicit === 0) { N.offers.push(...genNamingOffers(N.solicitKind)); addNews('biz', 'ネーミングライツの募集に企業から提案が届きました', { tid: G.user.tid }); } }
}
function namingYearEnd() {
  for (const k of ['main', 'farm']) { const c = G.naming[k]; if (!c) continue; c.yrs--; if (c.yrs <= 0) { G.naming[k] = null; addNews('biz', `ネーミングライツ「${c.name}」の契約が満了しました`, { tid: G.user.tid }); } }
}
function stadiumName() { return G.naming.main ? G.naming.main.name : G.stad.name; }
function stadiumNameOf(tid) { return isUser(tid) ? stadiumName() : G.teams[tid].stad.name; }

/* ---------- 融資 ---------- */
function loanLimit() { const rev = Math.max(yearTotal('rev'), G.fin.lastRev || 80000); return Math.round(rev * 1.6 * (0.6 + G.owner.trust / 125)); }
function debt() { return sum(G.fin.loans, l => l.bal); }
function loanRate() { return 0.012 + clamp(debt() / Math.max(1, loanLimit()), 0, 1) * 0.012; }
function borrow(amount, yrs) {
  const room = loanLimit() - debt(); amount = Math.min(amount, room);
  if (amount <= 0) return false;
  G.fin.loans.push({ bal: amount, rate: loanRate(), yrs, pay: Math.ceil(amount / yrs), taken: G.year });
  G.fin.cash += amount;
  addNews('biz', `銀行から${fmtOku(amount)}を借り入れました（${yrs}年返済）`, { tid: G.user.tid });
  return true;
}
function repay(idx, amount) {
  const l = G.fin.loans[idx]; if (!l) return;
  amount = Math.min(amount, l.bal, Math.max(0, G.fin.cash));
  l.bal -= amount; G.fin.cash -= amount;
  if (l.bal <= 0.5) G.fin.loans.splice(idx, 1);
}

/* ---------- 毎週の収支 ---------- */
function otherCost(T) { return 30000 + T.market * 20000; }
function officeCost(T) { return 20000 + T.market * 6000; }
function weeklyFinance() {
  const T = uT(); const t = curTurn();
  const season = t >= SEASON_START && t <= MAKEUP_TURN;
  book('exp', 'payroll', sum(roster(T.id), p => p.sal) / 48);
  book('exp', 'staff', (sum(userStaffList(), s => s.sal) + officeCost(T)) / 48);
  if (!G.stad.owned) book('exp', 'rent', G.stad.rent / 48);
  book('exp', 'maint', facilityMaint());
  book('exp', 'ads', adWeeklyCost());
  book('exp', 'scout', G.budget.scout / 48);
  book('exp', 'dev', G.budget.dev / 48);
  book('exp', 'sales', G.budget.sales / 48);
  book('exp', 'other', otherCost(T) / 48 * (G.user.policy === 'profit' ? 0.92 : 1));
  book('exp', 'interest', sum(G.fin.loans, l => l.bal * l.rate) / 48);
  if (season) {
    book('rev', 'tv', tvAnnual(T) / 25);
    const away = G.fin.awayWeek || 0; book('exp', 'travel', away * 300); G.fin.awayWeek = 0;
  }
  const online = T.fans * 2.5 * (T.pop / 60) * (1 + adEffect('goods') + G.town.stat.goods) * (season ? 1.15 : 0.8) * (1 + (G.flags.goodsBoost || 0));
  book('rev', 'goods', online);
  book('rev', 'town', townWeeklyRevenue(season));
  book('rev', 'farm', (season ? 120 + G.tfac.farm.lv * 70 : 25) * (0.6 + T.pop / 100));
  if (G.user.policy === 'profit') book('rev', 'goods', online * 0.05);
  sponsorWeekly();
  namingWeekly();
  fcWeekly();
}
function monthClose() {
  const F = G.fin;
  F.months.push({ y: G.year, m: G.month, rev: Math.round(F.m.rev), exp: Math.round(F.m.exp), cash: Math.round(F.cash) });
  if (F.months.length > 48) F.months.shift();
  F.m = { rev: 0, exp: 0 };
}
