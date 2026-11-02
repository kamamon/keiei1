/* =========================================================
   スタッフ（監督・コーチ・スカウト・フロント）
   ========================================================= */
const USER_ROLES = ['mgr', 'head', 'bat', 'pit', 'fld', 'farm', 'ikusei', 'cond', 'ana', 'sales', 'pr'];
const MAX_SCOUTS = 8;

function makeStaff(role, o) {
  o = o || {};
  const q = o.q !== undefined ? o.q : 55;
  const s = { id: G.sid++, role, name: o.name || genJpName(), age: o.age || ri(38, 64), abil: clamp(Math.round(rn(q, 11)), 20, 96), sal: 0, yrs: ri(1, 3), team: -1, ex: o.ex || null };
  if (role === 'mgr' || role === 'head') {
    s.tac = clamp(Math.round(rn(q, 12)), 20, 97); s.dev = clamp(Math.round(rn(q, 12)), 20, 97); s.lead = clamp(Math.round(rn(q, 12)), 20, 97); s.fame = clamp(Math.round(rn(q - 5, 15) + (o.ex ? 12 : 0)), 10, 99);
    s.style = pick(MGR_STYLES);
    s.abil = Math.round((s.tac + s.dev + s.lead + s.fame) / 4);
  }
  if (role === 'scout') { s.eye = clamp(Math.round(rn(q, 12)), 20, 97); s.nego = clamp(Math.round(rn(q, 12)), 20, 97); s.reg = o.reg !== undefined ? o.reg : ri(0, 5); s.abil = Math.round((s.eye + s.nego) / 2); s.assign = s.reg; }
  s.sal = staffSalary(s);
  return s;
}
function staffSalary(s) { const b = STAFF_ROLES[s.role].base; return roundSal(b * Math.pow(0.55 + s.abil / 100, 2.2)); }
function uStaff(role) { if (!G.ustaff) return null; const id = G.ustaff[role]; return id != null ? G.staff[id] : null; }
function userScouts() { return (G.ustaff.scouts || []).map(id => G.staff[id]).filter(Boolean); }
function userStaffList() { const out = []; for (const r of USER_ROLES) { const s = uStaff(r); if (s) out.push(s); } return out.concat(userScouts()); }
function coach(role) { const s = uStaff(role); return s ? s.abil : 30; }

function initUserStaff(T) {
  G.ustaff = { scouts: [] };
  const q = 45 + T.market * 3;
  for (const r of USER_ROLES) { const s = makeStaff(r, { q: q + ri(-6, 6) }); s.team = T.id; G.staff[s.id] = s; G.ustaff[r] = s.id; }
  for (let i = 0; i < 4; i++) { const s = makeStaff('scout', { q: q - 2, reg: [T.region, 1, 3, 5][i] }); s.team = T.id; G.staff[s.id] = s; G.ustaff.scouts.push(s.id); }
  refreshStaffPool();
}
function refreshStaffPool() {
  for (const id of G.staffPool || []) delete G.staff[id];
  G.staffPool = [];
  const roles = ['mgr', 'mgr', 'head', 'bat', 'bat', 'pit', 'pit', 'fld', 'farm', 'ikusei', 'cond', 'cond', 'ana', 'ana', 'sales', 'pr', 'scout', 'scout', 'scout', 'scout', 'scout'];
  for (const r of roles) { const s = makeStaff(r, { q: ri(42, 72) }); G.staff[s.id] = s; G.staffPool.push(s.id); }
  for (const ex of (G.retiredCoaches || []).splice(0)) { const s = makeStaff(ex.role, { q: ex.q, name: ex.name, age: ex.age, ex: ex.pid }); G.staff[s.id] = s; G.staffPool.push(s.id); }
}
function fireCost(s) { return Math.round(s.sal * Math.max(0, s.yrs - (curTurn() >= 44 ? 1 : 0)) * 0.5); }
function hireStaff(id, slotRole) {
  const s = G.staff[id]; if (!s || s.team !== -1) return { ok: false, why: '採用できません' };
  if (s.role === 'scout') {
    if (userScouts().length >= MAX_SCOUTS) return { ok: false, why: 'スカウトは最大' + MAX_SCOUTS + '人です' };
    G.ustaff.scouts.push(id);
  } else {
    const cur = uStaff(s.role);
    if (cur) { const c = fireCost(cur); if (c > 0) book('exp', 'staff', c); cur.team = -1; G.staffPool.push(cur.id); }
    G.ustaff[s.role] = id;
  }
  s.team = G.user.tid; s.yrs = Math.max(1, s.yrs);
  G.staffPool = G.staffPool.filter(x => x !== id);
  addNews('staff', `${STAFF_ROLES[s.role].n}に${s.name}が就任しました`, { tid: G.user.tid, important: s.role === 'mgr' });
  touch();
  return { ok: true };
}
function fireStaff(id) {
  const s = G.staff[id]; if (!s || s.team !== G.user.tid) return;
  const c = fireCost(s); if (c > 0) book('exp', 'staff', c);
  if (s.role === 'scout') G.ustaff.scouts = G.ustaff.scouts.filter(x => x !== id);
  else if (G.ustaff[s.role] === id) G.ustaff[s.role] = null;
  s.team = -1; G.staffPool.push(id);
  addNews('staff', `${STAFF_ROLES[s.role].n}の${s.name}との契約を解除しました`, { tid: G.user.tid });
}
function staffYearEnd() {
  for (const s of userStaffList()) {
    s.age++; if (s.age < 62) s.abil = clamp(s.abil + ri(0, 2), 0, 97);
    if (s.role === 'mgr' || s.role === 'head') { s.tac = clamp(s.tac + ri(-1, 2), 0, 97); s.dev = clamp(s.dev + ri(-1, 2), 0, 97); }
    if (s.role === 'scout') { s.eye = clamp(s.eye + ri(0, 2), 0, 97); }
    s.yrs--;
    if (s.yrs <= 0) {
      // 自動で1年延長（年俸を見直し）。不要なら解任する
      s.yrs = 1; s.sal = staffSalary(s);
      addNews('staff', `${STAFF_ROLES[s.role].n}の${s.name}と1年契約を更新しました`, { tid: G.user.tid });
    }
  }
  // AI球団の監督交代
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    if ((T.lastRank || 3) >= 5 && chance(0.4)) { T.mgr = aiManager(T.market); addNews('staff', `${tName(T.id)}が監督交代を発表`, { tid: T.id }); }
  }
  refreshStaffPool();
}
function aiManager(market) {
  const q = 50 + market * 2 + ri(-8, 8);
  return { name: genJpName(), tac: clamp(Math.round(rn(q, 10)), 25, 95), dev: clamp(Math.round(rn(q, 10)), 25, 95), lead: clamp(Math.round(rn(q, 10)), 25, 95), fame: clamp(Math.round(rn(q, 14)), 15, 95), style: pick(MGR_STYLES) };
}
