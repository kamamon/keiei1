/* =========================================================
   チーム：登録・オーダー・投手陣の役割
   lv: 1=1軍 2=2軍(支配下) 3=育成
   ========================================================= */
const LIM = { first: 29, shihai: 70, frn1: 4, ikusei: 40 };
const SLOTS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

function T_(tid) { return G.teams[tid]; }
function P_(id) { return G.players[id]; }
function uT() { return G.teams[G.user.tid]; }
function isUser(tid) { return tid === G.user.tid; }
function roster(tid) { return G.teams[tid].roster.map(P_).filter(Boolean); }
function rosterLv(tid, lv) { return roster(tid).filter(p => p.lv === lv); }
function shihai(tid) { return roster(tid).filter(p => p.lv !== 3); }
function firstFrnCount(tid) { return rosterLv(tid, 1).filter(p => p.frn).length; }

function addToTeam(p, tid, lv) {
  if (p.team >= 0 && G.teams[p.team]) removeFromTeam(p);
  p.team = tid; p.lv = lv || 2;
  if (p.lv === 3) p.ikusei = true;
  const T = G.teams[tid];
  if (!T.roster.includes(p.id)) T.roster.push(p.id);
  if (p.orig < 0) p.orig = tid;
  assignNumber(p, tid);
}
function removeFromTeam(p) {
  if (p.team >= 0 && G.teams[p.team]) {
    const T = G.teams[p.team];
    T.roster = T.roster.filter(id => id !== p.id);
    if (isUser(p.team)) cleanManual(p.id);
  }
  p.team = -1; p.num = -1;
}
function assignNumber(p, tid) {
  const used = new Set(roster(tid).filter(x => x !== p && x.num >= 0).map(x => x.num));
  if (p.num >= 0 && !used.has(p.num) && ((p.lv === 3) === (p.num >= 100))) return;
  let pref;
  if (p.lv === 3) pref = Array.from({ length: 100 }, (_, i) => 100 + i);
  else if (isP(p)) pref = [11, 14, 15, 16, 17, 18, 19, 20, 12, 13, 21, 26, 28, 29, 30, 34, 36, 41, 43, 45, 46, 47, 48, 49, 57, 59, 61, 62, 63, 64, 65, 66, 67, 68, 69, 90, 91, 92, 93, 94];
  else pref = [1, 2, 3, 5, 6, 7, 8, 9, 10, 0, 4, 22, 23, 24, 25, 27, 31, 32, 33, 35, 37, 38, 39, 40, 42, 44, 50, 51, 52, 53, 54, 55, 56, 58, 60, 95, 96, 97, 98, 99];
  for (const n of pref) if (!used.has(n)) { p.num = n; return; }
  for (let n = 0; n < 200; n++) if (!used.has(n)) { p.num = n; return; }
}
function numStr(p) { return p.num >= 100 ? String(p.num).padStart(3, '0') : String(p.num); }

/* ---------- 守備位置の適性 ---------- */
function fitPos(p, slot) {
  if (slot === 'DH') return 1;
  const pp = p.pos;
  if (pp === 'P') return 0;
  if (slot === 'LF' || slot === 'CF' || slot === 'RF') {
    if (pp === 'OF') return 1;
    if (pp === '2B' || pp === 'SS') return 0.82;
    if (pp === '1B' || pp === '3B') return 0.72;
    return 0.5;
  }
  if (slot === pp) return 1;
  const m = { SS: { '2B': 0.85, '3B': 0.8 }, '2B': { SS: 0.93, '3B': 0.85 }, '3B': { SS: 0.92, '2B': 0.85, '1B': 0.75 }, '1B': { '3B': 0.92, OF: 0.85, C: 0.88, '2B': 0.9, SS: 0.9 }, C: {} };
  const row = m[slot];
  if (row && row[pp]) return row[pp];
  if (slot === 'C') return 0.25;
  return 0.6;
}
function fatPen(p) { return Math.max(0, (p.fat || 0) - 55) * 0.25; }
function slotScore(p, slot) {
  const f = fitPos(p, slot);
  const defv = defVal(p) * f - (1 - f) * 30;
  const w = POS_DEFW[slot];
  return offVal(p) * (1 - w) + defv * w - fatPen(p) + (p.form || 0) * 1.2;
}

/* ---------- 自動オーダー ---------- */
function autoLineup(tid, excludeIds) {
  const ex = excludeIds || new Set();
  const bats = rosterLv(tid, 1).filter(p => !isP(p) && p.injW === 0 && !ex.has(p.id));
  const used = new Set(); const lu = [];
  const order = ['C', 'SS', '2B', 'CF', '3B', 'RF', 'LF', '1B', 'DH'];
  for (const s of order) {
    let best = null, bv = -1e9;
    for (const p of bats) {
      if (used.has(p.id)) continue;
      let v = slotScore(p, s);
      if (s === 'CF') v += (p.a.spd - 60) * 0.15;
      if (s === 'C' && p.pos !== 'C') v -= 25;
      if (v > bv) { bv = v; best = p; }
    }
    if (best) { lu.push({ p: best, pos: s }); used.add(best.id); }
  }
  // 野手が足りない場合は2軍から（AIの緊急措置）
  if (lu.length < 9) {
    const extra = rosterLv(tid, 2).filter(p => !isP(p) && p.injW === 0 && !used.has(p.id)).sort((a, b) => offVal(b) - offVal(a));
    for (const s of order) { if (lu.find(x => x.pos === s)) continue; const p = extra.shift(); if (!p) break; lu.push({ p, pos: s }); used.add(p.id); }
  }
  return battingOrder(lu);
}
function battingOrder(list) {
  const arr = list.slice();
  const take = f => { let bi = 0, bv = -1e9; arr.forEach((x, i) => { const v = f(x.p); if (v > bv) { bv = v; bi = i; } }); return arr.splice(bi, 1)[0]; };
  const res = [];
  if (arr.length >= 5) {
    const o4 = take(p => p.a.pow * 0.62 + p.a.con * 0.38);
    const o3 = take(p => offVal(p));
    const o1 = take(p => p.a.spd * 0.35 + p.a.eye * 0.3 + p.a.con * 0.35);
    const o2 = take(p => p.a.con * 0.5 + p.a.eye * 0.2 + p.a.spd * 0.3);
    const o5 = take(p => p.a.pow * 0.5 + p.a.con * 0.5);
    res.push(o1, o2, o3, o4, o5);
  }
  arr.sort((x, y) => offVal(y.p) - offVal(x.p));
  return res.concat(arr);
}

/* ---------- 投手陣の役割 ---------- */
function autoRoles(tid) {
  const ps = rosterLv(tid, 1).filter(p => isP(p) && p.injW === 0);
  const spScore = p => spOvr(p) + (p.pt === 'SP' ? 5 : -3) + (p.a.sta - 55) * 0.12;
  const sp = ps.filter(p => p.a.sta >= 38).sort((a, b) => spScore(b) - spScore(a)).slice(0, 6);
  const rest = ps.filter(p => !sp.includes(p)).sort((a, b) => rpOvr(b) - rpOvr(a));
  return { rot: sp.map(p => p.id), cl: rest[0] ? rest[0].id : null, su: rest.slice(1, 3).map(p => p.id), mr: rest.slice(3).map(p => p.id) };
}
function getRoles(tid) {
  const T = G.teams[tid];
  if (!T._roles || T._rolesStamp !== G.stamp) { T._roles = computeRoles(tid); T._rolesStamp = G.stamp; }
  return T._roles;
}
function computeRoles(tid) {
  const auto = autoRoles(tid);
  if (!isUser(tid) || G.user.lineupMode !== 'manual') return auto;
  const ok = id => { const p = P_(id); return p && p.team === tid && p.lv === 1 && isP(p) && p.injW === 0; };
  const m = G.user.manual;
  const rot = (m.rot || []).filter(ok).slice(0, 6);
  for (const id of auto.rot) if (rot.length < 6 && !rot.includes(id)) rot.push(id);
  for (const id of auto.su.concat(auto.mr, auto.cl != null ? [auto.cl] : [])) if (rot.length < 5 && !rot.includes(id)) rot.push(id);
  const usedR = new Set(rot);
  let cl = ok(m.cl) && !usedR.has(m.cl) ? m.cl : null;
  const su = (m.su || []).filter(id => ok(id) && !usedR.has(id) && id !== cl).slice(0, 2);
  const pool = rosterLv(tid, 1).filter(p => isP(p) && p.injW === 0 && !usedR.has(p.id) && p.id !== cl && !su.includes(p.id)).sort((a, b) => rpOvr(b) - rpOvr(a));
  if (cl == null && pool.length) cl = pool.shift().id;
  while (su.length < 2 && pool.length) su.push(pool.shift().id);
  return { rot, cl, su, mr: pool.map(p => p.id) };
}
function getLineup(tid) {
  const T = G.teams[tid];
  if (!T._lu || T._luStamp !== G.stamp) { T._lu = computeLineup(tid); T._luStamp = G.stamp; }
  return T._lu;
}
function computeLineup(tid) {
  if (!isUser(tid) || G.user.lineupMode !== 'manual') return autoLineup(tid);
  const m = G.user.manual.lu || [];
  const out = []; const used = new Set(); const usedPos = new Set();
  for (let i = 0; i < 9; i++) {
    const e = m[i];
    if (!e) { out.push(null); continue; }
    const p = P_(e.id);
    if (!p || p.team !== tid || p.lv !== 1 || isP(p) || p.injW > 0 || used.has(p.id) || usedPos.has(e.pos)) { out.push({ hole: true, pos: e.pos }); continue; }
    out.push({ p, pos: e.pos }); used.add(p.id); usedPos.add(e.pos);
  }
  // 欠けた枠（故障・降格など）は控えから自動で埋める
  const freePos = SLOTS.filter(s => !usedPos.has(s));
  const bench = rosterLv(tid, 1).filter(p => !isP(p) && p.injW === 0 && !used.has(p.id));
  for (let i = 0; i < 9; i++) {
    if (out[i] && out[i].p) continue;
    let pos = out[i] && out[i].pos && freePos.includes(out[i].pos) ? out[i].pos : freePos[0];
    if (!pos) pos = 'DH';
    if (freePos.includes(pos)) freePos.splice(freePos.indexOf(pos), 1);
    const best = maxBy(bench.filter(p => !used.has(p.id)), p => slotScore(p, pos) + (pos === 'C' && p.pos !== 'C' ? -25 : 0));
    if (best) { out[i] = { p: best, pos }; used.add(best.id); } else out[i] = null;
  }
  return out.filter(x => x && x.p);
}
function cleanManual(id) {
  const m = G.user.manual; if (!m) return;
  if (m.lu) m.lu = m.lu.map(e => e && e.id === id ? { id: -1, pos: e.pos } : e);
  if (m.rot) m.rot = m.rot.filter(x => x !== id);
  if (m.su) m.su = m.su.filter(x => x !== id);
  if (m.cl === id) m.cl = null;
}
function touch() { G.stamp = (G.stamp || 0) + 1; }

/* ---------- 1軍の自動編成 ---------- */
function autoRoster(tid) {
  const all = shihai(tid);
  const healthy = all.filter(p => p.injW === 0);
  const pick1 = new Set(); let frn = 0;
  const canAdd = p => !pick1.has(p.id) && (!p.frn || frn < LIM.frn1);
  const add = p => { pick1.add(p.id); if (p.frn) frn++; };
  const pits = healthy.filter(isP);
  const sps = pits.filter(p => p.a.sta >= 38).sort((a, b) => (spOvr(b) + (b.pt === 'SP' ? 5 : 0)) - (spOvr(a) + (a.pt === 'SP' ? 5 : 0)));
  let nsp = 0; for (const p of sps) { if (nsp >= 6) break; if (canAdd(p)) { add(p); nsp++; } }
  const rps = pits.filter(p => !pick1.has(p.id)).sort((a, b) => rpOvr(b) - rpOvr(a));
  let nrp = 0; for (const p of rps) { if (nrp >= 8) break; if (canAdd(p)) { add(p); nrp++; } }
  const bats = healthy.filter(p => !isP(p));
  const cs = bats.filter(p => p.pos === 'C').sort((a, b) => batOvr(b.a, 'C') - batOvr(a.a, 'C'));
  let nc = 0; for (const p of cs) { if (nc >= 2) break; if (canAdd(p)) { add(p); nc++; } }
  for (const pos of ['SS', '2B', '3B', '1B']) {
    const c = bats.filter(p => p.pos === pos && !pick1.has(p.id)).sort((a, b) => batOvr(b.a, pos) - batOvr(a.a, pos));
    for (const p of c) { if (canAdd(p)) { add(p); break; } }
  }
  const ofs = bats.filter(p => p.pos === 'OF' && !pick1.has(p.id)).sort((a, b) => batOvr(b.a, 'OF') - batOvr(a.a, 'OF'));
  let nof = 0; for (const p of ofs) { if (nof >= 4) break; if (canAdd(p)) { add(p); nof++; } }
  const restB = bats.filter(p => !pick1.has(p.id)).sort((a, b) => ovr(b) - ovr(a));
  for (const p of restB) { if (pick1.size >= LIM.first - 0) break; if (pick1.size - nsp - nrp >= 15) break; if (canAdd(p)) add(p); }
  const restAll = healthy.filter(p => !pick1.has(p.id)).sort((a, b) => ovr(b) - ovr(a));
  for (const p of restAll) { if (pick1.size >= LIM.first) break; if (canAdd(p)) add(p); }
  for (const p of all) p.lv = pick1.has(p.id) ? 1 : 2;
  touch();
}

/* 故障者の入れ替え（同じ投手/野手で補充） */
function swapInjured(tid) {
  let changed = false;
  const first = rosterLv(tid, 1);
  for (const p of first) {
    if (p.injW <= 0) continue;
    p.lv = 2; changed = true;
    const frn = firstFrnCount(tid);
    const cands = rosterLv(tid, 2).filter(x => x.injW === 0 && isP(x) === isP(p) && (!x.frn || frn < LIM.frn1));
    let rep;
    if (isP(p)) rep = maxBy(cands, x => Math.max(spOvr(x), rpOvr(x)));
    else {
      const needC = rosterLv(tid, 1).filter(x => x.pos === 'C' && x.injW === 0).length < 2;
      rep = maxBy(cands, x => ovr(x) + (needC && x.pos === 'C' ? 30 : 0) + (x.pos === p.pos ? 4 : 0));
    }
    if (rep) rep.lv = 1;
  }
  if (changed) touch();
  return changed;
}

/* ---------- チーム評価 ---------- */
function teamDefense(lu) {
  const W = { C: 1.2, SS: 1.3, '2B': 1.1, '3B': 1.0, CF: 1.1, LF: 0.7, RF: 0.8, '1B': 0.6, DH: 0 };
  let s = 0, w = 0;
  for (const x of lu) { const ww = W[x.pos] || 0; if (!ww) continue; s += (defVal(x.p) * fitPos(x.p, x.pos) - (1 - fitPos(x.p, x.pos)) * 20) * ww; w += ww; }
  return w ? s / w : 55;
}
function teamPower(tid) {
  const lu = getLineup(tid); const ro = getRoles(tid);
  const bat = lu.length ? avg(lu, x => offVal(x.p)) : 40;
  const rot = ro.rot.map(P_).filter(Boolean);
  const pen = [ro.cl].concat(ro.su, ro.mr.slice(0, 3)).map(P_).filter(Boolean);
  const sp = rot.length ? avg(rot, spOvr) : 40;
  const rp = pen.length ? avg(pen, rpOvr) : 40;
  const def = teamDefense(lu);
  const spd = lu.length ? avg(lu, x => x.p.a.spd) : 50;
  const total = bat * 0.42 + sp * 0.30 + rp * 0.13 + def * 0.15;
  return { bat, sp, rp, def, spd, total };
}
function teamMgr(tid) {
  if (isUser(tid)) { const m = uStaff('mgr'); return m ? { tac: m.tac, dev: m.dev, lead: m.lead, fame: m.fame, style: m.style } : { tac: 40, dev: 40, lead: 40, fame: 30, style: '攻撃型' }; }
  return G.teams[tid].mgr;
}
