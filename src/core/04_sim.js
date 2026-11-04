/* =========================================================
   試合エンジン（1打席ずつのシミュレーション）
   ========================================================= */
const LGC = { bb: .077, hbp: .008, k: .188, hr: .0195, babip: .290, err: .012, dbl: .20, tri: .020 };
function nz(v) { return (v - 60) / 40; }
const DEF_FX = { vsL: 0, vsLB: 0, bk: 1, bhr: 1, bab: 0, pk: 1, pbb: 1, phr: 1, pbab: 0, go: 0, nobi: 0, inf: false };
const DEF_C = { con: 63, pow: 63, eye: 63, spd: 63, arm: 63, fld: 63, def: 63, stuff: 63, ctl: 63 };
function nzk(v, k) { const C = G.simC || DEF_C; return (v - C[k]) / 40; }
/* リーグ全体の水準を基準にする（能力が全体に上下しても得点環境が安定する） */
function computeSimCenter() {
  const acc = { con: 0, pow: 0, eye: 0, spd: 0, arm: 0, fld: 0, def: 0, stuff: 0, ctl: 0 }; let nb = 0, np = 0, nt = 0;
  for (const T of G.teams) {
    const lu = autoLineup(T.id); const ro = autoRoles(T.id);
    for (const x of lu) { const a = x.p.a; acc.con += a.con; acc.pow += a.pow; acc.eye += a.eye; acc.spd += a.spd; acc.arm += a.arm; acc.fld += a.fld; nb++; }
    if (lu.length) { acc.def += teamDefense(lu); nt++; }
    for (const id of ro.rot.concat(ro.su, ro.cl != null ? [ro.cl] : [])) { const p = P_(id); if (!p) continue; acc.stuff += velScore(p.a.vel) * 0.45 + p.a.brk * 0.55; acc.ctl += p.a.ctl; np++; }
  }
  const C = {};
  for (const k of ['con', 'pow', 'eye', 'spd', 'arm', 'fld']) C[k] = nb ? acc[k] / nb : 63;
  C.def = nt ? acc.def / nt : 63; C.stuff = np ? acc.stuff / np : 63; C.ctl = np ? acc.ctl / np : 63;
  G.simC = C;
}
function pitMax(p, isSP) { const iron = skFx(p).iron; return isSP ? 68 + p.a.sta * 0.56 + (iron ? 10 : 0) : 16 + p.a.sta * 0.36 + (iron ? 6 : 0); }
function parkHR(hid) { return isUser(hid) ? G.stad.hrF : G.teams[hid].stad.hrF; }
function pcFor(r) {
  switch (r) { case 'K': return 4 + ri(0, 3); case 'BB': return 5 + ri(0, 2); case 'HBP': return 1 + ri(0, 3); default: return 1 + ri(0, 5); }
}
function relAvail(p, dayNo) {
  if (p.injW > 0) return false;
  const r = p.rel; if (!r) return true;
  if (r.last === dayNo) return false;
  const fx = skFx(p);
  const lim = 3 + (fx.rec >= 2 ? 1 : 0) - (fx.rec <= -2 ? 1 : 0), pcl = 38 + fx.rec * 5 + (fx.iron ? 10 : 0);
  if (r.last === dayNo - 1 && (r.consec >= lim || r.pc > pcl)) return false;
  return true;
}
/* sit：その打席の状況（risp＝得点圏に走者、wo＝サヨナラの場面） */
function batEff(p, home, side, sit) {
  const a = p.a; const fx = skFx(p);
  const f = (p.form || 0) * 2.5 + (p.mor - 50) * 0.04 - fatPen(p) * 0.6 + (p.adapt || 0) + (home ? 1.2 : 0) + side.tacB;
  let ac = fx.bcon, ap = 0;
  if (sit && sit.risp && fx.chance) { ac += fx.chance * 0.035; ap += fx.chance * 0.03; }
  if (sit && sit.wo && fx.wo) { ac += 0.08; ap += 0.08; }
  return { con: nzk(a.con + f, 'con') + ac, pow: nzk(a.pow + f, 'pow') + ap, eye: nzk(a.eye + f * 0.5, 'eye'), spd: nzk(a.spd, 'spd'), bats: p.bats, fx };
}
function pitEff(ps, side, sit, inn) {
  const p = ps.p, a = p.a; const fx = skFx(p);
  const t = Math.max(0, (ps.pc - 0.78 * ps.maxP) / (0.45 * ps.maxP));
  const pen = Math.min(30, t * 22);
  const f = (p.form || 0) * 2.5 + (p.mor - 50) * 0.04 + (p.adapt || 0) + side.tacB;
  const vs = velScore(a.vel) - pen * 0.8 + f;
  let st = fx.st + fx.nobi * 0.03, ct = fx.ct;
  if (sit && sit.risp && fx.pinch) st += fx.pinch * 0.04;
  if (ps.r >= 2 && fx.tough) { st += fx.tough * 0.04; ct += fx.tough * 0.03; }
  if (fx.late && inn >= 7) st += 0.06;
  if (fx.slow && ps.isSP && inn <= 1) { st -= 0.08; ct -= 0.08; }
  if (ps.shaky) ct -= 0.2;
  if (side.catFx) { st += side.catFx * 0.025; ct += side.catFx * 0.02; }
  return { stuff: vs * 0.45 + (a.brk - pen + f) * 0.55, ctl: a.ctl - pen * 0.7 + f * 0.6, thr: p.thr, fx, st, ct };
}
function simPA(b, pe, defN, park) {
  const bf = b.fx || DEF_FX, pf = pe.fx || DEF_FX;
  let con = b.con, pow = b.pow; const eye = b.eye, spd = b.spd;
  const bh = b.bats === 'S' ? (pe.thr === 'R' ? 'L' : 'R') : b.bats;
  const stuff = nzk(pe.stuff, 'stuff') + (pe.st || 0) + (bh === 'L' ? pf.vsLB * 0.04 : 0), ctl = nzk(pe.ctl, 'ctl') + (pe.ct || 0);
  const pl = (bh !== pe.thr) ? 0.05 : -0.07;
  con += pl; pow += pl * 0.8;
  if (pe.thr === 'L' && bf.vsL) { con += bf.vsL * 0.03; pow += bf.vsL * 0.025; }
  const pBB = LGC.bb * Math.exp(0.45 * eye - 0.55 * ctl) * pf.pbb;
  const pHBP = LGC.hbp * Math.exp(-0.25 * ctl);
  const pK = LGC.k * Math.exp(-0.55 * con + 0.55 * stuff - 0.15 * eye) * bf.bk * pf.pk * (1 + pf.nobi * 0.02);
  const pHR = LGC.hr * Math.exp(1.35 * pow - 0.45 * stuff - 0.1 * ctl - 0.05 * pf.nobi) * park * bf.bhr * pf.phr;
  let r = rnd();
  if ((r -= pBB) < 0) return 'BB';
  if ((r -= pHBP) < 0) return 'HBP';
  if ((r -= pK) < 0) return 'K';
  if ((r -= pHR) < 0) return 'HR';
  if (rnd() < LGC.err * (1 - 0.5 * defN)) return 'E';
  const babip = LGC.babip * (1 + 0.16 * con + 0.05 * spd - 0.10 * stuff - 0.07 * defN) + bf.bab + pf.pbab;
  if (rnd() < babip) {
    const r2 = rnd(); const tri = LGC.tri * (1 + 0.8 * spd); const dbl = LGC.dbl * (1 + 0.6 * pow + 0.1 * spd);
    if (r2 < tri) return '3B'; if (r2 < tri + dbl) return '2B'; return '1B';
  }
  if (rnd() < (0.48 - 0.10 * pow + pf.go)) return bf.inf && rnd() < clamp(0.06 + 0.05 * spd, 0.02, 0.12) ? '1B' : 'GO';
  return 'FO';
}

function pickStarter(tid, roles, dayNo) {
  const T = G.teams[tid]; const rot = roles.rot;
  for (let k = 0; k < rot.length; k++) {
    const idx = ((T.rotIdx || 0) + k) % rot.length; const p = P_(rot[idx]);
    if (p && p.injW === 0 && dayNo - p.ls >= (LG.rest || 6) && !benched(p)) { T.rotIdx = (idx + 1) % rot.length; p.ls = dayNo; return p; }
  }
  const rotSet = new Set(rot);
  let cands = rosterLv(tid, 1).filter(p => isP(p) && p.injW === 0 && dayNo - p.ls >= (LG.rest || 6) - 1 && relAvail(p, dayNo) && !rotSet.has(p.id) && !benched(p));
  if (!cands.length) cands = rosterLv(tid, 1).filter(p => isP(p) && p.injW === 0);
  if (!cands.length) cands = roster(tid).filter(p => isP(p));
  const p = maxBy(cands, x => spOvr(x) + x.a.sta * 0.2);
  p.ls = dayNo; return p;
}
function restTired(tid, lu) {
  const inLu = new Set(lu.map(x => x.p.id));
  const bench = rosterLv(tid, 1).filter(p => !isP(p) && p.injW === 0 && !inLu.has(p.id) && !benched(p));
  return lu.map(x => {
    if (x.p.fat >= 78 && chance(0.7) && bench.length) {
      const rep = maxBy(bench, p => slotScore(p, x.pos) + (x.pos === 'C' && !canCatch(p) ? -40 : 0));
      if (rep && slotScore(rep, x.pos) > slotScore(x.p, x.pos) - 25 && (x.pos !== 'C' || canCatch(rep))) {
        bench.splice(bench.indexOf(rep), 1); return { p: rep, pos: x.pos };
      }
    }
    return x;
  });
}

function setupSide(tid, idx, S) {
  const ctx = S.ctx;
  let lu = getLineup(tid).slice();
  if (ctx.rec && !ctx.post) lu = restTired(tid, lu);
  const roles = getRoles(tid);
  const sp = pickStarter(tid, roles, ctx.dayNo || 0);
  const mgr = teamMgr(tid);
  const anaLv = isUser(tid) ? G.tfac.analytics.lv : (G.teams[tid].facLv || 2);
  const tacB = nz(mgr.tac) * 1.5 + anaLv * 0.25;
  if (ctx.rec) for (const x of lu) {
    const st = x.p.st; st.g++; st.pos[x.pos] = (st.pos[x.pos] || 0) + 1; x.p.wkG++;
    const k = subKey(x.pos);
    if (x.pos !== 'DH' && k !== x.p.pos) { const lv = addSubXp(x.p, k, 1); if (lv) subLearned(x.p, k, lv); }
  }
  const catcher = (lu.find(x => x.pos === 'C') || lu[0]).p;
  const ofx = lu.filter(x => x.pos === 'LF' || x.pos === 'CF' || x.pos === 'RF').map(x => skFx(x.p));
  const armAdj = ofx.some(f => f.laser) ? -0.08 : ofx.reduce((a, f) => a - f.thr * 0.01, 0);
  return {
    tid, idx, lu, bi: 0, roles, sp, ps: null, used: [], usedIds: new Set(), defN: nzk(teamDefense(lu), 'def'), tacB, style: mgr.style,
    catFx: catcher && catcher.pos === 'C' ? skFx(catcher).cat : 0, armAdj,
    box: ctx.box ? { bat: lu.map(x => ({ id: x.p.id, pos: x.pos, ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, hr: 0, d: 0, t: 0, sb: 0 })) } : null,
    catcher, h: 0, e: 0
  };
}
function newPS(p, isSP, S, side) {
  return { p, isSP, pc: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, hbp: 0, so: 0, hr: 0, bf: 0, inRuns: 0, maxP: pitMax(p, isSP), shaky: skFx(p).shaky && rnd() < 0.12,
    entryLead: S.score[side.idx] - S.score[1 - side.idx], entryInn: S.inn, long: false, exitLead: null, hold: false };
}
function boxLine(side, id) { if (!side.box) return null; return side.box.bat.find(b => b.id === id) || null; }

function playGame(hid, aid, ctx) {
  ctx = ctx || {};
  const S = { score: [0, 0], line: [[], []], inn: 1, half: 0, log: ctx.log ? [] : null, wc: [null, null], lc: [null, null], leader: -1, ctx, walkoff: false, hrs: [], gb: {} };
  S.park = parkHR(hid);
  S.maxInn = ctx.post ? (LG.maxInnPost || 15) : (LG.maxInn || 12);
  const sides = [setupSide(aid, 0, S), setupSide(hid, 1, S)];
  S.sides = sides;
  for (const sd of sides) { const ps = newPS(sd.sp, true, S, sd); sd.ps = ps; sd.used.push(ps); sd.usedIds.add(sd.sp.id); }
  for (; ;) {
    halfInning(S, sides[0], sides[1], 0);
    if (S.inn >= 9 && S.score[1] > S.score[0]) { S.line[1].push('X'); break; }
    halfInning(S, sides[1], sides[0], 1);
    if (S.walkoff) break;
    if (S.inn >= 9 && S.score[0] !== S.score[1]) break;
    if (S.inn >= S.maxInn) break;
    S.inn++;
  }
  return finishGame(S);
}

function changeCheck(S, def, mid) {
  const ps = def.ps; const inn = S.inn;
  const lead = S.score[def.idx] - S.score[1 - def.idx];
  let need = false, long = false;
  if (ps.isSP) {
    if (ps.pc >= ps.maxP + 12) need = true;
    else if (!mid) {
      if (ps.pc >= ps.maxP) need = true;
      else if (inn >= 9 && lead >= 1 && lead <= 3 && !(ps.r <= 1 && ps.pc < ps.maxP - 20 && rnd() < 0.3)) need = true;
      else if (inn >= 8 && lead >= 1 && lead <= 3 && ps.pc >= ps.maxP * 0.85) need = true;
      else if (inn >= 7 && ps.pc >= ps.maxP * 0.92) need = true;
      else if (inn >= 10) need = true;
    } else {
      if (ps.r >= 5 && inn <= 5) { need = true; long = true; }
      else if (ps.inRuns >= 3 && ps.pc >= ps.maxP * 0.7) need = true;
      else if (ps.r >= 7) need = true;
    }
  } else {
    if (!mid) { if (ps.outs >= 3 && !(ps.long && ps.pc < ps.maxP)) need = true; }
    else { if (ps.inRuns >= 3 && ps.outs >= 1) need = true; else if (ps.pc >= ps.maxP + 15) need = true; }
  }
  if (!need) return;
  const rp = chooseReliever(S, def, lead, long);
  if (!rp) return;
  ps.exitLead = lead;
  const nps = newPS(rp, false, S, def);
  nps.long = long || (!mid && inn <= 5);
  if (nps.long) nps.maxP = Math.max(nps.maxP, 20 + rp.a.sta * 0.6);
  def.ps = nps; def.used.push(nps); def.usedIds.add(rp.id);
  if (S.log) S.log.push({ inn: S.inn, half: S.half, t: (S.half ? '' : '') + '投手交代：' + lastName(ps.p) + ' → ' + lastName(rp), k: 'chg', tid: def.tid });
}
function chooseReliever(S, def, lead, long) {
  const dayNo = S.ctx.dayNo || 0;
  const R = def.roles;
  const rotSet = new Set(R.rot);
  const cand = rosterLv(def.tid, 1).filter(p => isP(p) && !def.usedIds.has(p.id) && !rotSet.has(p.id) && relAvail(p, dayNo) && !benched(p));
  if (!cand.length) return null;
  const inn = S.inn;
  const role = id => id === R.cl ? 'CL' : R.su[0] === id ? 'SU1' : R.su[1] === id ? 'SU2' : 'MR';
  const find = r => cand.find(p => role(p.id) === r);
  const mids = cand.filter(p => role(p.id) === 'MR');
  const best = a => a.length ? maxBy(a, rpOvr) : null, worst = a => a.length ? minBy(a, rpOvr) : null;
  const noCL = cand.filter(p => role(p.id) !== 'CL');
  if (long) return maxBy(mids.length ? mids : noCL.length ? noCL : cand, p => p.a.sta * 0.6 + rpOvr(p) * 0.4);
  if (inn >= 9 && lead >= 1 && lead <= 3) return find('CL') || find('SU1') || find('SU2') || best(cand);
  if (inn >= 9 && lead === 0) return (def.idx === 1 ? (find('CL') || find('SU1')) : (find('SU1') || find('CL'))) || best(cand);
  if (inn === 8 && lead >= 1 && lead <= 3) return find('SU1') || find('SU2') || best(mids) || best(noCL) || find('CL');
  if (inn === 7 && lead >= 1 && lead <= 3) return find('SU2') || find('SU1') || best(mids) || best(cand);
  if (inn >= 10) return find('SU1') || find('SU2') || find('CL') || best(cand);
  if (mids.length) { if (lead <= -4 || lead >= 5) return worst(mids); return best(mids); }
  return best(noCL) || best(cand);
}

function stealTry(S, off, def, runner) {
  const rf = skFx(runner.p), qf = def.ps ? skFx(def.ps.p).quick : 0;
  const sp = nzk(runner.p.a.spd, 'spd') + 0.08 + rf.steal * 0.04;
  if (sp < 0) return 0;
  const style = off.style === '機動力型' ? 1.5 : 1;
  const att = (0.06 + 0.26 * sp) * style * (S.ctx.post ? 0.8 : 1) * (1 + rf.steal * 0.12) * (rf.thief ? 1.4 : 1) * (1 - qf * 0.08);
  if (rnd() >= att) return 0;
  const arm = nzk(def.catcher.a.arm, 'arm');
  const ok = rnd() < clamp(0.68 + 0.18 * sp - 0.12 * arm + rf.steal * 0.025 - qf * 0.04, 0.4, 0.95);
  if (S.ctx.rec) { if (ok) runner.p.st.sb++; else runner.p.st.cs++; }
  const bl = boxLine(off, runner.p.id); if (bl && ok) bl.sb++;
  return ok ? 1 : -1;
}
function buntDecision(S, off, bat, half) {
  const diff = S.score[half] - S.score[1 - half];
  if (Math.abs(diff) > 2) return false;
  const weak = offVal(bat) < 55;
  let p = 0;
  if (S.inn >= 7 && weak) p = 0.55; else if (S.inn >= 7) p = 0.10; else if (weak) p = 0.22;
  if (off.style === '攻撃型') p *= 0.5;
  if (off.style === '機動力型' || off.style === '守備型') p *= 1.3;
  return rnd() < p;
}
function recordError(S, def) {
  const W = { C: 6, '1B': 8, '2B': 16, '3B': 18, SS: 22, LF: 9, CF: 10, RF: 9 };
  const cands = def.lu.filter(x => W[x.pos]);
  if (!cands.length) return;
  const f = wpick(cands, x => W[x.pos] * (110 - x.p.a.fld) / 50 * skFx(x.p).err * (1 - skFx(x.p).thr * 0.06));
  if (S.ctx.rec) f.p.st.e++;
}
function hitAdvance(type, B, outs, bat, ps, scoreRun, arm) {
  arm = arm || 0;
  const sp = x => nzk(x.p.a.spd, 'spd') + skFx(x.p).run * 0.1 + arm * 4;
  if (type === '3B') { for (let i = 2; i >= 0; i--) if (B[i]) { scoreRun(B[i], bat, true); B[i] = null; } B[2] = { p: bat, rp: ps, er: true }; return; }
  if (type === '2B') {
    if (B[2]) { scoreRun(B[2], bat, true); B[2] = null; }
    if (B[1]) { scoreRun(B[1], bat, true); B[1] = null; }
    if (B[0]) { const pr = clamp(0.40 + 0.25 * sp(B[0]) + (outs === 2 ? 0.2 : 0), 0.1, 0.9); if (rnd() < pr) scoreRun(B[0], bat, true); else B[2] = B[0]; B[0] = null; }
    B[1] = { p: bat, rp: ps, er: true }; return;
  }
  if (B[2]) { scoreRun(B[2], bat, true); B[2] = null; }
  if (B[1]) { const pr = clamp(0.55 + 0.25 * sp(B[1]) + (outs === 2 ? 0.2 : 0), 0.2, 0.95); if (rnd() < pr) scoreRun(B[1], bat, true); else B[2] = B[1]; B[1] = null; }
  if (B[0]) { if (!B[2] && rnd() < clamp(0.25 + 0.2 * sp(B[0]), 0.05, 0.6)) B[2] = B[0]; else B[1] = B[0]; B[0] = null; }
  B[0] = { p: bat, rp: ps, er: true };
}

function halfInning(S, off, def, half) {
  S.half = half;
  let outs = 0, runs = 0; const B = [null, null, null];
  const lg = S.log; const rec = S.ctx.rec;
  changeCheck(S, def, false);
  def.ps.inRuns = 0;
  // メジャー版：延長10回からは無死二塁で始める（前の回の最後の打者が二塁へ。この走者の得点は自責点にならない）
  if (LG.ghost && S.inn >= 10 && !S.ctx.post && off.lu.length) { const n = off.lu.length; B[1] = { p: off.lu[(off.bi - 1 + n) % n].p, rp: def.ps, er: false }; }
  const scoreRun = (rn, bat, rbi) => {
    runs++; S.score[half]++;
    if (rec) rn.p.st.r++;
    const bl = boxLine(off, rn.p.id); if (bl) bl.r++;
    rn.rp.r++; if (rn.er) rn.rp.er++;
    def.ps.inRuns++;
    if (rbi && bat) { if (rec) bat.st.rbi++; const b2 = boxLine(off, bat.id); if (b2) b2.rbi++; }
    const ld = S.score[0] > S.score[1] ? 0 : S.score[1] > S.score[0] ? 1 : -1;
    if (ld !== S.leader) {
      if (ld === -1) { S.wc = [null, null]; S.lc = [null, null]; }
      else { S.wc[ld] = S.sides[ld].ps; S.lc[1 - ld] = rn.rp; }
      S.leader = ld;
    }
    if (half === 1 && S.inn >= 9 && S.score[1] > S.score[0]) S.walkoff = true;
  };
  let guard = 0;
  while (outs < 3 && guard++ < 90) {
    if (guard > 1) changeCheck(S, def, true);
    const ps = def.ps;
    if (B[0] && !B[1] && outs < 2) {
      const res = stealTry(S, off, def, B[0]);
      if (res === 1) { B[1] = B[0]; B[0] = null; }
      else if (res === -1) { B[0] = null; outs++; ps.outs++; if (outs >= 3) break; }
    }
    const slot = off.lu[off.bi % off.lu.length]; off.bi++;
    const bat = slot.p;
    const st = bat.st; const bl = boxLine(off, bat.id);
    const gb = rec ? (S.gb[bat.id] || (S.gb[bat.id] = { pa: 0, h: 0, s: 0, d: 0, t: 0, hr: 0, tid: off.tid })) : null;
    if (gb) gb.pa++;
    const s0 = S.score[half];
    if (outs === 0 && B[0] && !B[2] && buntDecision(S, off, bat, half)) {
      ps.pc += ri(2, 4); ps.bf++;
      if (rec) st.pa++;
      outs++; ps.outs++;
      if (rnd() < 0.82 + skFx(bat).bunt) {
        if (rec) st.sh++;
        if (B[1]) { B[2] = B[1]; B[1] = null; }
        B[1] = B[0]; B[0] = null;
      } else {
        if (rec) st.ab++; if (bl) bl.ab++;
        if (B[1]) B[1] = B[0];
        B[0] = { p: bat, rp: ps, er: true };
      }
      continue;
    }
    const sit = { risp: !!(B[1] || B[2]), wo: half === 1 && S.inn >= 9 && S.score[1] - S.score[0] <= 0 && S.score[1] - S.score[0] >= -1 };
    const r = simPA(batEff(bat, half === 1, off, sit), pitEff(ps, def, sit, S.inn), def.defN + (skFx(ps.p).tempo ? 0.08 : 0), S.park);
    ps.pc += pcFor(r); ps.bf++;
    if (rec) st.pa++;
    let desc = '';
    switch (r) {
      case 'BB': case 'HBP': {
        if (r === 'BB') { if (rec) st.bb++; ps.bb++; } else { if (rec) st.hbp++; ps.hbp++; }
        if (bl) bl.bb++;
        if (B[0]) { if (B[1]) { if (B[2]) scoreRun(B[2], bat, true); B[2] = B[1]; } B[1] = B[0]; }
        B[0] = { p: bat, rp: ps, er: true };
        desc = r === 'BB' ? '押し出しの四球' : '押し出しの死球';
        break;
      }
      case 'K': outs++; ps.outs++; ps.so++; if (rec) { st.ab++; st.so++; } if (bl) { bl.ab++; bl.so++; } break;
      case 'HR': {
        if (rec) { st.ab++; st.h++; st.hr++; gb.h++; gb.hr++; } ps.h++; ps.hr++; off.h++;
        if (bl) { bl.ab++; bl.h++; bl.hr++; }
        const n = (B[0] ? 1 : 0) + (B[1] ? 1 : 0) + (B[2] ? 1 : 0) + 1;
        for (let i = 2; i >= 0; i--) if (B[i]) { scoreRun(B[i], bat, true); B[i] = null; }
        scoreRun({ p: bat, rp: ps, er: true }, bat, true);
        S.hrs.push({ id: bat.id, tid: off.tid, n, inn: S.inn, no: rec ? st.hr : 0 });
        if (S.walkoff) S.woHR = { id: bat.id, tid: off.tid, n };
        desc = (n === 1 ? 'ソロ本塁打' : n === 4 ? '満塁本塁打' : n + 'ラン本塁打') + (rec ? '（' + st.hr + '号）' : '');
        break;
      }
      case '1B': case '2B': case '3B': {
        if (rec) { st.ab++; st.h++; if (r === '2B') st.d++; if (r === '3B') st.t++; gb.h++; if (r === '1B') gb.s++; else if (r === '2B') gb.d++; else gb.t++; }
        ps.h++; off.h++;
        if (bl) { bl.ab++; bl.h++; if (r === '2B') bl.d++; if (r === '3B') bl.t++; }
        hitAdvance(r, B, outs, bat, ps, scoreRun, def.armAdj);
        desc = r === '1B' ? 'タイムリーヒット' : r === '2B' ? 'タイムリーツーベース' : 'タイムリースリーベース';
        break;
      }
      case 'E': {
        if (rec) st.ab++; if (bl) bl.ab++;
        def.e++; recordError(S, def);
        if (B[2]) { scoreRun(B[2], bat, false); B[2] = null; }
        if (B[1]) { B[2] = B[1]; B[1] = null; }
        if (B[0]) { B[1] = B[0]; B[0] = null; }
        B[0] = { p: bat, rp: ps, er: false };
        desc = '相手のエラー';
        break;
      }
      case 'GO': {
        if (rec) st.ab++; if (bl) bl.ab++;
        if (B[0] && outs < 2 && rnd() < clamp(0.52 - 0.22 * nzk(bat.a.spd, 'spd') + skFx(bat).gdp, 0.2, 0.75)) {
          if (rec) st.gdp++;
          outs += 2; ps.outs += 2; B[0] = null;
          if (outs < 3) { if (B[2]) { scoreRun(B[2], bat, false); B[2] = null; } if (B[1]) { B[2] = B[1]; B[1] = null; } }
          desc = '併殺打の間';
        } else {
          outs++; ps.outs++;
          if (outs < 3) {
            const f1 = !!B[0], f2 = f1 && !!B[1], f3 = f2 && !!B[2];
            if (f3) { scoreRun(B[2], bat, true); B[2] = null; }
            else if (B[2] && rnd() < 0.5) { scoreRun(B[2], bat, true); B[2] = null; }
            if (f2 || (B[1] && !B[2] && rnd() < 0.6)) { B[2] = B[1]; B[1] = null; }
            if (f1) { B[1] = B[0]; B[0] = null; }
          }
          desc = '内野ゴロの間';
        }
        break;
      }
      case 'FO': {
        outs++; ps.outs++;
        if (outs < 3 && B[2] && rnd() < clamp(0.55 + 0.2 * nzk(B[2].p.a.spd, 'spd'), 0.3, 0.85)) { if (rec) st.sf++; scoreRun(B[2], bat, true); B[2] = null; desc = '犠牲フライ'; }
        else { if (rec) st.ab++; if (bl) bl.ab++; }
        if (outs < 3 && B[1] && !B[2] && rnd() < 0.25) { B[2] = B[1]; B[1] = null; }
        break;
      }
    }
    if (lg && (S.score[half] > s0 || r === 'HR')) {
      const got = S.score[half] - s0;
      const wo = S.walkoff ? 'サヨナラ' : '';
      const nm = lastName(bat);
      let t;
      if (r === 'HR') t = nm + 'の' + wo + desc;
      else if (r === 'BB' || r === 'HBP') t = `${nm}への${wo}${desc}で${got}点`;
      else if (r === 'E') t = `${nm}の打球を相手が失策、${wo ? 'サヨナラで' : ''}${got}点`;
      else if (desc.endsWith('の間')) t = `${nm}の${desc}に${got}点`;
      else t = `${nm}の${wo}${desc}で${got}点`;
      lg.push({ inn: S.inn, half, t, k: r === 'HR' ? 'hr' : 'run', tid: off.tid, sc: S.score.slice() });
    }
    if (S.walkoff) break;
  }
  S.line[half].push(runs);
  return runs;
}

/* 1試合の偉業（公式戦）と連続試合安打 */
function gameFeats(S) {
  const out = [];
  for (const sd of S.sides) {
    const opp = S.sides[1 - sd.idx];
    const outs = sum(sd.used, x => x.outs);
    if (opp.h === 0 && outs >= 27) {
      if (sd.used.length === 1) { const ps = sd.used[0]; out.push({ k: ps.bb + ps.hbp === 0 && sd.e === 0 ? 'perfect' : 'nono', pid: ps.p.id, tid: sd.tid }); }
      else out.push({ k: 'nono2', pid: sd.used[0].p.id, tid: sd.tid });
    }
    for (const ps of sd.used) if (ps.so >= 15) out.push({ k: 'k15', pid: ps.p.id, tid: sd.tid, v: ps.so });
  }
  if (S.woHR && S.woHR.n === 4) out.push({ k: 'sayogs', pid: S.woHR.id, tid: S.woHR.tid });
  for (const id in S.gb) {
    const g = S.gb[id]; const p = P_(+id); if (!p) continue;
    if (g.s && g.d && g.t && g.hr) out.push({ k: 'cycle', pid: p.id, tid: g.tid });
    if (g.hr >= 3) out.push({ k: 'hr3', pid: p.id, tid: g.tid, v: g.hr });
    if (g.h >= 5) out.push({ k: 'h5', pid: p.id, tid: g.tid, v: g.h });
    if (g.h > 0) p.hstr = (p.hstr || 0) + 1; else if (g.pa >= 2) p.hstr = 0;
  }
  return out;
}
function finishGame(S) {
  const [A, H] = S.sides; const ctx = S.ctx;
  const sa = S.score[0], sh = S.score[1];
  const tie = sa === sh;
  const win = sh > sa ? 1 : sa > sh ? 0 : -1;
  const leadOf = sd => S.score[sd.idx] - S.score[1 - sd.idx];
  for (const sd of S.sides) { if (sd.ps.exitLead === null) sd.ps.exitLead = leadOf(sd); }
  let W = null, L = null, SV = null;
  if (win >= 0) {
    const ws = S.sides[win], ls = S.sides[1 - win];
    W = S.wc[win]; L = S.lc[1 - win];
    if (W && W.isSP && W.outs < 15) { const rel = ws.used.filter(x => !x.isSP); if (rel.length) W = maxBy(rel, x => x.outs - x.er * 4 + (x === rel[0] ? 0.5 : 0)); }
    if (!W) W = ws.used[ws.used.length - 1];
    if (!L) L = ls.used[ls.used.length - 1];
    const last = ws.used[ws.used.length - 1];
    if (last !== W && !last.isSP && ((last.entryLead >= 1 && last.entryLead <= 3 && last.outs >= 3) || (last.entryLead >= 1 && last.outs >= 9) || (last.entryLead >= 1 && last.entryLead <= 3 && last.outs >= 1 && last.entryInn >= 9))) SV = last;
  }
  const dayNo = ctx.dayNo || 0;
  const pp = [];
  for (const sd of S.sides) {
    const opp = S.score[1 - sd.idx];
    for (const ps of sd.used) {
      if (!ps.isSP && ps !== W && ps !== L && ps !== SV) {
        if ((ps.entryLead >= 1 && ps.entryLead <= 3 && ps.exitLead >= 1 && ps.outs >= 1) || (ps.entryLead === 0 && ps.exitLead === 0 && ps.outs >= 3)) ps.hold = true;
      }
      if (ctx.rec) {
        const st = ps.p.st;
        st.g++; if (ps.isSP) st.gs++;
        st.outs += ps.outs; st.bf += ps.bf; st.h += ps.h; st.hr += ps.hr; st.bb += ps.bb; st.hbp += ps.hbp; st.so += ps.so; st.r += ps.r; st.er += ps.er; st.np += ps.pc;
        if (ps === W) st.w++; if (ps === L) st.l++; if (ps === SV) st.sv++; if (ps.hold) st.hld++;
        if (ps.isSP && sd.used.length === 1 && !tie) { st.cg++; if (opp === 0) st.sho++; }
        if (ps.isSP && ps.outs >= 18 && ps.er <= 3) st.qs++;
        ps.p.wkG++;
      }
      if (ctx.rec || ctx.post) {
        if (!ps.isSP) { const r = ps.p.rel || { last: -9, consec: 0, pc: 0 }; r.consec = (r.last === dayNo - 1) ? r.consec + 1 : 1; r.last = dayNo; r.pc = ps.pc; ps.p.rel = r; }
      }
      pp.push({ id: ps.p.id, sp: ps.isSP, pc: ps.pc });
    }
  }
  const feats = ctx.rec ? gameFeats(S) : null;
  const res = {
    h: H.tid, a: A.tid, hs: sh, as: sa, tie, inn: S.inn, line: S.line, W: W ? W.p.id : null, L: L ? L.p.id : null, SV: SV ? SV.p.id : null, feats,
    hits: [A.h, H.h], errs: [A.e, H.e], hrs: S.hrs, walkoff: S.walkoff, sp: [A.sp.id, H.sp.id],
    bp: A.lu.map(x => x.p.id).concat(H.lu.map(x => x.p.id)), pp
  };
  if (ctx.box) {
    res.box = S.sides.map(sd => ({
      bat: sd.box.bat,
      pit: sd.used.map(ps => ({ id: ps.p.id, outs: ps.outs, h: ps.h, r: ps.r, er: ps.er, bb: ps.bb + ps.hbp, so: ps.so, pc: ps.pc, hr: ps.hr,
        dec: ps === W ? '勝' : ps === L ? '敗' : ps === SV ? 'S' : ps.hold ? 'H' : '' }))
    }));
    res.log = S.log;
  }
  return res;
}
