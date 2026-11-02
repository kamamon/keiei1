/* =========================================================
   設備・球場・街づくり
   ========================================================= */
function facDef(kind, key) { return kind === 'stad' ? STAD_FAC[key] : TEAM_FAC[key]; }
function facObj(kind, key) { return kind === 'stad' ? G.stad.fac[key] : G.tfac[key]; }
function facBuilding(kind, key) { return G.builds.find(b => b.kind === kind && b.key === key); }
function isOffseason() { const t = curTurn(); return t >= 36 || t <= 7; }
function upgradeCost(kind, key) { const d = facDef(kind, key); const f = facObj(kind, key); if (f.lv >= d.max) return null; return d.cost[f.lv]; }
function canUpgrade(kind, key) {
  const d = facDef(kind, key); const f = facObj(kind, key);
  if (f.lv >= d.max) return { ok: false, why: '最大レベルです' };
  if (facBuilding(kind, key)) return { ok: false, why: '工事中です' };
  if (d.off && !isOffseason()) return { ok: false, why: 'オフシーズン（10月〜2月）のみ着工できます' };
  if (kind === 'stad' && G.project && G.project.kind === 'newstad') return { ok: false, why: '新球場の建設中は改修できません' };
  const c = d.cost[f.lv];
  if (G.fin.cash < c) return { ok: false, why: '資金が足りません' };
  return { ok: true, cost: c };
}
function startUpgrade(kind, key) {
  const c = canUpgrade(kind, key); if (!c.ok) return c;
  const d = facDef(kind, key); const f = facObj(kind, key);
  book('exp', 'capex', c.cost); G.fin.capexY = (G.fin.capexY || 0) + c.cost;
  G.builds.push({ kind, key, to: f.lv + 1, wk: d.wk[f.lv], tot: d.wk[f.lv], name: d.n });
  addNews('biz', `${d.n}の工事を開始（Lv${f.lv + 1}、${d.wk[f.lv]}週）`, { tid: G.user.tid });
  return { ok: true };
}
function renovateCost(kind, key) { const d = facDef(kind, key); const f = facObj(kind, key); if (f.lv === 0) return 0; return Math.round(d.cost[Math.min(f.lv, d.max) - 1] * (100 - f.cond) / 100 * 0.7); }
function renovate(kind, key) {
  const f = facObj(kind, key); const c = renovateCost(kind, key);
  if (c <= 0 || G.fin.cash < c) return false;
  book('exp', 'capex', c); G.fin.capexY = (G.fin.capexY || 0) + c; f.cond = 100;
  addNews('biz', `${facDef(kind, key).n}を改修し、設備が新品同様になりました`, { tid: G.user.tid });
  return true;
}
function facilityMaint() {
  let m = 0;
  for (const k in G.stad.fac) { const f = G.stad.fac[k]; m += f.lv * (STAD_FAC[k].cost[0] * 0.0012); }
  for (const k in G.tfac) { const f = G.tfac[k]; m += f.lv * (TEAM_FAC[k].cost[0] * 0.0012); }
  if (G.stad.owned) m += capOf(G.user.tid) * 0.004;
  for (const c of G.town.cells) if (c.b && !c.b.wk) m += BLD[c.b.k].maint * (1 + (c.b.lv - 1) * 0.6);
  return m;
}
function weeklyFacilities() {
  for (const k in G.stad.fac) { const f = G.stad.fac[k]; if (f.lv > 0) f.cond = Math.max(30, f.cond - 0.11); }
  for (const k in G.tfac) { const f = G.tfac[k]; if (f.lv > 0) f.cond = Math.max(30, f.cond - 0.09); }
  for (const b of G.builds) b.wk--;
  for (const b of G.builds.filter(b => b.wk <= 0)) {
    const f = facObj(b.kind, b.key); f.lv = b.to; f.cond = 100;
    addNews('biz', `${b.name}が完成しました（Lv${b.to}）`, { important: true, tid: G.user.tid });
  }
  G.builds = G.builds.filter(b => b.wk > 0);
  // 街の建物
  for (const c of G.town.cells) if (c.b && c.b.wk > 0) { c.b.wk--; if (c.b.wk === 0) { addNews('town', `${BLD[c.b.k].n}${c.b.lv > 1 ? '（Lv' + c.b.lv + '）' : ''}がオープンしました`, { important: true, tid: G.user.tid }); } }
  // 新球場
  const P = G.project;
  if (P && P.kind === 'newstad' && P.wk > 0) {
    const pay = P.cost / P.tot; book('exp', 'capex', pay); G.fin.projY = (G.fin.projY || 0) + pay;
    P.wk--; if (P.wk === 0) { P.ready = true; addNews('biz', '新球場が完成しました！ 来季から本拠地として使用します', { important: true, tid: G.user.tid }); }
  }
  computeTownStats();
}
function facMult(kind, key) { const f = facObj(kind, key); return f.lv * (0.82 + f.cond / 100 * 0.18); }

/* ---------- 球場の買収・新球場 ---------- */
function stadiumPrice() { return Math.round(capOf(G.user.tid) * 55 * (0.7 + avg(Object.values(G.stad.fac), x => x.cond) / 100 * 0.3) * (G.stad.dome ? 1.4 : 1)); }
function buyStadium() {
  const price = stadiumPrice();
  if (G.stad.owned || G.fin.cash < price) return false;
  book('exp', 'capex', price); G.fin.capexY = (G.fin.capexY || 0) + price;
  G.stad.owned = true; G.stad.rent = 0;
  addNews('biz', `本拠地球場を${fmtOku(price)}で買収。球場の収益をすべて球団が得られるようになりました`, { important: true, tid: G.user.tid });
  return true;
}
const NEWSTAD = {
  open: { n: '屋外ボールパーク', d: '天然芝の開放的な球場。雨天中止はあるが満足度が高い', base: 1500000, per: 5, dome: false, sat: 6, hrF: 1.0 },
  roof: { n: '開閉式屋根', d: '晴れの日は開放、雨でも中止なし。最も高価', base: 4500000, per: 8, dome: true, sat: 8, hrF: 1.02 },
  dome: { n: 'ドーム球場', d: '天候に左右されない。オフのコンサートでも稼げる', base: 3500000, per: 6, dome: true, sat: 3, hrF: 1.05 }
};
function newStadiumCost(type, cap) { const d = NEWSTAD[type]; return Math.round(d.base + cap * d.per); }
function startNewStadium(type, cap) {
  if (G.project) return { ok: false, why: 'すでに新球場の計画が進行中です' };
  if (!isOffseason()) return { ok: false, why: '着工はオフシーズン（10月〜2月）のみです' };
  const cost = newStadiumCost(type, cap);
  const down = Math.round(cost * 0.1);
  if (G.fin.cash < down) return { ok: false, why: '着工金（総額の1割）が足りません' };
  if (G.fin.cash + Math.max(0, loanLimit() - debt()) < cost) return { ok: false, why: '資金と借入枠を合わせても総工費に届きません' };
  book('exp', 'capex', down);
  const tot = 96;
  G.project = { kind: 'newstad', type, cap, cost: cost - down, wk: tot, tot, ready: false, started: G.year };
  addNews('biz', `新球場（${NEWSTAD[type].n}・${comma(cap)}人）の建設を開始。完成まで約2年`, { important: true, tid: G.user.tid });
  return { ok: true };
}
function openNewStadium() {
  const P = G.project; if (!P || !P.ready) return;
  const d = NEWSTAD[P.type];
  const S = G.stad;
  S.name = uT().city + (d.dome ? 'ドーム' : 'ボールパーク'); S.cap = P.cap; S.dome = d.dome; S.hrF = d.hrF; S.owned = true; S.rent = 0; S.age = 0;
  S.honey = 1.25;
  for (const k in S.fac) { if (k === 'seats') S.fac[k] = { lv: 0, cond: 100 }; else S.fac[k] = { lv: Math.max(3, S.fac[k].lv), cond: 100 }; }
  G.flags.satBonus = (G.flags.satBonus || 0) + d.sat;
  uT().pop = clamp(uT().pop + 8, 0, 99);
  G.project = null; G.flags.newStadium = (G.flags.newStadium || 0) + 1;
  addNews('biz', `新本拠地「${S.name}」が開業！ ファンの期待が高まっています`, { important: true, tid: G.user.tid });
}

/* ---------- 街づくり ---------- */
const TOWN_W = 7, TOWN_H = 5, STAD_XY = [3, 2], STATION_XY = [0, 2];
function initTown(T) {
  const cells = [];
  for (let y = 0; y < TOWN_H; y++) for (let x = 0; x < TOWN_W; x++) {
    const c = { x, y, own: false, b: null, sp: null };
    if (x === STAD_XY[0] && y === STAD_XY[1]) { c.sp = 'stadium'; c.own = true; }
    else if (x === STATION_XY[0] && y === STATION_XY[1]) { c.sp = 'station'; }
    else if (Math.abs(x - STAD_XY[0]) + Math.abs(y - STAD_XY[1]) === 1) c.own = true;
    cells.push(c);
  }
  const pk = cells.find(c => c.x === 3 && c.y === 3); pk.b = { k: 'parking', lv: 1, wk: 0 };
  G.town = { cells, attach: 20 + T.market * 4, base: 8000 + T.market * 6000, stat: {}, landIdx: 1 };
  computeTownStats();
}
function cellAt(x, y) { return G.town.cells.find(c => c.x === x && c.y === y); }
function nearStadium(c) { return Math.abs(c.x - STAD_XY[0]) <= 1 && Math.abs(c.y - STAD_XY[1]) <= 1; }
function landPrice(c) {
  const T = uT();
  const dist = Math.abs(c.x - STAD_XY[0]) + Math.abs(c.y - STAD_XY[1]);
  const dSt = Math.abs(c.x - STATION_XY[0]) + Math.abs(c.y - STATION_XY[1]);
  return roundSal(30000 * (1.5 - dist * 0.12 + (dSt <= 1 ? 0.25 : 0)) * G.town.landIdx * (0.6 + T.market * 0.12));
}
function buyLand(c) {
  if (c.own || c.sp) return false;
  const p = landPrice(c); if (G.fin.cash < p) return false;
  book('exp', 'land', p); G.fin.capexY = (G.fin.capexY || 0) + p; c.own = true;
  addNews('town', `球場周辺の土地を${fmtOku(p)}で取得しました`, { tid: G.user.tid });
  return true;
}
function bldCost(k, lv) { return Math.round(BLD[k].cost * (lv <= 1 ? 1 : Math.pow(1.6, lv - 1))); }
function canBuild(c, k) {
  const d = BLD[k];
  if (!c.own || c.sp) return { ok: false, why: '球団の土地ではありません' };
  if (c.b) return { ok: false, why: 'すでに建物があります' };
  if (d.req === 'vib50' && (G.town.stat.vib < 50)) return { ok: false, why: '街の賑わい50以上で自治体と協議できます' };
  if (k === 'station' && G.town.cells.some(x => x.b && x.b.k === 'station')) return { ok: false, why: '新駅はひとつだけです' };
  const cost = bldCost(k, 1);
  if (G.fin.cash < cost) return { ok: false, why: '資金が足りません' };
  return { ok: true, cost };
}
function build(c, k) {
  const r = canBuild(c, k); if (!r.ok) return r;
  book('exp', 'capex', r.cost); G.fin.capexY = (G.fin.capexY || 0) + r.cost;
  c.b = { k, lv: 1, wk: BLD[k].wk };
  addNews('town', `${BLD[k].n}の建設を開始（${BLD[k].wk}週）`, { tid: G.user.tid });
  return { ok: true };
}
function upgradeBld(c) {
  if (!c.b || c.b.wk > 0 || c.b.lv >= 3) return false;
  const cost = bldCost(c.b.k, c.b.lv + 1); if (G.fin.cash < cost) return false;
  book('exp', 'capex', cost); G.fin.capexY = (G.fin.capexY || 0) + cost;
  c.b.lv++; c.b.wk = Math.ceil(BLD[c.b.k].wk * 0.6);
  addNews('town', `${BLD[c.b.k].n}の拡張工事を開始（Lv${c.b.lv}）`, { tid: G.user.tid });
  return true;
}
function demolish(c) { if (!c.b) return; c.b = null; computeTownStats(); }
function bldMul(b) { return 1 + (b.lv - 1) * 0.7; }
function BLD_EFFECT(key) {
  let s = 0;
  for (const c of G.town.cells) if (c.b && !c.b.wk && BLD[c.b.k][key]) s += BLD[c.b.k][key] * bldMul(c.b) * (BLD[c.b.k].near && nearStadium(c) ? 1.2 : 1);
  return s;
}
function computeTownStats() {
  const tw = G.town;
  const st = { acc: 20, vib: 10, pop: tw.base, food: 0, goods: 0, sat: 0, gameRev: 0, heal: 0, fans: 0, academy: 0 };
  for (const c of tw.cells) {
    if (!c.b || c.b.wk) continue;
    const d = BLD[c.b.k]; const m = bldMul(c.b) * (d.near && nearStadium(c) ? 1.2 : 1);
    st.acc += (d.acc || 0) * m; st.vib += (d.vib || 0) * m; st.pop += (d.pop || 0) * m;
    st.food += (d.food || 0) * m; st.goods += (d.goods || 0) * m; st.sat += (d.sat || 0) * m;
    st.gameRev += (d.game || 0) * m; st.heal += (d.heal || 0) * m; st.fans += (d.fans || 0) * m; st.academy += (d.academy || 0) * m;
  }
  st.vib = Math.round(st.vib); st.acc = Math.round(st.acc);
  tw.stat = st;
  tw.landIdx = 1 + st.vib / 150;
}
function townWeeklyRevenue(season) {
  let r = 0;
  for (const c of G.town.cells) {
    if (!c.b || c.b.wk) continue;
    const d = BLD[c.b.k]; const m = bldMul(c.b) * (d.near && nearStadium(c) ? 1.2 : 1);
    let v = d.rev * m;
    if (c.b.k === 'hotel' && season) v *= 1.4;
    if (d.offrev && !season) v += d.offrev * m;
    r += v;
  }
  return r * (0.85 + G.town.stat.vib / 400);
}
function townWeekly() {
  const tw = G.town;
  tw.attach = clamp(tw.attach + adEffect('attach') + BLD_EFFECT('attach') * 0.004 - (tw.attach - 30) * 0.002, 0, 100);
  uT().fans += tw.stat.fans * 0.05;
}
