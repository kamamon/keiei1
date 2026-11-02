/* =========================================================
   スカウト活動とドラフト会議
   ========================================================= */
const DRAFT_CATS = [['高校', 45], ['大学', 35], ['社会人', 20], ['独立', 10]];
const BONUS = [10000, 7000, 5000, 4000, 3500, 3000, 3000, 3000, 3000, 3000];
const ROOKIE_SAL = [1500, 1200, 1000, 900, 900, 800, 720, 720, 720, 720];

function genSchool(cat, home) {
  const pl = pick(PLACES[home]);
  if (cat === '高校') return pl + pick(['高', '第一高', '工業高', '商業高', '学院高', '実業高', '西高', '東高', '中央高', '学園高']);
  if (cat === '大学') return pl + pick(['大', '学院大', '国際大', '経済大', '工業大', '体育大']);
  if (cat === '社会人') return pick(['北辰', '東邦', '大和', '富岳', '白鳳', '三星', '旭日', '常盤', '千代田', '若葉', '瑞穂', '日輪']) + pick(['製鉄', '自動車', '電機', '重工', '化学', 'ガス', '生命', '運輸', '硝子', '紡績']);
  return '独立L・' + pl;
}
function draftValue(p) { return potv(p) * 0.78 + ovr(p) * 0.22 - Math.max(0, p.age - 22) * 1.2; }
function genDraftClass() {
  G.prospects = [];
  const ut = uT(); const acad = G.town ? G.town.stat.academy : 0;
  for (const [cat, n] of DRAFT_CATS) for (let i = 0; i < n; i++) {
    let age, cur, pot;
    if (cat === '高校') { age = 18; pot = clamp(rn(54, 12), 35, 96); cur = clamp(pot - rf(22, 38), 15, 55); }
    else if (cat === '大学') { age = 22; pot = clamp(rn(54, 10), 38, 90); cur = clamp(pot - rf(10, 22), 25, 65); }
    else if (cat === '社会人') { age = ri(23, 27); pot = clamp(rn(55, 8), 40, 84); cur = clamp(pot - rf(3, 12), 35, 72); }
    else { age = ri(20, 27); pot = clamp(rn(49, 9), 35, 80); cur = clamp(pot - rf(6, 18), 25, 62); }
    const home = wpick([0, 1, 2, 3, 4, 5], i2 => REGION_W[i2]);
    if (acad > 0 && home === ut.region && chance(0.3)) pot = Math.min(96, pot + acad * 2.5);
    const pos = chance(0.47) ? 'P' : wpick(['C', '1B', '2B', '3B', 'SS', 'OF'], x => ({ C: 12, '1B': 8, '2B': 12, '3B': 12, SS: 16, OF: 30 })[x]);
    const p = makePlayer({ pos, pt: pos === 'P' ? (chance(0.55) ? 'SP' : 'RP') : '', age, cur, pot, from: cat, home });
    p.team = -2;
    const hype = clamp(Math.round((pot - 50) * 2.2 + (cur - 40) * 0.8 + rn(0, 12) + (cat === '高校' ? 5 : 0)), 0, 100);
    const noise = {}; for (const k of (isP(p) ? PIT_KEYS : BAT_KEYS)) noise[k] = rn(0, 1); noise.pot = rn(0, 1); noise.ovr = rn(0, 1);
    p.pr = { cat, school: genSchool(cat, home), hype, sc: hype >= 55 ? 12 : 0, noise, pref: null, mark: false, rank: 0, local: acad > 0 && home === ut.region && chance(0.15 * acad) };
    if (hype >= 85 && chance(0.25)) p.pr.pref = wpick(G.teams, t => t.pop + (t.region === home ? 40 : 0)).id;
    G.prospects.push(p);
  }
}
function prospectVisible(p) { return p.pr.sc > 0 || p.pr.hype >= 55; }
function scoutSigma(p) { return 2 + 16 * (1 - p.pr.sc / 100); }
function shownAttr(p, k) { const s = scoutSigma(p); return clamp(Math.round(p.a[k] + (k === 'vel' ? p.pr.noise[k] * s * 0.3 : p.pr.noise[k] * s)), 1, k === 'vel' ? 170 : 99); }
function shownOvr(p) { return clamp(Math.round(ovr(p) + p.pr.noise.ovr * scoutSigma(p) * 0.7), 1, 99); }
function shownPot(p) { if (p.pr.sc < 25) return null; return clamp(Math.round(potv(p) + p.pr.noise.pot * (3 + 14 * (1 - p.pr.sc / 100))), 1, 99); }
function userDraftValue(p) { const sp = shownPot(p); return (sp != null ? sp : shownOvr(p) + 12) * 0.78 + shownOvr(p) * 0.22 - Math.max(0, p.age - 22) * 1.2 + (p.pr.mark ? 6 : 0); }

function weeklyScouting() {
  const t = curTurn(); if (t > 38) return;
  const bud = clamp(G.budget.scout / 20000, 0.25, 4);
  const bf = 0.55 + Math.sqrt(bud) * 0.45;
  for (const s of userScouts()) {
    if (s.assign === 'frn') {
      const pool = G.foreign.filter(p => p.pr && p.pr.sc < 100);
      for (let i = 0; i < 2 && pool.length; i++) { const p = pick(pool); p.pr.sc = Math.min(100, p.pr.sc + (6 + s.eye * 0.12) * bf * (1 + G.tfac.analytics.lv * 0.05)); }
      continue;
    }
    const pool = G.prospects.filter(p => p.home === s.assign);
    if (!pool.length) continue;
    const k = Math.round(2 + bud * 0.6);
    for (let i = 0; i < k; i++) {
      const p = wpick(pool, x => (x.pr.mark ? 5 : 1) * (1 + x.pr.hype / 50) * (x.pr.sc >= 100 ? 0 : (110 - x.pr.sc) / 100) + 0.01);
      const gain = (6 + s.eye * 0.12) * bf * rf(0.7, 1.3) * (p.pr.sc === 0 ? 0.6 : 1);
      p.pr.sc = Math.min(100, p.pr.sc + gain);
    }
  }
  // アマチュア選手も少しずつ成長
  if (t % 2 === 0) for (const p of G.prospects) growPlayer(p, { mult: 0.5, team: null });
}

/* ---------- AIの見立て ---------- */
function aiKnows(p, tid) { return p.pr.hype >= 35 || hash2(p.id, tid * 13 + 5) < 0.55; }
function aiView(p, tid) { const sig = p.pr.hype >= 60 ? 5 : 11; return draftValue(p) + (hash2(p.id, tid) - 0.5) * 2 * sig + aiNeedBonus(tid, p); }
function aiNeedBonus(tid, p) {
  const r = shihai(tid);
  const np = r.filter(isP).length, nb = r.length - np;
  let b = isP(p) ? (np < 33 ? 3 : -1) : (nb < 33 ? 3 : -1);
  if (!isP(p)) { const same = r.filter(x => x.pos === p.pos).length; if (p.pos === 'C' && same < 4) b += 3; if (p.pos === 'SS' && same < 3) b += 2; }
  return b;
}
function waiverOrder() {
  return G.teams.slice().sort((a, b) => pctOf(a.rec) - pctOf(b.rec) || a.rec.w - b.rec.w).map(t => t.id);
}

/* ---------- ドラフト会議の進行 ---------- */
function startDraft() {
  G.draft = { stage: 'r1', round: 1, picks: [], r1log: [], pending: G.teams.map(t => t.id), order: waiverOrder(), idx: 0, stopped: {}, userStop: false, ik: false, finished: false, maxRound: 10 };
  for (const T of G.teams) T.dPicks = 0;
}
function availableProspects() { const taken = new Set(G.draft.picks.map(x => x.pid)); return G.prospects.filter(p => !taken.has(p.id)); }
function aiChoose(tid) {
  const av = availableProspects().filter(p => aiKnows(p, tid));
  if (!av.length) return null;
  return maxBy(av, p => aiView(p, tid) + (G.draft.ik ? -potv(p) * 0.1 : 0));
}
function draftR1(userPid) {
  const D = G.draft; const ut = G.user.tid;
  const choices = {};
  for (const tid of D.pending.slice()) {
    if (tid === ut) { if (userPid != null) choices[tid] = userPid; else D.pending = D.pending.filter(t => t !== tid); }
    else { const p = aiChoose(tid); if (p) choices[tid] = p.id; else D.pending = D.pending.filter(t => t !== tid); }
  }
  const byP = {};
  for (const tid in choices) { const pid = choices[tid]; (byP[pid] = byP[pid] || []).push(+tid); }
  const round = { picks: [] };
  for (const pid in byP) {
    const ts = byP[pid];
    const win = ts.length > 1 ? pick(ts) : ts[0];
    round.picks.push({ pid: +pid, teams: ts, win });
    D.picks.push({ round: 1, tid: win, pid: +pid, ik: false, lot: ts.length > 1 ? ts : null });
    G.teams[win].dPicks++;
    D.pending = D.pending.filter(t => t !== win);
  }
  D.r1log.push(round);
  if (!D.pending.length) { D.stage = 'rounds'; D.round = 2; D.order = waiverOrder(); D.idx = 0; }
  return round;
}
function aiWantsMore(tid) {
  const T = G.teams[tid]; const D = G.draft;
  if (D.ik) { const ik = rosterLv(tid, 3).length + G.draft.picks.filter(x => x.tid === tid && x.ik).length; return ik < 14 && T.ikPicks < (T.market >= 4 ? 4 : 2); }
  const projected = shihai(tid).length + T.dPicks - 7;
  return T.dPicks < 8 && projected < 70 && (T.dPicks < 5 || chance(0.6));
}
/* 自分の番まで進める。戻り値: 'user' | 'done' */
function draftAdvance() {
  const D = G.draft; const ut = G.user.tid;
  if (D.stage === 'r1') return D.pending.includes(ut) ? 'user' : (draftR1(null), draftAdvance());
  let guard = 0;
  while (guard++ < 500) {
    if (D.stage === 'done') return 'done';
    if (D.idx >= D.order.length) {
      D.round++; D.order.reverse(); D.idx = 0;
      const allStop = G.teams.every(t => D.stopped[t.id]);
      if (D.round > D.maxRound || allStop) {
        if (!D.ik) { D.ik = true; D.round = 1; D.stopped = {}; D.order = waiverOrder(); D.idx = 0; D.userStop = false; for (const T of G.teams) T.ikPicks = 0; D.maxRound = 6; continue; }
        D.stage = 'done'; return 'done';
      }
    }
    const tid = D.order[D.idx];
    if (D.stopped[tid]) { D.idx++; continue; }
    if (tid === ut) { if (D.userStop) { D.stopped[tid] = true; D.idx++; continue; } return 'user'; }
    if (!aiWantsMore(tid)) { D.stopped[tid] = true; D.idx++; continue; }
    const p = aiChoose(tid);
    if (!p) { D.stopped[tid] = true; D.idx++; continue; }
    D.picks.push({ round: D.round, tid, pid: p.id, ik: D.ik });
    if (D.ik) G.teams[tid].ikPicks++; else G.teams[tid].dPicks++;
    D.idx++;
  }
  return 'done';
}
function userDraftPick(pid) {
  const D = G.draft; const ut = G.user.tid;
  if (D.stage === 'r1') return draftR1(pid);
  if (D.order[D.idx] !== ut) return null;
  D.picks.push({ round: D.round, tid: ut, pid, ik: D.ik });
  if (D.ik) G.teams[ut].ikPicks = (G.teams[ut].ikPicks || 0) + 1; else G.teams[ut].dPicks++;
  D.idx++;
  return true;
}
function userDraftStop() { const D = G.draft; D.userStop = true; D.stopped[G.user.tid] = true; D.idx++; }
function autoUserDraft() {
  let guard = 0;
  while (G.draft.stage !== 'done' && guard++ < 400) {
    const st = draftAdvance();
    if (st === 'done') break;
    const ut = G.user.tid;
    const av = availableProspects().filter(prospectVisible);
    const mine = G.draft.picks.filter(x => x.tid === ut && x.ik === G.draft.ik).length;
    const room = LIM.shihai - shihai(ut).length + 6;
    if (G.draft.stage === 'r1') { const p = maxBy(av, userDraftValue) || maxBy(availableProspects(), draftValue); draftR1(p ? p.id : null); continue; }
    if ((G.draft.ik && mine >= 2) || (!G.draft.ik && (mine >= 6 || mine >= room)) || !av.length) { userDraftStop(); continue; }
    userDraftPick(maxBy(av, userDraftValue).id);
  }
  finishDraft();
}
function finishDraft() {
  const D = G.draft; if (D.finished) return;
  D.finished = true;
  const ut = G.user.tid;
  for (const pk of D.picks) {
    const p = G.prospects.find(x => x.id === pk.pid); if (!p) continue;
    pk.name = p.name; pk.school = p.pr.school; pk.pos = p.pos;
    let refuse = 0.01 + (p.pr.cat === '社会人' || p.pr.cat === '大学' ? 0.015 : 0);
    if (p.pr.pref != null && p.pr.pref !== pk.tid) refuse += 0.45;
    if (pk.tid === ut) { const sc = userScouts().find(s => s.assign === p.home); refuse *= (p.pr.sc >= 80 ? 0.3 : 1) * (sc ? 1.2 - sc.nego / 100 : 1); if (p.pr.local) refuse = 0; }
    if (chance(refuse)) { pk.refused = true; if (pk.tid === ut) addNews('draft', `${pk.round}位指名の${p.name}（${p.pr.school}）が入団を拒否しました`, { important: true, tid: ut }); continue; }
    const r = Math.min(9, pk.round - 1);
    const bonus = pk.ik ? 300 : BONUS[r];
    const sal = pk.ik ? 400 : ROOKIE_SAL[r];
    p.team = -1; G.players[p.id] = p;
    p.join = G.year + 1; p.dr = { y: G.year, r: pk.round, ik: pk.ik, t: pk.tid };
    addToTeam(p, pk.tid, pk.ik ? 3 : 2);
    p.sal = 0; p.ren = { st: 'signed', sal, yrs: 1, rookie: true };
    p.mor = 70; p.pop = clamp(Math.round(p.pr.hype * 0.4), 0, 60);
    p.orig = pk.tid;
    if (pk.tid === ut) book('exp', 'bonus', bonus);
    p.prInfo = { school: p.pr.school, cat: p.pr.cat, hype: p.pr.hype };
    delete p.pr;
  }
  const mine = D.picks.filter(x => x.tid === ut && !x.refused);
  addNews('draft', `ドラフト会議終了。支配下${mine.filter(x => !x.ik).length}人・育成${mine.filter(x => x.ik).length}人と入団合意しました`, { important: true, tid: ut });
  const first = D.picks.filter(x => x.round === 1 && !x.ik);
  const ln = first.map(x => { const p = P_(x.pid) || G.prospects.find(y => y.id === x.pid); return tShort(x.tid) + '：' + (p ? p.name : '?'); }).join(' ／ ');
  addNews('draft', `各球団の1位指名 ${ln}`, {});
  G.prospects = [];
}
